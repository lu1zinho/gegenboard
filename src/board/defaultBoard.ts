import { mirrorPosition } from './pitch'
import type { Board, Player, Team, TeamColours, TeamSide } from './types'

/** A player as listed in a lineup, positioned for a team attacking left to right. */
type LineupEntry = Omit<Player, 'id'>

// 4-3-3 in its own half, ready for kick-off.
const HOME_LINEUP: readonly LineupEntry[] = [
  { number: 1, name: 'Novak', position: { x: 5, y: 50 } },
  { number: 2, name: 'Moreira', position: { x: 20, y: 84 } },
  { number: 4, name: 'Hansen', position: { x: 17, y: 62 } },
  { number: 5, name: 'Kowalski', position: { x: 17, y: 38 } },
  { number: 3, name: 'Duarte', position: { x: 20, y: 16 } },
  { number: 6, name: 'Lindqvist', position: { x: 29, y: 50 } },
  { number: 8, name: 'Mensah', position: { x: 35, y: 68 } },
  { number: 10, name: 'Ferreira', position: { x: 35, y: 32 } },
  { number: 7, name: 'Takahashi', position: { x: 44, y: 84 } },
  { number: 9, name: 'Okafor', position: { x: 46, y: 50 } },
  { number: 11, name: 'Rossi', position: { x: 44, y: 16 } },
]

// 4-4-2 in its own half, ready for kick-off.
const AWAY_LINEUP: readonly LineupEntry[] = [
  { number: 1, name: 'Weber', position: { x: 5, y: 50 } },
  { number: 2, name: 'Castillo', position: { x: 20, y: 84 } },
  { number: 5, name: 'Brennan', position: { x: 17, y: 62 } },
  { number: 6, name: 'Petrov', position: { x: 17, y: 38 } },
  { number: 3, name: 'Laurent', position: { x: 20, y: 16 } },
  { number: 7, name: 'Diallo', position: { x: 33, y: 84 } },
  { number: 4, name: 'Jansen', position: { x: 31, y: 61 } },
  { number: 8, name: 'Haddad', position: { x: 31, y: 39 } },
  { number: 11, name: 'Moretti', position: { x: 33, y: 16 } },
  { number: 9, name: 'Nakamura', position: { x: 44, y: 60 } },
  { number: 10, name: 'Ortega', position: { x: 44, y: 40 } },
]

/** Builds a team, mirroring the lineup for the away side so it attacks right to left. */
function createTeam(
  side: TeamSide,
  name: string,
  colours: TeamColours,
  lineup: readonly LineupEntry[],
): Team {
  return {
    name,
    colours: { ...colours },
    players: lineup.map((entry) => ({
      id: `${side}-${entry.number}`,
      number: entry.number,
      name: entry.name,
      position: side === 'home' ? { ...entry.position } : mirrorPosition(entry.position),
    })),
  }
}

/** A new board with both teams lined up for kick-off. Returns a fresh object every call. */
export function createDefaultBoard(): Board {
  return {
    version: 1,
    teams: {
      home: createTeam('home', 'Home', { primary: '#c62828', secondary: '#ffffff' }, HOME_LINEUP),
      away: createTeam('away', 'Away', { primary: '#1565c0', secondary: '#ffffff' }, AWAY_LINEUP),
    },
    ball: { position: { x: 50, y: 50 } },
    arrows: [],
  }
}
