import { useId, useState } from 'react'
import type { TeamColours } from '../board/types'
import { createRoster, nextRosterId, removeRoster, upsertRoster } from '../roster/roster'
import { loadRosters, saveRosters } from '../roster/storage'
import { getLocalStorage } from '../storage'
import type { Roster, SquadEntry } from '../roster/types'
import { RosterEditor } from './RosterEditor'
import './Rosters.css'
import { SquadImportForm } from './SquadImportForm'
import { countOf } from './text'

const SAVE_FAILED =
  "Couldn't save: browser storage is blocked or full, so changes will be lost when you close the page"

/**
 * Lists, creates and edits saved rosters. Rosters are saved as soon as they change. Hide the
 * panel rather than unmounting it, so a half-filled form survives closing it.
 */
export function RosterPanel({
  id,
  hidden = false,
  onClose,
}: {
  id?: string
  hidden?: boolean
  onClose: () => void
}) {
  const headingId = useId()
  const [loaded] = useState(() => loadRosters(getLocalStorage()))
  const [rosters, setRosters] = useState(loaded.rosters)
  const [status, setStatus] = useState(loaded.problem ?? '')
  const [editingId, setEditingId] = useState<string | null>(null)
  const editing = rosters.find((roster) => roster.id === editingId)

  function commit(next: Roster[], message: string) {
    setRosters(next)
    setStatus(saveRosters(getLocalStorage(), next) ? message : SAVE_FAILED)
  }

  function handleCreate(name: string, colours: TeamColours, players: SquadEntry[]) {
    const roster = createRoster(nextRosterId(rosters), name, colours, players)
    commit([...rosters, roster], `Saved ${roster.name} with ${countOf(players.length, 'player')}`)
  }

  function handleSave(roster: Roster) {
    commit(upsertRoster(rosters, roster), `Saved ${roster.name}`)
    setEditingId(null)
  }

  function handleDelete(roster: Roster) {
    commit(removeRoster(rosters, roster.id), `Deleted ${roster.name}`)
    setEditingId(null)
  }

  return (
    <aside
      id={id}
      className="roster-panel"
      hidden={hidden}
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
      {editing ? (
        <RosterEditor
          key={editing.id}
          roster={editing}
          onSave={handleSave}
          onCancel={() => {
            setEditingId(null)
          }}
          onDelete={() => {
            handleDelete(editing)
          }}
        />
      ) : (
        <>
          <RosterList rosters={rosters} onEdit={setEditingId} />
          <SquadImportForm onCreate={handleCreate} />
        </>
      )}
    </aside>
  )
}

function RosterList({
  rosters,
  onEdit,
}: {
  rosters: readonly Roster[]
  onEdit: (rosterId: string) => void
}) {
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
          <button
            type="button"
            aria-label={`Edit ${roster.name}`}
            onClick={() => {
              onEdit(roster.id)
            }}
          >
            Edit
          </button>
        </li>
      ))}
    </ul>
  )
}
