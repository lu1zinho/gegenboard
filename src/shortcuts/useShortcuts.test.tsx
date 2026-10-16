import { render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { useShortcuts, type ShortcutHandlers } from './useShortcuts'

describe('useShortcuts', () => {
  function setup() {
    const handlers = { undo: vi.fn(), redo: vi.fn(), togglePresentation: vi.fn() }
    const initialProps: ShortcutHandlers = handlers
    const user = userEvent.setup()
    const hook = renderHook(
      (props) => {
        useShortcuts(props)
      },
      { initialProps },
    )
    return { ...handlers, user, hook }
  }

  it('runs the handler for each shortcut pressed', async () => {
    const { undo, redo, togglePresentation, user } = setup()

    await user.keyboard('{Control>}z{/Control}')
    await user.keyboard('{Control>}{Shift>}Z{/Shift}{/Control}')
    await user.keyboard('{Control>}y{/Control}')
    await user.keyboard('p')

    expect(undo).toHaveBeenCalledTimes(1)
    expect(redo).toHaveBeenCalledTimes(2)
    expect(togglePresentation).toHaveBeenCalledTimes(1)
  })

  it('stops the browser acting on a shortcut it handles', () => {
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

  it('leaves a shortcut without a handler to the browser', () => {
    setup()
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    document.body.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })

  it('uses the latest handlers', async () => {
    const { user, hook } = setup()
    const closePanel = vi.fn()

    await user.keyboard('{Escape}')
    hook.rerender({ closePanel })
    await user.keyboard('{Escape}')

    expect(closePanel).toHaveBeenCalledTimes(1)
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

  it('leaves the shortcuts to text fields while typing in them', async () => {
    const { undo, togglePresentation, user } = setup()
    render(<input aria-label="Name" />)

    await user.click(screen.getByRole('textbox', { name: 'Name' }))
    await user.keyboard('{Control>}z{/Control}p')

    expect(undo).not.toHaveBeenCalled()
    expect(togglePresentation).not.toHaveBeenCalled()
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('p')
  })

  it('stops listening when unmounted', async () => {
    const { undo, user, hook } = setup()
    hook.unmount()
    await user.keyboard('{Control>}z{/Control}')
    expect(undo).not.toHaveBeenCalled()
  })
})
