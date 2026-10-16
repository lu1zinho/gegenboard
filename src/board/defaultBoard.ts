import { applyFormation } from './formations'
import type { Board, Player, Team, TeamColours, TeamSide } from './types'

/** A player as listed in a lineup, before the formation places them. */
type LineupEntry = Pick<Player, 'number' | 'name'>

// In formation order: goalkeeper first, then each line from the bottom touchline to the top.
const HOME_LINEUP: readonly LineupEntry[] = [
  { number: 1, name: 'Novak' },
  { number: 2, name: 'Moreira' },
  { number: 4, name: 'Hansen' },
  { number: 5, name: 'Kowalski' },
  { number: 3, name: 'Duarte' },
  { number: 8, name: 'Mensah' },
  { number: 6, name: 'Lindqvist' },
  { number: 10, name: 'Ferreira' },
  { number: 7, name: 'Takahashi' },
  { number: 9, name: 'Okafor' },
  { number: 11, name: 'Rossi' },
]

const AWAY_LINEUP: readonly LineupEntry[] = [
  { number: 1, name: 'Weber' },
  { number: 2, name: 'Castillo' },
  { number: 5, name: 'Brennan' },
  { number: 6, name: 'Petrov' },
  { number: 3, name: 'Laurent' },
  { number: 7, name: 'Diallo' },
  { number: 4, name: 'Jansen' },
  { number: 8, name: 'Haddad' },
  { number: 11, name: 'Moretti' },
  { number: 9, name: 'Nakamura' },
  { number: 10, name: 'Ortega' },
]

/** A team on the centre spot, for `applyFormation` to line up. */
function createTeam(
  side: TeamSide,
  name: string,
  colours: TeamColours,
  lineup: readonly LineupEntry[],
): Team {
  return {
    name,
    colours: { ...colours },
    players: lineup.map(({ number, name }) => ({
      id: `${side}-${number}`,
      number,
      name,
      position: { x: 50, y: 50 },
    })),
  }
}

/**
 * A new board with both teams lined up for kick-off, home in a 4-3-3 and away in a 4-4-2, each
 * in its own half. Returns a fresh object every call.
 */
export function createDefaultBoard(): Board {
  const board: Board = {
    version: 1,
    teams: {
      home: createTeam('home', 'Home', { primary: '#c62828', secondary: '#ffffff' }, HOME_LINEUP),
      away: createTeam('away', 'Away', { primary: '#1565c0', secondary: '#ffffff' }, AWAY_LINEUP),
    },
    ball: { position: { x: 50, y: 50 } },
    arrows: [],
  }
  return applyFormation(applyFormation(board, 'home', '4-3-3'), 'away', '4-4-2')
}
