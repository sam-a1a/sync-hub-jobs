export type Platform = 'ios' | 'android' | null

function detect(): Platform {
  if (typeof navigator === 'undefined') return null
  const agent = navigator.userAgent
  if (/iPhone|iPod/i.test(agent)) return 'ios'
  if (/Android/i.test(agent) && /Mobile/i.test(agent)) return 'android'
  return null
}

export const PLATFORM: Platform = detect()
export const PHONE = PLATFORM !== null

export function markPlatform(): void {
  if (PLATFORM) document.documentElement.dataset.platform = PLATFORM
}
