import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeRoster } from '../test/roster'
import {
  ROSTERS_SCHEMA_VERSION,
  ROSTERS_STORAGE_KEY,
  STORAGE_UNAVAILABLE,
  deserialiseRosters,
  getLocalStorage,
  loadRosters,
  saveRosters,
  serialiseRosters,
  type RosterStorage,
} from './storage'

/** An in-memory stand-in for localStorage. */
function fakeStorage(entries: Record<string, string> = {}): RosterStorage & {
  entries: Map<string, string>
} {
  const map = new Map(Object.entries(entries))
  return {
    entries: map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    },
  }
}

function brokenStorage(): RosterStorage {
  return {
    getItem: () => {
      throw new DOMException('Access denied', 'SecurityError')
    },
    setItem: () => {
      throw new DOMException('Storage is full', 'QuotaExceededError')
    },
  }
}

const TWO_ROSTERS = [makeRoster(), makeRoster({ id: 'roster-2', name: 'Rondo United' })]

afterEach(() => {
  vi.restoreAllMocks()
})

describe('saving and loading rosters', () => {
  it('loads the rosters it saved', () => {
    const storage = fakeStorage()
    expect(saveRosters(storage, TWO_ROSTERS)).toBe(true)
    expect(loadRosters(storage)).toEqual({ rosters: TWO_ROSTERS, problem: null })
  })

  it('saves under its own key only, with the schema version', () => {
    const storage = fakeStorage({ 'gegenboard.board': '{"version":1}' })
    saveRosters(storage, TWO_ROSTERS)

    expect(ROSTERS_STORAGE_KEY).toBe('gegenboard.rosters')
    expect([...storage.entries.keys()]).toEqual(['gegenboard.board', 'gegenboard.rosters'])
    expect(storage.entries.get('gegenboard.board')).toBe('{"version":1}')
    expect(JSON.parse(storage.entries.get(ROSTERS_STORAGE_KEY) ?? '')).toEqual({
      version: ROSTERS_SCHEMA_VERSION,
      rosters: TWO_ROSTERS,
    })
  })

  it('replaces the rosters saved before', () => {
    const storage = fakeStorage()
    saveRosters(storage, TWO_ROSTERS)
    saveRosters(storage, [makeRoster({ name: 'Gegenpress City' })])
    expect(loadRosters(storage).rosters.map((r) => r.name)).toEqual(['Gegenpress City'])
  })

  it('saves and loads an empty list', () => {
    const storage = fakeStorage()
    saveRosters(storage, TWO_ROSTERS)
    saveRosters(storage, [])
    expect(loadRosters(storage)).toEqual({ rosters: [], problem: null })
  })

  it("works with the browser's localStorage", () => {
    expect(saveRosters(getLocalStorage(), TWO_ROSTERS)).toBe(true)
    expect(localStorage.getItem(ROSTERS_STORAGE_KEY)).toBe(serialiseRosters(TWO_ROSTERS))
    expect(loadRosters(getLocalStorage())).toEqual({ rosters: TWO_ROSTERS, problem: null })
  })

  it('loads no rosters, without a problem, when none were saved', () => {
    expect(loadRosters(fakeStorage())).toEqual({ rosters: [], problem: null })
  })

  it('reports blocked storage instead of throwing', () => {
    expect(loadRosters(brokenStorage())).toEqual({ rosters: [], problem: STORAGE_UNAVAILABLE })
    expect(loadRosters(null)).toEqual({ rosters: [], problem: STORAGE_UNAVAILABLE })
  })

  it('reports a failed save, e.g. full storage, instead of throwing', () => {
    expect(saveRosters(brokenStorage(), TWO_ROSTERS)).toBe(false)
    expect(saveRosters(null, TWO_ROSTERS)).toBe(false)
  })
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

describe('deserialiseRosters', () => {
  const stored = (rosters: unknown[], version: unknown = ROSTERS_SCHEMA_VERSION) =>
    JSON.stringify({ version, rosters })

  it('reads what serialiseRosters wrote', () => {
    expect(deserialiseRosters(serialiseRosters(TWO_ROSTERS)).rosters).toEqual(TWO_ROSTERS)
  })

  it('reports data that is not JSON', () => {
    expect(deserialiseRosters('{"version":1,')).toEqual({
      rosters: [],
      problem: "Saved rosters are damaged and couldn't be read",
    })
  })

  it.each([['[]'], ['null'], ['"rosters"'], ['{"rosters":[]}'], ['{"version":1}']])(
    'reports data in an unknown format: %s',
    (json) => {
      expect(deserialiseRosters(json)).toEqual({
        rosters: [],
        problem: "Saved rosters are in an unknown format and couldn't be read",
      })
    },
  )

  it('reports data from a newer schema version without reading it', () => {
    expect(deserialiseRosters(stored(TWO_ROSTERS, 2))).toEqual({
      rosters: [],
      problem: "Saved rosters use format version 2, which this version of Gegenboard can't read",
    })
  })

  it('skips rosters that do not match the model and keeps the rest', () => {
    const keeperOnly = makeRoster({
      id: 'roster-4',
      players: [{ id: 'p1', number: 1, name: 'Novak' }],
    })
    const json = stored([
      makeRoster(),
      { ...makeRoster({ id: 'roster-2' }), name: 42 },
      { ...makeRoster({ id: 'roster-3' }), colours: null },
      keeperOnly,
      { ...makeRoster({ id: 'roster-5' }), players: [{ id: 'p1', number: '1', name: 'Novak' }] },
      'roster-6',
    ])
    expect(deserialiseRosters(json)).toEqual({
      rosters: [makeRoster(), keeperOnly],
      problem: "Skipped 4 saved rosters that couldn't be read",
    })
  })

  it('skips rosters that break the roster rules', () => {
    const duplicateNumbers = makeRoster({
      id: 'roster-2',
      players: [
        { id: 'p1', number: 9, name: 'Okafor' },
        { id: 'p2', number: 9, name: 'Nakamura' },
      ],
    })
    expect(deserialiseRosters(stored([makeRoster(), duplicateNumbers]))).toEqual({
      rosters: [makeRoster()],
      problem: "Skipped 1 saved roster that couldn't be read",
    })
  })

  it('keeps only the first of rosters sharing an id', () => {
    const json = stored([makeRoster(), makeRoster({ name: 'Copy' })])
    expect(deserialiseRosters(json)).toEqual({
      rosters: [makeRoster()],
      problem: "Skipped 1 saved roster that couldn't be read",
    })
  })

  it('drops properties the model does not have', () => {
    const roster = makeRoster({ players: [{ id: 'p1', number: 1, name: 'Novak' }] })
    const json = stored([
      {
        ...roster,
        badge: 'crest.png',
        colours: { ...roster.colours, tertiary: '#00ff00' },
        players: [{ ...roster.players[0], position: 'GK' }],
      },
    ])
    expect(deserialiseRosters(json)).toEqual({ rosters: [roster], problem: null })
  })
})
