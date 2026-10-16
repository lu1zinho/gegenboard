import { describe, expect, it } from 'vitest'
import { boardWithStrikerAt } from '../test/board'
import { createDefaultBoard } from './defaultBoard'
import {
  boardNameProblem,
  deleteSavedBoard,
  findSavedBoard,
  renameProblem,
  renameSavedBoard,
  saveBoard,
  type SavedBoard,
} from './savedBoards'

const KICK_OFF: SavedBoard = { id: 'board-1', name: 'Kick-off', board: createDefaultBoard() }
const HIGH_PRESS: SavedBoard = { id: 'board-2', name: 'High press', board: boardWithStrikerAt(80) }
const TWO_BOARDS = [KICK_OFF, HIGH_PRESS]

describe('saveBoard', () => {
  it('adds a board under a new name, with a new id', () => {
    const board = boardWithStrikerAt(60)
    expect(saveBoard(TWO_BOARDS, 'Counter-attack', board)).toEqual([
      KICK_OFF,
      HIGH_PRESS,
      { id: 'board-3', name: 'Counter-attack', board },
    ])
  })

  it('numbers the first board 1 and never reuses a higher id', () => {
    const board = createDefaultBoard()
    expect(saveBoard([], 'Kick-off', board)).toEqual([{ id: 'board-1', name: 'Kick-off', board }])
    const afterGap = saveBoard([HIGH_PRESS], 'Kick-off', board)
    expect(afterGap.map((saved) => saved.id)).toEqual(['board-2', 'board-3'])
  })

  it('tidies the name', () => {
    const [saved] = saveBoard([], '  Low   block ', createDefaultBoard())
    expect(saved?.name).toBe('Low block')
  })

  it('replaces the board saved under the same name, in its place, ignoring case', () => {
    const board = boardWithStrikerAt(60)
    expect(saveBoard(TWO_BOARDS, ' kick-OFF ', board)).toEqual([
      { id: 'board-1', name: 'kick-OFF', board },
      HIGH_PRESS,
    ])
  })

  it('does not change the list it is given', () => {
    const boards = [...TWO_BOARDS]
    saveBoard(boards, 'Counter-attack', createDefaultBoard())
    saveBoard(boards, 'Kick-off', boardWithStrikerAt(60))
    expect(boards).toEqual([KICK_OFF, HIGH_PRESS])
    expect(KICK_OFF.board).toEqual(createDefaultBoard())
  })
})

describe('renameSavedBoard', () => {
  it('renames the board with the id, keeping its board and place', () => {
    expect(renameSavedBoard(TWO_BOARDS, 'board-1', ' Shape at  kick-off')).toEqual([
      { ...KICK_OFF, name: 'Shape at kick-off' },
      HIGH_PRESS,
    ])
    expect(KICK_OFF.name).toBe('Kick-off')
  })

  it('changes nothing for an unknown id', () => {
    expect(renameSavedBoard(TWO_BOARDS, 'board-9', 'Other')).toEqual(TWO_BOARDS)
  })
})

describe('deleteSavedBoard', () => {
  it('deletes the board with the id', () => {
    expect(deleteSavedBoard(TWO_BOARDS, 'board-1')).toEqual([HIGH_PRESS])
    expect(deleteSavedBoard(TWO_BOARDS, 'board-2')).toEqual([KICK_OFF])
    expect(TWO_BOARDS).toHaveLength(2)
  })

  it('changes nothing for an unknown id', () => {
    expect(deleteSavedBoard(TWO_BOARDS, 'board-9')).toEqual(TWO_BOARDS)
  })
})

describe('findSavedBoard', () => {
  it('finds a board by name, ignoring case and extra whitespace', () => {
    expect(findSavedBoard(TWO_BOARDS, 'High press')).toBe(HIGH_PRESS)
    expect(findSavedBoard(TWO_BOARDS, '  HIGH   PRESS')).toBe(HIGH_PRESS)
    expect(findSavedBoard(TWO_BOARDS, 'Low block')).toBeUndefined()
  })
})

describe('board names', () => {
  it('requires a name that is not blank', () => {
    expect(boardNameProblem('High press')).toBeNull()
    expect(boardNameProblem('')).toBe('Give the board a name')
    expect(boardNameProblem('   ')).toBe('Give the board a name')
  })

  it("refuses to rename a board to another board's name", () => {
    expect(renameProblem(TWO_BOARDS, 'board-1', 'high PRESS')).toBe(
      'There is already a saved board called High press',
    )
  })

  it('lets a board be renamed to a new name or its own name in other case', () => {
    expect(renameProblem(TWO_BOARDS, 'board-1', 'Low block')).toBeNull()
    expect(renameProblem(TWO_BOARDS, 'board-1', 'KICK-OFF')).toBeNull()
  })

  it('refuses a blank new name', () => {
    expect(renameProblem(TWO_BOARDS, 'board-1', ' ')).toBe('Give the board a name')
  })
})
