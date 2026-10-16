import { useCallback, useMemo, useState } from 'react'
import {
  canRedo,
  canUndo,
  createHistory,
  recordChange,
  redo,
  undo,
  type ChangeOptions,
  type Snapshot,
} from './history'

export interface HistoryControls<T extends Snapshot> {
  present: T
  canUndo: boolean
  canRedo: boolean
  /**
   * Records a change as an undo step. `update` gets the present state and returns the next
   * one, or the same object to change nothing. It must be pure: React may call it twice.
   */
  change: (update: (present: T) => T, options?: Pick<ChangeOptions, 'group'>) => void
  undo: () => void
  redo: () => void
}

/**
 * Keeps a value with undo and redo. Make every change through `change`, so all of them can
 * be undone. `initial` is called once, on the first render.
 */
export function useHistory<T extends Snapshot>(initial: () => T): HistoryControls<T> {
  const [history, setHistory] = useState(() => createHistory(initial()))

  const change = useCallback(
    (update: (present: T) => T, options?: Pick<ChangeOptions, 'group'>) => {
      setHistory((current) => recordChange(current, update(current.present), options))
    },
    [],
  )
  const undoChange = useCallback(() => {
    setHistory(undo)
  }, [])
  const redoChange = useCallback(() => {
    setHistory(redo)
  }, [])

  return useMemo(
    () => ({
      present: history.present,
      canUndo: canUndo(history),
      canRedo: canRedo(history),
      change,
      undo: undoChange,
      redo: redoChange,
    }),
    [history, change, undoChange, redoChange],
  )
}
