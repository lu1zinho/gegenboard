import { useRef, type PointerEvent } from 'react'
import { tokenPosition, type TokenRef } from '../board/moveToken'
import { PITCH_LENGTH, PITCH_WIDTH, fromScreenPoint, toPitchPoint } from '../board/pitch'
import {
  TEAM_SIDES,
  type Arrow,
  type Board,
  type PitchPosition,
  type Player,
  type Team,
  type TeamSide,
} from '../board/types'
import './Pitch.css'
import { PitchMarkings } from './PitchMarkings'

// Sizes in metres, the SVG's user units.
// A player token is 5 m across: about 80 px of a 1080p stream, and still readable on a phone.
const PLAYER_RADIUS = 2.5
const BALL_RADIUS = 1.4
const NUMBER_FONT_SIZE = 2.8
const NAME_FONT_SIZE = 2
const ARROW_WIDTH = 0.45
const ARROW_HEAD_LENGTH = 2.2
const ARROW_HEAD_WIDTH = 1.8

export interface PitchProps {
  board: Board
  /**
   * Called as a token is dragged, with where it should now be (not clamped) and an id shared
   * by every call of the same drag, to use as the undo group. Without it tokens stay put.
   */
  onMoveToken?: (token: TokenRef, position: PitchPosition, gesture: string) => void
}

interface Drag {
  pointerId: number
  token: TokenRef
  gesture: string
  /** Pointer position minus token position, in percent, so the token doesn't jump on grab. */
  offset: PitchPosition
}

/** Renders a board as an SVG pitch, scaled to fit its container. */
export function Pitch({ board, onMoveToken }: PitchProps) {
  const svg = useRef<SVGSVGElement>(null)
  const drag = useRef<Drag | null>(null)
  const gestures = useRef(0)

  function pointerPosition(event: PointerEvent): PitchPosition | undefined {
    const rect = svg.current?.getBoundingClientRect()
    if (!rect || rect.width === 0 || rect.height === 0) return undefined
    return fromScreenPoint({ x: event.clientX, y: event.clientY }, rect)
  }

  function startDrag(event: PointerEvent<SVGElement>, token: TokenRef) {
    if (!onMoveToken || event.button !== 0 || drag.current) return
    const pointer = pointerPosition(event)
    const from = tokenPosition(board, token)
    if (!pointer || !from) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    gestures.current += 1
    drag.current = {
      pointerId: event.pointerId,
      token,
      gesture: `drag-${gestures.current}`,
      offset: { x: pointer.x - from.x, y: pointer.y - from.y },
    }
  }

  function moveDrag(event: PointerEvent) {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId) return
    const pointer = pointerPosition(event)
    if (!pointer) return
    onMoveToken?.(
      current.token,
      { x: pointer.x - current.offset.x, y: pointer.y - current.offset.y },
      current.gesture,
    )
  }

  function endDrag(event: PointerEvent) {
    if (drag.current?.pointerId === event.pointerId) drag.current = null
  }

  const handlers = { onPointerMove: moveDrag, onPointerUp: endDrag, onPointerCancel: endDrag }
  const ball = toPitchPoint(board.ball.position)
  return (
    <svg
      ref={svg}
      className="pitch"
      data-draggable={onMoveToken ? '' : undefined}
      role="group"
      aria-label="Tactics board"
      viewBox={`0 0 ${PITCH_LENGTH} ${PITCH_WIDTH}`}
    >
      <PitchMarkings />
      <g role="list" aria-label="Arrows">
        {board.arrows.map((arrow) => (
          <ArrowShape key={arrow.id} arrow={arrow} />
        ))}
      </g>
      {TEAM_SIDES.map((side) => (
        <TeamPlayers
          key={side}
          side={side}
          team={board.teams[side]}
          onPointerDown={startDrag}
          handlers={handlers}
        />
      ))}
      <g
        className="pitch-token"
        role="img"
        aria-label="Ball"
        transform={`translate(${ball.x} ${ball.y})`}
        onPointerDown={(event) => {
          startDrag(event, { kind: 'ball' })
        }}
        {...handlers}
      >
        <circle className="pitch-ball-halo" r={BALL_RADIUS + 0.6} />
        <circle className="pitch-ball" r={BALL_RADIUS} strokeWidth={0.3} />
        <polygon className="pitch-ball-patch" points={BALL_PATCH} />
      </g>
    </svg>
  )
}

// A pentagon in the middle of the ball, so it reads as a football and its spin is visible.
const BALL_PATCH = Array.from({ length: 5 }, (_, i) => {
  const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2
  return `${Math.cos(angle) * 0.6},${Math.sin(angle) * 0.6}`
}).join(' ')

interface TokenHandlers {
  onPointerMove: (event: PointerEvent) => void
  onPointerUp: (event: PointerEvent) => void
  onPointerCancel: (event: PointerEvent) => void
}

function TeamPlayers({
  side,
  team,
  onPointerDown,
  handlers,
}: {
  side: TeamSide
  team: Team
  onPointerDown: (event: PointerEvent<SVGElement>, token: TokenRef) => void
  handlers: TokenHandlers
}) {
  return (
    <g role="list" aria-label={`${team.name} players`}>
      {team.players.map((player) => (
        <PlayerToken
          key={player.id}
          player={player}
          team={team}
          onPointerDown={(event) => {
            onPointerDown(event, { kind: 'player', side, id: player.id })
          }}
          handlers={handlers}
        />
      ))}
    </g>
  )
}

function PlayerToken({
  player,
  team,
  onPointerDown,
  handlers,
}: {
  player: Player
  team: Team
  onPointerDown: (event: PointerEvent<SVGElement>) => void
  handlers: TokenHandlers
}) {
  const { x, y } = toPitchPoint(player.position)
  const { primary, secondary } = team.colours
  return (
    <g
      className="pitch-token"
      role="listitem"
      aria-label={`${player.number} ${player.name}`}
      transform={`translate(${x} ${y})`}
      onPointerDown={onPointerDown}
      {...handlers}
    >
      <circle
        className="pitch-player-disc"
        r={PLAYER_RADIUS}
        fill={primary}
        stroke={secondary}
        strokeWidth={0.45}
      />
      <text
        className="pitch-player-number"
        fill={secondary}
        fontSize={NUMBER_FONT_SIZE}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {player.number}
      </text>
      <text
        className="pitch-player-name"
        y={PLAYER_RADIUS + NAME_FONT_SIZE * 0.95}
        fontSize={NAME_FONT_SIZE}
        textAnchor="middle"
        strokeWidth={0.6}
      >
        {player.name}
      </text>
    </g>
  )
}

function ArrowShape({ arrow }: { arrow: Arrow }) {
  const from = toPitchPoint(arrow.from)
  const to = toPitchPoint(arrow.to)
  const length = Math.hypot(to.x - from.x, to.y - from.y)
  // Unit vector along the arrow; a zero-length arrow points right.
  const ux = length > 0 ? (to.x - from.x) / length : 1
  const uy = length > 0 ? (to.y - from.y) / length : 0

  const headLength = Math.min(ARROW_HEAD_LENGTH, length)
  const baseX = to.x - ux * headLength
  const baseY = to.y - uy * headLength
  const half = ARROW_HEAD_WIDTH / 2
  const head = [
    `${to.x},${to.y}`,
    `${baseX - uy * half},${baseY + ux * half}`,
    `${baseX + uy * half},${baseY - ux * half}`,
  ].join(' ')

  return (
    <g role="listitem" aria-label={arrow.style === 'dashed' ? 'Dashed arrow' : 'Solid arrow'}>
      <line
        x1={from.x}
        y1={from.y}
        x2={baseX}
        y2={baseY}
        stroke={arrow.colour}
        strokeWidth={ARROW_WIDTH}
        strokeDasharray={arrow.style === 'dashed' ? '1.2 0.8' : undefined}
      />
      <polygon points={head} fill={arrow.colour} />
    </g>
  )
}
