import { describe, expect, it } from 'vitest'
import { parseStreamOptions } from './options'

describe('parseStreamOptions', () => {
  it('is opaque by default', () => {
    expect(parseStreamOptions('')).toEqual({ transparent: false })
  })

  it('reads bg=transparent', () => {
    expect(parseStreamOptions('?bg=transparent')).toEqual({ transparent: true })
    expect(parseStreamOptions('?x=1&bg=Transparent')).toEqual({ transparent: true })
  })

  it('ignores other background values', () => {
    expect(parseStreamOptions('?bg=red')).toEqual({ transparent: false })
    expect(parseStreamOptions('?bg=')).toEqual({ transparent: false })
  })
})
