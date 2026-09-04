import { useRef, type PointerEvent } from 'react'

type Drag = {
  id: number
  startY: number
  lastY: number
  lastT: number
  dy: number
  velocity: number
}

type Handlers = {
  onPointerDown?: (event: PointerEvent<HTMLElement>) => void
  onPointerMove?: (event: PointerEvent<HTMLElement>) => void
  onPointerUp?: (event: PointerEvent<HTMLElement>) => void
  onPointerCancel?: (event: PointerEvent<HTMLElement>) => void
}

export function useSheetDrag(
  sheet: () => HTMLElement | null,
  enabled: boolean,
  onDismiss: () => void,
): Handlers {
  const drag = useRef<Drag | null>(null)

  if (!enabled) return {}

  const end = (event: PointerEvent<HTMLElement>, cancelled: boolean) => {
    const state = drag.current
    const node = sheet()
    if (!state || !node || event.pointerId !== state.id) return
    drag.current = null
    if (event.currentTarget.hasPointerCapture(state.id)) {
      event.currentTarget.releasePointerCapture(state.id)
    }
    delete node.dataset.drag
    node.style.translate = ''
    if (cancelled) return
    const far = state.dy > node.offsetHeight * 0.3
    const fast = state.velocity > 0.6 && state.dy > 24
    if (far || fast) onDismiss()
  }

  return {
    onPointerDown(event) {
      const node = sheet()
      if (!node || drag.current) return
      if (event.pointerType === 'mouse' && event.button !== 0) return
      drag.current = {
        id: event.pointerId,
        startY: event.clientY,
        lastY: event.clientY,
        lastT: event.timeStamp,
        dy: 0,
        velocity: 0,
      }
      event.currentTarget.setPointerCapture(event.pointerId)
      node.dataset.drag = ''
    },
    onPointerMove(event) {
      const state = drag.current
      const node = sheet()
      if (!state || !node || event.pointerId !== state.id) return
      const raw = event.clientY - state.startY
      const dt = event.timeStamp - state.lastT
      if (dt > 0) state.velocity = (event.clientY - state.lastY) / dt
      state.lastY = event.clientY
      state.lastT = event.timeStamp
      state.dy = raw > 0 ? raw : raw * 0.12
      node.style.translate = `0 ${state.dy}px`
    },
    onPointerUp(event) {
      end(event, false)
    },
    onPointerCancel(event) {
      end(event, true)
    },
  }
}
