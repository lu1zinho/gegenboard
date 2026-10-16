import { describe, expect, it } from 'vitest'
import { getPlayer } from '../test/board'
import { createDefaultBoard } from './defaultBoard'
import { moveToken } from './moveToken'
import { validateBoard } from './validate'

describe('moveToken', () => {
  it('moves a player and leaves every other token and the input board alone', () => {
    const board = createDefaultBoard()
    const before = structuredClone(board)
    const striker = getPlayer(board, 'home', 9)

    const moved = moveToken(
      board,
      { kind: 'player', side: 'home', id: striker.id },
      { x: 70, y: 30 },
    )

    expect(getPlayer(moved, 'home', 9).position).toEqual({ x: 70, y: 30 })
    expect(board).toEqual(before)
    expect(moved.ball).toBe(board.ball)
    expect(moved.teams.away).toBe(board.teams.away)
    expect(moved.teams.home.players.filter((p) => p.number !== 9)).toEqual(
      board.teams.home.players.filter((p) => p.number !== 9),
    )
    expect(validateBoard(moved)).toEqual([])
  })

  it('moves the ball', () => {
    const board = createDefaultBoard()
    const moved = moveToken(board, { kind: 'ball' }, { x: 12.5, y: 80 })
    expect(moved.ball.position).toEqual({ x: 12.5, y: 80 })
    expect(moved.teams).toBe(board.teams)
  })

  it('clamps to the pitch bounds', () => {
    const board = createDefaultBoard()
    expect(moveToken(board, { kind: 'ball' }, { x: 140, y: -20 }).ball.position).toEqual({
      x: 100,
      y: 0,
    })
    const id = getPlayer(board, 'away', 1).id
    const moved = moveToken(board, { kind: 'player', side: 'away', id }, { x: -5, y: 101 })
    expect(getPlayer(moved, 'away', 1).position).toEqual({ x: 0, y: 100 })
  })

  it('returns the same board for an unknown token or an unchanged position', () => {
    const board = createDefaultBoard()
    expect(moveToken(board, { kind: 'player', side: 'home', id: 'nobody' }, { x: 1, y: 1 })).toBe(
      board,
    )
    expect(moveToken(board, { kind: 'ball' }, board.ball.position)).toBe(board)
  })
})
