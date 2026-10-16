import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { createDefaultBoard } from './board/defaultBoard'
import type { SavedBoard } from './board/savedBoards'
import {
  BOARD_STORAGE_KEY,
  autosaveBoard,
  loadAutosavedBoard,
  storeSavedBoards,
} from './board/storage'
import { getLocalStorage } from './storage'
import { boardWithStrikerAt, getPlayer } from './test/board'

afterEach(() => {
  vi.restoreAllMocks()
})

const HIGH_PRESS: SavedBoard = { id: 'board-1', name: 'High press', board: boardWithStrikerAt(80) }
const LOW_BLOCK: SavedBoard = { id: 'board-2', name: 'Low block', board: boardWithStrikerAt(30) }

// Where the home number 9 is drawn for each board above and for kick-off.
const AT_KICK_OFF = 'translate(48.3 34)'
const HIGH = 'translate(84 34)'
const LOW = 'translate(31.5 34)'

/** Renders the app with the saved boards listed and the Boards panel open. */
async function renderWithSavedBoards() {
  storeSavedBoards(getLocalStorage(), [HIGH_PRESS, LOW_BLOCK])
  const user = userEvent.setup()
  const view = render(<App />)
  await user.click(screen.getByRole('button', { name: 'Boards' }))
  const load = async (saved: SavedBoard) => {
    await user.click(screen.getByRole('button', { name: `Load ${saved.name}` }))
  }
  return { user, load, view }
}

/** Where the home number 9 is drawn, in metres from the top-left corner of the pitch. */
function strikerTransform() {
  return screen.getByRole('listitem', { name: '9 Okafor' }).getAttribute('transform')
}

describe('App', () => {
  it('has the app title as its heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Gegenboard' })).toBeInTheDocument()
  })

  it('shows the default board', () => {
    render(<App />)
    expect(screen.getByRole('group', { name: 'Tactics board' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Home players' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Away players' })).toBeInTheDocument()
  })

  it('opens and closes the rosters panel', async () => {
    const user = userEvent.setup()
    render(<App />)
    const toggle = screen.getByRole('button', { name: 'Rosters' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('complementary', { name: 'Rosters' })).not.toBeInTheDocument()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('complementary', { name: 'Rosters' })).toBeInTheDocument()

    await user.click(toggle)
    expect(screen.queryByRole('complementary', { name: 'Rosters' })).not.toBeInTheDocument()
  })

  it('returns focus to the Rosters button when the panel is closed', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Rosters' }))
    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('complementary', { name: 'Rosters' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rosters' })).toHaveFocus()
  })

  it('keeps what was typed in the rosters panel while it is closed', async () => {
    const user = userEvent.setup()
    render(<App />)
    const toggle = screen.getByRole('button', { name: 'Rosters' })

    await user.click(toggle)
    await user.type(screen.getByRole('textbox', { name: 'Team name' }), 'Gegenpress FC')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('complementary', { name: 'Rosters' })).not.toBeInTheDocument()

    await user.click(toggle)
    expect(screen.getByRole('textbox', { name: 'Team name' })).toHaveValue('Gegenpress FC')
  })

  it('shows an empty bench on each side of the pitch', () => {
    render(<App />)
    expect(screen.getByRole('complementary', { name: 'Home bench' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Away bench' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Home substitutes' })).toBeEmptyDOMElement()
  })

  describe('presentation mode', () => {
    it('hides the controls on P and brings them back on the next P', async () => {
      const user = userEvent.setup()
      render(<App />)
      const toggle = screen.getByRole('button', { name: 'Rosters' })
      expect(toggle).toBeVisible()

      await user.keyboard('p')
      expect(toggle).not.toBeVisible()
      expect(screen.queryByRole('combobox', { name: 'Home formation' })).not.toBeInTheDocument()
      expect(screen.getByRole('group', { name: 'Tactics board' })).toBeVisible()
      expect(screen.getByRole('complementary', { name: 'Home bench' })).toBeVisible()

      await user.keyboard('P')
      expect(toggle).toBeVisible()
    })

    it('ignores P typed into a field', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.click(screen.getByRole('button', { name: 'Rosters' }))
      await user.type(screen.getByRole('textbox', { name: 'Team name' }), 'Spurs')

      expect(screen.getByRole('textbox', { name: 'Team name' })).toHaveValue('Spurs')
      expect(screen.getByRole('button', { name: 'Rosters' })).toBeVisible()
    })
  })

  describe('transparent background', () => {
    afterEach(() => {
      window.history.replaceState(null, '', '/')
    })

    it('is opaque by default', () => {
      render(<App />)
      expect(document.documentElement).not.toHaveAttribute('data-bg')
    })

    it('is requested with ?bg=transparent', () => {
      window.history.replaceState(null, '', '/?bg=transparent')
      const { unmount } = render(<App />)
      expect(document.documentElement).toHaveAttribute('data-bg', 'transparent')
      unmount()
      expect(document.documentElement).not.toHaveAttribute('data-bg')
    })
  })
})

describe('App board', () => {
  it('restores the board saved when the page was last open', () => {
    const board = createDefaultBoard()
    getPlayer(board, 'home', 9).position = { x: 20, y: 25 }
    board.teams.away.name = 'Gegenpress FC'
    autosaveBoard(getLocalStorage(), board)

    render(<App />)
    expect(strikerTransform()).toBe('translate(21 17)')
    expect(screen.getByRole('list', { name: 'Gegenpress FC players' })).toBeInTheDocument()
  })

  it('starts at kick-off, without saving anything, when no board was saved', () => {
    render(<App />)
    expect(strikerTransform()).toBe(AT_KICK_OFF)
    expect(localStorage).toHaveLength(0)
  })

  it('starts at kick-off when the saved board is damaged', () => {
    localStorage.setItem(BOARD_STORAGE_KEY, '{"version":1,"teams":')
    render(<App />)
    expect(strikerTransform()).toBe(AT_KICK_OFF)
  })

  it('works where browser storage is blocked', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Access denied', 'SecurityError')
    })
    render(<App />)
    expect(strikerTransform()).toBe(AT_KICK_OFF)
  })
})

describe('App panels', () => {
  it('opens and closes the boards panel', async () => {
    const user = userEvent.setup()
    render(<App />)
    const toggle = screen.getByRole('button', { name: 'Boards' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('complementary', { name: 'Boards' })).not.toBeInTheDocument()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('complementary', { name: 'Boards' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('complementary', { name: 'Boards' })).not.toBeInTheDocument()
    expect(toggle).toHaveFocus()
  })

  it('opens one panel at a time', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Rosters' }))
    await user.click(screen.getByRole('button', { name: 'Boards' }))
    expect(screen.getByRole('complementary', { name: 'Boards' })).toBeInTheDocument()
    expect(screen.queryByRole('complementary', { name: 'Rosters' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Rosters' }))
    expect(screen.getByRole('complementary', { name: 'Rosters' })).toBeInTheDocument()
    expect(screen.queryByRole('complementary', { name: 'Boards' })).not.toBeInTheDocument()
  })
})

describe('App saved boards and undo', () => {
  it('loads a saved board onto the pitch', async () => {
    const { load } = await renderWithSavedBoards()
    await load(HIGH_PRESS)
    expect(strikerTransform()).toBe(HIGH)
  })

  it('saves the board on screen under a name', async () => {
    const { user, load } = await renderWithSavedBoards()
    await load(LOW_BLOCK)

    const form = screen.getByRole('form', { name: 'Save board' })
    await user.type(within(form).getByRole('textbox', { name: 'Board name' }), 'Deep{Enter}')
    await user.click(screen.getByRole('button', { name: 'Load High press' }))
    await user.click(screen.getByRole('button', { name: 'Load Deep' }))

    expect(strikerTransform()).toBe(LOW)
  })

  it('undoes on Ctrl+Z and redoes on Ctrl+Shift+Z and Ctrl+Y', async () => {
    const { user, load } = await renderWithSavedBoards()
    await load(HIGH_PRESS)
    await load(LOW_BLOCK)

    await user.keyboard('{Control>}z{/Control}')
    expect(strikerTransform()).toBe(HIGH)
    await user.keyboard('{Control>}z{/Control}')
    expect(strikerTransform()).toBe(AT_KICK_OFF)
    await user.keyboard('{Control>}z{/Control}')
    expect(strikerTransform()).toBe(AT_KICK_OFF)

    await user.keyboard('{Control>}{Shift>}Z{/Shift}{/Control}')
    expect(strikerTransform()).toBe(HIGH)
    await user.keyboard('{Control>}y{/Control}')
    expect(strikerTransform()).toBe(LOW)
    await user.keyboard('{Control>}y{/Control}')
    expect(strikerTransform()).toBe(LOW)
  })

  it('can no longer redo after a new change', async () => {
    const { user, load } = await renderWithSavedBoards()
    await load(HIGH_PRESS)
    await user.keyboard('{Control>}z{/Control}')
    expect(strikerTransform()).toBe(AT_KICK_OFF)

    await load(LOW_BLOCK)
    await user.keyboard('{Control>}y{/Control}')
    expect(strikerTransform()).toBe(LOW)

    // The undone load of High press is gone: undo goes straight back to kick-off.
    await user.keyboard('{Control>}z{/Control}')
    expect(strikerTransform()).toBe(AT_KICK_OFF)
    await user.keyboard('{Control>}z{/Control}')
    expect(strikerTransform()).toBe(AT_KICK_OFF)
  })

  it('leaves Ctrl+Z to a text field while typing in it', async () => {
    const { user, load } = await renderWithSavedBoards()
    await load(HIGH_PRESS)

    const name = screen.getByRole('textbox', { name: 'Board name' })
    await user.type(name, 'Press')
    await user.keyboard('{Control>}z{/Control}')

    expect(strikerTransform()).toBe(HIGH)
  })

  it('autosaves every change, including undo and redo', async () => {
    const { user, load } = await renderWithSavedBoards()
    const autosaved = () => loadAutosavedBoard(getLocalStorage())

    await load(HIGH_PRESS)
    expect(autosaved()).toEqual(HIGH_PRESS.board)
    await user.keyboard('{Control>}z{/Control}')
    expect(autosaved()).toEqual(createDefaultBoard())
    await user.keyboard('{Control>}y{/Control}')
    expect(autosaved()).toEqual(HIGH_PRESS.board)
  })

  it('restores the changed board when the page is opened again', async () => {
    const { load, view } = await renderWithSavedBoards()
    await load(LOW_BLOCK)
    view.unmount()

    render(<App />)
    expect(strikerTransform()).toBe(LOW)
  })
})

describe('formations', () => {
  it('moves a team to the chosen formation and keeps its players', async () => {
    const user = userEvent.setup()
    render(<App />)
    const homePlayers = screen.getByRole('list', { name: 'Home players' })
    const before = within(homePlayers)
      .getAllByRole('listitem')
      .map((item) => item.getAttribute('transform'))

    await user.selectOptions(screen.getByRole('combobox', { name: 'Home formation' }), '4-2-3-1')

    const after = within(homePlayers).getAllByRole('listitem')
    expect(after.map((item) => item.getAttribute('transform'))).not.toEqual(before)
    expect(after.map((item) => item.getAttribute('aria-label'))).toContain('9 Okafor')
    expect(screen.getByRole('combobox', { name: 'Home formation' })).toHaveValue('4-2-3-1')
    expect(screen.getByRole('combobox', { name: 'Away formation' })).toHaveValue('4-4-2')
  })
})

describe('formations and undo', () => {
  function picker(side: 'Home' | 'Away') {
    return screen.getByRole('combobox', { name: `${side} formation` })
  }

  it('undoes and redoes a formation change, and the picker follows', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.selectOptions(picker('Home'), '3-5-2')
    expect(picker('Home')).toHaveValue('3-5-2')
    const in352 = strikerTransform()
    expect(in352).not.toBe(AT_KICK_OFF)

    await user.keyboard('{Control>}z{/Control}')
    expect(picker('Home')).toHaveValue('4-3-3')
    expect(strikerTransform()).toBe(AT_KICK_OFF)

    await user.keyboard('{Control>}y{/Control}')
    expect(picker('Home')).toHaveValue('3-5-2')
    expect(strikerTransform()).toBe(in352)
  })

  it('autosaves a formation change and restores it with the picker', async () => {
    const user = userEvent.setup()
    const view = render(<App />)
    await user.selectOptions(picker('Away'), '4-2-3-1')
    view.unmount()

    render(<App />)
    expect(picker('Away')).toHaveValue('4-2-3-1')
    expect(picker('Home')).toHaveValue('4-3-3')
  })

  it('still undoes in presentation mode, with the controls hidden', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.selectOptions(picker('Home'), '3-5-2')
    // Leave the picker, where P is ignored, then present.
    await user.click(screen.getByRole('group', { name: 'Tactics board' }))
    await user.keyboard('p')
    expect(screen.queryByRole('combobox', { name: 'Home formation' })).not.toBeInTheDocument()

    await user.keyboard('{Control>}z{/Control}')
    expect(strikerTransform()).toBe(AT_KICK_OFF)
  })

  it('shows Custom for a team that is in no formation', async () => {
    const { load } = await renderWithSavedBoards()
    await load(HIGH_PRESS)

    expect(picker('Home')).toHaveValue('')
    expect(within(picker('Home')).getByRole('option', { selected: true })).toHaveTextContent(
      'Custom',
    )
    expect(picker('Away')).toHaveValue('4-4-2')
    expect(within(picker('Away')).queryByRole('option', { name: 'Custom' })).toBeNull()
  })
})
