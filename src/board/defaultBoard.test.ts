import { describe, expect, it } from 'vitest'
import { getPlayer } from '../test/board'
import { createDefaultBoard } from './defaultBoard'
import { TEAM_SIDES } from './types'

describe('createDefaultBoard', () => {
  it('has two teams of 11 players', () => {
    const board = createDefaultBoard()
    expect(board.teams.home.players).toHaveLength(11)
    expect(board.teams.away.players).toHaveLength(11)
  })

  it('gives every player a unique shirt number within the team and a name', () => {
    const board = createDefaultBoard()
    for (const side of TEAM_SIDES) {
      const { players } = board.teams[side]
      expect(new Set(players.map((p) => p.number)).size).toBe(11)
      for (const player of players) {
        expect(player.name).not.toBe('')
      }
    }
  })

  it('gives the teams different names and colours', () => {
    const { home, away } = createDefaultBoard().teams
    expect(home.name).not.toBe(away.name)
    expect(home.colours.primary).not.toBe(away.colours.primary)
  })

  it('keeps each team in its own half for kick-off', () => {
    const board = createDefaultBoard()
    for (const player of board.teams.home.players) {
      expect(player.position.x).toBeLessThan(50)
    }
    for (const player of board.teams.away.players) {
      expect(player.position.x).toBeGreaterThan(50)
    }
  })

  it('puts each goalkeeper in front of their own goal', () => {
    const board = createDefaultBoard()
    expect(getPlayer(board, 'home', 1).position).toEqual({ x: 5, y: 50 })
    expect(getPlayer(board, 'away', 1).position).toEqual({ x: 95, y: 50 })
  })

  it('keeps left-backs on their left flank for both directions of attack', () => {
    const board = createDefaultBoard()
    // Home attacks to the right, so its left flank is the top of the pitch; away is the reverse.
    expect(getPlayer(board, 'home', 3).position.y).toBeLessThan(50)
    expect(getPlayer(board, 'away', 3).position.y).toBeGreaterThan(50)
  })

  it('places the ball on the centre spot with no arrows', () => {
    const board = createDefaultBoard()
    expect(board.ball.position).toEqual({ x: 50, y: 50 })
    expect(board.arrows).toEqual([])
  })

  it('survives a JSON round trip unchanged', () => {
    const board = createDefaultBoard()
    expect(JSON.parse(JSON.stringify(board))).toEqual(board)
  })

  it('returns a new board every call', () => {
    const first = createDefaultBoard()
    getPlayer(first, 'home', 9).position.x = 80
    first.teams.away.colours.primary = '#000000'

    const second = createDefaultBoard()
    expect(getPlayer(second, 'home', 9).position.x).toBe(46)
    expect(second.teams.away.colours.primary).toBe('#1565c0')
  })
})
