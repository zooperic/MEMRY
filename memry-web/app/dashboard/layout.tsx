import Sidebar from '@/components/layout/Sidebar'
import { createServerClientInstance } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClientInstance()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const name    = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'You'
  const initial = name[0]?.toUpperCase() ?? 'A'

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar userName={name} userInitial={initial} />
      <div style={{ marginLeft: 220, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  )
}
export const dynamic = 'force-dynamic'
