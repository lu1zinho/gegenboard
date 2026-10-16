import { useId, useState, type SubmitEvent } from 'react'
import {
  addPlayer,
  lowestFreeShirtNumber,
  removePlayer,
  renameRoster,
  setRosterColours,
  tidyRoster,
  updatePlayer,
  validateRoster,
} from '../roster/roster'
import { MAX_SHIRT_NUMBER, MIN_SHIRT_NUMBER } from '../board/validate'
import type { Roster } from '../roster/types'
import { countOf } from '../text'
import { ColourFields } from './ColourFields'
import './Rosters.css'

/**
 * Edits a copy of a roster. Nothing changes until the roster is saved, and it can only be
 * saved once it is valid.
 */
export function RosterEditor({
  roster,
  onSave,
  onCancel,
  onDelete,
}: {
  roster: Roster
  onSave: (roster: Roster) => void
  onCancel: () => void
  onDelete: () => void
}) {
  const headingId = useId()
  const [draft, setDraft] = useState(roster)
  const [problems, setProblems] = useState<string[]>([])
  const [addedPlayerId, setAddedPlayerId] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const freeNumber = lowestFreeShirtNumber(draft)

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const tidied = tidyRoster(draft)
    const found = validateRoster(tidied)
    setProblems(found)
    if (found.length === 0) onSave(tidied)
  }

  function handleAddPlayer() {
    if (freeNumber === null) return
    const next = addPlayer(draft, { number: freeNumber, name: '' })
    setDraft(next)
    setAddedPlayerId(next.players.at(-1)?.id ?? null)
  }

  return (
    <form className="roster-form" aria-labelledby={headingId} onSubmit={handleSubmit}>
      <h3 id={headingId}>Edit {roster.name}</h3>
      <label className="field">
        Team name
        <input
          value={draft.name}
          autoComplete="off"
          onChange={(event) => {
            const name = event.target.value
            setDraft((current) => renameRoster(current, name))
          }}
        />
      </label>
      <ColourFields
        colours={draft.colours}
        onChange={(colours) => {
          setDraft((current) => setRosterColours(current, colours))
        }}
      />

      <table className="roster-players">
        <caption>Players</caption>
        <thead>
          <tr>
            <th scope="col">No.</th>
            <th scope="col">Name</th>
            <th scope="col">
              <span className="visually-hidden">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {draft.players.map((player, index) => {
            const label = `Player ${index + 1}`
            return (
              <tr key={player.id}>
                <td>
                  <input
                    type="number"
                    min={MIN_SHIRT_NUMBER}
                    max={MAX_SHIRT_NUMBER}
                    aria-label={`${label} shirt number`}
                    value={Number.isNaN(player.number) ? '' : player.number}
                    onChange={(event) => {
                      const number = event.target.valueAsNumber
                      setDraft((current) => updatePlayer(current, player.id, { number }))
                    }}
                  />
                </td>
                <td>
                  <input
                    aria-label={`${label} name`}
                    value={player.name}
                    autoComplete="off"
                    // Ready to type the name of a player just added.
                    autoFocus={player.id === addedPlayerId}
                    onChange={(event) => {
                      const name = event.target.value
                      setDraft((current) => updatePlayer(current, player.id, { name }))
                    }}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    aria-label={`Remove ${label.toLowerCase()}`}
                    onClick={() => {
                      setDraft((current) => removePlayer(current, player.id))
                    }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <button
        type="button"
        className="add-player"
        disabled={freeNumber === null}
        onClick={handleAddPlayer}
      >
        Add player
      </button>

      {/* Pinned to the bottom of the panel, so it stays in reach in a long squad. */}
      <div className="form-footer">
        {problems.length > 0 && (
          <div className="form-error" role="alert">
            <p>Fix these before saving:</p>
            <ul>
              {problems.map((problem, index) => (
                <li key={index}>{problem}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="form-actions">
          <button type="submit">Save roster</button>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          {!confirmingDelete && (
            <button
              type="button"
              className="danger"
              onClick={() => {
                setConfirmingDelete(true)
              }}
            >
              Delete roster
            </button>
          )}
        </div>
        {confirmingDelete && (
          <div className="confirm-delete" role="group" aria-label="Confirm delete">
            <p>
              Delete {roster.name} and its {countOf(roster.players.length, 'player')}? This can’t be
              undone.
            </p>
            <button type="button" className="danger" onClick={onDelete}>
              Delete
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmingDelete(false)
              }}
            >
              Keep it
            </button>
          </div>
        )}
      </div>
    </form>
  )
}
