import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useHistory } from './useHistory'

function renderHistory(initial = 0) {
  return renderHook(() => useHistory<number>(() => initial))
}

describe('useHistory', () => {
  it('starts at the initial value with nothing to undo or redo', () => {
    const { result } = renderHistory(7)
    expect(result.current).toMatchObject({ present: 7, canUndo: false, canRedo: false })
  })

  it('calls the initialiser once', () => {
    const initial = vi.fn(() => 1)
    const { result } = renderHook(() => useHistory(initial))
    act(() => {
      result.current.change((n) => n + 1)
    })
    expect(initial).toHaveBeenCalledTimes(1)
  })

  it('applies changes to the present value and undoes and redoes them', () => {
    const { result } = renderHistory()
    act(() => {
      result.current.change((n) => n + 1)
    })
    act(() => {
      result.current.change((n) => n * 10)
    })
    expect(result.current).toMatchObject({ present: 10, canUndo: true, canRedo: false })

    act(() => {
      result.current.undo()
    })
    expect(result.current).toMatchObject({ present: 1, canUndo: true, canRedo: true })

    act(() => {
      result.current.undo()
    })
    expect(result.current).toMatchObject({ present: 0, canUndo: false, canRedo: true })

    act(() => {
      result.current.redo()
    })
    expect(result.current).toMatchObject({ present: 1, canUndo: true, canRedo: true })
  })

  it('works out each change from the latest value, even within one event', () => {
    const { result } = renderHistory()
    act(() => {
      result.current.change((n) => n + 1)
      result.current.change((n) => n + 1)
    })
    expect(result.current.present).toBe(2)

    act(() => {
      result.current.undo()
    })
    expect(result.current.present).toBe(1)
  })

  it('clears redo after a new change', () => {
    const { result } = renderHistory()
    act(() => {
      result.current.change(() => 1)
    })
    act(() => {
      result.current.undo()
    })
    expect(result.current.canRedo).toBe(true)

    act(() => {
      result.current.change(() => 2)
    })
    expect(result.current).toMatchObject({ present: 2, canRedo: false })
    act(() => {
      result.current.redo()
    })
    expect(result.current.present).toBe(2)
  })

  it('merges changes in the same group into one undo step', () => {
    const { result } = renderHistory()
    for (const x of [1, 2, 3]) {
      act(() => {
        result.current.change(() => x, { group: 'drag-1' })
      })
    }
    act(() => {
      result.current.undo()
    })
    expect(result.current).toMatchObject({ present: 0, canUndo: false })
  })

  it('keeps the same functions between renders', () => {
    const { result } = renderHistory()
    const { change, undo, redo } = result.current
    act(() => {
      result.current.change(() => 1)
    })
    expect(result.current.change).toBe(change)
    expect(result.current.undo).toBe(undo)
    expect(result.current.redo).toBe(redo)
  })
})
