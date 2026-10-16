import { expect, test, type Page } from '@playwright/test'

test('shows both teams of 11 and the ball on the pitch', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle('Gegenboard')
  await expect(page.getByRole('list', { name: 'Home players' }).getByRole('listitem')).toHaveCount(
    11,
  )
  await expect(page.getByRole('list', { name: 'Away players' }).getByRole('listitem')).toHaveCount(
    11,
  )
  await expect(page.getByRole('listitem', { name: '9 Okafor' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Ball' })).toBeVisible()
})

async function scrollSize(page: Page) {
  return page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
  }))
}

test('pitch fills the full height of a 1920x1080 window, without scrollbars', async ({ page }) => {
  await page.goto('/')

  const board = page.getByRole('group', { name: 'Tactics board' })
  const box = await board.boundingBox()
  expect(box?.y).toBe(0)
  expect(box?.height).toBe(1080)
  // Real pitch proportions: 105 m by 68 m, centred with room left for the benches.
  expect(box?.width).toBeCloseTo((1080 * 105) / 68, 0)
  expect((box?.x ?? 0) + (box?.width ?? 0) / 2).toBeCloseTo(960, 0)
  expect(await scrollSize(page)).toEqual({ width: 1920, height: 1080 })
})

test('puts a bench in the spare width on each side of the pitch', async ({ page }) => {
  await page.goto('/')

  const pitch = await page.getByRole('group', { name: 'Tactics board' }).boundingBox()
  const home = await page.getByRole('complementary', { name: 'Home bench' }).boundingBox()
  const away = await page.getByRole('complementary', { name: 'Away bench' }).boundingBox()
  expect(home?.x).toBe(0)
  expect((home?.x ?? 0) + (home?.width ?? 0)).toBeCloseTo(pitch?.x ?? 0, 0)
  expect(away?.x).toBeCloseTo((pitch?.x ?? 0) + (pitch?.width ?? 0), 0)
  expect((away?.x ?? 0) + (away?.width ?? 0)).toBeCloseTo(1920, 0)
})

test('keeps the pitch proportions in a window of another shape', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1200 })
  await page.goto('/')

  // The 16:9 frame is 1600x900, centred vertically; the pitch fills its height.
  const box = await page.getByRole('group', { name: 'Tactics board' }).boundingBox()
  expect(box?.y).toBeCloseTo(150, 0)
  expect(box?.height).toBeCloseTo(900, 0)
  expect(box?.width).toBeCloseTo((900 * 105) / 68, 0)
  expect(await scrollSize(page)).toEqual({ width: 1600, height: 1200 })
})

test('P hides every control and shows them again', async ({ page }) => {
  await page.goto('/')
  const rosters = page.getByRole('button', { name: 'Rosters' })
  await expect(rosters).toBeVisible()
  await rosters.click()
  await expect(page.getByRole('complementary', { name: 'Rosters' })).toBeVisible()

  await page.keyboard.press('p')
  await expect(page.getByRole('button')).toHaveCount(0)
  await expect(page.getByRole('textbox')).toHaveCount(0)
  await expect(page.getByRole('complementary', { name: 'Rosters' })).toBeHidden()
  await expect(page.getByRole('group', { name: 'Tactics board' })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Home bench' })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Away bench' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Ball' })).toBeVisible()

  await page.keyboard.press('p')
  await expect(rosters).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Rosters' })).toBeVisible()
})

test('?bg=transparent makes the page background transparent', async ({ page }) => {
  const background = () =>
    page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)

  await page.goto('/')
  expect(await background()).not.toBe('rgba(0, 0, 0, 0)')

  await page.goto('/?bg=transparent')
  expect(await background()).toBe('rgba(0, 0, 0, 0)')
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
    'rgba(0, 0, 0, 0)',
  )
})
