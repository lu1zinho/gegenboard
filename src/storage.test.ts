import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  deserialiseList,
  getLocalStorage,
  isRecord,
  loadList,
  readItem,
  serialiseList,
  storageUnavailable,
  storeList,
  writeItem,
  type StoredList,
} from './storage'
import { brokenStorage, fakeStorage } from './test/storage'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getLocalStorage', () => {
  it("returns the browser's localStorage", () => {
    expect(getLocalStorage()).toBe(window.localStorage)
  })

  it('returns null where accessing localStorage throws', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Access denied', 'SecurityError')
    })
    expect(getLocalStorage()).toBeNull()
  })
})

describe('isRecord', () => {
  it('accepts objects', () => {
    expect(isRecord({})).toBe(true)
    expect(isRecord({ version: 1 })).toBe(true)
  })

  it.each([[null], [[]], ['board'], [1], [true], [undefined]])('rejects %j', (value) => {
    expect(isRecord(value)).toBe(false)
  })
})

describe('readItem and writeItem', () => {
  it('reads what was written, and null for a key never written', () => {
    const storage = fakeStorage()
    expect(writeItem(storage, 'gegenboard.test', 'value')).toBe(true)
    expect(readItem(storage, 'gegenboard.test')).toBe('value')
    expect(readItem(storage, 'gegenboard.other')).toBeNull()
  })

  it('tells missing or blocked storage apart from an empty key, without throwing', () => {
    expect(readItem(null, 'gegenboard.test')).toBeUndefined()
    expect(readItem(brokenStorage(), 'gegenboard.test')).toBeUndefined()
  })

  it('reports a failed write instead of throwing', () => {
    expect(writeItem(null, 'gegenboard.test', 'value')).toBe(false)
    expect(writeItem(brokenStorage(), 'gegenboard.test', 'value')).toBe(false)
  })
})

describe('stored lists', () => {
  /** Whole numbers, stored as `{ version: 3, numbers }`, without repeats. */
  const NUMBERS: StoredList<number> = {
    key: 'gegenboard.numbers',
    version: 3,
    field: 'numbers',
    noun: 'number',
    readItem: (value, kept) =>
      typeof value === 'number' && Number.isInteger(value) && !kept.includes(value) ? value : null,
  }

  it('stores and loads a list under its key, with its version', () => {
    const storage = fakeStorage()
    expect(storeList(storage, NUMBERS, [1, 2])).toBe(true)
    expect(storage.entries.get('gegenboard.numbers')).toBe('{"version":3,"numbers":[1,2]}')
    expect(loadList(storage, NUMBERS)).toEqual({ items: [1, 2], problem: null })
    expect(deserialiseList(NUMBERS, serialiseList(NUMBERS, [5]))).toEqual({
      items: [5],
      problem: null,
    })
  })

  it('loads an empty list, without a problem, when nothing was stored', () => {
    expect(loadList(fakeStorage(), NUMBERS)).toEqual({ items: [], problem: null })
  })

  it('reports missing or blocked storage instead of throwing', () => {
    const unavailable = {
      items: [],
      problem:
        "Browser storage isn't available, so saved numbers won't be kept after you close the page",
    }
    expect(loadList(null, NUMBERS)).toEqual(unavailable)
    expect(loadList(brokenStorage(), NUMBERS)).toEqual(unavailable)
    expect(storageUnavailable(NUMBERS)).toBe(unavailable.problem)
    expect(storeList(brokenStorage(), NUMBERS, [1])).toBe(false)
  })

  it.each([
    ['{"version":3,', "Saved numbers are damaged and couldn't be read"],
    ['[1,2]', "Saved numbers are in an unknown format and couldn't be read"],
    ['{"numbers":[1]}', "Saved numbers are in an unknown format and couldn't be read"],
    ['{"version":3,"numbers":{}}', "Saved numbers are in an unknown format and couldn't be read"],
    [
      '{"version":4,"numbers":[1]}',
      "Saved numbers use format version 4, which this version of Gegenboard can't read",
    ],
  ])('reads nothing from %s and says why', (json, problem) => {
    expect(deserialiseList(NUMBERS, json)).toEqual({ items: [], problem })
  })

  it('skips items that cannot be read or clash with earlier ones, and counts them', () => {
    expect(deserialiseList(NUMBERS, '{"version":3,"numbers":[1,"2",1,3]}')).toEqual({
      items: [1, 3],
      problem: "Skipped 2 saved numbers that couldn't be read",
    })
    expect(deserialiseList(NUMBERS, '{"version":3,"numbers":[1,1.5]}')).toEqual({
      items: [1],
      problem: "Skipped 1 saved number that couldn't be read",
    })
  })
})
