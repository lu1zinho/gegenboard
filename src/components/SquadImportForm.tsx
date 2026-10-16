import { useId, useState, type SubmitEvent } from 'react'
import type { TeamColours } from '../board/types'
import { DEFAULT_ROSTER_COLOURS } from '../roster/roster'
import { parseSquadList } from '../roster/squadList'
import type { SquadEntry } from '../roster/types'
import { countOf, tidyName } from '../text'
import { ColourFields } from './ColourFields'
import './Rosters.css'

const SQUAD_LIST_PLACEHOLDER = 'One player per line:\n1 Novak\n10. Ferreira\n9 - Okafor'

/** Creates a roster from a pasted squad list, showing which lines can't be read as you paste. */
export function SquadImportForm({
  onCreate,
}: {
  onCreate: (name: string, colours: TeamColours, players: SquadEntry[]) => void
}) {
  const headingId = useId()
  const summaryId = useId()
  const [name, setName] = useState('')
  const [colours, setColours] = useState<TeamColours>({ ...DEFAULT_ROSTER_COLOURS })
  const [squadList, setSquadList] = useState('')
  const [error, setError] = useState('')
  const { players, errors } = parseSquadList(squadList)

  let summary = ''
  if (squadList.trim() !== '') {
    summary = `${countOf(players.length, 'player')} found`
    if (errors.length > 0) summary += `, ${countOf(errors.length, 'line')} skipped`
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (tidyName(name) === '') {
      setError('Enter a team name')
      return
    }
    if (players.length === 0) {
      setError('Paste at least one player as "number name", e.g. "10 Ferreira"')
      return
    }
    onCreate(name, colours, players)
    setName('')
    setColours({ ...DEFAULT_ROSTER_COLOURS })
    setSquadList('')
    setError('')
  }

  return (
    <form className="roster-form" aria-labelledby={headingId} onSubmit={handleSubmit}>
      <h3 id={headingId}>New roster</h3>
      <label className="field">
        Team name
        <input
          value={name}
          autoComplete="off"
          onChange={(event) => {
            setName(event.target.value)
            setError('')
          }}
        />
      </label>
      <ColourFields colours={colours} onChange={setColours} />
      <label className="field">
        Squad list
        <textarea
          value={squadList}
          rows={12}
          spellCheck={false}
          placeholder={SQUAD_LIST_PLACEHOLDER}
          aria-describedby={summaryId}
          onChange={(event) => {
            setSquadList(event.target.value)
            setError('')
          }}
        />
      </label>
      <p id={summaryId} className="squad-summary">
        {summary}
      </p>
      {errors.length > 0 && (
        <ul className="squad-errors" aria-label="Skipped lines">
          {errors.map((lineError) => (
            <li key={lineError.line}>
              Line {lineError.line}, “{lineError.text}”: {lineError.reason}
            </li>
          ))}
        </ul>
      )}
      <p className="form-error" role="alert">
        {error}
      </p>
      <button type="submit">Create roster</button>
    </form>
  )
}
