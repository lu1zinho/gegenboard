import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getLocalStorage, loadRosters, saveRosters } from '../roster/storage'
import { makeRoster } from '../test/roster'
import { RosterPanel } from './RosterPanel'

afterEach(() => {
  vi.restoreAllMocks()
})

function renderPanel(onClose = () => {}) {
  const user = userEvent.setup()
  render(<RosterPanel onClose={onClose} />)
  const form = screen.getByRole('form', { name: 'New roster' })
  return {
    user,
    form,
    teamName: within(form).getByRole('textbox', { name: 'Team name' }),
    squadList: within(form).getByRole('textbox', { name: 'Squad list' }),
    create: within(form).getByRole('button', { name: 'Create roster' }),
  }
}

function savedRosters() {
  return loadRosters(getLocalStorage()).rosters
}

describe('RosterPanel', () => {
  it('says there are no rosters yet', () => {
    renderPanel()
    expect(screen.getByRole('complementary', { name: 'Rosters' })).toBeInTheDocument()
    expect(screen.getByText('No saved rosters yet.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Saved rosters' })).not.toBeInTheDocument()
  })

  it('creates a roster from a pasted squad list and saves it', async () => {
    const { user, teamName, squadList, create } = renderPanel()

    await user.type(teamName, 'Gegenpress FC')
    await user.click(squadList)
    await user.paste('1 Novak\n10. Ferreira\n9 - Okafor')
    expect(screen.getByText('3 players found')).toBeInTheDocument()
    await user.click(create)

    expect(screen.getByRole('status')).toHaveTextContent('Saved Gegenpress FC with 3 players')
    const list = screen.getByRole('list', { name: 'Saved rosters' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
    expect(within(list).getByRole('listitem')).toHaveTextContent('Gegenpress FC3 players')
    expect(savedRosters()).toEqual([
      makeRoster({ colours: { primary: '#c62828', secondary: '#ffffff' } }),
    ])
  })

  it('clears the form after creating a roster', async () => {
    const { user, teamName, squadList, create } = renderPanel()

    await user.type(teamName, 'Gegenpress FC')
    await user.click(squadList)
    await user.paste('9 Okafor')
    await user.click(create)

    expect(teamName).toHaveValue('')
    expect(squadList).toHaveValue('')
    expect(screen.queryByText(/found/)).not.toBeInTheDocument()
  })

  it('saves the chosen colours', async () => {
    const { user, teamName, squadList, create } = renderPanel()

    await user.type(teamName, 'Gegenpress FC')
    fireEvent.change(screen.getByLabelText('Primary colour'), { target: { value: '#ffeb3b' } })
    fireEvent.change(screen.getByLabelText('Secondary colour'), { target: { value: '#000000' } })
    await user.click(squadList)
    await user.paste('9 Okafor')
    await user.click(create)

    expect(savedRosters()[0]?.colours).toEqual({ primary: '#ffeb3b', secondary: '#000000' })
  })

  it('lists lines it cannot read while you paste, and creates the roster from the rest', async () => {
    const { user, teamName, squadList, create } = renderPanel()

    await user.click(squadList)
    await user.paste('Goalkeepers\n1 Novak\n9 Okafor\n9 Nakamura\n10 Ferreira')

    expect(screen.getByText('3 players found, 2 lines skipped')).toBeInTheDocument()
    const skipped = screen.getByRole('list', { name: 'Skipped lines' })
    expect(
      within(skipped)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      'Line 1, “Goalkeepers”: it should start with a shirt number',
      'Line 4, “9 Nakamura”: shirt number 9 is already used on line 3',
    ])

    await user.type(teamName, 'Gegenpress FC')
    await user.click(create)
    expect(savedRosters()[0]?.players.map((p) => `${p.number} ${p.name}`)).toEqual([
      '1 Novak',
      '9 Okafor',
      '10 Ferreira',
    ])
  })

  it('asks for a team name', async () => {
    const { user, squadList, create } = renderPanel()

    await user.click(squadList)
    await user.paste('9 Okafor')
    await user.click(create)

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a team name')
    expect(savedRosters()).toEqual([])
  })

  it('asks for at least one player', async () => {
    const { user, teamName, squadList, create } = renderPanel()

    await user.type(teamName, 'Gegenpress FC')
    await user.click(squadList)
    await user.paste('Goalkeepers')
    await user.click(create)

    expect(screen.getByRole('alert')).toHaveTextContent('Paste at least one player')
    expect(savedRosters()).toEqual([])
  })

  it('adds new rosters after those saved earlier', async () => {
    saveRosters(getLocalStorage(), [makeRoster({ id: 'roster-4' })])
    const { user, teamName, squadList, create } = renderPanel()

    const list = screen.getByRole('list', { name: 'Saved rosters' })
    expect(within(list).getByRole('listitem')).toHaveTextContent('Gegenpress FC3 players')

    await user.type(teamName, 'Rondo United')
    await user.click(squadList)
    await user.paste('1 Weber')
    await user.click(create)

    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(savedRosters().map((r) => [r.id, r.name])).toEqual([
      ['roster-4', 'Gegenpress FC'],
      ['roster-5', 'Rondo United'],
    ])
  })

  it('says when saved rosters could not be loaded', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Access denied', 'SecurityError')
    })
    renderPanel()
    expect(screen.getByRole('status')).toHaveTextContent("Browser storage isn't available")
  })

  it('keeps a roster for the session and says so when it cannot be saved', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage is full', 'QuotaExceededError')
    })
    const { user, teamName, squadList, create } = renderPanel()

    await user.type(teamName, 'Gegenpress FC')
    await user.click(squadList)
    await user.paste('9 Okafor')
    await user.click(create)

    expect(screen.getByRole('status')).toHaveTextContent("Couldn't save")
    expect(screen.getByRole('list', { name: 'Saved rosters' })).toHaveTextContent('Gegenpress FC')
  })

  it('closes from its button or with Escape', async () => {
    const onClose = vi.fn()
    const { user, teamName } = renderPanel(onClose)

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)

    await user.click(teamName)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
