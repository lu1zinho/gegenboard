/**
 * The board is one plain, JSON-serialisable object: no classes, dates, functions or
 * `undefined` values, so `JSON.parse(JSON.stringify(board))` gives back an equal board.
 */

/**
 * A point on the pitch as percentages of its size, so the model is independent of the
 * pitch's rendered dimensions. The pitch is landscape:
 * - `x` runs along the length: 0 is the left goal line, 100 the right goal line.
 * - `y` runs across the width: 0 is the top touchline, 100 the bottom touchline.
 */
export interface PitchPosition {
  x: number
  y: number
}

export const TEAM_SIDES = ['home', 'away'] as const

/** `home` defends the left goal (attacks left to right), `away` defends the right goal. */
export type TeamSide = (typeof TEAM_SIDES)[number]

export interface TeamColours {
  /** Shirt colour, as `#rrggbb`. */
  primary: string
  /** Colour of the shirt number and outline, as `#rrggbb`. */
  secondary: string
}

export interface Player {
  /** Unique across the whole board. */
  id: string
  /** Shirt number, an integer from 1 to 99, unique within the team. */
  number: number
  name: string
  position: PitchPosition
}

export interface Team {
  name: string
  colours: TeamColours
  players: Player[]
}

export interface Ball {
  position: PitchPosition
}

export type ArrowStyle = 'solid' | 'dashed'

export interface Arrow {
  id: string
  from: PitchPosition
  to: PitchPosition
  /** As `#rrggbb`. */
  colour: string
  style: ArrowStyle
}

export interface Board {
  /** Schema version, bumped on breaking changes so saved boards can be migrated. */
  version: 1
  teams: Record<TeamSide, Team>
  ball: Ball
  arrows: Arrow[]
}
