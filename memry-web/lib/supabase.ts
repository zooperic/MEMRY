// Re-export all clients — use specific files for better tree-shaking
// Browser: import from '@/lib/supabase-browser'
// Server:  import from '@/lib/supabase-server'
export { createBrowserClientInstance as createBrowserClient } from './supabase-browser'
export { createServerClientInstance, createAdminClient }      from './supabase-server'
