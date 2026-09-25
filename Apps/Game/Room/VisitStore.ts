import type { FirstPersonLook } from './Camera/FirstPersonLook.ts'
import type { RoomLog, RoomPlace } from './RoomNavigator.ts'
import type { CameraMode, StickLayout } from './Views/DebugMenu.ts'

export const savedVisitVersion = 1

export type SavedCamera = {
  readonly mode: CameraMode
  readonly stickLayout: StickLayout
  readonly look: FirstPersonLook
}

export type SavedVisit = {
  readonly savedVisitVersion: number
  readonly sessionStateVersion: number
  readonly savedAtMilliseconds: number
  readonly ritual: unknown
  readonly place: RoomPlace
  readonly camera: SavedCamera
}

export type FoundVisit = { readonly kind: 'none' } | { readonly kind: 'found'; readonly visit: SavedVisit } | { readonly kind: 'brokenByAnUpdate' }

const storageKey = 'tearoom.visit'
const cameraModes: readonly CameraMode[] = ['room', 'firstPerson']
const stickLayouts: readonly StickLayout[] = ['walkOnTheLeft', 'lookOnTheLeft']

export class VisitStore {
  private readonly log: RoomLog
  private hasLoggedAFailedKeep = false

  constructor(log: RoomLog) {
    this.log = log
  }

  find(): FoundVisit {
    const text = this.read()
    if (text === null) return { kind: 'none' }
    const visit = parsedOrNull(text)
    if (visit === null) {
      this.log('the saved visit cannot be read as JSON, so the room opens anew')
      return { kind: 'brokenByAnUpdate' }
    }
    const problem = problemWith(visit)
    if (problem !== null) {
      this.log(`the saved visit does not fit this version of the game: ${problem}`)
      return { kind: 'brokenByAnUpdate' }
    }
    const saved = visit as SavedVisit
    this.log(`found a visit saved at ${new Date(saved.savedAtMilliseconds).toISOString()}`)
    return { kind: 'found', visit: saved }
  }

  keep(visit: SavedVisit): void {
    try {
      localStorage.setItem(storageKey, JSON.stringify(visit))
      this.hasLoggedAFailedKeep = false
    } catch (error) {
      if (this.hasLoggedAFailedKeep) return
      this.hasLoggedAFailedKeep = true
      this.log(`the visit could not be saved, it will be tried again: ${String(error)}`)
    }
  }

  forget(reason: string): void {
    try {
      localStorage.removeItem(storageKey)
      this.log(`the saved visit is forgotten: ${reason}`)
    } catch (error) {
      this.log(`the saved visit could not be forgotten (${reason}): ${String(error)}`)
    }
  }

  private read(): string | null {
    try {
      return localStorage.getItem(storageKey)
    } catch (error) {
      this.log(`the saved visit cannot be read, so the room opens anew: ${String(error)}`)
      return null
    }
  }
}

function parsedOrNull(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function problemWith(visit: unknown): string | null {
  if (typeof visit !== 'object' || visit === null) return 'it is not an object'
  const saved = visit as Partial<Record<keyof SavedVisit, unknown>>
  if (saved.savedVisitVersion !== savedVisitVersion) return `it is version ${String(saved.savedVisitVersion)}, the game reads version ${savedVisitVersion}`
  if (typeof saved.sessionStateVersion !== 'number' || typeof saved.savedAtMilliseconds !== 'number') return 'its versions or its time are missing'
  const place = saved.place as Partial<Record<keyof RoomPlace, unknown>> | undefined
  const position = place?.position as { x?: unknown; z?: unknown } | undefined
  if (typeof position?.x !== 'number' || typeof position.z !== 'number' || typeof place?.headingRadians !== 'number') return 'its place is missing'
  if (place.closeUpOf !== null && typeof place.closeUpOf !== 'string') return 'its close-up is not a piece of furniture'
  const camera = saved.camera as Partial<Record<keyof SavedCamera, unknown>> | undefined
  const look = camera?.look as Partial<Record<keyof FirstPersonLook, unknown>> | undefined
  if (!cameraModes.includes(camera?.mode as CameraMode) || !stickLayouts.includes(camera?.stickLayout as StickLayout)) return 'its camera is not one the game has'
  if (typeof look?.headingRadians !== 'number' || typeof look.pitchRadians !== 'number') return 'its first-person look is missing'
  return null
}
