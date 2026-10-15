import type { Board, Player, TeamSide } from '../board/types'

/** Finds a player by shirt number, failing the test if there is none. */
export function getPlayer(board: Board, side: TeamSide, number: number): Player {
  const player = board.teams[side].players.find((p) => p.number === number)
  if (!player) throw new Error(`No ${side} player with number ${number}`)
  return player
}
