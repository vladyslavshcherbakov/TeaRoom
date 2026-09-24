import assert from 'node:assert/strict'
import test from 'node:test'
import type { FloorPoint, FurnitureId, WorldPoint } from '../../../Apps/Game/Room/RoomLayout.ts'
import { RoomPlay, type RoomTapTarget } from '../../../Apps/Game/Room/RoomPlay.ts'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import type { Spot } from '../../../Shared/Simulation/Definitions/RoomDefinition.ts'
import { assertNear } from '../../Support/Assertions.ts'
import { TestRitual } from '../../Support/TestRitual.ts'

const frameSeconds = 1 / 60
const longestWalkSeconds = 30
const onTheTeaTable: WorldPoint = { x: 1, y: 0.42, z: -1.5 }
const onTheCounter: WorldPoint = { x: -1.4, y: 0.9, z: -2.6 }

test('bowl_whenTappedInTheShelfCloseUp_goesIntoTheFirstFreeHand', () => {
  const room = new RoomVisit()
  room.walkTo('shelf')

  room.tap({ kind: 'item', itemId: 'bowl1' })

  assert.deepEqual(room.state.keeper.hands, ['bowl1', null])
})

test('bowl_whenItsHandIsChosenAndTheTeaTableIsTapped_standsWhereTheTableWasTapped', () => {
  const room = new RoomVisit()
  room.carryFromTheShelf('bowl1')
  room.walkTo('teaTable')
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'surface', furnitureId: 'teaTable', point: onTheTeaTable })

  assert.deepEqual(room.state.vessels['bowl1']?.location, { kind: 'onSurface', spot: spotOn('teaTable', onTheTeaTable) })
  assert.equal(room.play.selectedHandIndex, null)
})

test('surfaceTap_withNoHandChosen_leavesTheItemInHand', () => {
  const room = new RoomVisit()
  room.carryFromTheShelf('bowl1')
  room.walkTo('teaTable')

  room.tap({ kind: 'surface', furnitureId: 'teaTable', point: onTheTeaTable })

  assert.deepEqual(room.state.keeper.hands, ['bowl1', null])
  assert.ok(room.logLines.includes('tap on the teaTable ignored: no hand is chosen'), room.logLines.join('\n'))
})

test('bowl_whenPutDownWhereAnotherBowlStands_staysInHandWithItsHandChosen', () => {
  const room = new RoomVisit()
  room.carryFromTheShelf('bowl1', 'bowl2')
  room.walkTo('teaTable')
  room.putDown(0, onTheTeaTable)
  room.tap({ kind: 'hand', handIndex: 1 })

  room.tap({ kind: 'surface', furnitureId: 'teaTable', point: { ...onTheTeaTable, x: onTheTeaTable.x + 0.1 } })

  assert.deepEqual(room.state.keeper.hands, [null, 'bowl2'])
  assert.equal(room.play.selectedHandIndex, 1)
  assert.ok(room.logLines.some((line) => line.startsWith('no room for bowl2') && line.endsWith('somethingIsThere')), room.logLines.join('\n'))
})

test('kettle_whenItsHandIsChosenAndTheHeaterIsTapped_sitsOnTheHeater', () => {
  const room = new RoomVisit()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'heater' })

  assert.equal(room.state.heater.vesselIdOnTop, 'kettle')
  assert.deepEqual(room.state.keeper.hands, [null, null])
})

test('heaterSwitch_whenTapped_switchesTheHeaterOn', () => {
  const room = new RoomVisit()
  room.walkTo('counter')

  room.tap({ kind: 'heaterSwitch' })

  assert.equal(room.state.heater.isOn, true)
})

test('heaterTap_withNoHandChosen_leavesTheHeaterEmpty', () => {
  const room = new RoomVisit()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })

  room.tap({ kind: 'heater' })

  assert.equal(room.state.heater.vesselIdOnTop, null)
  assert.ok(room.logLines.includes('tap on the heater ignored: no hand is chosen'), room.logLines.join('\n'))
})

test('bowl_whenTappedWithTheKettleChosen_isAimedAtWithoutPouring', () => {
  const room = new RoomVisit()
  room.bringABowlToTheCounterAndTakeTheKettle()
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'item', itemId: 'bowl1' })

  assert.equal(room.play.aimedPourView?.targetId, 'bowl1')
  assert.equal(room.state.pour, null)
})

test('pour_whileTiltIsHeldWithTheSpoutMovedOverTheBowl_landsEntirelyInTheBowl', () => {
  const room = new RoomVisit()
  room.aimTheKettleAtTheBowl()
  room.moveTheSpout({ x: 0.22, z: 0 })

  room.play.tiltPressed()
  room.wait(2)

  assert.equal(room.state.pour?.streamOnTargetFraction, 1)
  assert.ok((room.state.vessels['bowl1']?.liquid.volumeMl ?? 0) > 0)
})

test('pour_whileTiltIsHeldWithTheSpoutBesideTheBowl_wetsTheTableAndNotTheBowl', () => {
  const room = new RoomVisit()
  room.aimTheKettleAtTheBowl()

  room.play.tiltPressed()
  room.wait(2)

  assert.equal(room.state.vessels['bowl1']?.liquid.volumeMl, 0)
  assert.ok(room.state.tableWetMl > 0)
})

test('pour_whenTheTiltButtonIsReleased_stopsAsTheKettleTiltsBack', () => {
  const room = new RoomVisit()
  room.aimTheKettleAtTheBowl()
  room.moveTheSpout({ x: 0.22, z: 0 })
  room.play.tiltPressed()
  room.wait(2)

  room.play.tiltReleased()
  room.wait(1)

  assert.equal(room.state.pour, null)
  assert.equal(room.play.aimedPourView?.tiltDegrees, 0)
})

test('pourAim_whenDone_endsWithTheKettleStillInHand', () => {
  const room = new RoomVisit()
  room.aimTheKettleAtTheBowl()

  room.play.pourDone()

  assert.equal(room.play.aimedPourView, null)
  assert.equal(room.state.keeper.hands[0], 'kettle')
})

test('kettle_whenChosenAndTheTapIsTapped_getsItsLidOpenedAndFillsFromTheTap', () => {
  const room = new RoomVisit()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'faucet' })

  assert.equal(room.state.filling?.vesselId, 'kettle')
  assert.equal(room.state.vessels['kettle']?.isLidOpen, true)
})

test('tap_whenTappedAgainWhileRunning_closes', () => {
  const room = new RoomVisit()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })
  room.tap({ kind: 'hand', handIndex: 0 })
  room.tap({ kind: 'faucet' })
  room.wait(2)

  room.tap({ kind: 'faucet' })

  assert.equal(room.state.filling, null)
  assertNear(room.state.vessels['kettle']?.liquid.volumeMl ?? 0, 100)
})

test('bowl_whenTappedShortlyWithTheKettleInHand_isPickedUp', () => {
  const room = new RoomVisit()
  room.bringABowlToTheCounterAndTakeTheKettle()

  room.tap({ kind: 'item', itemId: 'bowl1' })

  assert.deepEqual(room.state.keeper.hands, ['kettle', 'bowl1'])
  assert.equal(room.state.pour, null)
})

test('kettleLid_whenTapped_opens', () => {
  const room = new RoomVisit()
  room.walkTo('counter')

  room.tap({ kind: 'lid', itemId: 'kettle' })

  assert.equal(room.state.vessels['kettle']?.isLidOpen, true)
})

test('caddyLid_whenTappedOnTheTeaTable_opens', () => {
  const room = new RoomVisit()
  room.setTheTeaTable()

  room.tap({ kind: 'lid', itemId: 'caddy' })

  assert.equal(room.state.caddy.isOpen, true)
})

test('spoon_whenChosenAndTheOpenCaddyIsTapped_fillsWithLeaves', () => {
  const room = new RoomVisit()
  room.setTheTeaTable()
  room.session.dispatch({ type: 'openCaddy' })
  room.takeAndChoose('spoon')

  room.tap({ kind: 'item', itemId: 'caddy' })

  assert.equal(room.state.spoon.grams, 3)
  assert.equal(room.state.caddy.location.kind, 'onSurface')
})

test('spoon_whenFullAndTheOpenKettleIsTapped_tipsTheLeavesIntoIt', () => {
  const room = new RoomVisit()
  room.setTheTeaTable()
  room.session.dispatch({ type: 'openCaddy' })
  room.session.dispatch({ type: 'openVesselLid', vesselId: 'kettle' })
  room.takeAndChoose('spoon')
  room.session.dispatch({ type: 'scoopTea', depth: 1 })

  room.tap({ kind: 'item', itemId: 'kettle' })

  assert.equal(room.state.vessels['kettle']?.leaves?.grams, 3)
  assert.equal(room.state.spoon.grams, 0)
})

test('cloth_whenTappedWithTheSpoonChosen_isTakenIntoTheOtherHand', () => {
  const room = new RoomVisit()
  room.walkTo('teaTable')
  room.takeAndChoose('spoon')

  room.tap({ kind: 'item', itemId: 'cloth' })

  assert.deepEqual(room.state.keeper.hands, ['spoon', 'cloth'])
})

test('spoon_whenTappedAtTheTeaTable_goesIntoTheFirstFreeHand', () => {
  const room = new RoomVisit()
  room.walkTo('teaTable')

  room.tap({ kind: 'item', itemId: 'spoon' })

  assert.deepEqual(room.state.keeper.hands, ['spoon', null])
})

test('sipButton_whenTheChosenHandHoldsTheKettle_isNotOffered', () => {
  const room = new RoomVisit()
  room.walkTo('counter')
  room.tap({ kind: 'item', itemId: 'kettle' })

  room.tap({ kind: 'hand', handIndex: 0 })

  assert.equal(room.play.sippableCupId, null)
})

test('sipButton_whenTheChosenBowlIsEmpty_isNotOffered', () => {
  const room = new RoomVisit()
  room.carryFromTheShelf('bowl1')

  room.tap({ kind: 'hand', handIndex: 0 })

  assert.equal(room.play.sippableCupId, null)
})

test('sip_fromTheChosenBowlOfTea_takesTwentyMillilitres', () => {
  const room = new RoomVisit()
  room.setTheTeaTable()
  room.ritual.pour('kettle', 'bowl1', 4)
  room.session.dispatch({ type: 'pickUp', itemId: 'bowl1' })
  room.tap({ kind: 'hand', handIndex: 0 })
  const volumeBeforeTheSip = room.state.vessels['bowl1']?.liquid.volumeMl ?? 0

  room.play.sipTapped()

  assertNear(room.state.vessels['bowl1']?.liquid.volumeMl ?? 0, volumeBeforeTheSip - 20)
})

test('figurine_whenTappedWithABowlOfTeaChosen_isOfferedIt', () => {
  const room = new RoomVisit()
  room.setTheTeaTable()
  room.ritual.pour('kettle', 'bowl1', 4)
  room.session.dispatch({ type: 'pickUp', itemId: 'bowl1' })
  room.tap({ kind: 'hand', handIndex: 0 })

  room.tap({ kind: 'figurine', figurineId: 'dragon' })

  assert.equal(room.state.figurines['dragon']?.wasOfferedTeaThisRitual, true)
})

test('table_whenStrokedWithTheClothOneAndAHalfMetresInTenSeconds_isWipedSlowlyAllOver', () => {
  const room = new RoomVisit()
  room.setTheTeaTable()
  room.ritual.pour('kettle', null, 2)
  room.takeAndChoose('cloth')

  room.strokeTheTeaTable([{ x: 0.5, z: -1.6 }, { x: 1.25, z: -1.6 }, { x: 0.5, z: -1.6 }], 10)

  assert.ok(room.ritual.log.messagesAt('info').some((line) => line.includes('table wiped at 15 cm/s over 100%')), room.ritual.log.messagesAt('info').join('\n'))
})

test('table_whenTappedWithTheCloth_isNotWiped', () => {
  const room = new RoomVisit()
  room.setTheTeaTable()
  room.ritual.pour('kettle', null, 2)
  room.takeAndChoose('cloth')
  const wetMlBeforeTheTap = room.state.tableWetMl

  room.tap({ kind: 'surface', furnitureId: 'teaTable', point: onTheTeaTable })

  assert.equal(room.state.tableWetMl, wetMlBeforeTheTap)
})

class RoomVisit {
  readonly logLines: string[] = []
  readonly ritual = TestRitual.begun(defaultCatalog, 'sencha', 'quietRoom')
  readonly play = new RoomPlay(this.ritual.session, defaultCatalog, (message) => this.logLines.push(message))

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

  takeAndChoose(itemId: string): void {
    this.tap({ kind: 'item', itemId })
    const handIndex = this.state.keeper.hands.indexOf(itemId)
    if (handIndex !== 0 && handIndex !== 1) throw new Error(`${itemId} did not reach a hand`)
    this.tap({ kind: 'hand', handIndex })
  }

  wait(seconds: number): void {
    this.advance(seconds)
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

  carryFromTheShelf(...itemIds: string[]): void {
    this.walkTo('shelf')
    for (const itemId of itemIds) this.session.dispatch({ type: 'pickUp', itemId })
  }

  putDown(handIndex: 0 | 1, point: WorldPoint): void {
    const itemId = this.state.keeper.hands[handIndex]
    const placeId = this.state.keeper.placeId
    if (itemId === null || itemId === undefined || placeId === null) throw new Error(`nothing to put down from hand ${handIndex}`)
    this.session.dispatch({ type: 'putDown', itemId, spot: spotOn(placeId, point) })
  }

  bringABowlToTheCounterAndTakeTheKettle(): void {
    this.carryFromTheShelf('bowl1')
    this.walkTo('counter')
    this.putDown(0, onTheCounter)
    this.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
    this.fillTheKettleInHand()
  }

  aimTheKettleAtTheBowl(): void {
    this.bringABowlToTheCounterAndTakeTheKettle()
    this.tap({ kind: 'hand', handIndex: 0 })
    this.tap({ kind: 'item', itemId: 'bowl1' })
  }

  setTheTeaTable(): void {
    this.carryFromTheShelf('bowl1', 'caddy')
    this.walkTo('teaTable')
    this.putDown(0, { x: 0.8, y: 0.42, z: -1.5 })
    this.putDown(1, { x: 1.2, y: 0.42, z: -1.5 })
    this.walkTo('counter')
    this.session.dispatch({ type: 'pickUp', itemId: 'kettle' })
    this.fillTheKettleInHand()
    this.walkTo('teaTable')
    this.putDown(0, { x: 1, y: 0.42, z: -1.8 })
  }

  strokeTheTeaTable(corners: readonly FloorPoint[], seconds: number): void {
    const [start, ...rest] = corners
    if (start === undefined) return
    this.play.pressStarted(surfaceOfTheTeaTableAt(start))
    const framesPerLeg = Math.round(seconds / frameSeconds / rest.length)
    let from = start
    for (const to of rest) {
      for (let frame = 1; frame <= framesPerLeg; frame += 1) {
        this.advance(frameSeconds)
        this.play.pressMovedAway()
        this.play.pressMovedOver(surfaceOfTheTeaTableAt({ x: from.x + ((to.x - from.x) * frame) / framesPerLeg, z: from.z + ((to.z - from.z) * frame) / framesPerLeg }))
      }
      from = to
    }
    this.play.pressEnded()
  }

  fillTheKettleInHand(): void {
    this.session.dispatch({ type: 'openVesselLid', vesselId: 'kettle' })
    this.session.dispatch({ type: 'startFillingFromTap', vesselId: 'kettle' })
    this.advance(10)
    this.session.dispatch({ type: 'stopFillingFromTap' })
  }

  private advance(seconds: number): void {
    for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += frameSeconds) {
      this.play.advance(frameSeconds)
      this.session.advance(frameSeconds)
    }
  }
}

function surfaceOfTheTeaTableAt(point: FloorPoint): RoomTapTarget {
  return { kind: 'surface', furnitureId: 'teaTable', point: { x: point.x, y: onTheTeaTable.y, z: point.z } }
}

function spotOn(placeId: string, point: WorldPoint): Spot {
  return { placeId, x: point.x, y: point.y, z: point.z }
}
