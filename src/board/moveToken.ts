import { clampPosition } from './pitch'
import type { Board, PitchPosition, TeamSide } from './types'

/** Something on the board that can be dragged. */
export type TokenRef = { kind: 'ball' } | { kind: 'player'; side: TeamSide; id: string }

/** Where a token currently is, or undefined if the board has no such token. */
export function tokenPosition(board: Board, token: TokenRef): PitchPosition | undefined {
  if (token.kind === 'ball') return board.ball.position
  return board.teams[token.side].players.find((p) => p.id === token.id)?.position
}

/**
 * Moves a token to a position, clamped to the pitch. Returns the same board when the token is
 * unknown or already there, and leaves every other token untouched.
 */
export function moveToken(board: Board, token: TokenRef, to: PitchPosition): Board {
  const position = clampPosition(to)
  const current = tokenPosition(board, token)
  if (!current || (current.x === position.x && current.y === position.y)) return board

  if (token.kind === 'ball') return { ...board, ball: { ...board.ball, position } }
  const team = board.teams[token.side]
  return {
    ...board,
    teams: {
      ...board.teams,
      [token.side]: {
        ...team,
        players: team.players.map((p) => (p.id === token.id ? { ...p, position } : p)),
      },
    },
  }
}
