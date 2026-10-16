import { FORMATION_IDS, isFormationId, type FormationId } from '../board/formations'
import type { TeamSide } from '../board/types'
import { SIDE_LABELS } from '../text'

/** Picks a team's formation. A team in no formation shows Custom, which can't be picked. */
export function FormationPicker({
  side,
  formation,
  onChange,
}: {
  side: TeamSide
  /** The team's formation, or `null` for a team that isn't lined up in one. */
  formation: FormationId | null
  onChange: (formation: FormationId) => void
}) {
  return (
    <label className="formation-picker">
      {SIDE_LABELS[side]} formation
      <select
        value={formation ?? ''}
        onChange={(event) => {
          const { value } = event.target
          if (isFormationId(value)) onChange(value)
        }}
      >
        {formation === null && (
          <option value="" disabled>
            Custom
          </option>
        )}
        {FORMATION_IDS.map((id) => (
          <option key={id} value={id}>
            {id}
          </option>
        ))}
      </select>
    </label>
  )
}
