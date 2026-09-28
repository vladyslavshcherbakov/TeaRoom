import assert from 'node:assert/strict'
import test from 'node:test'
import { TestRoom } from '../../Support/TestRoom.ts'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import { definitionIn } from '../../../Shared/Engine/Catalog.ts'

const kettleCapacityMl = definitionIn(defaultCatalog, 'vessels', 'clayKettle').capacityMl

test('kettle_whenFilledFromTheDebugMenuWhereverItStands_holdsBoilingWaterToTheBrim', () => {
  const room = new TestRoom()

  room.playerController.fillTheKettleTapped()

  assert.deepEqual(room.state.vessels['kettle']?.liquid, { volumeMl: kettleCapacityMl, temperatureC: 100, strength: 0, strengthByTeaId: {}, bitterness: 0 })
})
