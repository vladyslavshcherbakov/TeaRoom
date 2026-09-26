import assert from 'node:assert/strict'
import test from 'node:test'
import { TestRoom } from '../../Support/TestRoom.ts'

test('kettle_whenFilledFromTheDebugMenuWhereverItStands_holdsBoilingWaterToTheBrim', () => {
  const room = new TestRoom()

  room.play.fillTheKettleTapped()

  assert.deepEqual(room.state.vessels['kettle']?.liquid, { volumeMl: 800, temperatureC: 100, strength: 0, bitterness: 0 })
})
