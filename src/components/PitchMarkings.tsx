import { PITCH_LENGTH, PITCH_WIDTH } from '../board/pitch'

// Law 1 dimensions, in metres.
const CENTRE_CIRCLE_RADIUS = 9.15
const PENALTY_AREA_DEPTH = 16.5
const PENALTY_AREA_WIDTH = 40.32
const GOAL_AREA_DEPTH = 5.5
const GOAL_AREA_WIDTH = 18.32
const PENALTY_SPOT_DISTANCE = 11
const GOAL_WIDTH = 7.32
const CORNER_ARC_RADIUS = 1

const GOAL_DEPTH = 2
const SPOT_RADIUS = 0.3
const LINE_WIDTH = 0.2
const STRIPES = 12

const MID_X = PITCH_LENGTH / 2
const MID_Y = PITCH_WIDTH / 2

/** Grass and white lines for a pitch drawn in metres, with `margin` metres of grass around it. */
export function PitchMarkings({ margin }: { margin: number }) {
  const stripeWidth = PITCH_LENGTH / STRIPES
  return (
    <g aria-hidden="true">
      <rect
        className="pitch-grass"
        x={-margin}
        y={-margin}
        width={PITCH_LENGTH + 2 * margin}
        height={PITCH_WIDTH + 2 * margin}
      />
      {Array.from({ length: STRIPES / 2 }, (_, i) => (
        <rect
          key={i}
          className="pitch-stripe"
          x={(2 * i + 1) * stripeWidth}
          width={stripeWidth}
          height={PITCH_WIDTH}
        />
      ))}
      <g className="pitch-lines" fill="none" strokeWidth={LINE_WIDTH}>
        <rect width={PITCH_LENGTH} height={PITCH_WIDTH} />
        <line x1={MID_X} y1={0} x2={MID_X} y2={PITCH_WIDTH} />
        <circle cx={MID_X} cy={MID_Y} r={CENTRE_CIRCLE_RADIUS} />
        <circle className="pitch-spot" cx={MID_X} cy={MID_Y} r={SPOT_RADIUS} />
        <PitchEnd />
        <g transform={`rotate(180 ${MID_X} ${MID_Y})`}>
          <PitchEnd />
        </g>
      </g>
    </g>
  )
}

/** Markings at the left end of the pitch; rotated 180° for the right end. */
function PitchEnd() {
  const arcHalfHeight = Math.sqrt(
    CENTRE_CIRCLE_RADIUS ** 2 - (PENALTY_AREA_DEPTH - PENALTY_SPOT_DISTANCE) ** 2,
  )
  const r = CENTRE_CIRCLE_RADIUS
  const c = CORNER_ARC_RADIUS
  return (
    <>
      <rect
        y={MID_Y - PENALTY_AREA_WIDTH / 2}
        width={PENALTY_AREA_DEPTH}
        height={PENALTY_AREA_WIDTH}
      />
      <rect y={MID_Y - GOAL_AREA_WIDTH / 2} width={GOAL_AREA_DEPTH} height={GOAL_AREA_WIDTH} />
      <circle className="pitch-spot" cx={PENALTY_SPOT_DISTANCE} cy={MID_Y} r={SPOT_RADIUS} />
      <path
        d={`M ${PENALTY_AREA_DEPTH} ${MID_Y - arcHalfHeight} A ${r} ${r} 0 0 1 ${PENALTY_AREA_DEPTH} ${MID_Y + arcHalfHeight}`}
      />
      <rect x={-GOAL_DEPTH} y={MID_Y - GOAL_WIDTH / 2} width={GOAL_DEPTH} height={GOAL_WIDTH} />
      <path d={`M 0 ${c} A ${c} ${c} 0 0 0 ${c} 0`} />
      <path d={`M 0 ${PITCH_WIDTH - c} A ${c} ${c} 0 0 1 ${c} ${PITCH_WIDTH}`} />
    </>
  )
}
