import { FORMATION_IDS, type FormationId } from '../board/formations'
import { TEAM_SIDES, type TeamSide } from '../board/types'

const SIDE_LABELS: Record<TeamSide, string> = { home: 'Home', away: 'Away' }

function isFormationId(value: string): value is FormationId {
  return FORMATION_IDS.some((id) => id === value)
}

interface FormationControlsProps {
  /** Each team's formation, or `null` for a team that isn't lined up in one. */
  formations: Record<TeamSide, FormationId | null>
  onChange: (side: TeamSide, formation: FormationId) => void
}

/** One formation picker per team. A team in no formation shows Custom, which can't be picked. */
export function FormationControls({ formations, onChange }: FormationControlsProps) {
  return (
    <div className="formation-controls" role="group" aria-label="Formations">
      {TEAM_SIDES.map((side) => (
        <label key={side}>
          {SIDE_LABELS[side]} formation
          <select
            value={formations[side] ?? ''}
            onChange={(event) => {
              const { value } = event.target
              if (isFormationId(value)) onChange(side, value)
            }}
          >
            {formations[side] === null && (
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
      ))}
    </div>
  )
}
