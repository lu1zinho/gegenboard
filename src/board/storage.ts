import { isRecord, type KeyValueStorage } from '../storage'
import { findSavedBoard, tidyBoardName, type SavedBoard } from './savedBoards'
import type { Arrow, Board, PitchPosition, Player, Team } from './types'
import { validateBoard } from './validate'

/** The localStorage key for the board on screen, saved after every change. */
export const BOARD_STORAGE_KEY = 'gegenboard.board'

/** The localStorage key for the list of named boards. */
export const SAVED_BOARDS_STORAGE_KEY = 'gegenboard.savedBoards'

/**
 * The board schema version this build reads and writes. Every stored board carries it as
 * `Board.version`: bump both on breaking changes and migrate older boards in `readBoard`.
 */
export const BOARD_SCHEMA_VERSION: Board['version'] = 1

/**
 * Version of the format the list of named boards is stored in, apart from the version each
 * board carries. Bump it on breaking changes and migrate older lists on load.
 */
export const SAVED_BOARDS_SCHEMA_VERSION = 1

export interface StoredSavedBoards {
  version: typeof SAVED_BOARDS_SCHEMA_VERSION
  boards: SavedBoard[]
}

export interface LoadedSavedBoards {
  boards: SavedBoard[]
  /** Why some or all saved boards couldn't be loaded, or `null` if nothing went wrong. */
  problem: string | null
}

export const SAVED_BOARDS_UNAVAILABLE =
  "Browser storage isn't available, so saved boards won't be kept after you close the page"

/**
 * A valid board rebuilt from stored data, without unknown properties, or `null` if the data
 * isn't a board of this schema version or breaks the board rules. Never throws.
 */
export function readBoard(value: unknown): Board | null {
  // Boards of older versions would be converted to the current version here.
  if (!isRecord(value) || value.version !== BOARD_SCHEMA_VERSION) return null
  const { teams, ball } = value
  if (!isRecord(teams) || !isRecord(ball)) return null

  const home = readTeam(teams.home)
  const away = readTeam(teams.away)
  const ballPosition = readPosition(ball.position)
  const arrows = readList(value.arrows, readArrow)
  if (!home || !away || !ballPosition || !arrows) return null

  const board: Board = {
    version: BOARD_SCHEMA_VERSION,
    teams: { home, away },
    ball: { position: ballPosition },
    arrows,
  }
  return validateBoard(board).length === 0 ? board : null
}

/** Reads a board saved as JSON. Never throws: returns `null` for anything but a valid board. */
export function deserialiseBoard(json: string | null): Board | null {
  if (json === null) return null
  try {
    return readBoard(JSON.parse(json))
  } catch {
    return null
  }
}

/**
 * The board saved by `autosaveBoard`, or `null` if there is none, it can't be read or storage
 * is blocked. Never throws.
 */
export function loadAutosavedBoard(storage: KeyValueStorage | null): Board | null {
  if (!storage) return null
  let json: string | null
  try {
    json = storage.getItem(BOARD_STORAGE_KEY)
  } catch {
    return null
  }
  return deserialiseBoard(json)
}

/**
 * Saves the board on screen so it can be restored after a reload. Never throws: returns
 * `false` if it couldn't be saved, e.g. because storage is blocked or full.
 */
export function autosaveBoard(storage: KeyValueStorage | null, board: Board): boolean {
  if (!storage) return false
  try {
    storage.setItem(BOARD_STORAGE_KEY, JSON.stringify(board))
    return true
  } catch {
    return false
  }
}

export function serialiseSavedBoards(boards: readonly SavedBoard[]): string {
  const stored: StoredSavedBoards = { version: SAVED_BOARDS_SCHEMA_VERSION, boards: [...boards] }
  return JSON.stringify(stored)
}

/**
 * Reads named boards saved by `serialiseSavedBoards`. Never throws: saved boards that can't be
 * read are skipped and the reason is returned as `problem`.
 */
export function deserialiseSavedBoards(json: string | null): LoadedSavedBoards {
  if (json === null) return { boards: [], problem: null }

  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return { boards: [], problem: "Saved boards are damaged and couldn't be read" }
  }
  if (!isRecord(data) || typeof data.version !== 'number') {
    return { boards: [], problem: "Saved boards are in an unknown format and couldn't be read" }
  }
  if (data.version !== SAVED_BOARDS_SCHEMA_VERSION) {
    return {
      boards: [],
      problem: `Saved boards use format version ${data.version}, which this version of Gegenboard can't read`,
    }
  }
  if (!Array.isArray(data.boards)) {
    return { boards: [], problem: "Saved boards are in an unknown format and couldn't be read" }
  }

  const stored: unknown[] = data.boards
  const boards: SavedBoard[] = []
  for (const value of stored) {
    const saved = readSavedBoard(value)
    // Ids and names must stay unique, so only the first of boards sharing either is kept.
    if (!saved || boards.some((other) => other.id === saved.id)) continue
    if (!findSavedBoard(boards, saved.name)) boards.push(saved)
  }
  const skipped = stored.length - boards.length
  return {
    boards,
    problem:
      skipped === 0
        ? null
        : `Skipped ${skipped} saved ${skipped === 1 ? 'board' : 'boards'} that couldn't be read`,
  }
}

/** Loads the named boards. Never throws, even where storage is blocked. */
export function loadSavedBoards(storage: KeyValueStorage | null): LoadedSavedBoards {
  if (!storage) return { boards: [], problem: SAVED_BOARDS_UNAVAILABLE }
  let json: string | null
  try {
    json = storage.getItem(SAVED_BOARDS_STORAGE_KEY)
  } catch {
    return { boards: [], problem: SAVED_BOARDS_UNAVAILABLE }
  }
  return deserialiseSavedBoards(json)
}

/**
 * Stores the named boards, replacing those stored before. Never throws: returns `false` if
 * they couldn't be stored, e.g. because storage is blocked or full.
 */
export function storeSavedBoards(
  storage: KeyValueStorage | null,
  boards: readonly SavedBoard[],
): boolean {
  if (!storage) return false
  try {
    storage.setItem(SAVED_BOARDS_STORAGE_KEY, serialiseSavedBoards(boards))
    return true
  } catch {
    return false
  }
}

/** A saved board rebuilt from stored data, or `null` if it or its board can't be read. */
function readSavedBoard(value: unknown): SavedBoard | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') {
    return null
  }
  const name = tidyBoardName(value.name)
  const board = readBoard(value.board)
  if (value.id === '' || name === '' || !board) return null
  return { id: value.id, name, board }
}

/** Every item read by `readItem`, or `null` if the value isn't a list or any item is invalid. */
function readList<T>(value: unknown, readItem: (item: unknown) => T | null): T[] | null {
  if (!Array.isArray(value)) return null
  const stored: unknown[] = value
  const items: T[] = []
  for (const item of stored) {
    const read = readItem(item)
    if (read === null) return null
    items.push(read)
  }
  return items
}

function readPosition(value: unknown): PitchPosition | null {
  if (!isRecord(value) || typeof value.x !== 'number' || typeof value.y !== 'number') return null
  return { x: value.x, y: value.y }
}

function readTeam(value: unknown): Team | null {
  if (!isRecord(value) || typeof value.name !== 'string' || !isRecord(value.colours)) return null
  const { primary, secondary } = value.colours
  if (typeof primary !== 'string' || typeof secondary !== 'string') return null
  const players = readList(value.players, readPlayer)
  if (!players) return null
  return { name: value.name, colours: { primary, secondary }, players }
}

function readPlayer(value: unknown): Player | null {
  if (!isRecord(value)) return null
  const { id, number, name } = value
  const position = readPosition(value.position)
  if (typeof id !== 'string' || typeof number !== 'number' || typeof name !== 'string') return null
  if (!position) return null
  return { id, number, name, position }
}

function readArrow(value: unknown): Arrow | null {
  if (!isRecord(value)) return null
  const { id, colour, style } = value
  const from = readPosition(value.from)
  const to = readPosition(value.to)
  if (typeof id !== 'string' || typeof colour !== 'string') return null
  if (style !== 'solid' && style !== 'dashed') return null
  if (!from || !to) return null
  return { id, from, to, colour, style }
}
