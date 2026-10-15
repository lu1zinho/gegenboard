import { describe, expect, it } from 'vitest'
import { makeRoster } from '../test/roster'
import {
  addPlayer,
  createRoster,
  lowestFreeShirtNumber,
  nextRosterId,
  removePlayer,
  removeRoster,
  renameRoster,
  setRosterColours,
  tidyRoster,
  updatePlayer,
  upsertRoster,
  validateRoster,
} from './roster'
import { parseSquadList } from './squadList'

const COLOURS = { primary: '#ffeb3b', secondary: '#000000' }

describe('createRoster', () => {
  it('gives each player an id, keeping the squad list order', () => {
    const { players } = parseSquadList('1 Novak\n10 Ferreira\n9 Okafor')
    expect(createRoster('roster-1', 'Gegenpress FC', COLOURS, players)).toEqual(makeRoster())
  })

  it('tidies the team and player names', () => {
    const roster = createRoster('roster-1', '  Gegenpress \t FC ', COLOURS, [
      { number: 9, name: ' Okafor  Jr ' },
    ])
    expect(roster.name).toBe('Gegenpress FC')
    expect(roster.players).toEqual([{ id: 'p1', number: 9, name: 'Okafor Jr' }])
  })

  it('copies the colours rather than sharing them', () => {
    const colours = { ...COLOURS }
    const roster = createRoster('roster-1', 'Gegenpress FC', colours, [])
    colours.primary = '#ffffff'
    expect(roster.colours.primary).toBe('#ffeb3b')
  })

  it('creates a valid roster from a 25-player squad list', () => {
    const lines = Array.from({ length: 25 }, (_, i) => `${i + 1} Player ${i + 1}`)
    const { players } = parseSquadList(lines.join('\n'))
    const roster = createRoster('roster-1', 'Big Squad', COLOURS, players)
    expect(roster.players).toHaveLength(25)
    expect(validateRoster(roster)).toEqual([])
  })
})

describe('nextRosterId', () => {
  it('starts at roster-1', () => {
    expect(nextRosterId([])).toBe('roster-1')
  })

  it('follows the highest existing id', () => {
    const rosters = [makeRoster({ id: 'roster-2' }), makeRoster({ id: 'roster-7' })]
    expect(nextRosterId(rosters)).toBe('roster-8')
  })

  it('ignores ids in another form', () => {
    expect(nextRosterId([makeRoster({ id: 'imported' }), makeRoster({ id: 'roster-x' })])).toBe(
      'roster-1',
    )
  })
})

describe('editing a roster', () => {
  it('renames the team without changing the original', () => {
    const roster = makeRoster()
    expect(renameRoster(roster, 'Rondo United').name).toBe('Rondo United')
    expect(roster.name).toBe('Gegenpress FC')
  })

  it('sets both colours', () => {
    const colours = { primary: '#1565c0', secondary: '#ffffff' }
    expect(setRosterColours(makeRoster(), colours).colours).toEqual(colours)
  })

  it('adds a player at the end with a new id', () => {
    const roster = makeRoster()
    const updated = addPlayer(roster, { number: 7, name: 'Takahashi' })
    expect(updated.players.at(-1)).toEqual({ id: 'p4', number: 7, name: 'Takahashi' })
    expect(roster.players).toHaveLength(3)
  })

  it('gives an added player an id no remaining player has', () => {
    const roster = removePlayer(makeRoster(), 'p2')
    expect(addPlayer(roster, { number: 7, name: 'Takahashi' }).players.at(-1)?.id).toBe('p4')
  })

  it('edits the number and name of one player, keeping its id and place', () => {
    const roster = makeRoster()
    const renumbered = updatePlayer(roster, 'p2', { number: 8 })
    expect(renumbered.players[1]).toEqual({ id: 'p2', number: 8, name: 'Ferreira' })
    const renamed = updatePlayer(renumbered, 'p2', { name: 'Mensah' })
    expect(renamed.players[1]).toEqual({ id: 'p2', number: 8, name: 'Mensah' })
    expect(renamed.players[0]).toBe(roster.players[0])
    expect(roster.players[1]).toEqual({ id: 'p2', number: 10, name: 'Ferreira' })
  })

  it('removes a player by id', () => {
    const roster = makeRoster()
    expect(removePlayer(roster, 'p2').players.map((p) => p.id)).toEqual(['p1', 'p3'])
    expect(roster.players).toHaveLength(3)
  })

  it('tidies names, for saving after editing', () => {
    const roster = makeRoster({ name: ' Gegenpress FC ' })
    const tidied = tidyRoster(updatePlayer(roster, 'p1', { name: 'Novak  ' }))
    expect(tidied.name).toBe('Gegenpress FC')
    expect(tidied.players[0]?.name).toBe('Novak')
  })
})

describe('lowestFreeShirtNumber', () => {
  it('finds the lowest number nobody wears', () => {
    expect(lowestFreeShirtNumber(makeRoster())).toBe(2)
    expect(lowestFreeShirtNumber(makeRoster({ players: [] }))).toBe(1)
  })

  it('returns null when all 99 numbers are taken', () => {
    const players = Array.from({ length: 99 }, (_, i) => ({
      id: `p${i + 1}`,
      number: i + 1,
      name: `Player ${i + 1}`,
    }))
    expect(lowestFreeShirtNumber(makeRoster({ players }))).toBeNull()
  })
})

describe('validateRoster', () => {
  it('accepts a valid roster', () => {
    expect(validateRoster(makeRoster())).toEqual([])
  })

  it('accepts a roster with no players yet', () => {
    expect(validateRoster(makeRoster({ players: [] }))).toEqual([])
  })

  it('requires a team name', () => {
    expect(validateRoster(makeRoster({ name: '  ' }))).toEqual(['The team needs a name'])
  })

  it('requires #rrggbb colours', () => {
    expect(validateRoster(makeRoster({ colours: { primary: 'red', secondary: '#fff' } }))).toEqual([
      'The primary colour must be a #rrggbb colour',
      'The secondary colour must be a #rrggbb colour',
    ])
  })

  it('requires each player to have a name', () => {
    const roster = updatePlayer(makeRoster(), 'p3', { name: ' ' })
    expect(validateRoster(roster)).toEqual(['Player 3 needs a name'])
  })

  it.each([0, 100, 7.5, Number.NaN])('rejects shirt number %s', (number) => {
    const roster = updatePlayer(makeRoster(), 'p2', { number })
    expect(validateRoster(roster)).toEqual(['Player 2 needs a whole shirt number from 1 to 99'])
  })

  it('rejects duplicate shirt numbers', () => {
    const roster = updatePlayer(makeRoster(), 'p3', { number: 10 })
    expect(validateRoster(roster)).toEqual(['Player 3 has duplicate shirt number 10'])
  })

  it('rejects duplicate player ids', () => {
    const roster = makeRoster()
    roster.players.push({ id: 'p1', number: 4, name: 'Hansen' })
    expect(validateRoster(roster)).toEqual(['Player 4 has a duplicate id'])
  })
})

describe('a list of rosters', () => {
  it('adds a new roster at the end', () => {
    const rosters = [makeRoster()]
    const added = upsertRoster(rosters, makeRoster({ id: 'roster-2', name: 'Rondo United' }))
    expect(added.map((r) => r.name)).toEqual(['Gegenpress FC', 'Rondo United'])
    expect(rosters).toHaveLength(1)
  })

  it('replaces a roster with the same id in place', () => {
    const rosters = [makeRoster(), makeRoster({ id: 'roster-2', name: 'Rondo United' })]
    const updated = upsertRoster(rosters, makeRoster({ name: 'Gegenpress City' }))
    expect(updated.map((r) => r.name)).toEqual(['Gegenpress City', 'Rondo United'])
  })

  it('removes a roster by id', () => {
    const rosters = [makeRoster(), makeRoster({ id: 'roster-2', name: 'Rondo United' })]
    expect(removeRoster(rosters, 'roster-1').map((r) => r.name)).toEqual(['Rondo United'])
    expect(rosters).toHaveLength(2)
  })
})
