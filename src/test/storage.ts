import type { KeyValueStorage } from '../storage'

/** An in-memory stand-in for localStorage, with its entries open to inspection. */
export function fakeStorage(
  entries: Record<string, string> = {},
): KeyValueStorage & { entries: Map<string, string> } {
  const map = new Map(Object.entries(entries))
  return {
    entries: map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    },
  }
}

/** Storage that throws on every access, as blocked or full browser storage does. */
export function brokenStorage(): KeyValueStorage {
  return {
    getItem: () => {
      throw new DOMException('Access denied', 'SecurityError')
    },
    setItem: () => {
      throw new DOMException('Storage is full', 'QuotaExceededError')
    },
  }
}
