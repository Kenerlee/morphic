import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'

/**
 * @deprecated This route was used for Supabase email OTP confirmation.
 * Better Auth handles email verification through /api/auth/*
 * This file can be removed once migration is complete.
 */
export async function GET(request: NextRequest) {
  // Redirect to login page since Supabase email confirmation is no longer used
  redirect('/auth/login?error=confirm_deprecated')
}
