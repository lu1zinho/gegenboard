import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FormationPicker } from './FormationPicker'

describe('FormationPicker', () => {
  it("shows the team's formation under the side's name", () => {
    render(<FormationPicker side="away" formation="4-4-2" onChange={vi.fn()} />)
    const picker = screen.getByRole('combobox', { name: 'Away formation' })
    expect(picker).toHaveValue('4-4-2')
    expect(
      within(picker)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['4-4-2', '4-3-3', '3-5-2', '4-2-3-1'])
  })

  it('shows Custom, which cannot be picked, for a team in no formation', () => {
    render(<FormationPicker side="home" formation={null} onChange={vi.fn()} />)
    const custom = screen.getByRole('option', { name: 'Custom', selected: true })
    expect(custom).toBeDisabled()
  })

  it('reports the formation picked', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<FormationPicker side="home" formation={null} onChange={onChange} />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Home formation' }), '3-5-2')
    expect(onChange).toHaveBeenCalledExactlyOnceWith('3-5-2')
  })
})
