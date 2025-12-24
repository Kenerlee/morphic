import { NextResponse } from 'next/server'

/**
 * @deprecated This route was used for Supabase OAuth callback.
 * Better Auth handles OAuth through /api/auth/callback/*
 * This file can be removed once migration is complete.
 */
export async function GET(request: Request) {
  // Redirect to login page since Supabase OAuth is no longer used
  const { origin } = new URL(request.url)
  return NextResponse.redirect(`${origin}/auth/login?error=oauth_deprecated`)
}
