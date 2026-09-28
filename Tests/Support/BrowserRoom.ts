import { expect, type Page } from '@playwright/test'

export type ConsoleRecord = { readonly roomLines: string[]; readonly simulationLines: string[]; readonly threeWarnings: string[]; readonly errors: string[] }

const roomOpensWithinMilliseconds = 20_000

export function consoleRecordOf(page: Page): ConsoleRecord {
  const record: ConsoleRecord = { roomLines: [], simulationLines: [], threeWarnings: [], errors: [] }
  page.on('console', (message) => {
    const line = message.text()
    if (line.includes('[room]')) record.roomLines.push(line)
    if (line.includes('[simulation]')) record.simulationLines.push(line)
    if (message.type() === 'error') record.errors.push(line)
    if (message.type() === 'warning' && line.startsWith('THREE.')) record.threeWarnings.push(line)
  })
  page.on('pageerror', (error) => record.errors.push(error.message))
  return record
}

export async function roomOpening(record: ConsoleRecord, openingNumber: number): Promise<string> {
  const openings = () => record.roomLines.filter((line) => line.includes('room opened'))
  await expect.poll(() => openings().length, { timeout: roomOpensWithinMilliseconds }).toBeGreaterThanOrEqual(openingNumber)
  const opening = openings()[openingNumber - 1]
  if (opening === undefined) throw new Error(`the room did not open ${openingNumber} times`)
  return opening
}
