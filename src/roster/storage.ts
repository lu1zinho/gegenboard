import {
  deserialiseList,
  isRecord,
  loadList,
  serialiseList,
  storageUnavailable,
  storeList,
  type KeyValueStorage,
  type LoadedList,
  type StoredList,
} from '../storage'
import { validateRoster } from './roster'
import type { Roster, RosterPlayer } from './types'

/** The localStorage key for saved rosters, kept apart from anything else Gegenboard saves. */
export const ROSTERS_STORAGE_KEY = 'gegenboard.rosters'

/** Version of the stored format. Bump it on breaking changes and migrate older data on load. */
export const ROSTERS_SCHEMA_VERSION = 1

/** Rosters are stored as `{ version, rosters }`. */
const ROSTER_LIST: StoredList<Roster> = {
  key: ROSTERS_STORAGE_KEY,
  version: ROSTERS_SCHEMA_VERSION,
  field: 'rosters',
  noun: 'roster',
  readItem: (value, kept) => {
    const roster = readRoster(value)
    return roster && !kept.some((other) => other.id === roster.id) ? roster : null
  },
}

export const ROSTERS_UNAVAILABLE = storageUnavailable(ROSTER_LIST)

export function serialiseRosters(rosters: readonly Roster[]): string {
  return serialiseList(ROSTER_LIST, rosters)
}

/**
 * Reads rosters saved by `serialiseRosters`. Stored data can be damaged, edited by hand or
 * written by another version of Gegenboard, so this never throws: rosters that don't match
 * the model, or repeat an id, are skipped and the reason is returned as `problem`.
 */
export function deserialiseRosters(json: string | null): LoadedList<Roster> {
  return deserialiseList(ROSTER_LIST, json)
}

/** Loads saved rosters. Never throws, even where storage is blocked. */
export function loadRosters(storage: KeyValueStorage | null): LoadedList<Roster> {
  return loadList(storage, ROSTER_LIST)
}

/**
 * Stores rosters, replacing those stored before. Never throws: returns `false` if they
 * couldn't be stored, e.g. because storage is blocked or full.
 */
export function storeRosters(storage: KeyValueStorage | null, rosters: readonly Roster[]): boolean {
  return storeList(storage, ROSTER_LIST, rosters)
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
