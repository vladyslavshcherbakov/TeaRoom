import { defineConfig, devices } from '@playwright/test'

const previewPort = 4173
const scenarios = 'Scenarios.endToEndUI.spec.ts'
const disclaimerAlreadyRead = { cookies: [], origins: [{ origin: `http://127.0.0.1:${previewPort}`, localStorage: [{ name: 'disclaimerSeen', value: 'true' }] }] }
const androidChromium = { ...devices['Pixel 7'], launchOptions: { args: ['--enable-unsafe-swiftshader'] } }

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: process.env['CI'] !== undefined,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${previewPort}/`, storageState: disclaimerAlreadyRead, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: {
    command: `npx vite preview Apps/Game/Room --outDir ../../../dist --host 127.0.0.1 --port ${previewPort} --strictPort`,
    cwd: '../..',
    url: `http://127.0.0.1:${previewPort}/`,
    reuseExistingServer: false,
  },
  projects: [
    { name: 'iphone-webkit', testMatch: 'Room.endToEndUI.spec.ts', use: { ...devices['iPhone 15'] } },
    { name: 'android-chromium', testIgnore: scenarios, use: androidChromium },
    { name: 'scenarios-in-the-room-view', testMatch: scenarios, grep: /\(room\)/, use: androidChromium },
    { name: 'scenarios-in-first-person', testMatch: scenarios, grep: /\(firstPerson\)/, use: androidChromium },
  ],
})
