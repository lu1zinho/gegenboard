import type { TeamColours } from '../board/types'

/** Colour pickers for a team's primary (shirt) and secondary (number and outline) colours. */
export function ColourFields({
  colours,
  onChange,
}: {
  colours: TeamColours
  onChange: (colours: TeamColours) => void
}) {
  return (
    <div className="colour-fields">
      <label>
        <input
          type="color"
          value={colours.primary}
          onChange={(event) => {
            onChange({ ...colours, primary: event.target.value })
          }}
        />
        Primary colour
      </label>
      <label>
        <input
          type="color"
          value={colours.secondary}
          onChange={(event) => {
            onChange({ ...colours, secondary: event.target.value })
          }}
        />
        Secondary colour
      </label>
    </div>
  )
}
