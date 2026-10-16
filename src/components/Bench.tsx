import type { Team } from '../board/types'
import './Bench.css'

/** A team's substitutes, shown beside the pitch. Empty until squads feed the board. */
export function Bench({ team, side }: { team: Team; side: 'home' | 'away' }) {
  const label = side === 'home' ? 'Home' : 'Away'
  return (
    <aside className="bench" aria-label={`${label} bench`}>
      <h2 className="bench-title" style={{ borderColor: team.colours.primary }}>
        {team.name}
      </h2>
      <ul className="bench-list" aria-label={`${label} substitutes`} />
    </aside>
  )
}
