import { expect, test } from '@playwright/test'

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

test('fills a 1920x1080 window exactly, without scrollbars', async ({ page }) => {
  await page.goto('/')

  const board = page.getByRole('group', { name: 'Tactics board' })
  expect(await board.boundingBox()).toEqual({ x: 0, y: 0, width: 1920, height: 1080 })
  const scrollSize = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
  }))
  expect(scrollSize).toEqual({ width: 1920, height: 1080 })
})

test('keeps a centred 16:9 frame in a window of another shape', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1200 })
  await page.goto('/')

  const board = page.getByRole('group', { name: 'Tactics board' })
  expect(await board.boundingBox()).toEqual({ x: 0, y: 150, width: 1600, height: 900 })
})
