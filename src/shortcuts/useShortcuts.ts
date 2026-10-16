import { useEffect, useEffectEvent } from 'react'
import { shortcutFor, type ShortcutAction } from './shortcuts'

/** What to do for each shortcut. A shortcut without a handler is left to the browser. */
export type ShortcutHandlers = Partial<Record<ShortcutAction, () => void>>

/**
 * Runs the handler for each keyboard shortcut pressed anywhere on the page, with one listener
 * for the whole app. Key presses that something on the page already handled (by calling
 * `preventDefault`) are left alone, so a field can keep a key such as Escape for itself.
 */
export function useShortcuts(handlers: ShortcutHandlers) {
  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented) return
    const action = shortcutFor(event)
    const handler = action === null ? undefined : handlers[action]
    if (!handler) return
    event.preventDefault()
    handler()
  })

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      handleKeyDown(event)
    }
    window.addEventListener('keydown', listener)
    return () => {
      window.removeEventListener('keydown', listener)
    }
  }, [])
}
