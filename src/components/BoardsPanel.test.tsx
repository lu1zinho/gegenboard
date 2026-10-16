import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDefaultBoard } from '../board/defaultBoard'
import type { SavedBoard } from '../board/savedBoards'
import { SAVED_BOARDS_STORAGE_KEY, loadSavedBoards, storeSavedBoards } from '../board/storage'
import { getLocalStorage } from '../storage'
import { boardWithStrikerAt } from '../test/board'
import { BoardsPanel } from './BoardsPanel'

afterEach(() => {
  vi.restoreAllMocks()
})

const KICK_OFF: SavedBoard = { id: 'board-1', name: 'Kick-off', board: createDefaultBoard() }
const HIGH_PRESS: SavedBoard = { id: 'board-2', name: 'High press', board: boardWithStrikerAt(80) }

function renderPanel({ board = createDefaultBoard(), onLoad = vi.fn(), onClose = vi.fn() } = {}) {
  const user = userEvent.setup()
  render(<BoardsPanel board={board} onLoad={onLoad} onClose={onClose} />)
  const form = screen.getByRole('form', { name: 'Save board' })
  return {
    user,
    onLoad,
    onClose,
    name: within(form).getByRole('textbox', { name: 'Board name' }),
    save: within(form).getByRole('button', { name: 'Save board' }),
  }
}

function savedBoards() {
  return loadSavedBoards(getLocalStorage()).items
}

/** The names of the saved boards in the order listed, read from their Load buttons. */
function listedNames() {
  const list = screen.getByRole('list', { name: 'Saved boards' })
  return within(list)
    .getAllByRole('button', { name: /^Load / })
    .map((button) => button.getAttribute('aria-label')?.replace(/^Load /u, ''))
}

describe('BoardsPanel', () => {
  it('says there are no saved boards yet', () => {
    renderPanel()
    expect(screen.getByRole('complementary', { name: 'Boards' })).toBeInTheDocument()
    expect(screen.getByText('No saved boards yet.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Saved boards' })).not.toBeInTheDocument()
  })

  it('lists the boards saved before', () => {
    storeSavedBoards(getLocalStorage(), [KICK_OFF, HIGH_PRESS])
    renderPanel()
    expect(listedNames()).toEqual(['Kick-off', 'High press'])
    expect(screen.getByRole('status')).toHaveTextContent('')
  })

  it('saves the board on screen under a name', async () => {
    const board = boardWithStrikerAt(60)
    const { user, name, save } = renderPanel({ board })

    await user.type(name, '  Counter-attack ')
    await user.click(save)

    expect(screen.getByRole('status')).toHaveTextContent('Saved Counter-attack')
    expect(listedNames()).toEqual(['Counter-attack'])
    expect(savedBoards()).toEqual([{ id: 'board-1', name: 'Counter-attack', board }])
    expect(name).toHaveValue('')
  })

  it('saves on Enter', async () => {
    const { user, name } = renderPanel()
    await user.type(name, 'Kick-off{Enter}')
    expect(savedBoards().map((saved) => saved.name)).toEqual(['Kick-off'])
  })

  it('needs a name to save the board', async () => {
    const { user, name, save } = renderPanel()

    await user.type(name, '   ')
    await user.click(save)

    expect(screen.getByRole('alert')).toHaveTextContent('Give the board a name')
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(savedBoards()).toEqual([])
  })

  it('updates the board saved under the same name', async () => {
    storeSavedBoards(getLocalStorage(), [KICK_OFF, HIGH_PRESS])
    const board = boardWithStrikerAt(70)
    const { user, name, save } = renderPanel({ board })

    await user.type(name, 'high press')
    await user.click(save)

    expect(screen.getByRole('status')).toHaveTextContent('Updated high press')
    expect(listedNames()).toEqual(['Kick-off', 'high press'])
    expect(savedBoards()).toEqual([KICK_OFF, { id: 'board-2', name: 'high press', board }])
  })

  it('loads a saved board', async () => {
    storeSavedBoards(getLocalStorage(), [KICK_OFF, HIGH_PRESS])
    const { user, onLoad } = renderPanel()

    await user.click(screen.getByRole('button', { name: 'Load High press' }))

    expect(onLoad).toHaveBeenCalledExactlyOnceWith(HIGH_PRESS.board)
    expect(screen.getByRole('status')).toHaveTextContent('Loaded High press')
  })

  it('renames a saved board', async () => {
    storeSavedBoards(getLocalStorage(), [KICK_OFF, HIGH_PRESS])
    const { user } = renderPanel()
    const rename = screen.getByRole('button', { name: 'Rename Kick-off' })

    await user.click(rename)
    expect(rename).toHaveAttribute('aria-expanded', 'true')
    const form = screen.getByRole('form', { name: 'Rename Kick-off' })
    const newName = within(form).getByRole('textbox', { name: 'New name' })
    expect(newName).toHaveValue('Kick-off')
    expect(newName).toHaveFocus()

    await user.clear(newName)
    await user.type(newName, 'Shape at kick-off{Enter}')

    expect(screen.getByRole('status')).toHaveTextContent('Renamed Kick-off to Shape at kick-off')
    expect(listedNames()).toEqual(['Shape at kick-off', 'High press'])
    expect(savedBoards()).toEqual([{ ...KICK_OFF, name: 'Shape at kick-off' }, HIGH_PRESS])
    expect(screen.queryByRole('form', { name: /^Rename/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rename Shape at kick-off' })).toHaveFocus()
  })

  it("refuses to rename a board to another board's name", async () => {
    storeSavedBoards(getLocalStorage(), [KICK_OFF, HIGH_PRESS])
    const { user } = renderPanel()

    await user.click(screen.getByRole('button', { name: 'Rename Kick-off' }))
    const newName = screen.getByRole('textbox', { name: 'New name' })
    await user.clear(newName)
    await user.type(newName, 'HIGH PRESS')
    await user.click(screen.getByRole('button', { name: 'Save name' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'There is already a saved board called High press',
    )
    expect(savedBoards()).toEqual([KICK_OFF, HIGH_PRESS])
  })

  it('cancels renaming on Escape, keeping the key from closing the panel', async () => {
    storeSavedBoards(getLocalStorage(), [KICK_OFF])
    const { user } = renderPanel()
    const escapes: KeyboardEvent[] = []
    const recordEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') escapes.push(event)
    }
    window.addEventListener('keydown', recordEscape)

    await user.click(screen.getByRole('button', { name: 'Rename Kick-off' }))
    await user.type(screen.getByRole('textbox', { name: 'New name' }), ' 2{Escape}')
    window.removeEventListener('keydown', recordEscape)

    expect(screen.queryByRole('form', { name: 'Rename Kick-off' })).not.toBeInTheDocument()
    // Marked as handled, so the app's Escape shortcut leaves the panel open.
    expect(escapes.map((event) => event.defaultPrevented)).toEqual([true])
    expect(listedNames()).toEqual(['Kick-off'])
    expect(screen.getByRole('button', { name: 'Rename Kick-off' })).toHaveFocus()
  })

  it('deletes a saved board once confirmed', async () => {
    storeSavedBoards(getLocalStorage(), [KICK_OFF, HIGH_PRESS])
    const { user } = renderPanel()

    await user.click(screen.getByRole('button', { name: 'Delete Kick-off' }))
    const confirm = screen.getByRole('group', { name: 'Confirm deleting Kick-off' })
    expect(confirm).toHaveTextContent('Delete Kick-off? This can’t be undone.')
    expect(savedBoards()).toHaveLength(2)

    await user.click(within(confirm).getByRole('button', { name: 'Delete' }))

    expect(screen.getByRole('status')).toHaveTextContent('Deleted Kick-off')
    expect(listedNames()).toEqual(['High press'])
    expect(savedBoards()).toEqual([HIGH_PRESS])
  })

  it('keeps a board when deleting is not confirmed', async () => {
    storeSavedBoards(getLocalStorage(), [KICK_OFF])
    const { user } = renderPanel()

    await user.click(screen.getByRole('button', { name: 'Delete Kick-off' }))
    await user.click(screen.getByRole('button', { name: 'Keep it' }))

    expect(screen.queryByRole('group', { name: /^Confirm/ })).not.toBeInTheDocument()
    expect(savedBoards()).toEqual([KICK_OFF])
    expect(screen.getByRole('button', { name: 'Delete Kick-off' })).toHaveFocus()
  })

  it('reports saved boards that could not be read', () => {
    localStorage.setItem(SAVED_BOARDS_STORAGE_KEY, '{"version":1,"boards":[null]}')
    renderPanel()
    expect(screen.getByRole('status')).toHaveTextContent(
      "Skipped 1 saved board that couldn't be read",
    )
  })

  it('reports blocked storage, and still saves boards for this visit', async () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Access denied', 'SecurityError')
    })
    const { user, name, save } = renderPanel()
    expect(screen.getByRole('status')).toHaveTextContent("Browser storage isn't available")

    await user.type(name, 'Kick-off')
    await user.click(save)

    expect(screen.getByRole('status')).toHaveTextContent(
      "Couldn't save: browser storage is blocked or full",
    )
    expect(listedNames()).toEqual(['Kick-off'])
  })

  it('reports a failed save, e.g. full storage', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage is full', 'QuotaExceededError')
    })
    const { user, name, save } = renderPanel()

    await user.type(name, 'Kick-off')
    await user.click(save)

    expect(screen.getByRole('status')).toHaveTextContent(
      "Couldn't save: browser storage is blocked or full",
    )
  })

  it('closes on the Close button', async () => {
    const { user, onClose } = renderPanel()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
