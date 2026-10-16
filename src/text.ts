import type { TeamSide } from './board/types'

/** Text helpers shared by the model and the interface. */

/** How each side is named on screen. */
export const SIDE_LABELS: Readonly<Record<TeamSide, string>> = { home: 'Home', away: 'Away' }

/** Trims a name and collapses runs of whitespace (tabs, non-breaking spaces) to one space. */
export function tidyName(name: string): string {
  return name.replace(/\s+/gu, ' ').trim()
}

/** A count with its noun, e.g. `1 player` or `25 players`. */
export function countOf(count: number, noun: string): string {
  return `${count} ${count === 1 ? noun : `${noun}s`}`
}
