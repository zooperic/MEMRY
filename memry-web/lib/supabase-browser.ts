import { createBrowserClient as _create } from '@supabase/ssr'

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function createBrowserClient() {
  return _create(URL, ANON)
}

// Alias
export { createBrowserClient as createBrowserClientInstance }
