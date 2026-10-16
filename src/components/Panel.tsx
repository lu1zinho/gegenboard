import { useId, type ReactNode } from 'react'
import './Panel.css'

/**
 * A side panel over the right of the stage, with a heading, a Close button and a status line
 * for what just happened. Hide it rather than unmounting it, so what was typed in it survives
 * closing it. Escape closes it too, through the app's keyboard shortcuts.
 */
export function Panel({
  id,
  title,
  hidden = false,
  status,
  onClose,
  children,
}: {
  id?: string
  title: string
  hidden?: boolean
  status: string
  onClose: () => void
  children: ReactNode
}) {
  const headingId = useId()
  return (
    <aside id={id} className="panel" hidden={hidden} aria-labelledby={headingId}>
      <header className="panel-header">
        <h2 id={headingId}>{title}</h2>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </header>
      <p className="panel-status" role="status">
        {status}
      </p>
      {children}
    </aside>
  )
}
