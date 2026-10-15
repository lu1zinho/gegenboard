import { useId, useState } from 'react'
import type { TeamColours } from '../board/types'
import { createRoster, nextRosterId } from '../roster/roster'
import { getLocalStorage, loadRosters, saveRosters } from '../roster/storage'
import type { Roster, SquadEntry } from '../roster/types'
import './Rosters.css'
import { SquadImportForm } from './SquadImportForm'
import { countOf } from './text'

const SAVE_FAILED =
  "Couldn't save: browser storage is blocked or full, so changes will be lost when you close the page"

/** Lists saved rosters and creates new ones. Rosters are saved as soon as they change. */
export function RosterPanel({ onClose }: { onClose: () => void }) {
  const headingId = useId()
  const [loaded] = useState(() => loadRosters(getLocalStorage()))
  const [rosters, setRosters] = useState(loaded.rosters)
  const [status, setStatus] = useState(loaded.problem ?? '')

  function commit(next: Roster[], message: string) {
    setRosters(next)
    setStatus(saveRosters(getLocalStorage(), next) ? message : SAVE_FAILED)
  }

  function handleCreate(name: string, colours: TeamColours, players: SquadEntry[]) {
    const roster = createRoster(nextRosterId(rosters), name, colours, players)
    commit([...rosters, roster], `Saved ${roster.name} with ${countOf(players.length, 'player')}`)
  }

  return (
    <aside
      className="roster-panel"
      aria-labelledby={headingId}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <header className="roster-panel-header">
        <h2 id={headingId}>Rosters</h2>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </header>
      <p className="roster-status" role="status">
        {status}
      </p>
      <RosterList rosters={rosters} />
      <SquadImportForm onCreate={handleCreate} />
    </aside>
  )
}

function RosterList({ rosters }: { rosters: readonly Roster[] }) {
  if (rosters.length === 0) return <p className="roster-empty">No saved rosters yet.</p>
  return (
    <ul className="roster-list" aria-label="Saved rosters">
      {rosters.map((roster) => (
        <li key={roster.id}>
          <span
            className="roster-swatch"
            aria-hidden="true"
            style={{ background: roster.colours.primary, borderColor: roster.colours.secondary }}
          />
          <span className="roster-name">{roster.name}</span>
          <span className="roster-count">{countOf(roster.players.length, 'player')}</span>
        </li>
      ))}
    </ul>
  )
}
