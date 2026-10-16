import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { createDefaultBoard } from './board/defaultBoard'
import { BOARD_STORAGE_KEY, autosaveBoard } from './board/storage'
import { getLocalStorage } from './storage'
import { getPlayer } from './test/board'

afterEach(() => {
  vi.restoreAllMocks()
})

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
    expect(strikerTransform()).toBe('translate(48.3 34)')
    expect(localStorage).toHaveLength(0)
  })

  it('starts at kick-off when the saved board is damaged', () => {
    localStorage.setItem(BOARD_STORAGE_KEY, '{"version":1,"teams":')
    render(<App />)
    expect(strikerTransform()).toBe('translate(48.3 34)')
  })

  it('works where browser storage is blocked', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Access denied', 'SecurityError')
    })
    render(<App />)
    expect(strikerTransform()).toBe('translate(48.3 34)')
  })
})
