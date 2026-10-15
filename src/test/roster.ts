import type { Roster } from '../roster/types'

/** A small valid roster for tests. Returns a fresh object every call. */
export function makeRoster(overrides: Partial<Roster> = {}): Roster {
  return {
    id: 'roster-1',
    name: 'Gegenpress FC',
    colours: { primary: '#ffeb3b', secondary: '#000000' },
    players: [
      { id: 'p1', number: 1, name: 'Novak' },
      { id: 'p2', number: 10, name: 'Ferreira' },
      { id: 'p3', number: 9, name: 'Okafor' },
    ],
    ...overrides,
  }
}
