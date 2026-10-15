import { isOnPitch } from './pitch'
import { TEAM_SIDES, type Board, type PitchPosition } from './types'

export const PLAYERS_PER_TEAM = 11

const HEX_COLOUR = /^#[0-9a-f]{6}$/i

/**
 * Checks the rules a board must follow beyond what its types express. Returns a description
 * of each problem found, or an empty array for a valid board.
 */
export function validateBoard(board: Board): string[] {
  const problems: string[] = []

  const checkPosition = (label: string, position: PitchPosition) => {
    if (!isOnPitch(position)) problems.push(`${label} is off the pitch`)
  }
  const checkColour = (label: string, colour: string) => {
    if (!HEX_COLOUR.test(colour)) problems.push(`${label} must be a #rrggbb colour`)
  }

  const playerIds = new Set<string>()
  for (const side of TEAM_SIDES) {
    const team = board.teams[side]
    if (team.players.length !== PLAYERS_PER_TEAM) {
      problems.push(`${side} has ${team.players.length} players, expected ${PLAYERS_PER_TEAM}`)
    }
    checkColour(`${side} primary colour`, team.colours.primary)
    checkColour(`${side} secondary colour`, team.colours.secondary)

    const numbers = new Set<number>()
    for (const player of team.players) {
      const label = `${side} player ${player.id}`
      if (playerIds.has(player.id)) problems.push(`${label} has a duplicate id`)
      playerIds.add(player.id)

      if (!Number.isInteger(player.number) || player.number < 1 || player.number > 99) {
        problems.push(`${label} shirt number must be a whole number from 1 to 99`)
      } else if (numbers.has(player.number)) {
        problems.push(`${label} has duplicate shirt number ${player.number}`)
      }
      numbers.add(player.number)

      checkPosition(label, player.position)
    }
  }

  checkPosition('ball', board.ball.position)

  const arrowIds = new Set<string>()
  for (const arrow of board.arrows) {
    const label = `arrow ${arrow.id}`
    if (arrowIds.has(arrow.id)) problems.push(`${label} has a duplicate id`)
    arrowIds.add(arrow.id)
    checkPosition(`${label} start`, arrow.from)
    checkPosition(`${label} end`, arrow.to)
    checkColour(`${label} colour`, arrow.colour)
  }

  return problems
}
