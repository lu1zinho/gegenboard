import { describe, expect, it } from 'vitest'
import { getLocalStorage } from '../storage'
import { getPlayer } from '../test/board'
import { brokenStorage, fakeStorage } from '../test/storage'
import { createDefaultBoard } from './defaultBoard'
import {
  BOARD_SCHEMA_VERSION,
  BOARD_STORAGE_KEY,
  autosaveBoard,
  deserialiseBoard,
  loadAutosavedBoard,
  readBoard,
} from './storage'
import type { Arrow, Board } from './types'

/** A board that differs from the default one in every part: players, ball and arrows. */
function changedBoard(): Board {
  const board = createDefaultBoard()
  getPlayer(board, 'home', 9).position = { x: 70, y: 40 }
  board.teams.away.name = 'Gegenpress FC'
  board.ball.position = { x: 72, y: 41 }
  board.arrows = [
    { id: 'run', from: { x: 46, y: 50 }, to: { x: 70, y: 40 }, colour: '#ffeb3b', style: 'dashed' },
  ]
  return board
}

describe('autosaving the board', () => {
  it('restores the board it saved', () => {
    const storage = fakeStorage()
    expect(autosaveBoard(storage, changedBoard())).toBe(true)
    expect(loadAutosavedBoard(storage)).toEqual(changedBoard())
  })

  it('saves under its own key only, with the schema version', () => {
    const storage = fakeStorage({ 'gegenboard.rosters': '{"version":1,"rosters":[]}' })
    autosaveBoard(storage, changedBoard())

    expect(BOARD_STORAGE_KEY).toBe('gegenboard.board')
    expect([...storage.entries.keys()]).toEqual(['gegenboard.rosters', 'gegenboard.board'])
    expect(storage.entries.get('gegenboard.rosters')).toBe('{"version":1,"rosters":[]}')
    const stored: unknown = JSON.parse(storage.entries.get(BOARD_STORAGE_KEY) ?? '')
    expect(stored).toEqual(changedBoard())
    expect(stored).toHaveProperty('version', BOARD_SCHEMA_VERSION)
  })

  it('replaces the board saved before', () => {
    const storage = fakeStorage()
    autosaveBoard(storage, changedBoard())
    autosaveBoard(storage, createDefaultBoard())
    expect(loadAutosavedBoard(storage)).toEqual(createDefaultBoard())
  })

  it("works with the browser's localStorage", () => {
    expect(autosaveBoard(getLocalStorage(), changedBoard())).toBe(true)
    expect(localStorage.getItem(BOARD_STORAGE_KEY)).toBe(JSON.stringify(changedBoard()))
    expect(loadAutosavedBoard(getLocalStorage())).toEqual(changedBoard())
  })

  it('restores nothing when nothing was saved', () => {
    expect(loadAutosavedBoard(fakeStorage())).toBeNull()
  })

  it('restores nothing, without throwing, where storage is blocked', () => {
    expect(loadAutosavedBoard(brokenStorage())).toBeNull()
    expect(loadAutosavedBoard(null)).toBeNull()
  })

  it('reports a failed save, e.g. full storage, instead of throwing', () => {
    expect(autosaveBoard(brokenStorage(), changedBoard())).toBe(false)
    expect(autosaveBoard(null, changedBoard())).toBe(false)
  })

  it('restores nothing from a damaged save', () => {
    const storage = fakeStorage({ [BOARD_STORAGE_KEY]: '{"version":1,"teams":' })
    expect(loadAutosavedBoard(storage)).toBeNull()
  })
})

describe('deserialiseBoard', () => {
  it('reads a board saved as JSON', () => {
    expect(deserialiseBoard(JSON.stringify(changedBoard()))).toEqual(changedBoard())
  })

  it.each([[null], [''], ['{'], ['null'], ['[]'], ['"board"']])('returns null for %j', (json) => {
    expect(deserialiseBoard(json)).toBeNull()
  })
})

describe('readBoard', () => {
  /** Stored data: a copy of a valid board, changed by `edit`. */
  function stored(edit: (board: Board) => void = () => {}): unknown {
    const board = structuredClone(changedBoard())
    edit(board)
    return board
  }

  function firstArrow(board: Board): Arrow {
    const [arrow] = board.arrows
    if (!arrow) throw new Error('The board has no arrows')
    return arrow
  }

  it('reads a valid board', () => {
    expect(readBoard(stored())).toEqual(changedBoard())
  })

  it('returns a new board, not the stored data', () => {
    const data = stored()
    expect(readBoard(data)).not.toBe(data)
  })

  it('drops properties the model does not have', () => {
    const data = stored((board) => {
      Object.assign(board, { notes: 'High press' })
      Object.assign(board.teams.home, { formation: '4-3-3' })
      Object.assign(getPlayer(board, 'home', 9), { captain: true })
      Object.assign(board.ball.position, { z: 2 })
      Object.assign(firstArrow(board), { label: 'Run' })
    })
    expect(readBoard(data)).toEqual(changedBoard())
  })

  it.each([
    ['a missing version', { version: undefined }],
    ['an older version', { version: 0 }],
    ['a newer version', { version: 2 }],
    ['a version written as text', { version: '1' }],
  ])('rejects a board with %s', (_, changes) => {
    expect(readBoard(stored((board) => Object.assign(board, changes)))).toBeNull()
  })

  it.each([[null], [[]], ['board'], [1]])('rejects %j', (value) => {
    expect(readBoard(value)).toBeNull()
  })

  it.each<[string, (board: Board) => void]>([
    ['a missing team', (board) => Object.assign(board.teams, { away: undefined })],
    ['a team without colours', (board) => Object.assign(board.teams.home, { colours: '#ff0000' })],
    ['a missing player list', (board) => Object.assign(board.teams.home, { players: null })],
    ['a player that is not an object', (board) => Object.assign(board.teams.home.players, ['x'])],
    [
      'a shirt number written as text',
      (board) => Object.assign(getPlayer(board, 'home', 9), { number: '9' }),
    ],
    [
      'a player without a position',
      (board) => Object.assign(getPlayer(board, 'home', 9), { position: [] }),
    ],
    ['a missing ball', (board) => Object.assign(board, { ball: null })],
    ['a missing arrow list', (board) => Object.assign(board, { arrows: {} })],
    ['an unknown arrow style', (board) => Object.assign(firstArrow(board), { style: 'wavy' })],
    ['an arrow without an end', (board) => Object.assign(firstArrow(board), { to: null })],
  ])('rejects a board with %s', (_, edit) => {
    expect(readBoard(stored(edit))).toBeNull()
  })

  it.each<[string, (board: Board) => void]>([
    ['10 players in a team', (board) => board.teams.away.players.pop()],
    ['a player off the pitch', (board) => (getPlayer(board, 'home', 9).position.x = 120)],
    ['the ball off the pitch', (board) => (board.ball.position.y = -1)],
    ['a colour that is not #rrggbb', (board) => (board.teams.home.colours.primary = 'red')],
    ['two players sharing a shirt number', (board) => (getPlayer(board, 'home', 9).number = 10)],
  ])('rejects a board that breaks the board rules: %s', (_, edit) => {
    expect(readBoard(stored(edit))).toBeNull()
  })
})
