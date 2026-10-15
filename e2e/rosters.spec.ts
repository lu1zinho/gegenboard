import { expect, test } from '@playwright/test'

// A 25-player squad as a streamer might paste it, mixing the line formats the parser accepts.
const SQUAD = [
  '1 Novak',
  '2. Moreira',
  '3 - Duarte',
  '4 Hansen',
  '5 Kowalski',
  '6. Lindqvist',
  '7 Takahashi',
  '8 - Mensah',
  '9 Okafor',
  '10 Ferreira',
  '11. Rossi',
  '12 Weber',
  '13 Castillo',
  '14 - Brennan',
  '15 Petrov',
  '16 Laurent',
  '17. Diallo',
  '18 Jansen',
  '19 Haddad',
  '20 – Moretti',
  '21 Nakamura',
  '22 Ortega',
  '23. Van der Berg',
  '24 Da Silva',
  '25 Ó Briain',
]

test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

test('creates a roster by pasting a 25-player squad and keeps it after a reload', async ({
  page,
}) => {
  await page.goto('/')
  const panel = page.getByRole('complementary', { name: 'Rosters' })
  await expect(panel).toBeHidden()
  await page.getByRole('button', { name: 'Rosters' }).click()
  await expect(panel).toBeVisible()

  const form = page.getByRole('form', { name: 'New roster' })
  await form.getByRole('textbox', { name: 'Team name' }).fill('Gegenpress FC')
  await page.evaluate((text) => navigator.clipboard.writeText(text), SQUAD.join('\n'))
  await form.getByRole('textbox', { name: 'Squad list' }).focus()
  await page.keyboard.press('ControlOrMeta+V')
  await expect(form.getByText('25 players found')).toBeVisible()
  await expect(form.getByRole('list', { name: 'Skipped lines' })).toHaveCount(0)
  await form.getByRole('button', { name: 'Create roster' }).click()

  await expect(page.getByRole('status')).toHaveText('Saved Gegenpress FC with 25 players')
  const saved = page.getByRole('list', { name: 'Saved rosters' }).getByRole('listitem')
  await expect(saved).toHaveCount(1)
  await expect(saved).toContainText('Gegenpress FC')
  await expect(saved).toContainText('25 players')

  // Saved under its own key, with a schema version.
  const storage = await page.evaluate(() => ({
    keys: Object.keys(localStorage),
    rosters: localStorage.getItem('gegenboard.rosters'),
  }))
  expect(storage.keys).toEqual(['gegenboard.rosters'])
  const stored: unknown = JSON.parse(storage.rosters ?? 'null')
  expect(stored).toMatchObject({
    version: 1,
    rosters: [{ name: 'Gegenpress FC', colours: { primary: '#c62828', secondary: '#ffffff' } }],
  })
  expect(stored).toHaveProperty('rosters.0.players.length', 25)
  expect(stored).toHaveProperty('rosters.0.players.19', { id: 'p20', number: 20, name: 'Moretti' })
  expect(stored).toHaveProperty('rosters.0.players.24', {
    id: 'p25',
    number: 25,
    name: 'Ó Briain',
  })

  await page.reload()
  await page.getByRole('button', { name: 'Rosters' }).click()
  await expect(page.getByRole('list', { name: 'Saved rosters' })).toContainText(
    'Gegenpress FC25 players',
  )

  // The whole squad loads into the editor, and Save stays on screen however long it is.
  await page.getByRole('button', { name: 'Edit Gegenpress FC' }).click()
  const players = page.getByRole('table', { name: 'Players' })
  await expect(players.getByRole('spinbutton')).toHaveCount(25)
  await expect(players.getByRole('textbox', { name: 'Player 25 name' })).toHaveValue('Ó Briain')
  await expect(page.getByRole('button', { name: 'Save roster' })).toBeInViewport()

  await page.getByRole('button', { name: 'Close' }).click()
  await expect(panel).toBeHidden()
})
