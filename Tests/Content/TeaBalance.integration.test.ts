import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultCatalog } from '../../Shared/Content/DefaultCatalog.ts'
import type { Catalog } from '../../Shared/Simulation/Definitions/Catalog.ts'
import type { Spot } from '../../Shared/Simulation/Definitions/RoomDefinition.ts'
import { eventsOfType, TestRitual } from '../Support/TestRitual.ts'

const onTheTeaTable = (x: number): Spot => ({ placeId: 'teaTable', x, y: 0.42, z: -1.55 })

function bringTheBowlAndTheCaddyToTheTeaTable(ritual: TestRitual): void {
  ritual.do({ type: 'standAt', placeId: 'shelf' })
  ritual.do({ type: 'pickUp', itemId: 'bowl1' })
  ritual.do({ type: 'pickUp', itemId: 'caddy' })
  ritual.do({ type: 'standAt', placeId: 'teaTable' })
  ritual.do({ type: 'putDown', itemId: 'bowl1', spot: onTheTeaTable(0.8) })
  ritual.do({ type: 'putDown', itemId: 'caddy', spot: onTheTeaTable(1.4) })
}

function fillBoilAndBringTheKettleToTheTeaTable(ritual: TestRitual, temperatureC: number): void {
  ritual.do({ type: 'standAt', placeId: 'counter' })
  ritual.do({ type: 'pickUp', itemId: 'kettle' })
  ritual.do({ type: 'openVesselLid', vesselId: 'kettle' })
  ritual.fillInTheSink('kettle', 10)
  ritual.heatKettleTo(temperatureC)
  ritual.do({ type: 'standAt', placeId: 'teaTable' })
  ritual.do({ type: 'putDown', itemId: 'kettle', spot: onTheTeaTable(1.1) })
}

function quietRoomWithItsCaddyOf(teaId: string): Catalog {
  const room = defaultCatalog.rooms['quietRoom']
  if (room === undefined) throw new Error('the default catalog lost its quiet room')
  const vessels = room.vessels.map((vessel) => (vessel.teaStock === null ? vessel : { ...vessel, teaStock: { ...vessel.teaStock, teaId } }))
  return { ...defaultCatalog, rooms: { ...defaultCatalog.rooms, quietRoom: { ...room, vessels } } }
}

for (const tea of Object.values(defaultCatalog.teas)) {
  test(`${tea.id}_whenBrewedByTheBookInTheQuietRoom_tastesBalancedAndSoft`, () => {
    const ritual = TestRitual.begun(quietRoomWithItsCaddyOf(tea.id), tea.id, 'quietRoom')
    bringTheBowlAndTheCaddyToTheTeaTable(ritual)
    fillBoilAndBringTheKettleToTheTeaTable(ritual, tea.water.idealC)
    ritual.addLeavesToKettle((tea.steeping.idealGramsPer100Ml * ritual.vessel('kettle').liquid.volumeMl) / 100)
    ritual.wait(tea.steeping.idealSeconds)
    ritual.pour('kettle', 'bowl1', 8)
    ritual.waitUntilCupCoolsTo('bowl1', 60)

    const events = ritual.do({ type: 'tasteCup', cupId: 'bowl1' })

    assert.deepEqual(ritual.log.messagesAt('info').filter((message) => message.includes(' refused ')), [])
    const verdict = eventsOfType(events, 'teaTasted')[0]?.verdict
    assert.equal(verdict?.strength, 'balanced')
    assert.equal(verdict?.bitterness, 'soft')
    assert.equal(verdict?.reaction, 'contentSigh')
  })
}
