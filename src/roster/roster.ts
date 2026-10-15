import type { TeamColours } from '../board/types'
import { isHexColour } from '../board/validate'
import { MAX_SHIRT_NUMBER, MIN_SHIRT_NUMBER, isShirtNumber, normaliseName } from './squadList'
import type { Roster, RosterPlayer, SquadEntry } from './types'

/*
 * Pure functions over rosters. They never mutate their arguments: each returns a new roster
 * or list of rosters.
 */

export const DEFAULT_ROSTER_COLOURS: Readonly<TeamColours> = {
  primary: '#c62828',
  secondary: '#ffffff',
}

/** The next unused id with this prefix and a number, e.g. `p3` after `p1` and `p2`. */
function nextId(prefix: string, ids: readonly string[]): string {
  let highest = 0
  for (const id of ids) {
    const suffix = id.slice(prefix.length)
    if (id.startsWith(prefix) && /^\d+$/u.test(suffix)) highest = Math.max(highest, Number(suffix))
  }
  return `${prefix}${highest + 1}`
}

/** An id for a new roster that no roster in the list has. */
export function nextRosterId(rosters: readonly Roster[]): string {
  const ids = rosters.map((roster) => roster.id)
  return nextId('roster-', ids)
}

/** A roster with the given players, in order, and tidied names. */
export function createRoster(
  id: string,
  name: string,
  colours: TeamColours,
  entries: readonly SquadEntry[],
): Roster {
  return tidyRoster({
    id,
    name,
    colours: { ...colours },
    players: entries.map((entry, index) => ({
      id: `p${index + 1}`,
      number: entry.number,
      name: entry.name,
    })),
  })
}

/** Trims the team and player names and collapses whitespace inside them. */
export function tidyRoster(roster: Roster): Roster {
  return {
    ...roster,
    name: normaliseName(roster.name),
    players: roster.players.map((player) => ({ ...player, name: normaliseName(player.name) })),
  }
}

export function renameRoster(roster: Roster, name: string): Roster {
  return { ...roster, name }
}

export function setRosterColours(roster: Roster, colours: TeamColours): Roster {
  return { ...roster, colours: { ...colours } }
}

/** The lowest shirt number no player in the roster wears, or `null` if all are taken. */
export function lowestFreeShirtNumber(roster: Roster): number | null {
  const taken = new Set(roster.players.map((player) => player.number))
  for (let number = MIN_SHIRT_NUMBER; number <= MAX_SHIRT_NUMBER; number++) {
    if (!taken.has(number)) return number
  }
  return null
}

/** Adds a player at the end of the roster, with a new id. */
export function addPlayer(roster: Roster, entry: SquadEntry): Roster {
  const ids = roster.players.map((player) => player.id)
  const player: RosterPlayer = {
    id: nextId('p', ids),
    number: entry.number,
    name: entry.name,
  }
  return { ...roster, players: [...roster.players, player] }
}

/** Changes the number and/or name of the player with this id, keeping its place. */
export function updatePlayer(
  roster: Roster,
  playerId: string,
  changes: Partial<SquadEntry>,
): Roster {
  return {
    ...roster,
    players: roster.players.map((player) =>
      player.id === playerId
        ? {
            id: player.id,
            number: changes.number ?? player.number,
            name: changes.name ?? player.name,
          }
        : player,
    ),
  }
}

export function removePlayer(roster: Roster, playerId: string): Roster {
  return { ...roster, players: roster.players.filter((player) => player.id !== playerId) }
}

/**
 * Checks the rules a roster must follow beyond what its types express, before it is saved.
 * Players are referred to by their place in the list (`Player 3`), as the editor shows them.
 * Returns a description of each problem found, or an empty array for a valid roster.
 */
export function validateRoster(roster: Roster): string[] {
  const problems: string[] = []

  if (normaliseName(roster.name) === '') problems.push('The team needs a name')
  if (!isHexColour(roster.colours.primary)) {
    problems.push('The primary colour must be a #rrggbb colour')
  }
  if (!isHexColour(roster.colours.secondary)) {
    problems.push('The secondary colour must be a #rrggbb colour')
  }

  const ids = new Set<string>()
  const numbers = new Set<number>()
  roster.players.forEach((player, index) => {
    const label = `Player ${index + 1}`
    if (ids.has(player.id)) problems.push(`${label} has a duplicate id`)
    ids.add(player.id)

    if (!isShirtNumber(player.number)) {
      problems.push(
        `${label} needs a whole shirt number from ${MIN_SHIRT_NUMBER} to ${MAX_SHIRT_NUMBER}`,
      )
    } else if (numbers.has(player.number)) {
      problems.push(`${label} has duplicate shirt number ${player.number}`)
    }
    numbers.add(player.number)

    if (normaliseName(player.name) === '') problems.push(`${label} needs a name`)
  })

  return problems
}

/** Replaces the roster with the same id, or adds the roster at the end if it is new. */
export function upsertRoster(rosters: readonly Roster[], roster: Roster): Roster[] {
  return rosters.some((r) => r.id === roster.id)
    ? rosters.map((r) => (r.id === roster.id ? roster : r))
    : [...rosters, roster]
}

export function removeRoster(rosters: readonly Roster[], rosterId: string): Roster[] {
  return rosters.filter((roster) => roster.id !== rosterId)
}
