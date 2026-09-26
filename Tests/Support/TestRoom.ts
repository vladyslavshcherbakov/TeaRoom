import assert from 'node:assert/strict'
import { CameraZoom } from '../../Apps/Game/Room/Camera/CameraZoom.ts'
import { RoomGestures, type ScreenReader } from '../../Apps/Game/Room/RoomGestures.ts'
import { quietRoomLayout, type FloorPoint, type FurnitureId, type WorldPoint } from '../../Apps/Game/Room/RoomLayout.ts'
import { RoomPlay, type RoomTapTarget } from '../../Apps/Game/Room/RoomPlay.ts'
import type { RoomRemark } from '../../Apps/Game/Room/RoomRemarks.ts'
import type { TemperatureUnit } from '../../Apps/Game/Room/Temperatures.ts'
import { defaultCatalog } from '../../Shared/Content/DefaultCatalog.ts'
import type { Spot } from '../../Shared/Simulation/Definitions/RoomDefinition.ts'
import type { DeepReadonly } from '../../Shared/Simulation/State/DeepReadonly.ts'
import type { ItemLocation } from '../../Shared/Simulation/State/SessionState.ts'
import { TestRitual } from './TestRitual.ts'

export type TestRoomOptions = {
  readonly heaterItemsBeforeTheTesterJoke?: number
  readonly screen?: (room: TestRoom) => ScreenReader
}

const frameSeconds = 1 / 60
const longestWaitSeconds = 600
const longestWalkSeconds = 30

export class TestRoom {
  readonly logLines: string[] = []
  readonly ritual = TestRitual.begun(defaultCatalog, 'sencha', 'quietRoom')
  readonly remarks: RoomRemark[] = []
  readonly zoom = new CameraZoom()
  readonly play: RoomPlay
  readonly gestures: RoomGestures
  debugMenusAsked = 0
  achievementListsAsked = 0
  settingsAsked = 0
  guidesAsked = 0
  mayGrowAMiddleHand = true
  temperatureUnit: TemperatureUnit = 'celsius'
  isNerdModeOn = false
  areAchievementsShown = false
  deathsSeen = 0

  constructor(options: TestRoomOptions = {}) {
    const log = (line: string): void => {
      this.logLines.push(line)
    }
    this.play = new RoomPlay(this.ritual.session, defaultCatalog, quietRoomLayout, log, options.heaterItemsBeforeTheTesterJoke ?? 4, {
      remarked: (remark) => this.remarks.push(remark),
      debugMenuAsked: () => (this.debugMenusAsked += 1),
      achievementsAsked: () => (this.achievementListsAsked += 1),
      settingsAsked: () => (this.settingsAsked += 1),
      guideAsked: () => (this.guidesAsked += 1),
      mayGrowAMiddleHand: () => this.mayGrowAMiddleHand,
      temperatureUnit: () => this.temperatureUnit,
      isNerdModeOn: () => this.isNerdModeOn,
      areAchievementsShown: () => this.areAchievementsShown,
      keeperDied: () => (this.deathsSeen += 1),
      screenRightOnTheFloor: () => null,
    })
    const screen = options.screen?.(this) ?? { tapTargetAt: () => ({ kind: 'nothing' }), aimPointAt: () => ({ x: 0, z: 0 }) }
    this.gestures = new RoomGestures(this.play, this.zoom, screen, log)
  }

  get session() {
    return this.ritual.session
  }

  get state() {
    return this.ritual.state
  }

  tap(target: RoomTapTarget): void {
    this.play.pressStarted(target)
    this.play.pressEnded()
  }

  tapTimes(times: number, target: RoomTapTarget): void {
    for (let tap = 0; tap < times; tap += 1) this.tap(target)
  }

  takeAndChoose(itemId: string): void {
    this.tap({ kind: 'item', itemId })
    const handIndex = this.state.keeper.hands.indexOf(itemId)
    if (this.play.chosenHandIndex !== handIndex) throw new Error(`${itemId} did not reach a chosen hand`)
  }

  moveTheSpout(by: FloorPoint): void {
    this.play.pourFingerDown({ x: 0, z: 0 })
    this.play.pourFingerMoved(by)
    this.play.pourFingerUp()
  }

  walkTo(furnitureId: FurnitureId): void {
    this.tap({ kind: 'furniture', furnitureId })
    for (let elapsed = 0; elapsed < longestWalkSeconds && this.play.view.kind !== 'closeUp'; elapsed += frameSeconds) this.advance(frameSeconds)
    assert.deepEqual(this.play.view, { kind: 'closeUp', furnitureId }, this.logLines.join('\n'))
  }

  walkAcrossTheFloorTo(point: FloorPoint): void {
    if (this.play.view.kind === 'closeUp') this.tap({ kind: 'floor', point })
    this.tap({ kind: 'floor', point })
    this.advance(longestWalkSeconds)
  }

  carryFromTheShelf(...itemIds: string[]): void {
    this.walkTo('shelf')
    for (const itemId of itemIds) this.session.dispatch({ type: 'pickUp', itemId })
  }

  putDown(handIndex: 0 | 1, point: WorldPoint): void {
    const itemId = this.state.keeper.hands[handIndex]
    const placeId = this.state.keeper.placeId
    if (itemId === null || itemId === undefined || placeId === null) throw new Error(`nothing to put down from hand ${handIndex}`)
    this.session.dispatch({ type: 'putDown', itemId, spot: { placeId, x: point.x, y: point.y, z: point.z } })
  }

  fillInTheSink(vesselId: string): void {
    this.session.dispatch({ type: 'openVesselLid', vesselId })
    this.session.dispatch({ type: 'putInTheSink', itemId: vesselId })
    this.session.dispatch({ type: 'turnTheTapOn' })
    this.advance(10)
    this.session.dispatch({ type: 'turnTheTapOff' })
    this.session.dispatch({ type: 'pickUp', itemId: vesselId })
  }

  holdFor(seconds: number): void {
    for (let heldSeconds = 0; heldSeconds < seconds; heldSeconds += frameSeconds) this.gestures.advance(frameSeconds)
  }

  advanceUntil(isReached: () => boolean): void {
    for (let elapsed = 0; elapsed < longestWaitSeconds && !isReached(); elapsed += frameSeconds) this.advance(frameSeconds)
    assert.ok(isReached(), `not reached within ${longestWaitSeconds} s`)
  }

  advance(seconds: number): void {
    for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += frameSeconds) {
      this.play.advance(frameSeconds)
      this.session.advance(frameSeconds)
    }
  }
}

export function onTopOf(furnitureId: FurnitureId, across: number, forward: number): WorldPoint {
  const piece = quietRoomLayout.furniture.find((furniture) => furniture.id === furnitureId)
  if (piece === undefined) throw new Error(`the quiet room has no ${furnitureId}`)
  return { x: piece.footprint.x + across, y: piece.height, z: piece.footprint.z + forward }
}

export function withoutTheTurn(location: DeepReadonly<ItemLocation> | undefined): DeepReadonly<ItemLocation> | undefined {
  if (location?.kind !== 'onSurface') return location
  const { placeId, x, y, z } = location.spot
  return { kind: 'onSurface', spot: { placeId, x, y, z } }
}

export function spotOn(placeId: string, point: WorldPoint): Spot {
  return { placeId, x: point.x, y: point.y, z: point.z }
}
