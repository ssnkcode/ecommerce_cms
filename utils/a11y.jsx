import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function getFocusable(container) {
  const nodes = Array.from(container.querySelectorAll(FOCUSABLE))
  return nodes.filter((el) => el.offsetParent !== null || el === document.activeElement)
}

export function useFocusTrap(ref, { onEscape } = {}) {
  const onEscapeRef = useRef(onEscape)
  useEffect(() => {
    onEscapeRef.current = onEscape
  }, [onEscape])

  useEffect(() => {
    const container = ref.current
    if (!container) return

    const previouslyFocused = document.activeElement
    const hasAutofocus = container.querySelector('[autofocus]')
    if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '-1')
    const alreadyFocused = previouslyFocused && container.contains(previouslyFocused)
    if (!hasAutofocus && !alreadyFocused && typeof container.focus === 'function') {
      container.focus({ preventScroll: true })
    }

    const onKeyDown = (e) => {
      if (e.key === 'Escape' && onEscapeRef.current) {
        e.preventDefault()
        onEscapeRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const items = getFocusable(container)
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first || !items.includes(document.activeElement)) {
          e.preventDefault()
          last.focus()
        }
      } else if (document.activeElement === last || !items.includes(document.activeElement)) {
        e.preventDefault()
        first.focus()
      }
    }

    container.addEventListener('keydown', onKeyDown)
    return () => {
      container.removeEventListener('keydown', onKeyDown)
      const active = document.activeElement
      if (active && container.contains(active) && previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus()
      }
    }
  }, [ref])
}