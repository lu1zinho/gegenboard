import { describe, expect, it } from 'vitest'
import { getPlayer } from '../test/board'
import { createDefaultBoard } from './defaultBoard'
import type { Arrow } from './types'
import { validateBoard } from './validate'

function arrow(overrides: Partial<Arrow> = {}): Arrow {
  return {
    id: 'a1',
    from: { x: 30, y: 40 },
    to: { x: 60, y: 20 },
    colour: '#ffeb3b',
    style: 'solid',
    ...overrides,
  }
}

describe('validateBoard', () => {
  it('accepts the default board', () => {
    expect(validateBoard(createDefaultBoard())).toEqual([])
  })

  it('accepts arrows on the pitch', () => {
    const board = createDefaultBoard()
    board.arrows = [arrow(), arrow({ id: 'a2', style: 'dashed' })]
    expect(validateBoard(board)).toEqual([])
  })

  it('requires 11 players per team', () => {
    const board = createDefaultBoard()
    board.teams.away.players.pop()
    expect(validateBoard(board)).toEqual(['away has 10 players, expected 11'])
  })

  it('rejects duplicate shirt numbers within a team', () => {
    const board = createDefaultBoard()
    getPlayer(board, 'home', 11).number = 9
    expect(validateBoard(board)).toEqual(['home player home-11 has duplicate shirt number 9'])
  })

  it('allows the same shirt number in both teams', () => {
    const board = createDefaultBoard()
    expect(getPlayer(board, 'away', 9).number).toBe(getPlayer(board, 'home', 9).number)
    expect(validateBoard(board)).toEqual([])
  })

  it.each([0, 100, 7.5, Number.NaN])('rejects shirt number %s', (number) => {
    const board = createDefaultBoard()
    getPlayer(board, 'home', 7).number = number
    expect(validateBoard(board)).toEqual([
      'home player home-7 shirt number must be a whole number from 1 to 99',
    ])
  })

  it('rejects duplicate player ids across teams', () => {
    const board = createDefaultBoard()
    getPlayer(board, 'away', 1).id = 'home-1'
    expect(validateBoard(board)).toEqual(['away player home-1 has a duplicate id'])
  })

  it('rejects players, ball and arrows off the pitch', () => {
    const board = createDefaultBoard()
    getPlayer(board, 'away', 9).position = { x: 101, y: 50 }
    board.ball.position = { x: 50, y: -1 }
    board.arrows = [arrow({ from: { x: -5, y: 10 }, to: { x: 50, y: Number.NaN } })]
    expect(validateBoard(board)).toEqual([
      'away player away-9 is off the pitch',
      'ball is off the pitch',
      'arrow a1 start is off the pitch',
      'arrow a1 end is off the pitch',
    ])
  })

  it('requires #rrggbb colours', () => {
    const board = createDefaultBoard()
    board.teams.home.colours.primary = 'red'
    board.teams.away.colours.secondary = '#fff'
    board.arrows = [arrow({ colour: 'rgb(0, 0, 0)' })]
    expect(validateBoard(board)).toEqual([
      'home primary colour must be a #rrggbb colour',
      'away secondary colour must be a #rrggbb colour',
      'arrow a1 colour must be a #rrggbb colour',
    ])
  })

  it('rejects duplicate arrow ids', () => {
    const board = createDefaultBoard()
    board.arrows = [arrow(), arrow()]
    expect(validateBoard(board)).toEqual(['arrow a1 has a duplicate id'])
  })
})
