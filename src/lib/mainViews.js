export const MAIN_VIEWS = [
  'dashboard',
  'board',
  'positions',
  'schedule',
  'insights',
  'settings',
]

export const LEGACY_MAIN_VIEW_PATHS = {
  '/dashboard': 'dashboard',
  '/board': 'board',
  '/positions': 'positions',
  '/schedule': 'schedule',
  '/insights': 'insights',
  '/settings': 'settings',
}

export function normalizeMainView(view) {
  const value = Array.isArray(view) ? view[0] : view
  return MAIN_VIEWS.includes(value) ? value : 'dashboard'
}

export function getLegacyMainView(pathname) {
  return LEGACY_MAIN_VIEW_PATHS[pathname] || null
}

export function sanitizeCallbackUrl(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/'

  try {
    const baseUrl = 'http://offerflow.local'
    const url = new URL(value, baseUrl)
    if (url.origin !== baseUrl) return '/'

    const legacyView = getLegacyMainView(url.pathname)
    if (legacyView) return `/?view=${legacyView}`
    if (url.pathname !== '/') return '/'

    const view = url.searchParams.get('view')
    return MAIN_VIEWS.includes(view) ? `/?view=${view}` : '/'
  } catch {
    return '/'
  }
}
