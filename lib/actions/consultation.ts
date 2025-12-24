'use server'

import { getRedisClient } from '@/lib/redis/config'
import {
  Consultation,
  ConsultationStatus,
  CreateConsultationInput,
  UpdateConsultationInput
} from '@/lib/types/consultation'

// Redis key patterns
const CONSULTATION_KEY = (id: string) => `consultation:${id}`
const CONSULTATIONS_ALL_KEY = 'consultations:all'

// Generate unique ID
function generateId(): string {
  return `cons_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Create a new consultation
 */
export async function createConsultation(
  input: CreateConsultationInput
): Promise<Consultation> {
  const id = generateId()
  const now = new Date().toISOString()

  const consultation: Consultation = {
    id,
    name: input.name,
    company: input.company || null,
    phone: input.phone,
    email: input.email || null,
    consultation_type: input.consultationType,
    description: input.description || null,
    status: 'pending',
    admin_notes: null,
    created_at: now,
    updated_at: now
  }

  try {
    const redis = await getRedisClient()

    // Store consultation
    await redis.hmset(CONSULTATION_KEY(id), serializeConsultation(consultation))

    // Add to all consultations index (sorted by creation time, newest first)
    await redis.zadd(CONSULTATIONS_ALL_KEY, Date.now(), id)

    return consultation
  } catch (error) {
    console.error('Error creating consultation in Redis:', error)
    throw error
  }
}

/**
 * Get consultation by ID
 */
export async function getConsultation(id: string): Promise<Consultation | null> {
  try {
    const redis = await getRedisClient()
    const data = await redis.hgetall<Record<string, string>>(CONSULTATION_KEY(id))

    if (!data || Object.keys(data).length === 0) {
      return null
    }

    return parseConsultation(data)
  } catch (error) {
    console.error('Error getting consultation from Redis:', error)
    return null
  }
}

/**
 * Update consultation
 */
export async function updateConsultation(
  id: string,
  updates: UpdateConsultationInput
): Promise<Consultation | null> {
  const existing = await getConsultation(id)
  if (!existing) {
    return null
  }

  const updatedConsultation: Consultation = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString()
  }

  try {
    const redis = await getRedisClient()
    await redis.hmset(
      CONSULTATION_KEY(id),
      serializeConsultation(updatedConsultation)
    )
    return updatedConsultation
  } catch (error) {
    console.error('Error updating consultation in Redis:', error)
    return null
  }
}

/**
 * Get all consultations (for admin)
 */
export async function getAllConsultations(
  page: number = 1,
  limit: number = 20,
  status?: ConsultationStatus
): Promise<{ consultations: Consultation[]; total: number }> {
  try {
    const redis = await getRedisClient()

    // Get all consultation IDs (sorted by time, newest first)
    const allIds = await redis.zrange(CONSULTATIONS_ALL_KEY, 0, -1, { rev: true })

    if (!allIds || allIds.length === 0) {
      return { consultations: [], total: 0 }
    }

    // Get all consultations
    const allConsultations: Consultation[] = []
    for (const id of allIds) {
      const consultation = await getConsultation(id)
      if (consultation) {
        // Filter by status if provided
        if (status) {
          if (consultation.status === status) {
            allConsultations.push(consultation)
          }
        } else {
          allConsultations.push(consultation)
        }
      }
    }

    // Paginate
    const total = allConsultations.length
    const start = (page - 1) * limit
    const paged = allConsultations.slice(start, start + limit)

    return { consultations: paged, total }
  } catch (error) {
    console.error('Error getting all consultations from Redis:', error)
    return { consultations: [], total: 0 }
  }
}

/**
 * Delete consultation
 */
export async function deleteConsultation(id: string): Promise<boolean> {
  try {
    const redis = await getRedisClient()

    // Remove from index
    await redis.zrem(CONSULTATIONS_ALL_KEY, id)

    // Delete consultation data
    await redis.del(CONSULTATION_KEY(id))

    return true
  } catch (error) {
    console.error('Error deleting consultation from Redis:', error)
    return false
  }
}

// Helper: Parse consultation from Redis hash
function parseConsultation(data: Record<string, any>): Consultation {
  return {
    id: data.id || '',
    name: data.name || '',
    company: data.company || null,
    phone: data.phone || '',
    email: data.email || null,
    consultation_type: data.consultation_type || 'other',
    description: data.description || null,
    status: data.status || 'pending',
    admin_notes: data.admin_notes || null,
    created_at: data.created_at || new Date().toISOString(),
    updated_at: data.updated_at || new Date().toISOString()
  }
}

// Helper: Serialize consultation for Redis hash
function serializeConsultation(consultation: Consultation): Record<string, string> {
  return {
    id: consultation.id,
    name: consultation.name,
    company: consultation.company || '',
    phone: consultation.phone,
    email: consultation.email || '',
    consultation_type: consultation.consultation_type,
    description: consultation.description || '',
    status: consultation.status,
    admin_notes: consultation.admin_notes || '',
    created_at: consultation.created_at,
    updated_at: consultation.updated_at
  }
}
