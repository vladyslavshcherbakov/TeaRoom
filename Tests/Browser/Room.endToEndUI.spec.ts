import { expect, test, type Page } from '@playwright/test'

function roomLog(page: Page): { lines: string[]; errors: string[] } {
  const record = { lines: [] as string[], errors: [] as string[] }
  page.on('console', (message) => {
    if (message.text().includes('[room]')) record.lines.push(message.text())
  })
  page.on('pageerror', (error) => record.errors.push(error.message))
  return record
}

test('room_whenTheFloorInFrontOfTheWalkerIsTapped_answersTheTap', async ({ page }) => {
  const log = roomLog(page)
  await page.goto('./room/')
  await expect.poll(() => log.lines.some((line) => line.includes('room opened'))).toBe(true)
  const viewport = page.viewportSize()
  if (viewport === null) throw new Error('the page has no viewport')

  await page.mouse.click(viewport.width / 2, viewport.height / 2)

  await expect.poll(() => log.lines.length).toBeGreaterThan(1)
  expect(log.errors).toEqual([])
})
