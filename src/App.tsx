import { useEffect, useId, useRef, useState } from 'react'
import './App.css'
import { createDefaultBoard } from './board/defaultBoard'
import { applyFormation, formationOf } from './board/formations'
import { autosaveBoard, loadAutosavedBoard } from './board/storage'
import { moveToken } from './board/moveToken'
import type { Board } from './board/types'
import { Bench } from './components/Bench'
import { BoardsPanel } from './components/BoardsPanel'
import { FormationControls } from './components/FormationControls'
import { Pitch } from './components/Pitch'
import { RosterPanel } from './components/RosterPanel'
import { useHistory } from './history/useHistory'
import { useShortcuts } from './shortcuts/useShortcuts'
import { getLocalStorage } from './storage'
import { parseStreamOptions } from './stream/options'

/** The board as it was when the page was last closed, or both teams lined up for kick-off. */
function initialBoard(): Board {
  return loadAutosavedBoard(getLocalStorage()) ?? createDefaultBoard()
}

type PanelName = 'rosters' | 'boards'

export default function App() {
  // Every change to the board goes through board.change, so all of them can be undone.
  const board = useHistory(initialBoard)
  useAutosave(board.present)

  // Presentation mode hides every control, for the stream.
  const [presenting, setPresenting] = useState(false)
  const [openPanel, setOpenPanel] = useState<PanelName | null>(null)
  const rostersButton = useRef<HTMLButtonElement>(null)
  const boardsButton = useRef<HTMLButtonElement>(null)
  const rostersPanelId = useId()
  const boardsPanelId = useId()
  const [{ transparent }] = useState(() => parseStreamOptions(window.location.search))

  useEffect(() => {
    if (!transparent) return
    document.documentElement.dataset.bg = 'transparent'
    return () => {
      delete document.documentElement.dataset.bg
    }
  }, [transparent])

  // Both panels cover the right of the stage, so only one is open at a time.
  function togglePanel(panel: PanelName) {
    setOpenPanel((open) => (open === panel ? null : panel))
  }

  /** Closes the open panel and gives the focus back to the button that opened it. */
  function closePanel() {
    if (openPanel === 'rosters') rostersButton.current?.focus()
    if (openPanel === 'boards') boardsButton.current?.focus()
    setOpenPanel(null)
  }

  // Every keyboard shortcut is defined in src/shortcuts.
  useShortcuts({
    undo: board.undo,
    redo: board.redo,
    togglePresentation: () => {
      setPresenting((current) => !current)
    },
    // A panel hidden by presentation mode stays open for when the controls come back.
    closePanel: openPanel && !presenting ? closePanel : undefined,
  })

  return (
    <main className="app">
      <h1 className="visually-hidden">Gegenboard</h1>
      <div className="stage">
        <Bench team={board.present.teams.home} side="home" />
        <div className="stage-pitch">
          <Pitch
            board={board.present}
            onMoveToken={(token, position, gesture) => {
              board.change((current) => moveToken(current, token, position), { group: gesture })
            }}
          />
        </div>
        <Bench team={board.present.teams.away} side="away" />
      </div>
      <div className="controls" hidden={presenting}>
        <FormationControls
          formations={{
            home: formationOf(board.present, 'home'),
            away: formationOf(board.present, 'away'),
          }}
          onChange={(side, formation) => {
            board.change((current) => applyFormation(current, side, formation))
          }}
        />
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
        <RosterPanel id={rostersPanelId} hidden={openPanel !== 'rosters'} onClose={closePanel} />
        <BoardsPanel
          id={boardsPanelId}
          hidden={openPanel !== 'boards'}
          board={board.present}
          onLoad={(saved) => {
            board.change(() => saved)
          }}
          onClose={closePanel}
        />
      </div>
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
