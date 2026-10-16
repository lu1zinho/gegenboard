import { describe, expect, it } from 'vitest'
import { countOf, tidyName } from './text'

describe('tidyName', () => {
  it('trims and collapses whitespace', () => {
    expect(tidyName('  Lionel \t  Messi \n')).toBe('Lionel Messi')
    expect(tidyName('High  press')).toBe('High press')
  })

  it('leaves a tidy name alone', () => {
    expect(tidyName('Virgil van Dijk')).toBe('Virgil van Dijk')
  })
})

describe('countOf', () => {
  it('uses the singular for one and the plural otherwise', () => {
    expect(countOf(1, 'player')).toBe('1 player')
    expect(countOf(0, 'player')).toBe('0 players')
    expect(countOf(25, 'saved board')).toBe('25 saved boards')
  })
})
