import { browserStore, doesNotFit, fits, type BrowserStore, type Decoded } from '../../../Engine/BrowserStorage.ts'
import type { FirstPersonLook } from '../../../Engine/Camera/FirstPersonLook.ts'
import { describeArrangement, problemWithArrangement, type RoomArrangement } from '../NewGame/RoomArrangement.ts'
import type { RoomPlace } from '../Layout/RoomNavigator.ts'
import type { AppLog } from '../../../Engine/AppLog.ts'

export const savedVisitVersion = 2

export type SavedCamera = {
  readonly look: FirstPersonLook
}

export type SavedVisit = {
  readonly savedVisitVersion: number
  readonly sessionStateVersion: number
  readonly savedAtMilliseconds: number
  readonly session: unknown
  readonly place: RoomPlace
  readonly camera: SavedCamera
  readonly arrangement: RoomArrangement
}

export function visitStore(log: AppLog): BrowserStore<SavedVisit> {
  return browserStore({ key: 'visit', name: 'the visit', whenLost: 'so the room opens anew', decode: savedVisitFrom, describe: describeVisit }, log)
}

function savedVisitFrom(visit: unknown): Decoded<SavedVisit> {
  const problem = problemWith(visit)
  return problem === null ? fits(visit as SavedVisit) : doesNotFit(problem)
}

function describeVisit(visit: SavedVisit): string {
  return `saved at ${new Date(visit.savedAtMilliseconds).toISOString()} in a room with ${describeArrangement(visit.arrangement)}`
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
  if (typeof look?.headingRadians !== 'number' || typeof look.pitchRadians !== 'number') return 'its first-person look is missing'
  const arrangementProblem = problemWithArrangement(saved.arrangement)
  return arrangementProblem === null ? null : `its room ${arrangementProblem}`
}
