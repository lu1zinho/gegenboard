import { expect, test, type Locator, type Page } from '@playwright/test'

const pitch = (page: Page) => page.getByRole('group', { name: 'Tactics board' })

async function centre(token: Locator) {
  const box = await token.boundingBox()
  if (!box) throw new Error('Token is not visible')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

async function transform(token: Locator) {
  return token.getAttribute('transform')
}

test('dragging a player moves only that player', async ({ page }) => {
  await page.goto('/')
  const striker = page.getByRole('listitem', { name: '9 Okafor' })
  const positions = () =>
    page.getByRole('listitem').evaluateAll((items) => {
      const result: Record<string, string | null> = {}
      for (const item of items)
        result[item.getAttribute('aria-label') ?? ''] = item.getAttribute('transform')
      return result
    })
  const before = await positions()
  const ball = page.getByRole('img', { name: 'Ball' })
  const ballBefore = await transform(ball)
  const from = await centre(striker)
  const box = await pitch(page).boundingBox()
  if (!box) throw new Error('No pitch')

  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.3, { steps: 8 })
  await page.mouse.up()

  const after = await centre(striker)
  expect(after.x).toBeCloseTo(box.x + box.width * 0.75, 0)
  expect(after.y).toBeCloseTo(box.y + box.height * 0.3, 0)
  const { '9 Okafor': moved, ...othersAfter } = await positions()
  const { '9 Okafor': start, ...othersBefore } = before
  expect(moved).not.toBe(start)
  expect(othersAfter).toEqual(othersBefore)
  expect(await transform(ball)).toBe(ballBefore)
})

test('dragging the ball moves it, and it stays after a reload', async ({ page }) => {
  await page.goto('/')
  const ball = page.getByRole('img', { name: 'Ball' })
  const box = await pitch(page).boundingBox()
  if (!box) throw new Error('No pitch')
  const from = await centre(ball)

  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.8, { steps: 8 })
  await page.mouse.up()

  const after = await centre(ball)
  expect(after.x).toBeCloseTo(box.x + box.width * 0.25, 0)
  expect(after.y).toBeCloseTo(box.y + box.height * 0.8, 0)

  const moved = await transform(ball)
  await page.reload()
  expect(await transform(page.getByRole('img', { name: 'Ball' }))).toBe(moved)
})

test('a drag outside the pitch ends clamped to the edge', async ({ page }) => {
  await page.goto('/')
  const striker = page.getByRole('listitem', { name: '9 Okafor' })
  const box = await pitch(page).boundingBox()
  if (!box) throw new Error('No pitch')
  const from = await centre(striker)

  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  // Far past the right goal line and above the top touchline, inside the window.
  await page.mouse.move(box.x + box.width + 150, box.y - 5, { steps: 8 })
  await page.mouse.up()

  // Right goal line is x = 105 m, top touchline y = 0 m.
  expect(await transform(striker)).toBe('translate(105 0)')
})

test('a dragged ball is clamped to the bottom-left corner', async ({ page }) => {
  await page.goto('/')
  const ball = page.getByRole('img', { name: 'Ball' })
  const box = await pitch(page).boundingBox()
  if (!box) throw new Error('No pitch')
  const from = await centre(ball)

  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(box.x - 100, box.y + box.height + 20, { steps: 8 })
  await page.mouse.up()

  expect(await transform(ball)).toBe('translate(0 68)')
})

test('a drag can be undone in one step', async ({ page }) => {
  await page.goto('/')
  const ball = page.getByRole('img', { name: 'Ball' })
  const before = await transform(ball)
  const from = await centre(ball)

  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 300, from.y + 100, { steps: 10 })
  await page.mouse.up()
  expect(await transform(ball)).not.toBe(before)

  await page.keyboard.press('Control+z')
  expect(await transform(ball)).toBe(before)
})
