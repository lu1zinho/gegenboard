import { useId, useRef, useState, type SubmitEvent } from 'react'
import {
  boardNameProblem,
  deleteSavedBoard,
  findSavedBoard,
  renameProblem,
  renameSavedBoard,
  saveBoard,
  tidyBoardName,
  type SavedBoard,
} from '../board/savedBoards'
import { loadSavedBoards, storeSavedBoards } from '../board/storage'
import type { Board } from '../board/types'
import { getLocalStorage } from '../storage'
import './Boards.css'

const STORE_FAILED =
  "Couldn't save: browser storage is blocked or full, so saved boards will be lost when you close the page"

/**
 * Saves the board on screen under a name, and loads, renames and deletes saved boards. The
 * list is stored as soon as it changes. Hide the panel rather than unmounting it, so a name
 * being typed survives closing it.
 */
export function BoardsPanel({
  id,
  hidden = false,
  board,
  onLoad,
  onClose,
}: {
  id?: string
  hidden?: boolean
  /** The board on screen, which Save board saves. */
  board: Board
  onLoad: (board: Board) => void
  onClose: () => void
}) {
  const headingId = useId()
  const [loaded] = useState(() => loadSavedBoards(getLocalStorage()))
  const [boards, setBoards] = useState(loaded.boards)
  const [status, setStatus] = useState(loaded.problem ?? '')

  function commit(next: SavedBoard[], message: string) {
    setBoards(next)
    setStatus(storeSavedBoards(getLocalStorage(), next) ? message : STORE_FAILED)
  }

  function handleSave(name: string) {
    const verb = findSavedBoard(boards, name) ? 'Updated' : 'Saved'
    commit(saveBoard(boards, name, board), `${verb} ${tidyBoardName(name)}`)
  }

  return (
    <aside
      id={id}
      className="boards-panel"
      hidden={hidden}
      aria-labelledby={headingId}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <header className="boards-panel-header">
        <h2 id={headingId}>Boards</h2>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </header>
      <p className="boards-status" role="status">
        {status}
      </p>
      <SaveBoardForm onSave={handleSave} />
      {boards.length === 0 ? (
        <p className="boards-empty">No saved boards yet.</p>
      ) : (
        <ul className="boards-list" aria-label="Saved boards">
          {boards.map((saved) => (
            <SavedBoardItem
              key={saved.id}
              saved={saved}
              boards={boards}
              onLoad={() => {
                onLoad(saved.board)
                setStatus(`Loaded ${saved.name}`)
              }}
              onRename={(name) => {
                const renamed = renameSavedBoard(boards, saved.id, name)
                commit(renamed, `Renamed ${saved.name} to ${tidyBoardName(name)}`)
              }}
              onDelete={() => {
                commit(deleteSavedBoard(boards, saved.id), `Deleted ${saved.name}`)
              }}
            />
          ))}
        </ul>
      )}
    </aside>
  )
}

function SaveBoardForm({ onSave }: { onSave: (name: string) => void }) {
  const [name, setName] = useState('')
  const [problem, setProblem] = useState<string | null>(null)

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = boardNameProblem(name)
    setProblem(found)
    if (found !== null) return
    onSave(name)
    setName('')
  }

  return (
    <form className="boards-save" aria-label="Save board" onSubmit={handleSubmit}>
      <label>
        Board name
        <input
          value={name}
          aria-invalid={problem !== null}
          onChange={(event) => {
            setName(event.target.value)
          }}
        />
      </label>
      <button type="submit">Save board</button>
      {problem !== null && (
        <p className="boards-error" role="alert">
          {problem}
        </p>
      )}
    </form>
  )
}

function SavedBoardItem({
  saved,
  boards,
  onLoad,
  onRename,
  onDelete,
}: {
  saved: SavedBoard
  boards: readonly SavedBoard[]
  onLoad: () => void
  onRename: (name: string) => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState<'rename' | 'delete' | null>(null)
  const renameButton = useRef<HTMLButtonElement>(null)
  const deleteButton = useRef<HTMLButtonElement>(null)

  function toggle(form: 'rename' | 'delete') {
    setOpen((current) => (current === form ? null : form))
  }

  return (
    <li>
      <div className="boards-row">
        <span className="boards-name">{saved.name}</span>
        <button type="button" aria-label={`Load ${saved.name}`} onClick={onLoad}>
          Load
        </button>
        <button
          ref={renameButton}
          type="button"
          aria-label={`Rename ${saved.name}`}
          aria-expanded={open === 'rename'}
          onClick={() => {
            toggle('rename')
          }}
        >
          Rename
        </button>
        <button
          ref={deleteButton}
          type="button"
          aria-label={`Delete ${saved.name}`}
          aria-expanded={open === 'delete'}
          onClick={() => {
            toggle('delete')
          }}
        >
          Delete
        </button>
      </div>
      {open === 'rename' && (
        <RenameForm
          saved={saved}
          boards={boards}
          onRename={(name) => {
            onRename(name)
            setOpen(null)
            renameButton.current?.focus()
          }}
          onCancel={() => {
            setOpen(null)
            renameButton.current?.focus()
          }}
        />
      )}
      {open === 'delete' && (
        <div className="boards-confirm" role="group" aria-label={`Confirm deleting ${saved.name}`}>
          <p>Delete {saved.name}? This can’t be undone.</p>
          <button type="button" className="boards-danger" onClick={onDelete}>
            Delete
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(null)
              deleteButton.current?.focus()
            }}
          >
            Keep it
          </button>
        </div>
      )}
    </li>
  )
}

function RenameForm({
  saved,
  boards,
  onRename,
  onCancel,
}: {
  saved: SavedBoard
  boards: readonly SavedBoard[]
  onRename: (name: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(saved.name)
  const [problem, setProblem] = useState<string | null>(null)

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = renameProblem(boards, saved.id, name)
    setProblem(found)
    if (found === null) onRename(name)
  }

  return (
    <form
      className="boards-rename"
      aria-label={`Rename ${saved.name}`}
      onSubmit={handleSubmit}
      onKeyDown={(event) => {
        // Escape cancels the rename without closing the panel.
        if (event.key !== 'Escape') return
        event.stopPropagation()
        onCancel()
      }}
    >
      <input
        aria-label="New name"
        value={name}
        aria-invalid={problem !== null}
        autoFocus
        onChange={(event) => {
          setName(event.target.value)
        }}
      />
      <button type="submit">Save name</button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
      {problem !== null && (
        <p className="boards-error" role="alert">
          {problem}
        </p>
      )}
    </form>
  )
}
