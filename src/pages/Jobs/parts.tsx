import type { BrandName } from '../../components/BrandIcon/BrandIcon'

export const BRANDS: Record<string, BrandName> = {
  google: 'google',
  meta: 'meta',
  stripe: 'stripe',
  airbnb: 'airbnb',
  spotify: 'spotify',
  figma: 'figma',
  notion: 'notion',
}

export const PILL =
  'inline-flex items-center justify-center gap-2 rounded-full border border-hairline px-3 py-1 text-center text-xs font-medium whitespace-nowrap text-ink-muted'

export const CHIP =
  'inline-flex cursor-pointer items-center rounded-full border px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors duration-[var(--hover-fade)] ease-[var(--ease-standard)]'

export const ACTION =
  'inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-hairline px-6 text-[15px] font-semibold whitespace-nowrap text-ink transition-colors duration-[var(--hover-fade)] ease-[var(--ease-standard)] hover:border-ink'

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export function unique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b))
}
