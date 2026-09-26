import { expect, test, type Page } from '@playwright/test'
import { text } from '../../Apps/Game/Texts/Texts.ts'

const floorSharesToTry = [
  [0.3, 0.5],
  [0.35, 0.45],
  [0.6, 0.55],
  [0.4, 0.58],
] as const
const entrance = '(1.60, 1.80)'

test('room_whenTheFloorInFrontOfTheWalkerIsTapped_answersTheTap', async ({ page }) => {
  const log = roomLog(page)
  await page.goto('./')
  await expect.poll(() => log.lines.some((line) => line.includes('room opened'))).toBe(true)
  const viewport = page.viewportSize()
  if (viewport === null) throw new Error('the page has no viewport')

  await page.mouse.click(viewport.width / 2, viewport.height / 2)

  await expect.poll(() => log.lines.length).toBeGreaterThan(1)
  expect(log.errors).toEqual([])
})

test('room_whenOpened_opensTheSessionWithNothingToSip', async ({ page }) => {
  const ritualLines: string[] = []
  page.on('console', (message) => {
    if (message.text().includes('[ritual]')) ritualLines.push(message.text())
  })

  await page.goto('./')

  await expect.poll(() => ritualLines.some((line) => line.includes('session opened in quietRoom'))).toBe(true)
  await expect(page.locator('button.sip')).toBeHidden()
})

test('room_whenReloadedAfterTheWalkerMoved_offersToContinueWhereTheWalkerStood', async ({ page }) => {
  const log = roomLog(page)
  await page.goto('./')
  await expect.poll(() => log.lines.some((line) => line.includes('room opened'))).toBe(true)
  await walkSomewhereOnTheFloor(page, log.lines)
  await expect.poll(() => log.lines.some((line) => line.includes('the visit is saved with the walker at') && !line.includes(entrance)), { timeout: 20_000 }).toBe(true)
  await page.reload()

  await page.locator('.continue-primary').click()

  await expect.poll(() => log.lines.filter((line) => line.includes('room opened')).length).toBe(2)
  const reopened = log.lines.filter((line) => line.includes('room opened'))[1] ?? ''
  expect(reopened).not.toContain(`walker at ${entrance}`)
  expect(log.errors).toEqual([])
})

test('room_whenReloadedAndStartedOver_opensAtTheEntrance', async ({ page }) => {
  const log = roomLog(page)
  await page.goto('./')
  await expect.poll(() => log.lines.some((line) => line.includes('room opened'))).toBe(true)
  await page.reload()

  await page.locator('.continue-secondary').click()

  await expect.poll(() => log.lines.filter((line) => line.includes('room opened')).length).toBe(2)
  expect(log.lines.filter((line) => line.includes('room opened'))[1]).toContain(`walker at ${entrance}`)
})

test('room_withAVisitSavedByAnIncompatibleVersion_saysTheVisitWasLost', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('visit', JSON.stringify({ savedVisitVersion: 0 })))

  await page.goto('./')

  await expect(page.locator('.caption')).toContainText(text('visit.lostToAnUpdate'))
})

function roomLog(page: Page): { lines: string[]; errors: string[] } {
  const record = { lines: [] as string[], errors: [] as string[] }
  page.on('console', (message) => {
    if (message.text().includes('[room]')) record.lines.push(message.text())
  })
  page.on('pageerror', (error) => record.errors.push(error.message))
  return record
}

async function walkSomewhereOnTheFloor(page: Page, lines: readonly string[]): Promise<void> {
  const viewport = page.viewportSize()
  if (viewport === null) throw new Error('the page has no viewport')
  for (const [widthShare, heightShare] of floorSharesToTry) {
    const walking = page.waitForEvent('console', { predicate: (message) => message.text().includes('walking to'), timeout: 1000 }).catch(() => null)
    await page.mouse.click(viewport.width * widthShare, viewport.height * heightShare)
    if ((await walking) !== null || lines.some((line) => line.includes('walking to'))) return
  }
  throw new Error('no tap on the floor made the walker walk')
}
