import { useRef, useState } from 'react'
import './App.css'
import { createDefaultBoard } from './board/defaultBoard'
import { Pitch } from './components/Pitch'
import { RosterPanel } from './components/RosterPanel'

export default function App() {
  const [board] = useState(createDefaultBoard)
  const [showRosters, setShowRosters] = useState(false)
  const rostersButton = useRef<HTMLButtonElement>(null)

  return (
    <main className="app">
      <h1 className="visually-hidden">Gegenboard</h1>
      <div className="stage">
        <Pitch board={board} />
      </div>
      <button
        ref={rostersButton}
        type="button"
        className="panel-toggle"
        aria-expanded={showRosters}
        onClick={() => {
          setShowRosters((shown) => !shown)
        }}
      >
        Rosters
      </button>
      {showRosters && (
        <RosterPanel
          onClose={() => {
            setShowRosters(false)
            rostersButton.current?.focus()
          }}
        />
      )}
    </main>
  )
}
