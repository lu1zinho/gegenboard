import { afterEach, describe, expect, it, vi } from 'vitest'
import { getLocalStorage, isRecord } from './storage'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getLocalStorage', () => {
  it("returns the browser's localStorage", () => {
    expect(getLocalStorage()).toBe(window.localStorage)
  })

  it('returns null where accessing localStorage throws', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Access denied', 'SecurityError')
    })
    expect(getLocalStorage()).toBeNull()
  })
})

describe('isRecord', () => {
  it('accepts objects', () => {
    expect(isRecord({})).toBe(true)
    expect(isRecord({ version: 1 })).toBe(true)
  })

  it.each([[null], [[]], ['board'], [1], [true], [undefined]])('rejects %j', (value) => {
    expect(isRecord(value)).toBe(false)
  })
})
