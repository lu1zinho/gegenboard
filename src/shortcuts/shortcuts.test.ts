import { afterEach, describe, expect, it } from 'vitest'
import { shortcutFor, type KeyPress } from './shortcuts'

/** The shortcut for a key press; the key code defaults to the key's place on QWERTY. */
function press(key: string, overrides: Partial<KeyPress> = {}) {
  return shortcutFor({
    key,
    code: /^[a-z]$/iu.test(key) ? `Key${key.toUpperCase()}` : key,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    repeat: false,
    target: document.body,
    ...overrides,
  })
}

/** An element added to the page, removed after the test. */
function element(html: string): Element {
  const container = document.createElement('div')
  container.innerHTML = html
  document.body.append(container)
  const child = container.firstElementChild
  if (!child) throw new Error(`No element in ${html}`)
  return child
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('shortcutFor', () => {
  describe('undo and redo', () => {
    it('undoes on Ctrl+Z', () => {
      expect(press('z', { ctrlKey: true })).toBe('undo')
    })

    it('redoes on Ctrl+Shift+Z and Ctrl+Y', () => {
      expect(press('Z', { ctrlKey: true, shiftKey: true })).toBe('redo')
      expect(press('y', { ctrlKey: true })).toBe('redo')
    })

    it('accepts ⌘ in place of Ctrl', () => {
      expect(press('z', { metaKey: true })).toBe('undo')
      expect(press('Z', { metaKey: true, shiftKey: true })).toBe('redo')
      expect(press('y', { metaKey: true })).toBe('redo')
    })

    it('reads the letter regardless of Caps Lock', () => {
      expect(press('Z', { ctrlKey: true })).toBe('undo')
    })

    it('follows the keyboard layout', () => {
      // On AZERTY, Z is where QWERTY has W.
      expect(press('z', { ctrlKey: true, code: 'KeyW' })).toBe('undo')
      expect(press('w', { ctrlKey: true, code: 'KeyZ' })).toBeNull()
    })

    it('falls back to the key position for layouts without Latin letters', () => {
      expect(press('я', { ctrlKey: true, code: 'KeyZ' })).toBe('undo')
      expect(press('н', { ctrlKey: true, code: 'KeyY' })).toBe('redo')
    })

    it('repeats while held', () => {
      expect(press('z', { ctrlKey: true, repeat: true })).toBe('undo')
    })

    it('ignores other combinations', () => {
      expect(press('z')).toBeNull()
      expect(press('z', { shiftKey: true })).toBeNull()
      expect(press('z', { ctrlKey: true, altKey: true })).toBeNull()
      expect(press('Y', { ctrlKey: true, shiftKey: true })).toBeNull()
      expect(press('x', { ctrlKey: true })).toBeNull()
      expect(press('Control', { ctrlKey: true, code: 'ControlLeft' })).toBeNull()
    })

    it('leaves text fields their own undo, but works on other controls', () => {
      for (const html of ['<input>', '<input type="number">', '<textarea></textarea>']) {
        expect(press('z', { ctrlKey: true, target: element(html) })).toBeNull()
      }
      for (const html of ['<button>Save</button>', '<input type="color">', '<select></select>']) {
        expect(press('z', { ctrlKey: true, target: element(html) })).toBe('undo')
      }
    })
  })

  describe('presentation mode', () => {
    it('toggles on P, with or without Shift', () => {
      expect(press('p')).toBe('togglePresentation')
      expect(press('P', { shiftKey: true })).toBe('togglePresentation')
    })

    it('finds P on any keyboard layout', () => {
      expect(press('з', { code: 'KeyP' })).toBe('togglePresentation')
    })

    it('ignores P with Ctrl, ⌘ or Alt, and a held-down P', () => {
      expect(press('p', { ctrlKey: true })).toBeNull()
      expect(press('p', { metaKey: true })).toBeNull()
      expect(press('p', { altKey: true })).toBeNull()
      expect(press('p', { repeat: true })).toBeNull()
    })

    it('leaves P to text fields and selects, but works on other controls', () => {
      for (const html of ['<input>', '<textarea></textarea>', '<select></select>']) {
        expect(press('p', { target: element(html) })).toBeNull()
      }
      for (const html of ['<button>Save</button>', '<input type="color">']) {
        expect(press('p', { target: element(html) })).toBe('togglePresentation')
      }
    })
  })

  describe('closing a panel', () => {
    it('closes on Escape, even from a text field', () => {
      expect(press('Escape')).toBe('closePanel')
      expect(press('Escape', { target: element('<input>') })).toBe('closePanel')
    })

    it('ignores Escape with modifiers', () => {
      expect(press('Escape', { shiftKey: true })).toBeNull()
      expect(press('Escape', { ctrlKey: true })).toBeNull()
    })
  })

  it('ignores keys that are no shortcut', () => {
    expect(press('a')).toBeNull()
    expect(press('Enter')).toBeNull()
    expect(press(' ', { code: 'Space' })).toBeNull()
  })
})
