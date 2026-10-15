import type { TeamColours } from '../board/types'

/**
 * A roster is a saved squad a streamer can pick teams from. Unlike a board team it has any
 * number of players (shirt numbers still keep it to 99) and no positions. Rosters are plain,
 * JSON-serialisable objects, stored separately from boards.
 */

/** A player as written in a squad list: just a shirt number and a name. */
export interface SquadEntry {
  /** Shirt number, an integer from 1 to 99. */
  number: number
  name: string
}

export interface RosterPlayer extends SquadEntry {
  /** Unique within the roster; stays the same when the number or name is edited. */
  id: string
}

export interface Roster {
  /** Unique among saved rosters. */
  id: string
  name: string
  colours: TeamColours
  /** In squad list order. Shirt numbers are unique within the roster. */
  players: RosterPlayer[]
}
