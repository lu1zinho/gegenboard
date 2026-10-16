import { isRecord, type KeyValueStorage } from '../storage'
import type { Arrow, Board, PitchPosition, Player, Team } from './types'
import { validateBoard } from './validate'

/** The localStorage key for the board on screen, saved after every change. */
export const BOARD_STORAGE_KEY = 'gegenboard.board'

/**
 * The board schema version this build reads and writes. Every stored board carries it as
 * `Board.version`: bump both on breaking changes and migrate older boards in `readBoard`.
 */
export const BOARD_SCHEMA_VERSION: Board['version'] = 1

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
