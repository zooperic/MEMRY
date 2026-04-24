import { createServerClient } from '@supabase/ssr'
import { createClient }       from '@supabase/supabase-js'
import { cookies }            from 'next/headers'

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SVC  = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function createServerClientInstance() {
  const cookieStore = await cookies()
  return createServerClient(URL, ANON, {
    cookies: {
      getAll()             { return cookieStore.getAll() },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options))
        } catch {}
      },
    },
  })
}

export function createAdminClient() {
  return createClient(URL, SVC, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
