import { useEffect, useState } from 'react'

const QUERY = '(hover: hover) and (pointer: fine)'

export function useCanHover(): boolean {
  const [can, setCan] = useState(true)

  useEffect(() => {
    if (!window.matchMedia) return
    const media = window.matchMedia(QUERY)
    const read = () => setCan(media.matches)
    read()
    media.addEventListener('change', read)
    return () => media.removeEventListener('change', read)
  }, [])

  return can
}
