import { describe, expect, it } from 'vitest'
import {
  PITCH_LENGTH,
  PITCH_WIDTH,
  clampPosition,
  fromScreenPoint,
  isOnPitch,
  mirrorPosition,
  toPitchPoint,
} from './pitch'

describe('toPitchPoint', () => {
  it('maps the corners and centre spot to metres', () => {
    expect(toPitchPoint({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 })
    expect(toPitchPoint({ x: 100, y: 100 })).toEqual({ x: PITCH_LENGTH, y: PITCH_WIDTH })
    expect(toPitchPoint({ x: 50, y: 50 })).toEqual({ x: 52.5, y: 34 })
  })

  it('scales each axis by its own dimension', () => {
    expect(toPitchPoint({ x: 20, y: 25 })).toEqual({ x: 21, y: 17 })
  })
})

describe('mirrorPosition', () => {
  it('rotates a position 180° about the centre spot', () => {
    expect(mirrorPosition({ x: 5, y: 50 })).toEqual({ x: 95, y: 50 })
    expect(mirrorPosition({ x: 20, y: 15 })).toEqual({ x: 80, y: 85 })
  })

  it('leaves the centre spot where it is', () => {
    expect(mirrorPosition({ x: 50, y: 50 })).toEqual({ x: 50, y: 50 })
  })

  it('is its own inverse', () => {
    const position = { x: 12.5, y: 73 }
    expect(mirrorPosition(mirrorPosition(position))).toEqual(position)
  })
})

describe('isOnPitch', () => {
  it('accepts positions inside the pitch and on its lines', () => {
    expect(isOnPitch({ x: 50, y: 50 })).toBe(true)
    expect(isOnPitch({ x: 0, y: 0 })).toBe(true)
    expect(isOnPitch({ x: 100, y: 100 })).toBe(true)
  })

  it('rejects positions off the pitch', () => {
    expect(isOnPitch({ x: -0.1, y: 50 })).toBe(false)
    expect(isOnPitch({ x: 50, y: 100.1 })).toBe(false)
  })

  it('rejects non-finite values', () => {
    expect(isOnPitch({ x: Number.NaN, y: 50 })).toBe(false)
    expect(isOnPitch({ x: 50, y: Number.POSITIVE_INFINITY })).toBe(false)
  })
})

describe('clampPosition', () => {
  it('keeps positions on the pitch as they are', () => {
    expect(clampPosition({ x: 0, y: 100 })).toEqual({ x: 0, y: 100 })
    expect(clampPosition({ x: 33.3, y: 66.6 })).toEqual({ x: 33.3, y: 66.6 })
  })

  it('pulls positions off the pitch to the nearest edge', () => {
    expect(clampPosition({ x: -10, y: 50 })).toEqual({ x: 0, y: 50 })
    expect(clampPosition({ x: 250, y: -1 })).toEqual({ x: 100, y: 0 })
  })

  it('maps non-finite coordinates to the centre line', () => {
    expect(clampPosition({ x: Number.NaN, y: Number.POSITIVE_INFINITY })).toEqual({ x: 50, y: 50 })
  })
})

describe('fromScreenPoint', () => {
  const rect = { left: 100, top: 50, width: 400, height: 200 }

  it('converts a screen point to percentages of the pitch rectangle', () => {
    expect(fromScreenPoint({ x: 300, y: 100 }, rect)).toEqual({ x: 50, y: 25 })
    expect(fromScreenPoint({ x: 100, y: 250 }, rect)).toEqual({ x: 0, y: 100 })
  })

  it('does not clamp points outside the rectangle', () => {
    expect(fromScreenPoint({ x: 0, y: 0 }, rect)).toEqual({ x: -25, y: -25 })
  })
})
