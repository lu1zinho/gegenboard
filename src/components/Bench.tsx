import type { Team, TeamSide } from '../board/types'
import { SIDE_LABELS } from '../text'
import './Bench.css'

/** A team's substitutes, shown beside the pitch. Empty until squads feed the board. */
export function Bench({ team, side }: { team: Team; side: TeamSide }) {
  const label = SIDE_LABELS[side]
  return (
    <aside className="bench" aria-label={`${label} bench`}>
      <h2 className="bench-title" style={{ borderColor: team.colours.primary }}>
        {team.name}
      </h2>
      <ul className="bench-list" aria-label={`${label} substitutes`} />
    </aside>
  )
}
