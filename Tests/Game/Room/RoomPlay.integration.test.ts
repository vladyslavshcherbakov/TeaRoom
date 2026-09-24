import assert from 'node:assert/strict'
import test from 'node:test'
import type { FurnitureId, WorldPoint } from '../../../Apps/Game/Room/RoomLayout.ts'
import { RoomPlay, type RoomTapTarget } from '../../../Apps/Game/Room/RoomPlay.ts'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import type { Spot } from '../../../Shared/Simulation/Definitions/RoomDefinition.ts'
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

test('bowl_whileHeldWithTheKettleInHand_isPouredInto', () => {
  const room = new RoomVisit()
  room.bringABowlToTheCounterAndTakeTheKettle()

  room.pressOn({ kind: 'item', itemId: 'bowl1' }, 1)

  assert.equal(room.state.pour?.sourceId, 'kettle')
  assert.equal(room.state.pour?.targetId, 'bowl1')
})

test('pour_whenTheFingerLifts_stopsWithWaterInTheBowl', () => {
  const room = new RoomVisit()
  room.bringABowlToTheCounterAndTakeTheKettle()
  room.pressOn({ kind: 'item', itemId: 'bowl1' }, 1)

  room.play.pressEnded()

  assert.equal(room.state.pour, null)
  assert.ok((room.state.vessels['bowl1']?.liquid.volumeMl ?? 0) > 0)
})

test('pour_whenHeldForFiveSeconds_spillsNothing', () => {
  const room = new RoomVisit()
  room.bringABowlToTheCounterAndTakeTheKettle()
  room.pressOn({ kind: 'item', itemId: 'bowl1' }, 5)

  const events = room.session.dispatch({ type: 'stopPouring' })

  assert.deepEqual(
    events.flatMap((event) => (event.type === 'pourFinished' ? [event.spilledMl] : [])),
    [0],
  )
})

test('bowl_whenTappedShortlyWithTheKettleInHand_isPickedUp', () => {
  const room = new RoomVisit()
  room.bringABowlToTheCounterAndTakeTheKettle()

  room.tap({ kind: 'item', itemId: 'bowl1' })

  assert.deepEqual(room.state.keeper.hands, ['kettle', 'bowl1'])
  assert.equal(room.state.pour, null)
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

  pressOn(target: RoomTapTarget, seconds: number): void {
    this.play.pressStarted(target)
    this.advance(seconds)
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
  }

  private advance(seconds: number): void {
    for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += frameSeconds) {
      this.play.advance(frameSeconds)
      this.session.advance(frameSeconds)
    }
  }
}

function spotOn(placeId: string, point: WorldPoint): Spot {
  return { placeId, x: point.x, y: point.y, z: point.z }
}
