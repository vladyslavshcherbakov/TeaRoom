import { defineConfig, devices } from '@playwright/test'

const previewPort = 4173

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  timeout: 60_000,
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${previewPort}/` },
  webServer: {
    command: `npx vite preview Apps/Game/Room --outDir ../../../dist --host 127.0.0.1 --port ${previewPort} --strictPort`,
    cwd: '../..',
    url: `http://127.0.0.1:${previewPort}/`,
    reuseExistingServer: false,
  },
  projects: [
    { name: 'iphone-webkit', use: { ...devices['iPhone 15'] } },
    { name: 'android-chromium', use: { ...devices['Pixel 7'], launchOptions: { args: ['--enable-unsafe-swiftshader'] } } },
  ],
})
