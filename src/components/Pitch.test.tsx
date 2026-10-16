import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefaultBoard } from '../board/defaultBoard'
import { getPlayer } from '../test/board'
import { Pitch } from './Pitch'

describe('Pitch', () => {
  it('renders 11 players for each team, listed under the team name', () => {
    render(<Pitch board={createDefaultBoard()} />)

    const home = screen.getByRole('list', { name: 'Home players' })
    const away = screen.getByRole('list', { name: 'Away players' })
    expect(within(home).getAllByRole('listitem')).toHaveLength(11)
    expect(within(away).getAllByRole('listitem')).toHaveLength(11)
  })

  it("shows each player's shirt number and name", () => {
    render(<Pitch board={createDefaultBoard()} />)

    const striker = screen.getByRole('listitem', { name: '9 Okafor' })
    expect(within(striker).getByText('9')).toBeInTheDocument()
    expect(within(striker).getByText('Okafor')).toBeInTheDocument()
  })

  it('uses the team name and colours from the model', () => {
    const board = createDefaultBoard()
    board.teams.away.name = 'Gegenpress FC'
    board.teams.away.colours = { primary: '#ffeb3b', secondary: '#000000' }
    render(<Pitch board={board} />)

    const away = screen.getByRole('list', { name: 'Gegenpress FC players' })
    const keeper = within(away).getByRole('listitem', { name: '1 Weber' })
    expect(keeper.querySelector('circle')).toHaveAttribute('fill', '#ffeb3b')
    expect(within(keeper).getByText('1')).toHaveAttribute('fill', '#000000')
  })

  it('places players and the ball at their positions, converted to metres', () => {
    const board = createDefaultBoard()
    getPlayer(board, 'home', 9).position = { x: 20, y: 25 }
    board.ball.position = { x: 60, y: 75 }
    render(<Pitch board={board} />)

    expect(screen.getByRole('listitem', { name: '9 Okafor' })).toHaveAttribute(
      'transform',
      'translate(21 17)',
    )
    const ball = screen.getByRole('img', { name: 'Ball' })
    expect(ball).toHaveAttribute('transform', 'translate(63 51)')
  })

  it('draws no arrows for an empty arrow list', () => {
    render(<Pitch board={createDefaultBoard()} />)

    const arrows = screen.getByRole('list', { name: 'Arrows' })
    expect(within(arrows).queryAllByRole('listitem')).toHaveLength(0)
  })

  it('draws arrows from start to end in their colour and style', () => {
    const board = createDefaultBoard()
    board.arrows = [
      {
        id: 'pass',
        from: { x: 0, y: 50 },
        to: { x: 100, y: 50 },
        colour: '#ffeb3b',
        style: 'solid',
      },
      {
        id: 'run',
        from: { x: 40, y: 20 },
        to: { x: 60, y: 20 },
        colour: '#00e5ff',
        style: 'dashed',
      },
    ]
    render(<Pitch board={board} />)

    const arrows = screen.getByRole('list', { name: 'Arrows' })
    expect(within(arrows).getAllByRole('listitem')).toHaveLength(2)

    const pass = within(arrows).getByRole('listitem', { name: 'Solid arrow' })
    const passLine = pass.querySelector('line')
    expect(passLine).toHaveAttribute('x1', '0')
    expect(passLine).toHaveAttribute('y1', '34')
    expect(passLine).toHaveAttribute('stroke', '#ffeb3b')
    expect(passLine).not.toHaveAttribute('stroke-dasharray')
    const passHead = pass.querySelector('polygon')
    expect(passHead).toHaveAttribute('fill', '#ffeb3b')
    expect(passHead?.getAttribute('points')).toMatch(/^105,34 /)

    const run = within(arrows).getByRole('listitem', { name: 'Dashed arrow' })
    expect(run.querySelector('line')).toHaveAttribute('stroke-dasharray')
  })
})

describe('Pitch dragging', () => {
  beforeEach(() => {
    // jsdom has no layout or pointer capture: pretend the pitch is 1050 x 680 px at (10, 20).
    vi.spyOn(SVGElement.prototype, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(10, 20, 1050, 680),
    )
    Object.defineProperty(SVGElement.prototype, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    })
  })

  function drag(element: Element, from: [number, number], to: [number, number][]) {
    fireEvent.pointerDown(element, { pointerId: 1, button: 0, clientX: from[0], clientY: from[1] })
    for (const [clientX, clientY] of to) {
      fireEvent.pointerMove(element, { pointerId: 1, clientX, clientY })
    }
    fireEvent.pointerUp(element, { pointerId: 1 })
  }

  it('reports the dragged player with a position in percent, keeping the grab offset', () => {
    const onMoveToken = vi.fn()
    const board = createDefaultBoard()
    const striker = getPlayer(board, 'home', 9)
    render(<Pitch board={board} onMoveToken={onMoveToken} />)

    // Grab 10 px right of the token centre, then drag to the middle of the pitch.
    const centre = {
      x: 10 + (striker.position.x / 100) * 1050,
      y: 20 + (striker.position.y / 100) * 680,
    }
    drag(
      screen.getByRole('listitem', { name: '9 Okafor' }),
      [centre.x + 10, centre.y],
      [[10 + 525 + 10, 20 + 340]],
    )

    expect(onMoveToken).toHaveBeenCalledTimes(1)
    const [token, position] = onMoveToken.mock.calls[0] as [unknown, { x: number; y: number }]
    expect(token).toEqual({ kind: 'player', side: 'home', id: striker.id })
    expect(position.x).toBeCloseTo(50)
    expect(position.y).toBeCloseTo(50)
  })

  it('uses one gesture id per drag and a new one for the next', () => {
    const onMoveToken = vi.fn()
    render(<Pitch board={createDefaultBoard()} onMoveToken={onMoveToken} />)
    const ball = screen.getByRole('img', { name: 'Ball' })

    drag(
      ball,
      [535, 360],
      [
        [600, 400],
        [650, 450],
      ],
    )
    drag(ball, [650, 450], [[700, 500]])

    const gestures = onMoveToken.mock.calls.map((call: unknown[]) => call[2])
    expect(gestures[0]).toBe(gestures[1])
    expect(gestures[2]).not.toBe(gestures[0])
  })

  it('does not report moves after the pointer is released', () => {
    const onMoveToken = vi.fn()
    render(<Pitch board={createDefaultBoard()} onMoveToken={onMoveToken} />)
    const ball = screen.getByRole('img', { name: 'Ball' })

    drag(ball, [535, 360], [])
    fireEvent.pointerMove(ball, { pointerId: 1, clientX: 600, clientY: 400 })

    expect(onMoveToken).not.toHaveBeenCalled()
  })

  it('ignores non-primary buttons', () => {
    const onMoveToken = vi.fn()
    render(<Pitch board={createDefaultBoard()} onMoveToken={onMoveToken} />)
    const ball = screen.getByRole('img', { name: 'Ball' })

    fireEvent.pointerDown(ball, { pointerId: 1, button: 2, clientX: 535, clientY: 360 })
    fireEvent.pointerMove(ball, { pointerId: 1, clientX: 600, clientY: 400 })

    expect(onMoveToken).not.toHaveBeenCalled()
  })
})
