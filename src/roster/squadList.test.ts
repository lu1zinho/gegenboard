import { describe, expect, it } from 'vitest'
import { normaliseName, parseSquadList } from './squadList'

describe('parseSquadList', () => {
  it('reads one "number name" player per line, in order', () => {
    expect(parseSquadList('1 Ederson\n10 Messi\n9 Haaland')).toEqual({
      players: [
        { number: 1, name: 'Ederson' },
        { number: 10, name: 'Messi' },
        { number: 9, name: 'Haaland' },
      ],
      errors: [],
    })
  })

  it('keeps names with several words, accents and punctuation', () => {
    const { players, errors } = parseSquadList(
      "4 Virgil van Dijk\n8 Martin Ødegaard\n7 Nicolás González\n11 N'Golo Kanté\n3 Alexander-Arnold",
    )
    expect(errors).toEqual([])
    expect(players.map((player) => player.name)).toEqual([
      'Virgil van Dijk',
      'Martin Ødegaard',
      'Nicolás González',
      "N'Golo Kanté",
      'Alexander-Arnold',
    ])
  })

  it.each([
    ['10. Messi'],
    ['10 - Messi'],
    ['10 -Messi'],
    ['10-Messi'],
    ['10 – Messi'],
    ['10 — Messi'],
    ['10: Messi'],
    ['10) Messi'],
    ['#10 Messi'],
    ['10Messi'],
    ['10\tMessi'],
  ])('accepts the variant %j', (line) => {
    expect(parseSquadList(line)).toEqual({ players: [{ number: 10, name: 'Messi' }], errors: [] })
  })

  it('trims lines and collapses spaces, tabs and non-breaking spaces inside names', () => {
    expect(parseSquadList('   7   Bukayo \t Saka   \n 10 Lionel Messi ').players).toEqual([
      { number: 7, name: 'Bukayo Saka' },
      { number: 10, name: 'Lionel Messi' },
    ])
  })

  it('reads leading zeros as the plain number', () => {
    expect(parseSquadList('07 Saka').players).toEqual([{ number: 7, name: 'Saka' }])
  })

  it('accepts Windows and old Mac line endings', () => {
    expect(parseSquadList('1 Alisson\r\n2 Gomez\r3 Robertson').players).toHaveLength(3)
  })

  it('ignores blank lines without reporting them', () => {
    expect(parseSquadList('\n1 Alisson\n\n   \n2 Gomez\n')).toEqual({
      players: [
        { number: 1, name: 'Alisson' },
        { number: 2, name: 'Gomez' },
      ],
      errors: [],
    })
  })

  it('returns nothing for empty text', () => {
    expect(parseSquadList('')).toEqual({ players: [], errors: [] })
  })

  it('reports lines without a leading shirt number and keeps the rest', () => {
    expect(parseSquadList('Goalkeepers\n1 Alisson\nSalah 11\n2 Gomez')).toEqual({
      players: [
        { number: 1, name: 'Alisson' },
        { number: 2, name: 'Gomez' },
      ],
      errors: [
        { line: 1, text: 'Goalkeepers', reason: 'it should start with a shirt number' },
        { line: 3, text: 'Salah 11', reason: 'it should start with a shirt number' },
      ],
    })
  })

  it('reports a number without a name', () => {
    expect(parseSquadList('10\n11 -\n12 99').errors).toEqual([
      { line: 1, text: '10', reason: 'there is no player name after the number' },
      { line: 2, text: '11 -', reason: 'there is no player name after the number' },
      { line: 3, text: '12 99', reason: 'there is no player name after the number' },
    ])
  })

  it('reports shirt numbers outside 1 to 99', () => {
    expect(parseSquadList('0 Zero\n100 Hundred\n00 Nil').errors).toEqual([
      { line: 1, text: '0 Zero', reason: 'shirt number 0 is not between 1 and 99' },
      { line: 2, text: '100 Hundred', reason: 'shirt number 100 is not between 1 and 99' },
      { line: 3, text: '00 Nil', reason: 'shirt number 00 is not between 1 and 99' },
    ])
  })

  it('keeps the first player with a shirt number and reports later duplicates', () => {
    expect(parseSquadList('10 Messi\n7 Saka\n10 Maradona\n\n010 Pelé')).toEqual({
      players: [
        { number: 10, name: 'Messi' },
        { number: 7, name: 'Saka' },
      ],
      errors: [
        { line: 3, text: '10 Maradona', reason: 'shirt number 10 is already used on line 1' },
        { line: 5, text: '010 Pelé', reason: 'shirt number 10 is already used on line 1' },
      ],
    })
  })

  it('does not count a skipped line as using its shirt number', () => {
    expect(parseSquadList('10\n10 Messi')).toEqual({
      players: [{ number: 10, name: 'Messi' }],
      errors: [{ line: 1, text: '10', reason: 'there is no player name after the number' }],
    })
  })

  it('reads a full 25-player squad', () => {
    const lines = Array.from({ length: 25 }, (_, i) => `${i + 1}. Player ${i + 1}`)
    const { players, errors } = parseSquadList(lines.join('\n'))
    expect(errors).toEqual([])
    expect(players).toHaveLength(25)
    expect(players[24]).toEqual({ number: 25, name: 'Player 25' })
  })
})

describe('normaliseName', () => {
  it('trims and collapses whitespace', () => {
    expect(normaliseName('  Lionel \t  Messi \n')).toBe('Lionel Messi')
  })

  it('leaves a tidy name alone', () => {
    expect(normaliseName('Virgil van Dijk')).toBe('Virgil van Dijk')
  })
})
