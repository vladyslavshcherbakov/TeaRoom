import { expect, test } from '@playwright/test'
import { text } from '../../Apps/Game/Texts/Texts.ts'
import { consoleRecordOf, roomOpening } from '../Support/BrowserRoom.ts'

test.use({ storageState: { cookies: [], origins: [] } })

test('disclaimer_onTheFirstVisit_showsItsNoteWithOk', async ({ page }) => {
  const record = consoleRecordOf(page)

  await page.goto('./')
  await roomOpening(record, 1)

  await expect(page.getByRole('dialog', { name: text('disclaimer.title') })).toContainText(text('disclaimer.farewell'))
  await expect(page.getByRole('button', { name: text('disclaimer.ok') })).toBeVisible()
  expect(record.errors).toEqual([])
})

test('disclaimer_whenOkWasTappedAndThePageReloads_isNotShownAgain', async ({ page }) => {
  const record = consoleRecordOf(page)
  await page.goto('./')
  await roomOpening(record, 1)
  await page.getByRole('button', { name: text('disclaimer.ok') }).tap()

  await page.reload()
  await expect(page.locator('.continue')).toBeVisible()

  await expect(page.locator('.disclaimer')).toHaveCount(0)
  expect(record.errors).toEqual([])
})
