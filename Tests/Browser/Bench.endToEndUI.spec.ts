import { expect, test } from '@playwright/test'

test('ritualBench_whenOpened_showsItsControlsAndTheLog', async ({ page }) => {
  await page.goto('./bench/')

  await expect(page.locator('section')).toHaveCount(7)
  await expect(page.locator('#log')).toContainText('session opened in quietRoom')
})
