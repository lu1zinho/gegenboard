import { expect, test } from '@playwright/test'

/**
 * A valid board in the stored format, unlike the kick-off board in two visible ways: the away
 * team is Gegenpress FC and the home number 9, Okafor, is far upfield.
 */
function highPressBoard() {
  const players = (side: 'home' | 'away') =>
    Array.from({ length: 11 }, (_, index) => {
      const number = index + 1
      const id = `${side}-${number}`
      if (id === 'home-9') return { id, number, name: 'Okafor', position: { x: 80, y: 50 } }
      // The rest in a diagonal line across their own half.
      const x = 5 + index * 4
      const y = 10 + index * 8
      const position = side === 'home' ? { x, y } : { x: 100 - x, y: 100 - y }
      return { id, number, name: `Player ${number}`, position }
    })
  return {
    version: 1,
    teams: {
      home: {
        name: 'Home',
        colours: { primary: '#c62828', secondary: '#ffffff' },
        players: players('home'),
      },
      away: {
        name: 'Gegenpress FC',
        colours: { primary: '#ffeb3b', secondary: '#000000' },
        players: players('away'),
      },
    },
    ball: { position: { x: 80, y: 45 } },
    arrows: [],
  }
}

test('keeps a changed board after a reload, and undoes and redoes the change', async ({ page }) => {
  await page.goto('/')
  const striker = page.getByRole('listitem', { name: '9 Okafor' })
  const gegenpress = page.getByRole('list', { name: 'Gegenpress FC players' })
  await expect(striker).toHaveAttribute('transform', 'translate(48.3 34)')
  await expect(gegenpress).toHaveCount(0)

  // Change the whole board at once by loading a saved one. Store it as a visit before this one
  // would have, then reload so the app lists it.
  const savedBoards = {
    version: 1,
    boards: [{ id: 'board-1', name: 'High press', board: highPressBoard() }],
  }
  await page.evaluate((json) => {
    localStorage.setItem('gegenboard.savedBoards', json)
  }, JSON.stringify(savedBoards))
  await page.reload()

  await page.getByRole('button', { name: 'Boards' }).click()
  await page.getByRole('button', { name: 'Load High press' }).click()
  await expect(page.getByRole('status')).toHaveText('Loaded High press')
  await expect(striker).toHaveAttribute('transform', 'translate(84 34)')
  await expect(gegenpress.getByRole('listitem')).toHaveCount(11)

  // Undo and redo the load from the keyboard.
  await page.keyboard.press('Control+Z')
  await expect(striker).toHaveAttribute('transform', 'translate(48.3 34)')
  await expect(gegenpress).toHaveCount(0)
  await page.keyboard.press('Control+Shift+Z')
  await expect(striker).toHaveAttribute('transform', 'translate(84 34)')
  await page.keyboard.press('Control+Z')
  await expect(striker).toHaveAttribute('transform', 'translate(48.3 34)')
  await page.keyboard.press('Control+Y')
  await expect(striker).toHaveAttribute('transform', 'translate(84 34)')

  // The board on screen is autosaved under its own key, with its schema version.
  const autosaved: unknown = JSON.parse(
    (await page.evaluate(() => localStorage.getItem('gegenboard.board'))) ?? 'null',
  )
  expect(autosaved).toEqual(highPressBoard())

  await page.reload()
  await expect(striker).toHaveAttribute('transform', 'translate(84 34)')
  await expect(gegenpress.getByRole('listitem')).toHaveCount(11)
  await expect(page.getByRole('img', { name: 'Ball' })).toHaveAttribute(
    'transform',
    'translate(84 30.6)',
  )
})
