import { browserStorage, parsedJsonOrNull } from './BrowserStorage.ts'
import type { FirstPersonLook } from './Camera/FirstPersonLook.ts'
import { arrangementBeforeRoomsVaried, arrangementOfAnEarlierSave, describeArrangement, problemWithArrangement, type RoomArrangement } from './RoomArrangement.ts'
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
  readonly arrangement: RoomArrangement
}

export type FoundVisit = { readonly kind: 'none' } | { readonly kind: 'found'; readonly visit: SavedVisit } | { readonly kind: 'brokenByAnUpdate' }

const storageKey = 'visit'
const cameraModes: readonly CameraMode[] = ['room', 'firstPerson']
const stickLayouts: readonly StickLayout[] = ['walkOnTheLeft', 'lookOnTheLeft']

export class VisitStore {
  private readonly log: RoomLog
  private hasLoggedAFailedKeep = false

  constructor(log: RoomLog) {
    this.log = log
  }

  find(): FoundVisit {
    const stored = browserStorage.read(storageKey)
    if (stored.kind === 'unreachable') {
      this.log(`the saved visit cannot be read, so the room opens anew: ${stored.error}`)
      return { kind: 'none' }
    }
    if (stored.kind === 'none') return { kind: 'none' }
    const parsedVisit = parsedJsonOrNull(stored.text)
    if (parsedVisit === null) {
      this.log('the saved visit cannot be read as JSON, so the room opens anew')
      return { kind: 'brokenByAnUpdate' }
    }
    const visit = this.withTheArrangementInTodaysWords(parsedVisit)
    const problem = problemWith(visit)
    if (problem !== null) {
      this.log(`the saved visit does not fit this version of the game: ${problem}`)
      return { kind: 'brokenByAnUpdate' }
    }
    const saved = this.withItsArrangement(visit as Omit<SavedVisit, 'arrangement'> & { readonly arrangement?: RoomArrangement })
    this.log(`found a visit saved at ${new Date(saved.savedAtMilliseconds).toISOString()} in a room with ${describeArrangement(saved.arrangement)}`)
    return { kind: 'found', visit: saved }
  }

  keep(visit: SavedVisit): void {
    const write = browserStorage.keep(storageKey, JSON.stringify(visit))
    if (write.kind === 'done') {
      this.hasLoggedAFailedKeep = false
      return
    }
    if (this.hasLoggedAFailedKeep) return
    this.hasLoggedAFailedKeep = true
    this.log(`the visit could not be saved, it will be tried again: ${write.error}`)
  }

  forget(reason: string): void {
    const write = browserStorage.forget(storageKey)
    if (write.kind === 'done') this.log(`the saved visit is forgotten: ${reason}`)
    else this.log(`the saved visit could not be forgotten (${reason}): ${write.error}`)
  }

  private withTheArrangementInTodaysWords(visit: unknown): unknown {
    if (typeof visit !== 'object' || visit === null || !('arrangement' in visit)) return visit
    const arrangement = arrangementOfAnEarlierSave(visit.arrangement)
    if (arrangement === visit.arrangement) return visit
    this.log('the saved visit names its room by its kitchen alone, from before the furniture could move, so it keeps its window with the kitchen beside it and the tea table by the window')
    return { ...visit, arrangement }
  }

  private withItsArrangement(visit: Omit<SavedVisit, 'arrangement'> & { readonly arrangement?: RoomArrangement }): SavedVisit {
    if (visit.arrangement !== undefined) return { ...visit, arrangement: visit.arrangement }
    this.log('the saved visit is from before the room was arranged anew for each game, so it continues in the room it was played in')
    return { ...visit, arrangement: arrangementBeforeRoomsVaried }
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
  if (saved.arrangement === undefined) return null
  const arrangementProblem = problemWithArrangement(saved.arrangement)
  return arrangementProblem === null ? null : `its room ${arrangementProblem}`
}
