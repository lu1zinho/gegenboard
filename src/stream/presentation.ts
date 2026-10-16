import { useEffect, useState } from 'react'

/** Whether a key press is aimed at something the user is typing into. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/** Presentation mode, toggled by the P key. Typing in a field or using modifiers is ignored. */
export function usePresentationMode(): boolean {
  const [presenting, setPresenting] = useState(false)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'p' || event.repeat) return
      if (event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) return
      setPresenting((current) => !current)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])
  return presenting
}
