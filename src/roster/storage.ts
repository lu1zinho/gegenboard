import { isRecord, type KeyValueStorage } from '../storage'
import { validateRoster } from './roster'
import type { Roster, RosterPlayer } from './types'

/** The localStorage key for saved rosters, kept apart from anything else Gegenboard saves. */
export const ROSTERS_STORAGE_KEY = 'gegenboard.rosters'

/** Version of the stored format. Bump it on breaking changes and migrate older data on load. */
export const ROSTERS_SCHEMA_VERSION = 1

export interface StoredRosters {
  version: typeof ROSTERS_SCHEMA_VERSION
  rosters: Roster[]
}

export type RosterStorage = KeyValueStorage

export interface LoadedRosters {
  rosters: Roster[]
  /** Why some or all saved rosters couldn't be loaded, or `null` if nothing went wrong. */
  problem: string | null
}

export const STORAGE_UNAVAILABLE =
  "Browser storage isn't available, so rosters won't be kept after you close the page"

export function serialiseRosters(rosters: readonly Roster[]): string {
  const stored: StoredRosters = { version: ROSTERS_SCHEMA_VERSION, rosters: [...rosters] }
  return JSON.stringify(stored)
}

/**
 * Reads rosters saved by `serialiseRosters`. Stored data can be damaged, edited by hand or
 * written by another version of Gegenboard, so this never throws: rosters that don't match
 * the model are skipped and the reason is returned as `problem`.
 */
export function deserialiseRosters(json: string | null): LoadedRosters {
  if (json === null) return { rosters: [], problem: null }

  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return { rosters: [], problem: "Saved rosters are damaged and couldn't be read" }
  }
  if (!isRecord(data) || typeof data.version !== 'number') {
    return { rosters: [], problem: "Saved rosters are in an unknown format and couldn't be read" }
  }
  if (data.version !== ROSTERS_SCHEMA_VERSION) {
    return {
      rosters: [],
      problem: `Saved rosters use format version ${data.version}, which this version of Gegenboard can't read`,
    }
  }
  if (!Array.isArray(data.rosters)) {
    return { rosters: [], problem: "Saved rosters are in an unknown format and couldn't be read" }
  }

  const stored: unknown[] = data.rosters
  const rosters: Roster[] = []
  for (const value of stored) {
    const roster = readRoster(value)
    if (roster && !rosters.some((r) => r.id === roster.id)) rosters.push(roster)
  }
  const skipped = stored.length - rosters.length
  const noun = skipped === 1 ? 'roster' : 'rosters'
  return {
    rosters,
    problem: skipped === 0 ? null : `Skipped ${skipped} saved ${noun} that couldn't be read`,
  }
}

/** Loads saved rosters. Never throws, even where storage is blocked. */
export function loadRosters(storage: RosterStorage | null): LoadedRosters {
  if (!storage) return { rosters: [], problem: STORAGE_UNAVAILABLE }
  let json: string | null
  try {
    json = storage.getItem(ROSTERS_STORAGE_KEY)
  } catch {
    return { rosters: [], problem: STORAGE_UNAVAILABLE }
  }
  return deserialiseRosters(json)
}

/**
 * Saves rosters, replacing those saved before. Never throws: returns `false` if they couldn't
 * be saved, e.g. because storage is blocked or full.
 */
export function saveRosters(storage: RosterStorage | null, rosters: readonly Roster[]): boolean {
  if (!storage) return false
  try {
    storage.setItem(ROSTERS_STORAGE_KEY, serialiseRosters(rosters))
    return true
  } catch {
    return false
  }
}

/** A valid roster rebuilt from stored data, without unknown properties, or `null`. */
function readRoster(value: unknown): Roster | null {
  if (!isRecord(value) || !isRecord(value.colours) || !Array.isArray(value.players)) return null
  const { id, name, colours } = value
  const { primary, secondary } = colours
  if (typeof id !== 'string' || typeof name !== 'string') return null
  if (typeof primary !== 'string' || typeof secondary !== 'string') return null

  const players: RosterPlayer[] = []
  const storedPlayers: unknown[] = value.players
  for (const player of storedPlayers) {
    if (!isRecord(player)) return null
    if (typeof player.id !== 'string' || typeof player.number !== 'number') return null
    if (typeof player.name !== 'string') return null
    players.push({ id: player.id, number: player.number, name: player.name })
  }

  const roster: Roster = { id, name, colours: { primary, secondary }, players }
  return validateRoster(roster).length === 0 ? roster : null
}
