import { describe, expect, it } from 'vitest'
import { createDefaultBoard } from '../board/defaultBoard'
import type { Board } from '../board/types'
import {
  HISTORY_LIMIT,
  canRedo,
  canUndo,
  createHistory,
  recordChange,
  redo,
  undo,
  type History,
} from './history'

/** A history that went through the given states in order, ending at the last one. */
function historyOf<T extends number | string>(...states: [T, ...T[]]): History<T> {
  const [first, ...rest] = states
  return rest.reduce((history, state) => recordChange(history, state), createHistory(first))
}

describe('createHistory', () => {
  it('starts with nothing to undo or redo', () => {
    const history = createHistory('kick-off')
    expect(history).toEqual({ past: [], present: 'kick-off', future: [], group: null })
    expect(canUndo(history)).toBe(false)
    expect(canRedo(history)).toBe(false)
  })
})

describe('recordChange', () => {
  it('makes the change the present state and keeps the old one to undo to', () => {
    const history = recordChange(createHistory(1), 2)
    expect(history).toEqual({ past: [1], present: 2, future: [], group: null })
    expect(canUndo(history)).toBe(true)
    expect(canRedo(history)).toBe(false)
  })

  it('adds a step for each change', () => {
    expect(historyOf(1, 2, 3)).toEqual({ past: [1, 2], present: 3, future: [], group: null })
  })

  it('ignores a change to the same state', () => {
    const history = historyOf(1, 2)
    expect(recordChange(history, 2)).toBe(history)
  })

  it('does not mutate the history it is given', () => {
    const history = historyOf(1, 2)
    const copy = structuredClone(history)
    recordChange(history, 3)
    expect(history).toEqual(copy)
  })

  it('merges changes in a row from the same group into one step', () => {
    let history = createHistory<number>(0)
    history = recordChange(history, 1, { group: 'drag-1' })
    history = recordChange(history, 2, { group: 'drag-1' })
    history = recordChange(history, 3, { group: 'drag-1' })
    expect(history).toEqual({ past: [0], present: 3, future: [], group: 'drag-1' })
    expect(undo(history).present).toBe(0)
  })

  it('starts a new step for a different group or a change without one', () => {
    let history = createHistory<number>(0)
    history = recordChange(history, 1, { group: 'drag-1' })
    history = recordChange(history, 2, { group: 'drag-2' })
    history = recordChange(history, 3)
    history = recordChange(history, 4)
    expect(history.past).toEqual([0, 1, 2, 3])
  })

  it('starts a new step after undo, even in the same group', () => {
    let history = createHistory<number>(0)
    history = recordChange(history, 1, { group: 'name' })
    history = recordChange(history, 2, { group: 'name' })
    history = recordChange(undo(history), 5, { group: 'name' })
    history = recordChange(history, 6, { group: 'name' })
    expect(history).toEqual({ past: [0], present: 6, future: [], group: 'name' })
  })

  it('keeps at most the limit of undo steps, dropping the oldest', () => {
    let history = createHistory<number>(0)
    for (let state = 1; state <= HISTORY_LIMIT + 10; state++) {
      history = recordChange(history, state)
    }
    expect(history.past).toHaveLength(HISTORY_LIMIT)
    expect(history.past[0]).toBe(10)

    expect(recordChange(historyOf(1, 2, 3), 4, { limit: 2 }).past).toEqual([2, 3])
  })
})

describe('undo', () => {
  it('goes back to the previous state and lets it be redone', () => {
    const history = undo(historyOf(1, 2, 3))
    expect(history).toEqual({ past: [1], present: 2, future: [3], group: null })
    expect(canUndo(history)).toBe(true)
    expect(canRedo(history)).toBe(true)
  })

  it('goes back step by step to the first state', () => {
    const history = undo(undo(historyOf(1, 2, 3)))
    expect(history).toEqual({ past: [], present: 1, future: [2, 3], group: null })
    expect(canUndo(history)).toBe(false)
  })

  it('does nothing when there is nothing to undo', () => {
    const history = createHistory(1)
    expect(undo(history)).toBe(history)
  })
})

describe('redo', () => {
  it('goes forward to the state last undone', () => {
    const history = redo(undo(undo(historyOf(1, 2, 3))))
    expect(history).toEqual({ past: [1], present: 2, future: [3], group: null })
  })

  it('redoes everything that was undone, in order', () => {
    const history = redo(redo(undo(undo(historyOf(1, 2, 3)))))
    expect(history).toEqual(historyOf(1, 2, 3))
  })

  it('does nothing when there is nothing to redo', () => {
    const history = historyOf(1, 2)
    expect(redo(history)).toBe(history)
  })

  it('is no longer possible after a new change', () => {
    const undone = undo(undo(historyOf(1, 2, 3)))
    expect(canRedo(undone)).toBe(true)

    const changed = recordChange(undone, 4)
    expect(changed).toEqual({ past: [1], present: 4, future: [], group: null })
    expect(canRedo(changed)).toBe(false)
    expect(redo(changed)).toBe(changed)
  })

  it('is no longer possible after a grouped change', () => {
    const changed = recordChange(undo(historyOf(1, 2)), 3, { group: 'drag-1' })
    expect(changed.future).toEqual([])
  })
})

describe('board history', () => {
  function moveBall(board: Board, x: number, y: number): Board {
    return { ...board, ball: { position: { x, y } } }
  }

  it('undoes and redoes board changes without touching the boards', () => {
    const kickOff = createDefaultBoard()
    const attack = moveBall(kickOff, 80, 30)
    const cross = moveBall(attack, 95, 10)

    let history = recordChange(recordChange(createHistory(kickOff), attack), cross)
    history = undo(undo(history))
    expect(history.present).toBe(kickOff)
    expect(history.present).toEqual(createDefaultBoard())

    history = redo(history)
    expect(history.present).toBe(attack)
    expect(history.present.ball.position).toEqual({ x: 80, y: 30 })
  })
})
