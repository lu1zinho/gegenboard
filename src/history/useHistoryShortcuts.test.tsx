import { render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { historyActionFor, useHistoryShortcuts } from './useHistoryShortcuts'

describe('historyActionFor', () => {
  /** The action for a key press; the key code defaults to the key's place on QWERTY. */
  const press = (key: string, overrides: Partial<Parameters<typeof historyActionFor>[0]> = {}) =>
    historyActionFor({
      key,
      code: `Key${key.toUpperCase()}`,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      ...overrides,
    })

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

  it('ignores other keys and combinations', () => {
    expect(press('z')).toBeNull()
    expect(press('z', { shiftKey: true })).toBeNull()
    expect(press('z', { ctrlKey: true, altKey: true })).toBeNull()
    expect(press('Y', { ctrlKey: true, shiftKey: true })).toBeNull()
    expect(press('x', { ctrlKey: true })).toBeNull()
    expect(press('Control', { ctrlKey: true, code: 'ControlLeft' })).toBeNull()
  })
})

describe('useHistoryShortcuts', () => {
  function setup() {
    const undo = vi.fn()
    const redo = vi.fn()
    const user = userEvent.setup()
    const hook = renderHook(() => {
      useHistoryShortcuts({ undo, redo })
    })
    return { undo, redo, user, hook }
  }

  it('undoes and redoes on the keyboard shortcuts', async () => {
    const { undo, redo, user } = setup()

    await user.keyboard('{Control>}z{/Control}')
    expect(undo).toHaveBeenCalledTimes(1)
    expect(redo).not.toHaveBeenCalled()

    await user.keyboard('{Control>}{Shift>}Z{/Shift}{/Control}')
    await user.keyboard('{Control>}y{/Control}')
    expect(redo).toHaveBeenCalledTimes(2)
    expect(undo).toHaveBeenCalledTimes(1)
  })

  it('stops the browser acting on the shortcut', () => {
    setup()
    const event = new KeyboardEvent('keydown', {
      key: 'z',
      code: 'KeyZ',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })
    document.body.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it('leaves the shortcuts to text fields while typing in them', async () => {
    const { undo, redo, user } = setup()
    render(
      <>
        <input aria-label="Name" />
        <textarea aria-label="Notes" />
      </>,
    )

    await user.click(screen.getByRole('textbox', { name: 'Name' }))
    await user.keyboard('{Control>}z{/Control}')
    await user.click(screen.getByRole('textbox', { name: 'Notes' }))
    await user.keyboard('{Control>}y{/Control}')

    expect(undo).not.toHaveBeenCalled()
    expect(redo).not.toHaveBeenCalled()
  })

  it('still works while a button or colour picker has focus', async () => {
    const { undo, user } = setup()
    render(
      <>
        <button type="button">Save</button>
        <input type="color" aria-label="Colour" />
      </>,
    )

    await user.click(screen.getByRole('button', { name: 'Save' }))
    await user.keyboard('{Control>}z{/Control}')
    screen.getByLabelText('Colour').focus()
    await user.keyboard('{Control>}z{/Control}')

    expect(undo).toHaveBeenCalledTimes(2)
  })

  it('ignores key presses already handled elsewhere', async () => {
    const { undo, user } = setup()
    render(
      <div
        role="presentation"
        onKeyDown={(event) => {
          event.preventDefault()
        }}
      >
        <button type="button">Inside</button>
      </div>,
    )

    await user.click(screen.getByRole('button', { name: 'Inside' }))
    await user.keyboard('{Control>}z{/Control}')
    expect(undo).not.toHaveBeenCalled()
  })

  it('stops listening when unmounted', async () => {
    const { undo, user, hook } = setup()
    hook.unmount()
    await user.keyboard('{Control>}z{/Control}')
    expect(undo).not.toHaveBeenCalled()
  })
})
