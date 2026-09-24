import { expect, test, type Page } from '@playwright/test'

const sceneWidth = 390
const sceneHeight = 844

async function sceneToPage(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const canvas = await page.locator('canvas').boundingBox()
  if (canvas === null) throw new Error('the game has no canvas on the page')
  return { x: canvas.x + (x * canvas.width) / sceneWidth, y: canvas.y + (y * canvas.height) / sceneHeight }
}

async function tapScene(page: Page, x: number, y: number): Promise<void> {
  const point = await sceneToPage(page, x, y)
  await page.mouse.click(point.x, point.y)
}

async function dragScene(page: Page, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
  const start = await sceneToPage(page, from.x, from.y)
  const end = await sceneToPage(page, to.x, to.y)
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(end.x, end.y, { steps: 15 })
  await page.mouse.up()
}

function ritualLog(page: Page): { lines: string[]; errors: string[] } {
  const record = { lines: [] as string[], errors: [] as string[] }
  page.on('console', (message) => {
    if (message.text().includes('[ritual]')) record.lines.push(message.text())
  })
  page.on('pageerror', (error) => record.errors.push(error.message))
  return record
}

test('firstRitual_whenTheKettleIsPutOnTheHeaterAndSwitchedOn_startsHeating', async ({ page }) => {
  const log = ritualLog(page)
  await page.goto('./')
  await expect.poll(() => log.lines.some((line) => line.includes('session opened in quietRoom'))).toBe(true)

  await tapScene(page, 195, 620)
  await dragScene(page, { x: 205, y: 520 }, { x: 80, y: 548 })
  await tapScene(page, 80, 592)

  await expect.poll(() => log.lines.some((line) => line.includes('heater switched on with kettle on top'))).toBe(true)
  expect(log.lines.some((line) => line.includes('ritual began with sencha'))).toBe(true)
  expect(log.errors).toEqual([])
})

test('ritualBench_whenOpened_showsItsControlsAndTheLog', async ({ page }) => {
  await page.goto('./bench/')

  await expect(page.locator('section')).toHaveCount(7)
  await expect(page.locator('#log')).toContainText('session opened in quietRoom')
})
