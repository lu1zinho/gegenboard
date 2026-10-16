import { describe, expect, it } from 'vitest'
import { nextId } from './ids'

describe('nextId', () => {
  it('starts at 1', () => {
    expect(nextId('board-', [])).toBe('board-1')
  })

  it('follows the highest number in use, never filling gaps', () => {
    expect(nextId('p', ['p1', 'p2'])).toBe('p3')
    expect(nextId('board-', ['board-7', 'board-2'])).toBe('board-8')
  })

  it('ignores ids in another form', () => {
    expect(nextId('roster-', ['imported', 'roster-x', 'roster-2b', 'board-9'])).toBe('roster-1')
  })
})
