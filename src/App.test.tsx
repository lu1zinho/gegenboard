import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('has the app title as its heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Gegenboard' })).toBeInTheDocument()
  })

  it('shows the default board', () => {
    render(<App />)
    expect(screen.getByRole('group', { name: 'Tactics board' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Home players' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Away players' })).toBeInTheDocument()
  })

  it('opens and closes the rosters panel', async () => {
    const user = userEvent.setup()
    render(<App />)
    const toggle = screen.getByRole('button', { name: 'Rosters' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('complementary', { name: 'Rosters' })).not.toBeInTheDocument()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('complementary', { name: 'Rosters' })).toBeInTheDocument()

    await user.click(toggle)
    expect(screen.queryByRole('complementary', { name: 'Rosters' })).not.toBeInTheDocument()
  })

  it('returns focus to the Rosters button when the panel is closed', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Rosters' }))
    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('complementary', { name: 'Rosters' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rosters' })).toHaveFocus()
  })

  it('keeps what was typed in the rosters panel while it is closed', async () => {
    const user = userEvent.setup()
    render(<App />)
    const toggle = screen.getByRole('button', { name: 'Rosters' })

    await user.click(toggle)
    await user.type(screen.getByRole('textbox', { name: 'Team name' }), 'Gegenpress FC')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('complementary', { name: 'Rosters' })).not.toBeInTheDocument()

    await user.click(toggle)
    expect(screen.getByRole('textbox', { name: 'Team name' })).toHaveValue('Gegenpress FC')
  })

  it('shows an empty bench on each side of the pitch', () => {
    render(<App />)
    expect(screen.getByRole('complementary', { name: 'Home bench' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Away bench' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Home substitutes' })).toBeEmptyDOMElement()
  })

  describe('presentation mode', () => {
    it('hides the controls on P and brings them back on the next P', async () => {
      const user = userEvent.setup()
      render(<App />)
      const toggle = screen.getByRole('button', { name: 'Rosters' })
      expect(toggle).toBeVisible()

      await user.keyboard('p')
      expect(toggle).not.toBeVisible()
      expect(screen.queryByRole('combobox', { name: 'Home formation' })).not.toBeInTheDocument()
      expect(screen.getByRole('group', { name: 'Tactics board' })).toBeVisible()
      expect(screen.getByRole('complementary', { name: 'Home bench' })).toBeVisible()

      await user.keyboard('P')
      expect(toggle).toBeVisible()
    })

    it('ignores P typed into a field', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.click(screen.getByRole('button', { name: 'Rosters' }))
      await user.type(screen.getByRole('textbox', { name: 'Team name' }), 'Spurs')

      expect(screen.getByRole('textbox', { name: 'Team name' })).toHaveValue('Spurs')
      expect(screen.getByRole('button', { name: 'Rosters' })).toBeVisible()
    })
  })

  describe('transparent background', () => {
    afterEach(() => {
      window.history.replaceState(null, '', '/')
    })

    it('is opaque by default', () => {
      render(<App />)
      expect(document.documentElement).not.toHaveAttribute('data-bg')
    })

    it('is requested with ?bg=transparent', () => {
      window.history.replaceState(null, '', '/?bg=transparent')
      const { unmount } = render(<App />)
      expect(document.documentElement).toHaveAttribute('data-bg', 'transparent')
      unmount()
      expect(document.documentElement).not.toHaveAttribute('data-bg')
    })
  })
})

describe('formations', () => {
  it('moves a team to the chosen formation and keeps its players', async () => {
    const user = userEvent.setup()
    render(<App />)
    const homePlayers = screen.getByRole('list', { name: 'Home players' })
    const before = within(homePlayers)
      .getAllByRole('listitem')
      .map((item) => item.getAttribute('transform'))

    await user.selectOptions(screen.getByRole('combobox', { name: 'Home formation' }), '4-2-3-1')

    const after = within(homePlayers).getAllByRole('listitem')
    expect(after.map((item) => item.getAttribute('transform'))).not.toEqual(before)
    expect(after.map((item) => item.getAttribute('aria-label'))).toContain('9 Okafor')
    expect(screen.getByRole('combobox', { name: 'Home formation' })).toHaveValue('4-2-3-1')
    expect(screen.getByRole('combobox', { name: 'Away formation' })).toHaveValue('4-4-2')
  })
})
