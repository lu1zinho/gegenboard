import type { PitchPosition } from './types'

/** Pitch dimensions in metres, used as SVG user units when rendering. */
export const PITCH_LENGTH = 105
export const PITCH_WIDTH = 68

export interface Point {
  x: number
  y: number
}

/** Converts a percentage position to metres from the top-left corner of the pitch. */
export function toPitchPoint(position: PitchPosition): Point {
  return {
    x: (position.x * PITCH_LENGTH) / 100,
    y: (position.y * PITCH_WIDTH) / 100,
  }
}

/**
 * Rotates a position 180° about the centre spot. This turns a shape drawn for the home team
 * (attacking left to right) into the same shape for the away team, keeping left and right
 * sided players on their correct flanks.
 */
export function mirrorPosition(position: PitchPosition): PitchPosition {
  return { x: 100 - position.x, y: 100 - position.y }
}

/** Whether a position lies on the pitch, touchlines and goal lines included. */
export function isOnPitch(position: PitchPosition): boolean {
  return isPercentage(position.x) && isPercentage(position.y)
}

function isPercentage(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 100
}
