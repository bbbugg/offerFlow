import MainPageClient from './main-page-client'
import { normalizeMainView } from '@/lib/mainViews'

export default async function MainPage({ searchParams }) {
  const params = await searchParams
  return <MainPageClient initialView={normalizeMainView(params.view)} />
}
