export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import MainLayoutClient from './main-layout-client'

export default async function MainLayout({ children }) {
  const user = await getAuthUser()
  if (!user) redirect('/auth/login')

  return <MainLayoutClient>{children}</MainLayoutClient>
}
