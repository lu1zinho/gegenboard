/*
 * Helpers shared by everything Gegenboard keeps in browser storage. Storage can be missing,
 * blocked or full, and saved data can be damaged or from another version, so code using these
 * never lets a storage error or bad data escape.
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
