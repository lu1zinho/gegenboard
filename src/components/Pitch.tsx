import { PITCH_LENGTH, PITCH_WIDTH, toPitchPoint } from '../board/pitch'
import { TEAM_SIDES, type Arrow, type Board, type Player, type Team } from '../board/types'
import './Pitch.css'
import { PitchMarkings } from './PitchMarkings'

// Sizes in metres, the SVG's user units.
const PLAYER_RADIUS = 1.8
const BALL_RADIUS = 0.9
const ARROW_WIDTH = 0.45
const ARROW_HEAD_LENGTH = 2.2
const ARROW_HEAD_WIDTH = 1.8

/** Renders a board as an SVG pitch, scaled to fit its container. */
export function Pitch({ board }: { board: Board }) {
  const ball = toPitchPoint(board.ball.position)
  return (
    <svg
      className="pitch"
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
        <TeamPlayers key={side} team={board.teams[side]} />
      ))}
      <circle
        className="pitch-ball"
        role="img"
        aria-label="Ball"
        cx={ball.x}
        cy={ball.y}
        r={BALL_RADIUS}
        strokeWidth={0.25}
      />
    </svg>
  )
}

function TeamPlayers({ team }: { team: Team }) {
  return (
    <g role="list" aria-label={`${team.name} players`}>
      {team.players.map((player) => (
        <PlayerToken key={player.id} player={player} team={team} />
      ))}
    </g>
  )
}

function PlayerToken({ player, team }: { player: Player; team: Team }) {
  const { x, y } = toPitchPoint(player.position)
  const { primary, secondary } = team.colours
  return (
    <g
      role="listitem"
      aria-label={`${player.number} ${player.name}`}
      transform={`translate(${x} ${y})`}
    >
      <circle r={PLAYER_RADIUS} fill={primary} stroke={secondary} strokeWidth={0.3} />
      <text
        className="pitch-player-number"
        fill={secondary}
        fontSize={1.9}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {player.number}
      </text>
      <text
        className="pitch-player-name"
        y={PLAYER_RADIUS + 1.7}
        fontSize={1.5}
        textAnchor="middle"
        strokeWidth={0.35}
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
