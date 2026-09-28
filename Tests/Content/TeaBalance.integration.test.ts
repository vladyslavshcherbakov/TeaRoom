import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultCatalog } from '../../Shared/Content/DefaultCatalog.ts'
import type { Catalog } from '../../Shared/GameLogic/Definitions/Catalog.ts'
import type { Spot } from '../../Shared/GameLogic/Definitions/RoomDefinition.ts'
import { eventsOfType, TestTeaSession } from '../Support/TestTeaSession.ts'

const onTheTeaTable = (x: number): Spot => ({ placeId: 'teaTable', x, y: 0.42, z: -1.55 })

function bringTheBowlAndTheCaddyToTheTeaTable(session: TestTeaSession): void {
  session.doWithoutARefusal({ type: 'standAt', placeId: 'shelf' })
  session.doWithoutARefusal({ type: 'pickUp', itemId: 'bowl1' })
  session.doWithoutARefusal({ type: 'pickUp', itemId: 'caddy' })
  session.doWithoutARefusal({ type: 'standAt', placeId: 'teaTable' })
  session.doWithoutARefusal({ type: 'putDown', itemId: 'bowl1', spot: onTheTeaTable(0.8) })
  session.doWithoutARefusal({ type: 'putDown', itemId: 'caddy', spot: onTheTeaTable(1.4) })
}

function fillBoilAndBringTheKettleToTheTeaTable(session: TestTeaSession, temperatureC: number): void {
  session.doWithoutARefusal({ type: 'standAt', placeId: 'counter' })
  session.doWithoutARefusal({ type: 'pickUp', itemId: 'kettle' })
  session.doWithoutARefusal({ type: 'openVesselLid', vesselId: 'kettle' })
  session.fillInTheSink('kettle', 10)
  session.heatKettleTo(temperatureC)
  session.doWithoutARefusal({ type: 'standAt', placeId: 'teaTable' })
  session.doWithoutARefusal({ type: 'putDown', itemId: 'kettle', spot: onTheTeaTable(1.1) })
}

function quietRoomWithItsCaddyOf(teaId: string): Catalog {
  const room = defaultCatalog.rooms['quietRoom']
  if (room === undefined) throw new Error('the default catalog lost its quiet room')
  const vessels = room.vessels.map((vessel) => (vessel.teaStock === null ? vessel : { ...vessel, teaStock: { ...vessel.teaStock, teaId } }))
  return { ...defaultCatalog, rooms: { ...defaultCatalog.rooms, quietRoom: { ...room, vessels } } }
}

for (const tea of Object.values(defaultCatalog.teas)) {
  test(`${tea.id}_whenBrewedByTheBookInTheQuietRoom_tastesBalancedAndSoft`, () => {
    const session = new TestTeaSession(quietRoomWithItsCaddyOf(tea.id), 'quietRoom')
    bringTheBowlAndTheCaddyToTheTeaTable(session)
    fillBoilAndBringTheKettleToTheTeaTable(session, tea.water.idealC)
    session.addLeavesToKettle((tea.steeping.idealGramsPer100Ml * session.vessel('kettle').liquid.volumeMl) / 100)
    session.wait(tea.steeping.idealSeconds)
    session.pour('kettle', 'bowl1', 8)
    session.waitUntilCupCoolsTo('bowl1', 60)

    const events = session.do({ type: 'tasteCup', cupId: 'bowl1' })

    const verdict = eventsOfType(events, 'teaTasted')[0]?.verdict
    assert.equal(verdict?.strength, 'balanced')
    assert.equal(verdict?.bitterness, 'soft')
    assert.equal(verdict?.reaction, 'contentSigh')
  })
}
