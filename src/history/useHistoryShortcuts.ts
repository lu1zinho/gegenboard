import { useEffect } from 'react'

export type HistoryAction = 'undo' | 'redo'

type KeyPress = Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>

/**
 * The history action a key press asks for, if any: Ctrl+Z undoes, Ctrl+Shift+Z and Ctrl+Y
 * redo. ⌘ works in place of Ctrl, for Macs.
 */
export function historyActionFor(press: KeyPress): HistoryAction | null {
  if (!(press.ctrlKey || press.metaKey) || press.altKey) return null
  const letter = letterOf(press)
  if (letter === 'z') return press.shiftKey ? 'redo' : 'undo'
  if (letter === 'y' && !press.shiftKey) return 'redo'
  return null
}

/**
 * The Latin letter on the key pressed, in lower case, following the keyboard layout. Layouts
 * without Latin letters fall back to where the key sits on a QWERTY keyboard.
 */
function letterOf({ key, code }: KeyPress): string | null {
  if (/^[a-z]$/iu.test(key)) return key.toLowerCase()
  return /^Key[A-Z]$/u.test(code) ? code.slice(3).toLowerCase() : null
}

const TEXT_INPUT_TYPES = new Set(['email', 'number', 'password', 'search', 'tel', 'text', 'url'])

/** Whether the element is a field for typing in, which has its own undo for the text. */
function isTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable || target instanceof HTMLTextAreaElement) return true
  return target instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(target.type)
}

/**
 * Undoes and redoes on the usual keyboard shortcuts anywhere on the page, except while typing
 * in a text field, where they undo the typing as usual.
 */
export function useHistoryShortcuts({ undo, redo }: { undo: () => void; redo: () => void }) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || isTextField(event.target)) return
      const action = historyActionFor(event)
      if (action === null) return
      event.preventDefault()
      if (action === 'undo') undo()
      else redo()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [undo, redo])
}
