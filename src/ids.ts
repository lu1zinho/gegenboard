/**
 * The next id made of `prefix` and a number, one more than the highest number in use with that
 * prefix: `p3` after `p1` and `p2`. Ids in another form are ignored.
 */
export function nextId(prefix: string, ids: Iterable<string>): string {
  let highest = 0
  for (const id of ids) {
    const suffix = id.slice(prefix.length)
    if (id.startsWith(prefix) && /^\d+$/u.test(suffix)) highest = Math.max(highest, Number(suffix))
  }
  return `${prefix}${highest + 1}`
}
