/**
 * Undo history for any value that is changed by replacing it with a new one, never by
 * mutating it: the board today, anything else later. Pure functions over plain data.
 */

/** A state the history can hold: anything but `undefined`, which it uses to mean "no state". */
export type Snapshot = object | string | number | boolean | null

export interface History<T extends Snapshot> {
  /** Earlier states, oldest first: undo goes back to the last one. */
  past: T[]
  present: T
  /** Undone states, nearest first: redo goes forward to the first one. */
  future: T[]
  /** The group of the latest change, or `null`. See `ChangeOptions.group`. */
  group: string | null
}

export interface ChangeOptions {
  /**
   * Changes in a row with the same group make a single undo step: the first one adds a step
   * and the rest update it. Use one group per gesture, e.g. per drag or per edited field, so
   * undo doesn't replay every intermediate state. Undo and redo end the group.
   */
  group?: string
  /** The most undo steps kept; older ones are dropped. */
  limit?: number
}

export const HISTORY_LIMIT = 100

/** A history with nothing to undo or redo. */
export function createHistory<T extends Snapshot>(present: T): History<T> {
  return { past: [], present, future: [], group: null }
}

export function canUndo(history: History<Snapshot>): boolean {
  return history.past.length > 0
}

export function canRedo(history: History<Snapshot>): boolean {
  return history.future.length > 0
}

/**
 * Makes `next` the present state, as a new undo step unless it continues the latest change's
 * group. Any undone states can no longer be redone. Returns the same history if `next` is the
 * present state itself, so an update that changes nothing should return its input unchanged.
 */
export function recordChange<T extends Snapshot>(
  history: History<T>,
  next: T,
  { group, limit = HISTORY_LIMIT }: ChangeOptions = {},
): History<T> {
  if (Object.is(next, history.present)) return history
  if (group !== undefined && group === history.group) {
    return { past: history.past, present: next, future: [], group }
  }
  const past = [...history.past, history.present]
  return {
    past: past.length > limit ? past.slice(past.length - limit) : past,
    present: next,
    future: [],
    group: group ?? null,
  }
}

/** Goes back to the previous state, or returns the same history if there is none. */
export function undo<T extends Snapshot>(history: History<T>): History<T> {
  const previous = history.past.at(-1)
  if (previous === undefined) return history
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
    group: null,
  }
}

/** Goes forward to the state last undone, or returns the same history if there is none. */
export function redo<T extends Snapshot>(history: History<T>): History<T> {
  const [next, ...future] = history.future
  if (next === undefined) return history
  return {
    past: [...history.past, history.present],
    present: next,
    future,
    group: null,
  }
}
