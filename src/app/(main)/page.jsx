import MainPageClient from './main-page-client'
import { MAIN_VIEWS, normalizeMainView } from '@/lib/mainViews'

export default async function MainPage({ searchParams }) {
  const params = await searchParams
  const rawView = params.view
  const requestedView = Array.isArray(rawView) ? rawView[0] : rawView
  const validRequestedView = MAIN_VIEWS.includes(requestedView)
  const shouldCleanViewUrl = rawView !== undefined && (Array.isArray(rawView) || !validRequestedView)
  const canonicalViewParam = shouldCleanViewUrl ? (validRequestedView ? requestedView : '') : null

  return (
    <MainPageClient
      initialView={normalizeMainView(rawView)}
      canonicalViewParam={canonicalViewParam}
    />
  )
}
