'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export type SignInResult = { error: string } | { ok: true }

/**
 * Server-side sign-in so session cookies are written via Next.js `cookies()`.
 * Client-only `createBrowserClient` can leave the server/middleware without a readable session.
 */
export async function signInWithPasswordAction(formData: FormData): Promise<SignInResult> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Please enter your email and password.' }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!supabaseUrl || !supabaseAnonKey) {
    const missing: string[] = []
    if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    return {
      error: `Missing environment variable(s): ${missing.join(', ')}. Add them in Vercel → Project → Settings → Environment Variables (Production), then redeploy.`,
    }
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // set() can fail in some Server Component contexts; login runs in an action so this is rare
        }
      },
    },
  })

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return { error: error.message }
  }

  return { ok: true }
}
