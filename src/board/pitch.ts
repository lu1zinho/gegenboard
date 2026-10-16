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

/** Limits a position to the pitch. Non-finite coordinates fall back to the centre line. */
export function clampPosition(position: PitchPosition): PitchPosition {
  return { x: clampPercentage(position.x), y: clampPercentage(position.y) }
}

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 50
  return Math.min(100, Math.max(0, value))
}

/**
 * Converts a point in a rendered pitch to a (not yet clamped) percentage position, given the
 * pitch's on-screen rectangle.
 */
export function fromScreenPoint(
  point: Point,
  rect: { left: number; top: number; width: number; height: number },
): PitchPosition {
  return {
    x: ((point.x - rect.left) / rect.width) * 100,
    y: ((point.y - rect.top) / rect.height) * 100,
  }
}
