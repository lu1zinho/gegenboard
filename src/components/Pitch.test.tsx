import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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
    expect(ball).toHaveAttribute('cx', '63')
    expect(ball).toHaveAttribute('cy', '51')
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
