import { describe, expect, it } from 'vitest'
import { getLocalStorage } from '../storage'
import { getPlayer } from '../test/board'
import { brokenStorage, fakeStorage } from '../test/storage'
import { createDefaultBoard } from './defaultBoard'
import type { SavedBoard } from './savedBoards'
import {
  BOARD_SCHEMA_VERSION,
  BOARD_STORAGE_KEY,
  SAVED_BOARDS_SCHEMA_VERSION,
  SAVED_BOARDS_STORAGE_KEY,
  SAVED_BOARDS_UNAVAILABLE,
  autosaveBoard,
  deserialiseBoard,
  deserialiseSavedBoards,
  loadAutosavedBoard,
  loadSavedBoards,
  readBoard,
  serialiseSavedBoards,
  storeSavedBoards,
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

describe('storing named boards', () => {
  const KICK_OFF: SavedBoard = { id: 'board-1', name: 'Kick-off', board: createDefaultBoard() }
  const CHANGED: SavedBoard = { id: 'board-2', name: 'Counter-attack', board: changedBoard() }
  const TWO_BOARDS = [KICK_OFF, CHANGED]

  it('loads the boards it stored', () => {
    const storage = fakeStorage()
    expect(storeSavedBoards(storage, TWO_BOARDS)).toBe(true)
    expect(loadSavedBoards(storage)).toEqual({ items: TWO_BOARDS, problem: null })
  })

  it('stores under its own key only, with the list and board schema versions', () => {
    const storage = fakeStorage({ [BOARD_STORAGE_KEY]: '{"version":1}' })
    storeSavedBoards(storage, TWO_BOARDS)

    expect(SAVED_BOARDS_STORAGE_KEY).toBe('gegenboard.savedBoards')
    expect([...storage.entries.keys()]).toEqual([BOARD_STORAGE_KEY, SAVED_BOARDS_STORAGE_KEY])
    expect(storage.entries.get(BOARD_STORAGE_KEY)).toBe('{"version":1}')
    const stored: unknown = JSON.parse(storage.entries.get(SAVED_BOARDS_STORAGE_KEY) ?? '')
    expect(stored).toEqual({ version: SAVED_BOARDS_SCHEMA_VERSION, boards: TWO_BOARDS })
    expect(stored).toHaveProperty('boards.0.board.version', BOARD_SCHEMA_VERSION)
    expect(stored).toHaveProperty('boards.1.board.version', BOARD_SCHEMA_VERSION)
  })

  it('replaces the boards stored before, and stores an empty list', () => {
    const storage = fakeStorage()
    storeSavedBoards(storage, TWO_BOARDS)
    storeSavedBoards(storage, [CHANGED])
    expect(loadSavedBoards(storage).items).toEqual([CHANGED])
    storeSavedBoards(storage, [])
    expect(loadSavedBoards(storage)).toEqual({ items: [], problem: null })
  })

  it("works with the browser's localStorage", () => {
    expect(storeSavedBoards(getLocalStorage(), TWO_BOARDS)).toBe(true)
    expect(localStorage.getItem(SAVED_BOARDS_STORAGE_KEY)).toBe(serialiseSavedBoards(TWO_BOARDS))
    expect(loadSavedBoards(getLocalStorage())).toEqual({ items: TWO_BOARDS, problem: null })
  })

  it('loads no boards, without a problem, when none were stored', () => {
    expect(loadSavedBoards(fakeStorage())).toEqual({ items: [], problem: null })
  })

  it('reports blocked storage instead of throwing', () => {
    expect(loadSavedBoards(brokenStorage())).toEqual({
      items: [],
      problem: SAVED_BOARDS_UNAVAILABLE,
    })
    expect(loadSavedBoards(null)).toEqual({ items: [], problem: SAVED_BOARDS_UNAVAILABLE })
  })

  it('reports a failed store, e.g. full storage, instead of throwing', () => {
    expect(storeSavedBoards(brokenStorage(), TWO_BOARDS)).toBe(false)
    expect(storeSavedBoards(null, TWO_BOARDS)).toBe(false)
  })
})

describe('deserialiseSavedBoards', () => {
  const KICK_OFF: SavedBoard = { id: 'board-1', name: 'Kick-off', board: createDefaultBoard() }
  const stored = (boards: unknown[], version: unknown = SAVED_BOARDS_SCHEMA_VERSION) =>
    JSON.stringify({ version, boards })

  it('reads what serialiseSavedBoards wrote', () => {
    expect(deserialiseSavedBoards(serialiseSavedBoards([KICK_OFF]))).toEqual({
      items: [KICK_OFF],
      problem: null,
    })
  })

  it('reports data that is not JSON', () => {
    expect(deserialiseSavedBoards('{"version":1,')).toEqual({
      items: [],
      problem: "Saved boards are damaged and couldn't be read",
    })
  })

  it.each([['[]'], ['null'], ['"boards"'], ['{"boards":[]}'], ['{"version":1}']])(
    'reports data in an unknown format: %s',
    (json) => {
      expect(deserialiseSavedBoards(json)).toEqual({
        items: [],
        problem: "Saved boards are in an unknown format and couldn't be read",
      })
    },
  )

  it('reports a list from a newer schema version without reading it', () => {
    expect(deserialiseSavedBoards(stored([KICK_OFF], 2))).toEqual({
      items: [],
      problem: "Saved boards use format version 2, which this version of Gegenboard can't read",
    })
  })

  it('skips boards that cannot be read and keeps the rest', () => {
    const json = stored([
      KICK_OFF,
      { ...KICK_OFF, id: 'board-2', name: 'Newer', board: { ...KICK_OFF.board, version: 2 } },
      { ...KICK_OFF, id: 'board-3', name: 'Broken', board: { version: 1 } },
      { ...KICK_OFF, id: 'board-4', name: 42 },
      { ...KICK_OFF, id: 'board-5', name: '   ' },
      { ...KICK_OFF, id: '', name: 'No id' },
      { id: 'board-7', name: 'No board' },
      'board-8',
    ])
    expect(deserialiseSavedBoards(json)).toEqual({
      items: [KICK_OFF],
      problem: "Skipped 7 saved boards that couldn't be read",
    })
  })

  it('keeps only the first of boards sharing an id or a name', () => {
    const json = stored([
      KICK_OFF,
      { ...KICK_OFF, name: 'Same id' },
      { ...KICK_OFF, id: 'board-3', name: 'KICK-OFF' },
    ])
    expect(deserialiseSavedBoards(json)).toEqual({
      items: [KICK_OFF],
      problem: "Skipped 2 saved boards that couldn't be read",
    })
  })

  it('tidies names and drops properties the model does not have', () => {
    const json = stored([{ ...KICK_OFF, name: ' Kick-off ', thumbnail: 'pitch.png' }])
    expect(deserialiseSavedBoards(json)).toEqual({ items: [KICK_OFF], problem: null })
  })

  it('says when a single board was skipped', () => {
    expect(deserialiseSavedBoards(stored([KICK_OFF, null])).problem).toBe(
      "Skipped 1 saved board that couldn't be read",
    )
  })
})
