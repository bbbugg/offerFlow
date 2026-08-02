export const MAIN_VIEWS = [
  'dashboard',
  'board',
  'positions',
  'schedule',
  'insights',
  'settings',
]

export function normalizeMainView(view) {
  const value = Array.isArray(view) ? view[0] : view
  return MAIN_VIEWS.includes(value) ? value : 'dashboard'
}
