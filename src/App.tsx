import { useEffect, useId, useRef, useState, type RefObject } from 'react'
import './App.css'
import { createDefaultBoard } from './board/defaultBoard'
import { autosaveBoard, loadAutosavedBoard } from './board/storage'
import type { Board } from './board/types'
import { BoardsPanel } from './components/BoardsPanel'
import { Pitch } from './components/Pitch'
import { RosterPanel } from './components/RosterPanel'
import { useHistory } from './history/useHistory'
import { useHistoryShortcuts } from './history/useHistoryShortcuts'
import { getLocalStorage } from './storage'

/** The board as it was when the page was last closed, or both teams lined up for kick-off. */
function initialBoard(): Board {
  return loadAutosavedBoard(getLocalStorage()) ?? createDefaultBoard()
}

type Panel = 'rosters' | 'boards'

export default function App() {
  // Every change to the board goes through board.change, so all of them can be undone.
  const board = useHistory(initialBoard)
  useHistoryShortcuts(board)
  useAutosave(board.present)

  const [openPanel, setOpenPanel] = useState<Panel | null>(null)
  const rostersButton = useRef<HTMLButtonElement>(null)
  const boardsButton = useRef<HTMLButtonElement>(null)
  const rostersPanelId = useId()
  const boardsPanelId = useId()

  // Both panels cover the right of the stage, so only one is open at a time.
  function togglePanel(panel: Panel) {
    setOpenPanel((open) => (open === panel ? null : panel))
  }

  function closePanel(toggle: RefObject<HTMLButtonElement | null>) {
    setOpenPanel(null)
    toggle.current?.focus()
  }

  return (
    <main className="app">
      <h1 className="visually-hidden">Gegenboard</h1>
      <div className="stage">
        <Pitch board={board.present} />
      </div>
      <div className="panel-toggles">
        <button
          ref={rostersButton}
          type="button"
          className="panel-toggle"
          aria-expanded={openPanel === 'rosters'}
          aria-controls={rostersPanelId}
          onClick={() => {
            togglePanel('rosters')
          }}
        >
          Rosters
        </button>
        <button
          ref={boardsButton}
          type="button"
          className="panel-toggle"
          aria-expanded={openPanel === 'boards'}
          aria-controls={boardsPanelId}
          onClick={() => {
            togglePanel('boards')
          }}
        >
          Boards
        </button>
      </div>
      <RosterPanel
        id={rostersPanelId}
        hidden={openPanel !== 'rosters'}
        onClose={() => {
          closePanel(rostersButton)
        }}
      />
      <BoardsPanel
        id={boardsPanelId}
        hidden={openPanel !== 'boards'}
        board={board.present}
        onLoad={(saved) => {
          board.change(() => saved)
        }}
        onClose={() => {
          closePanel(boardsButton)
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
