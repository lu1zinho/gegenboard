export interface StreamOptions {
  /** Leave the page background transparent, for use as an OBS browser source. */
  transparent: boolean
}

/** Reads stream options from a URL query string such as `?bg=transparent`. */
export function parseStreamOptions(search: string): StreamOptions {
  const params = new URLSearchParams(search)
  return { transparent: params.get('bg')?.toLowerCase() === 'transparent' }
}
