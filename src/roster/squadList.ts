import { MAX_SHIRT_NUMBER, MIN_SHIRT_NUMBER, isShirtNumber } from '../board/validate'
import { tidyName } from '../text'
import type { SquadEntry } from './types'

/** A line of a squad list that couldn't be turned into a player. */
export interface SquadLineError {
  /** 1-based line number in the pasted text. */
  line: number
  /** The line as pasted, trimmed. */
  text: string
  reason: string
}

export interface ParsedSquadList {
  /** Players in the order they were listed. Shirt numbers are unique. */
  players: SquadEntry[]
  /** Lines that were skipped, in order. Blank lines are ignored, not reported. */
  errors: SquadLineError[]
}

/**
 * An optional `#`, the shirt number, then the name, optionally after a separator such as
 * `10. Name`, `10 - Name` or `10: Name`. Hyphens may arrive as en or em dashes when copied
 * from a web page or document.
 */
const SQUAD_LINE = /^#?(\d+)\s*(?:[.:)\-–—]\s*)?(.*)$/u
const LETTER = /\p{L}/u

/**
 * Reads a pasted squad list with one player per line as `number name`, e.g. `10 Messi`.
 * It is forgiving about spacing and separators, and never throws: lines it can't read, or
 * that repeat a shirt number already listed, are reported in `errors` and left out.
 */
export function parseSquadList(text: string): ParsedSquadList {
  const players: SquadEntry[] = []
  const errors: SquadLineError[] = []
  const lineByNumber = new Map<number, number>()

  text.split(/\r\n|\r|\n/u).forEach((rawLine, index) => {
    const line = index + 1
    const trimmed = rawLine.trim()
    if (trimmed === '') return
    const fail = (reason: string) => {
      errors.push({ line, text: trimmed, reason })
    }

    const match = SQUAD_LINE.exec(trimmed)
    if (!match) {
      fail('it should start with a shirt number')
      return
    }
    const [, digits = '', rawName = ''] = match
    const name = tidyName(rawName)
    if (!LETTER.test(name)) {
      fail('there is no player name after the number')
      return
    }
    const number = Number(digits)
    if (!isShirtNumber(number)) {
      fail(`shirt number ${digits} is not between ${MIN_SHIRT_NUMBER} and ${MAX_SHIRT_NUMBER}`)
      return
    }
    const firstLine = lineByNumber.get(number)
    if (firstLine !== undefined) {
      fail(`shirt number ${number} is already used on line ${firstLine}`)
      return
    }

    lineByNumber.set(number, line)
    players.push({ number, name })
  })

  return { players, errors }
}
