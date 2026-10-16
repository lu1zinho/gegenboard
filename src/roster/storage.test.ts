import { describe, expect, it } from 'vitest'
import { getLocalStorage } from '../storage'
import { makeRoster } from '../test/roster'
import { brokenStorage, fakeStorage } from '../test/storage'
import {
  ROSTERS_SCHEMA_VERSION,
  ROSTERS_STORAGE_KEY,
  ROSTERS_UNAVAILABLE,
  deserialiseRosters,
  loadRosters,
  serialiseRosters,
  storeRosters,
} from './storage'

const TWO_ROSTERS = [makeRoster(), makeRoster({ id: 'roster-2', name: 'Rondo United' })]

describe('saving and loading rosters', () => {
  it('loads the rosters it saved', () => {
    const storage = fakeStorage()
    expect(storeRosters(storage, TWO_ROSTERS)).toBe(true)
    expect(loadRosters(storage)).toEqual({ items: TWO_ROSTERS, problem: null })
  })

  it('saves under its own key only, with the schema version', () => {
    const storage = fakeStorage({ 'gegenboard.board': '{"version":1}' })
    storeRosters(storage, TWO_ROSTERS)

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
    storeRosters(storage, TWO_ROSTERS)
    storeRosters(storage, [makeRoster({ name: 'Gegenpress City' })])
    expect(loadRosters(storage).items.map((r) => r.name)).toEqual(['Gegenpress City'])
  })

  it('saves and loads an empty list', () => {
    const storage = fakeStorage()
    storeRosters(storage, TWO_ROSTERS)
    storeRosters(storage, [])
    expect(loadRosters(storage)).toEqual({ items: [], problem: null })
  })

  it("works with the browser's localStorage", () => {
    expect(storeRosters(getLocalStorage(), TWO_ROSTERS)).toBe(true)
    expect(localStorage.getItem(ROSTERS_STORAGE_KEY)).toBe(serialiseRosters(TWO_ROSTERS))
    expect(loadRosters(getLocalStorage())).toEqual({ items: TWO_ROSTERS, problem: null })
  })

  it('loads no rosters, without a problem, when none were saved', () => {
    expect(loadRosters(fakeStorage())).toEqual({ items: [], problem: null })
  })

  it('reports blocked storage instead of throwing', () => {
    expect(loadRosters(brokenStorage())).toEqual({ items: [], problem: ROSTERS_UNAVAILABLE })
    expect(loadRosters(null)).toEqual({ items: [], problem: ROSTERS_UNAVAILABLE })
  })

  it('reports a failed save, e.g. full storage, instead of throwing', () => {
    expect(storeRosters(brokenStorage(), TWO_ROSTERS)).toBe(false)
    expect(storeRosters(null, TWO_ROSTERS)).toBe(false)
  })
})

describe('deserialiseRosters', () => {
  const stored = (rosters: unknown[], version: unknown = ROSTERS_SCHEMA_VERSION) =>
    JSON.stringify({ version, rosters })

  it('reads what serialiseRosters wrote', () => {
    expect(deserialiseRosters(serialiseRosters(TWO_ROSTERS)).items).toEqual(TWO_ROSTERS)
  })

  it('reports data that is not JSON', () => {
    expect(deserialiseRosters('{"version":1,')).toEqual({
      items: [],
      problem: "Saved rosters are damaged and couldn't be read",
    })
  })

  it.each([['[]'], ['null'], ['"rosters"'], ['{"rosters":[]}'], ['{"version":1}']])(
    'reports data in an unknown format: %s',
    (json) => {
      expect(deserialiseRosters(json)).toEqual({
        items: [],
        problem: "Saved rosters are in an unknown format and couldn't be read",
      })
    },
  )

  it('reports data from a newer schema version without reading it', () => {
    expect(deserialiseRosters(stored(TWO_ROSTERS, 2))).toEqual({
      items: [],
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
      items: [makeRoster(), keeperOnly],
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
      items: [makeRoster()],
      problem: "Skipped 1 saved roster that couldn't be read",
    })
  })

  it('keeps only the first of rosters sharing an id', () => {
    const json = stored([makeRoster(), makeRoster({ name: 'Copy' })])
    expect(deserialiseRosters(json)).toEqual({
      items: [makeRoster()],
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
    expect(deserialiseRosters(json)).toEqual({ items: [roster], problem: null })
  })
})
