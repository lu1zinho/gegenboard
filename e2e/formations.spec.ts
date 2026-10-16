import { expect, test } from '@playwright/test'

test('switching a formation moves that team and leaves the other alone', async ({ page }) => {
  await page.goto('/')
  const home = page.getByRole('list', { name: 'Home players' }).getByRole('listitem')
  const away = page.getByRole('list', { name: 'Away players' }).getByRole('listitem')
  const positions = (players: typeof home) =>
    players.evaluateAll((items) => items.map((item) => item.getAttribute('transform')))

  const homeBefore = await positions(home)
  const awayBefore = await positions(away)

  await page.getByRole('combobox', { name: 'Home formation' }).selectOption('3-5-2')

  await expect(page.getByRole('combobox', { name: 'Home formation' })).toHaveValue('3-5-2')
  expect(await positions(home)).not.toEqual(homeBefore)
  expect(await positions(away)).toEqual(awayBefore)
  await expect(page.getByRole('listitem', { name: '9 Okafor' })).toBeVisible()
})
