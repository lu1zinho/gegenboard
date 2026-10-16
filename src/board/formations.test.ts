import { describe, expect, it } from 'vitest'
import { getPlayer } from '../test/board'
import { createDefaultBoard } from './defaultBoard'
import { FORMATION_IDS, applyFormation, formationOf, formationPositions } from './formations'
import { isOnPitch, mirrorPosition } from './pitch'
import { deserialiseBoard } from './storage'
import { TEAM_SIDES } from './types'
import { validateBoard } from './validate'

describe('formationPositions', () => {
  describe.each(FORMATION_IDS)('%s', (id) => {
    it('has 11 positions inside the pitch for each side', () => {
      for (const side of TEAM_SIDES) {
        const positions = formationPositions(id, side)
        expect(positions).toHaveLength(11)
        expect(positions.every(isOnPitch)).toBe(true)
      }
    })

    it('has no two players on the same spot', () => {
      const spots = new Set(formationPositions(id, 'home').map(({ x, y }) => `${x},${y}`))
      expect(spots.size).toBe(11)
    })

    it('puts the goalkeeper first, nearest the own goal', () => {
      const [keeper, ...outfield] = formationPositions(id, 'home')
      expect(keeper).toEqual({ x: 5, y: 50 })
      expect(outfield.every((position) => position.x > 5)).toBe(true)
    })

    it('keeps the home team in its own half', () => {
      expect(formationPositions(id, 'home').every((position) => position.x < 50)).toBe(true)
    })

    it('mirrors the away side through the centre spot', () => {
      const home = formationPositions(id, 'home')
      expect(formationPositions(id, 'away')).toEqual(home.map(mirrorPosition))
      expect(formationPositions(id, 'away').every((position) => position.x > 50)).toBe(true)
    })

    it('returns fresh objects every call', () => {
      const first = formationPositions(id, 'home')
      const second = formationPositions(id, 'home')
      expect(first).not.toBe(second)
      expect(first[0]).not.toBe(second[0])
    })
  })

  it('defends with the number of players in the name', () => {
    for (const id of FORMATION_IDS) {
      const defenders = Number(id.split('-')[0])
      const positions = formationPositions(id, 'home')
      expect(positions.slice(1, 1 + defenders).every((position) => position.x <= 20)).toBe(true)
      expect(positions[1 + defenders]?.x).toBeGreaterThan(20)
    }
  })
})

describe('applyFormation', () => {
  it('repositions the team in order, keeper first', () => {
    const board = applyFormation(createDefaultBoard(), 'home', '4-2-3-1')
    expect(board.teams.home.players.map((player) => player.position)).toEqual(
      formationPositions('4-2-3-1', 'home'),
    )
  })

  it('mirrors the positions for the away team', () => {
    const board = applyFormation(createDefaultBoard(), 'away', '3-5-2')
    expect(board.teams.away.players.map((player) => player.position)).toEqual(
      formationPositions('3-5-2', 'away'),
    )
    expect(getPlayer(board, 'away', 1).position).toEqual({ x: 95, y: 50 })
  })

  it('keeps numbers, names and ids', () => {
    const before = createDefaultBoard()
    const after = applyFormation(before, 'home', '3-5-2')
    const identity = (board: typeof before) =>
      board.teams.home.players.map(({ id, number, name }) => ({ id, number, name }))
    expect(identity(after)).toEqual(identity(before))
  })

  it('leaves the other team, ball and arrows alone', () => {
    const before = createDefaultBoard()
    const after = applyFormation(before, 'home', '4-4-2')
    expect(after.teams.away).toEqual(before.teams.away)
    expect(after.ball).toEqual(before.ball)
    expect(after.arrows).toEqual(before.arrows)
    expect(after.teams.home.name).toBe(before.teams.home.name)
    expect(after.teams.home.colours).toEqual(before.teams.home.colours)
  })

  it('does not mutate the original board', () => {
    const before = createDefaultBoard()
    const snapshot = structuredClone(before)
    applyFormation(before, 'away', '4-4-2')
    expect(before).toEqual(snapshot)
  })

  it('gives a valid, JSON-serialisable board for every formation and side', () => {
    for (const id of FORMATION_IDS) {
      for (const side of TEAM_SIDES) {
        const board = applyFormation(createDefaultBoard(), side, id)
        expect(validateBoard(board)).toEqual([])
        expect(JSON.parse(JSON.stringify(board))).toEqual(board)
      }
    }
  })

  it('changes positions when the formation differs from the lineup', () => {
    const before = createDefaultBoard()
    const after = applyFormation(before, 'home', '4-2-3-1')
    expect(after.teams.home.players).not.toEqual(before.teams.home.players)
  })
})

describe('formationOf', () => {
  it('reads the formations the default board lines up in', () => {
    const board = createDefaultBoard()
    expect(formationOf(board, 'home')).toBe('4-3-3')
    expect(formationOf(board, 'away')).toBe('4-4-2')
  })

  it.each(FORMATION_IDS)('reads %s back after applying it to either side', (id) => {
    for (const side of TEAM_SIDES) {
      const board = applyFormation(createDefaultBoard(), side, id)
      expect(formationOf(board, side)).toBe(id)
    }
  })

  it('reads a formation from a board saved and restored as JSON', () => {
    const restored = deserialiseBoard(
      JSON.stringify(applyFormation(createDefaultBoard(), 'away', '3-5-2')),
    )
    if (!restored) throw new Error('The board could not be restored')
    expect(formationOf(restored, 'away')).toBe('3-5-2')
  })

  it('returns null once a player leaves the formation', () => {
    const board = createDefaultBoard()
    getPlayer(board, 'home', 9).position = { x: 80, y: 50 }
    expect(formationOf(board, 'home')).toBeNull()
    expect(formationOf(board, 'away')).toBe('4-4-2')
  })

  it('reads the formation whichever player stands on which spot', () => {
    const board = createDefaultBoard()
    const [keeper, rightBack] = board.teams.home.players
    if (!keeper || !rightBack) throw new Error('Expected a full team')
    ;[keeper.position, rightBack.position] = [rightBack.position, keeper.position]
    expect(formationOf(board, 'home')).toBe('4-3-3')
  })

  it('returns null when two players share a spot of the formation', () => {
    const board = createDefaultBoard()
    getPlayer(board, 'home', 9).position = { ...getPlayer(board, 'home', 11).position }
    expect(formationOf(board, 'home')).toBeNull()
  })
})
