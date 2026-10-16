/**
 * Every keyboard shortcut in Gegenboard. They are matched here and nowhere else, so they can't
 * clash; add new ones to `shortcutFor` and to the table below (and in CLAUDE.md).
 *
 * | Keys                     | Action               | Ignored while focus is in      |
 * | ------------------------ | -------------------- | ------------------------------ |
 * | Ctrl+Z                   | `undo`               | a text field, which has its own undo |
 * | Ctrl+Shift+Z or Ctrl+Y   | `redo`               | a text field                   |
 * | P                        | `togglePresentation` | a text field or a select, which take typed letters |
 * | Escape                   | `closePanel`         | nothing: it works everywhere   |
 *
 * ⌘ works in place of Ctrl, for Macs. Letters follow the keyboard layout; layouts without Latin
 * letters fall back to where the key sits on a QWERTY keyboard.
 */
export type ShortcutAction = 'undo' | 'redo' | 'togglePresentation' | 'closePanel'

export type KeyPress = Pick<
  KeyboardEvent,
  'key' | 'code' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey' | 'repeat' | 'target'
>

/** The shortcut a key press asks for, if any. See the table above. */
export function shortcutFor(press: KeyPress): ShortcutAction | null {
  const { ctrlKey, metaKey, shiftKey, altKey } = press
  if (press.key === 'Escape') return ctrlKey || metaKey || shiftKey || altKey ? null : 'closePanel'
  if (altKey) return null

  const letter = letterOf(press)
  if (ctrlKey || metaKey) {
    if (isTextField(press.target)) return null
    if (letter === 'z') return shiftKey ? 'redo' : 'undo'
    if (letter === 'y' && !shiftKey) return 'redo'
    return null
  }
  // Holding P down would flicker the controls, so only the first press counts.
  if (letter === 'p' && !press.repeat && !takesTypedLetters(press.target)) {
    return 'togglePresentation'
  }
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

/** Whether the element is a field for typing text in, with its own undo. */
function isTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable || target instanceof HTMLTextAreaElement) return true
  return target instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(target.type)
}

/** Whether typing a letter in the element does something there: a text field or a select. */
function takesTypedLetters(target: EventTarget | null): boolean {
  return isTextField(target) || target instanceof HTMLSelectElement
}
