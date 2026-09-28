import assert from 'node:assert/strict'
import { nothingUnlocked, type AchievementId, type Achievements } from '../../Apps/Game/Room/Achievements.ts'
import { CameraZoom } from '../../Apps/Game/Room/Camera/CameraZoom.ts'
import { TouchInput, type ScreenReader } from '../../Apps/Game/Room/TouchInput.ts'
import type { ScreenPoint } from '../../Apps/Engine/ScreenPoint.ts'
import { furnitureWithId, roomLayoutFor, type FurnitureId } from '../../Apps/Game/Room/RoomLayout.ts'
import type { FloorPoint, WorldPoint } from '../../Apps/Engine/Points.ts'
import { LyingLids, whyThereIsNoRoomFor } from '../../Apps/Game/Room/Placement.ts'
import type { PlayerController } from '../../Apps/Game/Room/PlayerController.ts'
import { RoomVisit } from '../../Apps/Game/Room/RoomVisit.ts'
import { arrangementOfANewGame } from '../../Apps/Game/Room/RoomArrangement.ts'
import { roomEntrance } from '../../Apps/Game/Room/RoomNavigator.ts'
import type { TapTarget } from '../../Apps/Game/Room/TapTarget.ts'
import type { PlayerBark } from '../../Apps/Game/Room/PlayerBarks.ts'
import type { TapReach } from '../../Apps/Game/Room/TapTargetAmong.ts'
import type { TemperatureUnit } from '../../Apps/Game/Room/Temperatures.ts'
import type { MomentaryRoomSound } from '../../Apps/Game/Room/RoomSounds.ts'
import { defaultCatalog } from '../../Shared/Content/DefaultCatalog.ts'
import { shelfBoards } from '../../Shared/Content/Rooms.ts'
import { definitionIn } from '../../Shared/Engine/Catalog.ts'
import type { Spot } from '../../Shared/GameLogic/Definitions/RoomDefinition.ts'
import type { DeepReadonly } from '../../Shared/Engine/DeepReadonly.ts'
import type { ItemLocation, SessionState } from '../../Shared/GameLogic/State/SessionState.ts'
import { AchievementsKeptInMemory } from './AchievementsKeptInMemory.ts'
import { TestTeaSession } from './TestTeaSession.ts'
import { itemIdsInTheHands } from '../../Shared/GameLogic/State/WhereItemsAre.ts'
import type { ScreenButton } from '../../Apps/Game/Room/ScreenButton.ts'
import { screenControlsShown } from '../../Apps/Game/Room/ScreenControls.ts'

export type ShelfBoard = 'bottom' | 'middle' | 'upper'

export type TestRoomOptions = {
  readonly heaterItemsBeforeTheTesterJoke?: number
  readonly screen?: (room: TestRoom) => ScreenReader
  readonly unlocked?: readonly AchievementId[]
}

const missedStreamOffsetFromTheMiddleOfTheTop: Partial<Record<FurnitureId, FloorPoint>> = { teaTable: { x: -0.2, z: 0.1 } }

export const frameSeconds = 1 / 60

export const quietRoomLayout = roomLayoutFor({ window: 'inTheBackWall', besideTheWindow: 'kitchen', table: 'byTheWindow' })

const longestWaitSeconds = 600
const longestWalkSeconds = 30
const secondsTheTapFillsAVessel = 10

export class TestRoom {
  readonly logLines: string[] = []
  readonly testSession = new TestTeaSession(defaultCatalog, 'quietRoom', null, spotWhereAPourMissesOnTheTopOfThePlayersPlace)
  readonly barks: Pick<PlayerBark, 'kind' | 'timesMade'>[] = []
  readonly announcedAchievements: AchievementId[] = []
  readonly soundsStarted: MomentaryRoomSound[] = []
  readonly zoom = new CameraZoom()
  readonly lyingLids: LyingLids
  readonly visit: RoomVisit
  readonly playerController: PlayerController
  readonly touchInput: TouchInput
  debugMenusAsked = 0
  achievementListsAsked = 0
  settingsAsked = 0
  guidesAsked = 0
  firstPersonLeaves = 0
  captions: (readonly string[])[] = []
  savedVisits = 0
  visitsForgotten = 0
  temperatureUnit: TemperatureUnit = 'celsius'
  isNerdModeOn = false
  areAchievementsShown = false
  deathsSeen = 0

  constructor(options: TestRoomOptions = {}) {
    const log = (line: string): void => {
      this.logLines.push(line)
    }
    this.lyingLids = new LyingLids(log)
    this.visit = new RoomVisit({
      session: this.testSession.session,
      catalog: defaultCatalog,
      layout: quietRoomLayout,
      arrangement: arrangementOfANewGame(() => 0),
      lyingLids: this.lyingLids,
      voiceSeed: 7,
      heaterItemsBeforeTheTesterJoke: options.heaterItemsBeforeTheTesterJoke ?? 4,
      place: roomEntrance,
      stores: {
        visit: { keep: () => (this.savedVisits += 1), forget: () => (this.visitsForgotten += 1) },
        achievements: new AchievementsKeptInMemory({ ...nothingUnlocked, unlocked: options.unlocked ?? [] }),
        playTime: { load: () => 0, keep: () => {} },
      },
      settings: () => this,
      screenRightOnTheFloor: () => null,
      screens: {
        captionShown: (lines) => lines.length > 0 && this.captions.push(lines),
        captionHidden: () => {},
        barked: (bark) => this.barks.push({ kind: bark.kind, timesMade: bark.timesMade }),
        youDiedShown: () => (this.deathsSeen += 1),
        debugMenuOpened: () => (this.debugMenusAsked += 1),
        achievementsOpened: () => (this.achievementListsAsked += 1),
        guideOpened: () => (this.guidesAsked += 1),
        settingsOpened: () => (this.settingsAsked += 1),
        firstPersonLeft: () => (this.firstPersonLeaves += 1),
        achievementAnnounced: (id) => this.announcedAchievements.push(id),
        soundStarted: (sound) => this.soundsStarted.push(sound),
      },
      log,
    })
    this.playerController = this.visit.playerController
    const screen = options.screen?.(this) ?? screenShowing(() => ({ kind: 'nothing' }))
    this.touchInput = new TouchInput(this.playerController, this.zoom, screen, log)
  }

  get achievements(): Achievements {
    return this.visit.achievements
  }

  get session() {
    return this.testSession.session
  }

  get state() {
    return this.testSession.state
  }

  buttonsShownInTheRoomView(): Readonly<Record<ScreenButton, boolean>> {
    return screenControlsShown({ cameraMode: 'room', controlScheme: 'twoSticks', stickLayout: 'walkOnTheLeft', mode: this.playerController.mode, hasACupToSip: this.playerController.sippableCupId !== null }).buttons
  }

  tap(target: TapTarget): void {
    this.playerController.pressStarted(target, null)
    this.playerController.pressEnded()
  }

  tapTimes(times: number, target: TapTarget): void {
    for (let tap = 0; tap < times; tap += 1) this.tap(target)
  }

  takeAndChoose(itemId: string): void {
    this.tap({ kind: 'item', itemId })
    const handIndex = itemIdsInTheHands(this.state).indexOf(itemId)
    if (this.playerController.chosenHandIndex !== handIndex) throw new Error(`${itemId} did not reach a chosen hand`)
  }

  moveTheSpout(by: FloorPoint): void {
    this.playerController.pourFingerDown(middleOfTheFloor)
    this.playerController.pourFingerMoved(by)
    this.playerController.pourFingerUp()
  }

  walkTo(furnitureId: FurnitureId): void {
    this.tap({ kind: 'furniture', furnitureId })
    for (let elapsed = 0; elapsed < longestWalkSeconds && this.playerController.view.kind !== 'closeUp'; elapsed += frameSeconds) this.advance(frameSeconds)
    assert.deepEqual(this.playerController.view, { kind: 'closeUp', furnitureId }, this.logLines.join('\n'))
  }

  walkAcrossTheFloorTo(point: FloorPoint): void {
    if (this.playerController.view.kind === 'closeUp') this.tap({ kind: 'floor', point })
    this.tap({ kind: 'floor', point })
    this.advance(longestWalkSeconds)
  }

  carryFromTheShelf(...itemIds: string[]): void {
    this.walkTo('shelf')
    for (const itemId of itemIds) this.testSession.doWithoutARefusal({ type: 'pickUp', itemId })
  }

  putDown(handIndex: 0 | 1, point: WorldPoint): void {
    const itemId = itemIdsInTheHands(this.state)[handIndex]
    const placeId = this.state.player.placeId
    if (itemId === null || itemId === undefined || placeId === null) throw new Error(`nothing to put down from hand ${handIndex}`)
    const spot = spotOn(placeId, point)
    const refusal = whyThereIsNoRoomFor(itemId, spot, this.state, { layout: quietRoomLayout, heaterSpot: definitionIn(defaultCatalog, 'rooms', 'quietRoom').heaterSpot }, this.lyingLids)
    if (refusal !== null) throw new Error(`the arrange could not put ${itemId} down on the ${placeId}: the room refuses it with ${refusal}`)
    this.testSession.doWithoutARefusal({ type: 'putDown', itemId, spot })
  }

  fillInTheSink(vesselId: string): void {
    this.testSession.doWithoutARefusal({ type: 'openVesselLid', vesselId })
    this.testSession.fillInTheSink(vesselId, secondsTheTapFillsAVessel)
  }

  bringABowlToTheCounterAndTakeTheKettle(): void {
    this.carryFromTheShelf('bowl1')
    this.walkTo('counter')
    this.putDown(0, onTheCounter)
    this.testSession.doWithoutARefusal({ type: 'pickUp', itemId: 'kettle' })
    this.fillInTheSink('kettle')
  }

  setTheTeaTable(): void {
    this.carryFromTheShelf('bowl1', 'caddy')
    this.walkTo('teaTable')
    this.putDown(0, whereTheTeaTableIsSet.bowl)
    this.putDown(1, whereTheTeaTableIsSet.caddy)
    this.walkTo('counter')
    this.testSession.doWithoutARefusal({ type: 'pickUp', itemId: 'kettle' })
    this.fillInTheSink('kettle')
    this.walkTo('teaTable')
    this.putDown(0, whereTheTeaTableIsSet.kettle)
  }

  putEverythingButTheClothOnTheShelf(): void {
    this.walkTo('counter')
    this.testSession.doWithoutARefusal({ type: 'pickUp', itemId: 'kettle' })
    this.testSession.doWithoutARefusal({ type: 'pickUp', itemId: 'thermos' })
    this.walkTo('shelf')
    this.putDown(0, onTheShelfBoard('upper', 0, -0.1))
    this.putDown(1, onTheShelfBoard('upper', 0, 0.3))
    this.walkTo('teaTable')
    this.testSession.doWithoutARefusal({ type: 'pickUp', itemId: 'spoon' })
    this.walkTo('shelf')
    this.putDown(0, onTheShelfBoard('upper', 0, -0.75))
  }

  holdFor(seconds: number): void {
    for (let heldSeconds = 0; heldSeconds < seconds; heldSeconds += frameSeconds) this.touchInput.advance(frameSeconds)
  }

  advanceUntil(isReached: () => boolean): void {
    for (let elapsed = 0; elapsed < longestWaitSeconds && !isReached(); elapsed += frameSeconds) this.advance(frameSeconds)
    assert.ok(isReached(), `not reached within ${longestWaitSeconds} s`)
  }

  advance(seconds: number): void {
    for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += frameSeconds) {
      this.playerController.advance({ worldSeconds: frameSeconds, realSeconds: frameSeconds })
      this.visit.advanceTheWorld(frameSeconds)
    }
  }
}

export function touchedDirectly(target: TapTarget): TapReach {
  return { target, touched: target, areasHoldingTheFinger: [], areasSetAside: [] }
}

export function screenShowing(targetAt: (point: ScreenPoint) => TapTarget, aimPointAt: (point: ScreenPoint) => FloorPoint | null = () => middleOfTheFloor): ScreenReader {
  return { tapTargetAt: (point) => touchedDirectly(targetAt(point)), aimPointAt }
}

export function onTopOf(furnitureId: FurnitureId, across: number, forward: number): WorldPoint {
  const piece = quietRoomLayout.furniture.find((furniture) => furniture.id === furnitureId)
  if (piece === undefined) throw new Error(`the quiet room has no ${furnitureId}`)
  return { x: piece.footprint.x + across, y: piece.height, z: piece.footprint.z + forward }
}

export function onTheShelfBoard(board: ShelfBoard, across: number, forward: number): WorldPoint {
  const [bottom, middle, upper] = shelfBoards.centreHeightsMetres
  const centreHeight = { bottom, middle, upper }[board]
  return { ...onTopOf('shelf', across, forward), y: centreHeight + shelfBoards.thicknessMetres / 2 }
}

export const onTheTeaTable = onTopOf('teaTable', 0, 0.05)
export const onTheCounter = onTopOf('counter', 0.8, 0.2)
export const onTheCounterBesideTheBowl = onTopOf('counter', 1, 0.2)

const teaTableFootprint = furnitureWithId(quietRoomLayout, 'teaTable').footprint

export const middleOfTheFloor: FloorPoint = { x: 0, z: 0 }
export const openFloorFrontLeft: FloorPoint = { x: -1, z: 1.5 }
export const openFloorFrontRight: FloorPoint = { x: 1, z: 1 }
export const openFloorRight: FloorPoint = { x: 2, z: 0 }
export const backRightCorner: FloorPoint = { x: 2.5, z: -2.5 }
export const inFrontOfTheTeaTable: FloorPoint = { x: teaTableFootprint.x, z: teaTableFootprint.z + teaTableFootprint.depth / 2 + 0.5 }
export const behindTheTeaTable: FloorPoint = { x: teaTableFootprint.x, z: teaTableFootprint.z - teaTableFootprint.depth / 2 - 0.45 }

export const whereTheTeaTableIsSet = {
  bowl: onTopOf('teaTable', -0.2, 0.05),
  caddy: onTopOf('teaTable', 0.2, 0.05),
  kettle: onTopOf('teaTable', 0, -0.25),
} as const

export function withoutTheTurn(location: DeepReadonly<ItemLocation> | undefined): DeepReadonly<ItemLocation> | undefined {
  if (location?.kind !== 'onSurface') return location
  const { placeId, x, y, z } = location.spot
  return { kind: 'onSurface', spot: { placeId, x, y, z } }
}

export function spotOn(placeId: string, point: WorldPoint): Spot {
  return { placeId, x: point.x, y: point.y, z: point.z }
}

function spotWhereAPourMissesOnTheTopOfThePlayersPlace(state: DeepReadonly<SessionState>): Spot {
  const placeId = state.player.placeId ?? 'teaTable'
  const piece = furnitureWithId(quietRoomLayout, placeId as FurnitureId)
  const offset = missedStreamOffsetFromTheMiddleOfTheTop[piece.id] ?? { x: 0, z: 0 }
  return { placeId, x: piece.footprint.x + offset.x, y: piece.height, z: piece.footprint.z + offset.z }
}
