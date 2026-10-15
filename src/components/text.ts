/** A count with its noun, e.g. `1 player` or `25 players`. */
export function countOf(count: number, noun: string): string {
  return `${count} ${count === 1 ? noun : `${noun}s`}`
}
