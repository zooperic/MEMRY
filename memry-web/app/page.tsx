export const dynamic = 'force-dynamic'
import { createServerClientInstance } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import LandingPage from './landing/page'

export default async function RootPage() {
  const supabase = await createServerClientInstance()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')
  return <LandingPage />
}
