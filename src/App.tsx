import { useEffect, useId, useRef, useState } from 'react'
import './App.css'
import { createDefaultBoard } from './board/defaultBoard'
import { Bench } from './components/Bench'
import { Pitch } from './components/Pitch'
import { RosterPanel } from './components/RosterPanel'
import { parseStreamOptions } from './stream/options'
import { usePresentationMode } from './stream/presentation'

export default function App() {
  const [board] = useState(createDefaultBoard)
  const [showRosters, setShowRosters] = useState(false)
  const rostersButton = useRef<HTMLButtonElement>(null)
  const rostersPanelId = useId()
  const presenting = usePresentationMode()
  const [{ transparent }] = useState(() => parseStreamOptions(window.location.search))

  useEffect(() => {
    if (!transparent) return
    document.documentElement.dataset.bg = 'transparent'
    return () => {
      delete document.documentElement.dataset.bg
    }
  }, [transparent])

  return (
    <main className="app">
      <h1 className="visually-hidden">Gegenboard</h1>
      <div className="stage">
        <Bench team={board.teams.home} side="home" />
        <div className="stage-pitch">
          <Pitch board={board} />
        </div>
        <Bench team={board.teams.away} side="away" />
      </div>
      <div className="controls" hidden={presenting}>
        <button
          ref={rostersButton}
          type="button"
          className="panel-toggle"
          aria-expanded={showRosters}
          aria-controls={rostersPanelId}
          onClick={() => {
            setShowRosters((shown) => !shown)
          }}
        >
          Rosters
        </button>
        <RosterPanel
          id={rostersPanelId}
          hidden={!showRosters}
          onClose={() => {
            setShowRosters(false)
            rostersButton.current?.focus()
          }}
        />
      </div>
    </main>
  )
}
