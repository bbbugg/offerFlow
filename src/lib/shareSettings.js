export const DEFAULT_SHARE_SETTINGS = Object.freeze({
  shareSchedule: true,
  shareUsername: true
})

export function parseShareSettings(raw) {
  return {
    shareSchedule: typeof raw?.shareSchedule === 'boolean'
      ? raw.shareSchedule
      : DEFAULT_SHARE_SETTINGS.shareSchedule,
    shareUsername: typeof raw?.shareUsername === 'boolean'
      ? raw.shareUsername
      : DEFAULT_SHARE_SETTINGS.shareUsername
  }
}

export function validateShareSettings(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

  const allowedKeys = Object.keys(DEFAULT_SHARE_SETTINGS)
  const keys = Object.keys(raw)
  if (
    keys.length !== allowedKeys.length ||
    !allowedKeys.every((key) => typeof raw[key] === 'boolean') ||
    !keys.every((key) => allowedKeys.includes(key))
  ) {
    return null
  }

  return {
    shareSchedule: raw.shareSchedule,
    shareUsername: raw.shareUsername
  }
}
