import { countOf } from './text'

/*
 * Everything Gegenboard keeps in browser storage goes through these helpers. Storage can be
 * missing, blocked or full, and saved data can be damaged or from another version, so none of
 * them throws or lets data through unchecked.
 */

/** The part of the Web Storage API Gegenboard needs, so tests can pass a fake. */
export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>

/** The browser's localStorage, or `null` where merely accessing it throws. */
export function getLocalStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** Whether a value parsed from JSON is an object, as opposed to an array, `null` or primitive. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * The text stored under `key`: `null` if nothing is, or `undefined` where storage is missing or
 * blocked. Never throws.
 */
export function readItem(storage: KeyValueStorage | null, key: string): string | null | undefined {
  if (!storage) return undefined
  try {
    return storage.getItem(key)
  } catch {
    return undefined
  }
}

/**
 * Stores text under `key`, replacing what was there. Never throws: returns `false` if it
 * couldn't be stored, e.g. because storage is missing, blocked or full.
 */
export function writeItem(storage: KeyValueStorage | null, key: string, value: string): boolean {
  if (!storage) return false
  try {
    storage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

/**
 * How a list is kept in storage: as JSON `{ version, [field]: items }` under `key`, apart from
 * anything else Gegenboard saves.
 */
export interface StoredList<T> {
  key: string
  /** Version of the stored format. Bump it on breaking changes and migrate older lists. */
  version: number
  /** The property holding the items, e.g. `rosters`. */
  field: string
  /** What an item is called in messages, e.g. `roster`. */
  noun: string
  /**
   * An item rebuilt from stored data, without unknown properties, or `null` if it can't be read
   * or clashes with an item already read (`kept`), e.g. by sharing its id.
   */
  readItem: (value: unknown, kept: readonly T[]) => T | null
}

export interface LoadedList<T> {
  items: T[]
  /** Why some or all stored items couldn't be loaded, or `null` if nothing went wrong. */
  problem: string | null
}

/** Why nothing in the list will be kept where storage is missing or blocked. */
export function storageUnavailable<T>(list: StoredList<T>): string {
  return `Browser storage isn't available, so saved ${list.noun}s won't be kept after you close the page`
}

export function serialiseList<T>(list: StoredList<T>, items: readonly T[]): string {
  return JSON.stringify({ version: list.version, [list.field]: items })
}

/**
 * Reads a list written by `serialiseList`. Never throws: items that can't be read are skipped
 * and the reason is returned as `problem`.
 */
export function deserialiseList<T>(list: StoredList<T>, json: string | null): LoadedList<T> {
  if (json === null) return { items: [], problem: null }

  const plural = `${list.noun}s`
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return { items: [], problem: `Saved ${plural} are damaged and couldn't be read` }
  }
  const unknownFormat = `Saved ${plural} are in an unknown format and couldn't be read`
  if (!isRecord(data) || typeof data.version !== 'number') {
    return { items: [], problem: unknownFormat }
  }
  // Older versions would be migrated here.
  if (data.version !== list.version) {
    return {
      items: [],
      problem: `Saved ${plural} use format version ${data.version}, which this version of Gegenboard can't read`,
    }
  }
  const stored = data[list.field]
  if (!Array.isArray(stored)) return { items: [], problem: unknownFormat }

  const values: unknown[] = stored
  const items: T[] = []
  for (const value of values) {
    const item = list.readItem(value, items)
    if (item !== null) items.push(item)
  }
  const skipped = values.length - items.length
  return {
    items,
    problem:
      skipped === 0
        ? null
        : `Skipped ${countOf(skipped, `saved ${list.noun}`)} that couldn't be read`,
  }
}

/** Loads a stored list. Never throws, even where storage is blocked. */
export function loadList<T>(storage: KeyValueStorage | null, list: StoredList<T>): LoadedList<T> {
  const json = readItem(storage, list.key)
  if (json === undefined) return { items: [], problem: storageUnavailable(list) }
  return deserialiseList(list, json)
}

/**
 * Stores a list, replacing the one stored before. Never throws: returns `false` if it couldn't
 * be stored, e.g. because storage is blocked or full.
 */
export function storeList<T>(
  storage: KeyValueStorage | null,
  list: StoredList<T>,
  items: readonly T[],
): boolean {
  return writeItem(storage, list.key, serialiseList(list, items))
}
