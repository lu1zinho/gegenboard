import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Roster } from '../roster/types'
import { makeRoster } from '../test/roster'
import { RosterEditor } from './RosterEditor'

function renderEditor(roster: Roster = makeRoster()) {
  const user = userEvent.setup()
  const onSave = vi.fn<(roster: Roster) => void>()
  const onCancel = vi.fn()
  const onDelete = vi.fn()
  render(<RosterEditor roster={roster} onSave={onSave} onCancel={onCancel} onDelete={onDelete} />)
  const form = screen.getByRole('form', { name: `Edit ${roster.name}` })
  const save = () => user.click(within(form).getByRole('button', { name: 'Save roster' }))
  return { user, form, onSave, onCancel, onDelete, save }
}

const numberInput = (row: number) =>
  screen.getByRole('spinbutton', { name: `Player ${row} shirt number` })
const nameInput = (row: number) => screen.getByRole('textbox', { name: `Player ${row} name` })

describe('RosterEditor', () => {
  it('shows the team name, colours and players in order', () => {
    renderEditor()

    expect(screen.getByRole('textbox', { name: 'Team name' })).toHaveValue('Gegenpress FC')
    expect(screen.getByLabelText('Primary colour')).toHaveValue('#ffeb3b')
    expect(screen.getByLabelText('Secondary colour')).toHaveValue('#000000')
    const table = screen.getByRole('table', { name: 'Players' })
    expect(within(table).getAllByRole('spinbutton')).toHaveLength(3)
    const players = [
      [1, 'Novak'],
      [10, 'Ferreira'],
      [9, 'Okafor'],
    ] as const
    players.forEach(([number, name], index) => {
      expect(numberInput(index + 1)).toHaveValue(number)
      expect(nameInput(index + 1)).toHaveValue(name)
    })
  })

  it('saves a new team name and colours', async () => {
    const { user, onSave, save } = renderEditor()

    const teamName = screen.getByRole('textbox', { name: 'Team name' })
    await user.clear(teamName)
    await user.type(teamName, 'Rondo United')
    fireEvent.change(screen.getByLabelText('Primary colour'), { target: { value: '#1565c0' } })
    fireEvent.change(screen.getByLabelText('Secondary colour'), { target: { value: '#ffffff' } })
    await save()

    expect(onSave).toHaveBeenCalledWith(
      makeRoster({ name: 'Rondo United', colours: { primary: '#1565c0', secondary: '#ffffff' } }),
    )
  })

  it("edits a player's number and name", async () => {
    const { user, onSave, save } = renderEditor()

    await user.clear(numberInput(2))
    await user.type(numberInput(2), '8')
    await user.clear(nameInput(2))
    await user.type(nameInput(2), 'Mensah')
    await save()

    expect(onSave.mock.calls[0]?.[0].players[1]).toEqual({ id: 'p2', number: 8, name: 'Mensah' })
  })

  it('adds a player with the lowest free number and focuses its name', async () => {
    const { user, onSave, save } = renderEditor()

    await user.click(screen.getByRole('button', { name: 'Add player' }))
    expect(numberInput(4)).toHaveValue(2)
    expect(nameInput(4)).toHaveFocus()
    await user.keyboard('Moreira')
    await save()

    expect(onSave.mock.calls[0]?.[0].players[3]).toEqual({ id: 'p4', number: 2, name: 'Moreira' })
  })

  it('removes a player', async () => {
    const { user, onSave, save } = renderEditor()

    await user.click(screen.getByRole('button', { name: 'Remove player 2' }))
    expect(screen.getAllByRole('spinbutton')).toHaveLength(2)
    await save()

    expect(onSave.mock.calls[0]?.[0].players.map((p) => p.name)).toEqual(['Novak', 'Okafor'])
  })

  it('tidies names when saving', async () => {
    const { user, onSave, save } = renderEditor()

    await user.type(nameInput(1), '  Jr ')
    await save()

    expect(onSave.mock.calls[0]?.[0].players[0]?.name).toBe('Novak Jr')
  })

  it('lists problems and does not save an invalid roster', async () => {
    const { user, onSave, save } = renderEditor()

    await user.clear(screen.getByRole('textbox', { name: 'Team name' }))
    await user.clear(numberInput(3))
    await user.type(numberInput(3), '10')
    await user.click(screen.getByRole('button', { name: 'Add player' }))
    await save()

    const alert = screen.getByRole('alert')
    expect(
      within(alert)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      'The team needs a name',
      'Player 3 has duplicate shirt number 10',
      'Player 4 needs a name',
    ])
    expect(onSave).not.toHaveBeenCalled()
  })

  it('does not save a player without a shirt number', async () => {
    const { user, onSave, save } = renderEditor()

    await user.clear(numberInput(1))
    expect(numberInput(1)).toHaveValue(null)
    await save()

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Player 1 needs a whole shirt number from 1 to 99',
    )
    expect(onSave).not.toHaveBeenCalled()
  })

  it('leaves the roster unchanged when cancelled', async () => {
    const roster = makeRoster()
    const { user, onCancel, onSave } = renderEditor(roster)

    await user.type(nameInput(1), 'xyz')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onSave).not.toHaveBeenCalled()
    expect(roster).toEqual(makeRoster())
  })

  it('asks before deleting the roster', async () => {
    const { user, onDelete } = renderEditor()

    await user.click(screen.getByRole('button', { name: 'Delete roster' }))
    const confirm = screen.getByRole('group', { name: 'Confirm delete' })
    expect(confirm).toHaveTextContent('Delete Gegenpress FC and its 3 players?')
    expect(onDelete).not.toHaveBeenCalled()

    await user.click(within(confirm).getByRole('button', { name: 'Keep it' }))
    expect(screen.queryByRole('group', { name: 'Confirm delete' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete roster' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })
})
