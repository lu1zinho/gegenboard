import { mirrorPosition } from './pitch'
import type { Board, PitchPosition, TeamSide } from './types'

export const FORMATION_IDS = ['4-4-2', '4-3-3', '3-5-2', '4-2-3-1'] as const

export type FormationId = (typeof FORMATION_IDS)[number]

export function isFormationId(value: string): value is FormationId {
  return FORMATION_IDS.some((id) => id === value)
}

/**
 * Goalkeeper first, then the outfield lines from defence to attack, each line from the
 * bottom touchline to the top. Positions are for a team attacking left to right; use
 * `formationPositions` to get them for a given side.
 */
const FORMATIONS: Record<FormationId, readonly PitchPosition[]> = {
  '4-4-2': [
    { x: 5, y: 50 },
    { x: 20, y: 84 },
    { x: 17, y: 62 },
    { x: 17, y: 38 },
    { x: 20, y: 16 },
    { x: 33, y: 84 },
    { x: 31, y: 61 },
    { x: 31, y: 39 },
    { x: 33, y: 16 },
    { x: 44, y: 60 },
    { x: 44, y: 40 },
  ],
  '4-3-3': [
    { x: 5, y: 50 },
    { x: 20, y: 84 },
    { x: 17, y: 62 },
    { x: 17, y: 38 },
    { x: 20, y: 16 },
    { x: 35, y: 68 },
    { x: 29, y: 50 },
    { x: 35, y: 32 },
    { x: 44, y: 84 },
    { x: 46, y: 50 },
    { x: 44, y: 16 },
  ],
  '3-5-2': [
    { x: 5, y: 50 },
    { x: 17, y: 70 },
    { x: 15, y: 50 },
    { x: 17, y: 30 },
    { x: 32, y: 88 },
    { x: 30, y: 68 },
    { x: 27, y: 50 },
    { x: 30, y: 32 },
    { x: 32, y: 12 },
    { x: 44, y: 60 },
    { x: 44, y: 40 },
  ],
  '4-2-3-1': [
    { x: 5, y: 50 },
    { x: 20, y: 84 },
    { x: 17, y: 62 },
    { x: 17, y: 38 },
    { x: 20, y: 16 },
    { x: 28, y: 62 },
    { x: 28, y: 38 },
    { x: 38, y: 82 },
    { x: 40, y: 50 },
    { x: 38, y: 18 },
    { x: 47, y: 50 },
  ],
}

/** The 11 positions of a formation for a team on the given side, goalkeeper first. */
export function formationPositions(id: FormationId, side: TeamSide): PitchPosition[] {
  return FORMATIONS[id].map((position) =>
    side === 'home' ? { ...position } : mirrorPosition(position),
  )
}

/**
 * Returns a new board where the team's players, in their existing order (goalkeeper first),
 * take the formation's positions. Numbers, names and everything else are kept.
 */
export function applyFormation(board: Board, side: TeamSide, id: FormationId): Board {
  const positions = formationPositions(id, side)
  const team = board.teams[side]
  return {
    ...board,
    teams: {
      ...board.teams,
      [side]: {
        ...team,
        players: team.players.map((player, index) => ({
          ...player,
          position: positions[index] ?? { ...player.position },
        })),
      },
    },
  }
}

/**
 * The formation the team is lined up in: the one whose spots its players stand on exactly,
 * whichever player is on which spot. `null` if they stand anywhere else.
 */
export function formationOf(board: Board, side: TeamSide): FormationId | null {
  const spots = (positions: readonly PitchPosition[]) =>
    positions
      .map(({ x, y }) => `${x},${y}`)
      .sort()
      .join(' ')
  const lineup = spots(board.teams[side].players.map((player) => player.position))
  return FORMATION_IDS.find((id) => spots(formationPositions(id, side)) === lineup) ?? null
}
