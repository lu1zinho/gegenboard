import type { Board } from './types'

/*
 * Pure functions over the list of named boards. They never mutate their arguments: each
 * returns a new list.
 */

/** A board saved under a name, to load again later. */
export interface SavedBoard {
  /** Unique among saved boards. Stays the same when the board is renamed or saved over. */
  id: string
  /** Unique among saved boards, ignoring case. */
  name: string
  board: Board
}

/** Trims a name and collapses the whitespace inside it. */
export function tidyBoardName(name: string): string {
  return name.replace(/\s+/gu, ' ').trim()
}

/** The saved board with this name, ignoring case and extra whitespace, if there is one. */
export function findSavedBoard(
  boards: readonly SavedBoard[],
  name: string,
): SavedBoard | undefined {
  const wanted = comparable(name)
  return boards.find((saved) => comparable(saved.name) === wanted)
}

/** Why a board can't be saved under this name, or `null` if it can. */
export function boardNameProblem(name: string): string | null {
  return tidyBoardName(name) === '' ? 'Give the board a name' : null
}

/** Why the saved board with this id can't be renamed to `name`, or `null` if it can. */
export function renameProblem(
  boards: readonly SavedBoard[],
  id: string,
  name: string,
): string | null {
  const problem = boardNameProblem(name)
  if (problem !== null) return problem
  const other = findSavedBoard(boards, name)
  return other && other.id !== id ? `There is already a saved board called ${other.name}` : null
}

/**
 * Saves a board under a name. A board already saved under that name, ignoring case, is
 * replaced in its place; otherwise the board is added at the end.
 */
export function saveBoard(boards: readonly SavedBoard[], name: string, board: Board): SavedBoard[] {
  const tidied = tidyBoardName(name)
  const existing = findSavedBoard(boards, tidied)
  if (existing) {
    return boards.map((saved) =>
      saved.id === existing.id ? { ...saved, name: tidied, board } : saved,
    )
  }
  return [...boards, { id: nextSavedBoardId(boards), name: tidied, board }]
}

export function renameSavedBoard(
  boards: readonly SavedBoard[],
  id: string,
  name: string,
): SavedBoard[] {
  const tidied = tidyBoardName(name)
  return boards.map((saved) => (saved.id === id ? { ...saved, name: tidied } : saved))
}

export function deleteSavedBoard(boards: readonly SavedBoard[], id: string): SavedBoard[] {
  return boards.filter((saved) => saved.id !== id)
}

/** An id no saved board has: `board-` and one more than the highest number in use. */
function nextSavedBoardId(boards: readonly SavedBoard[]): string {
  let highest = 0
  for (const { id } of boards) {
    const match = /^board-(\d+)$/u.exec(id)
    if (match?.[1] !== undefined) highest = Math.max(highest, Number(match[1]))
  }
  return `board-${highest + 1}`
}

function comparable(name: string): string {
  return tidyBoardName(name).toLocaleLowerCase()
}
