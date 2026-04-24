import { createServerClientInstance } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createServerClientInstance()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/auth', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'))
}
