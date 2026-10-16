import { useEffect, useId, useRef, useState } from 'react'
import './App.css'
import { createDefaultBoard } from './board/defaultBoard'
import { autosaveBoard, loadAutosavedBoard } from './board/storage'
import type { Board } from './board/types'
import { Pitch } from './components/Pitch'
import { RosterPanel } from './components/RosterPanel'
import { useHistory } from './history/useHistory'
import { useHistoryShortcuts } from './history/useHistoryShortcuts'
import { getLocalStorage } from './storage'

/** The board as it was when the page was last closed, or both teams lined up for kick-off. */
function initialBoard(): Board {
  return loadAutosavedBoard(getLocalStorage()) ?? createDefaultBoard()
}

export default function App() {
  // Every change to the board goes through board.change, so all of them can be undone.
  const board = useHistory(initialBoard)
  useHistoryShortcuts(board)
  useAutosave(board.present)

  const [showRosters, setShowRosters] = useState(false)
  const rostersButton = useRef<HTMLButtonElement>(null)
  const rostersPanelId = useId()

  return (
    <main className="app">
      <h1 className="visually-hidden">Gegenboard</h1>
      <div className="stage">
        <Pitch board={board.present} />
      </div>
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
    </main>
  )
}

/** Saves the board after every change, so reloading the page restores it. */
function useAutosave(board: Board) {
  // The board on screen when the page opened is already saved, or is the default board.
  const saved = useRef(board)
  useEffect(() => {
    if (board === saved.current) return
    saved.current = board
    autosaveBoard(getLocalStorage(), board)
  }, [board])
}
