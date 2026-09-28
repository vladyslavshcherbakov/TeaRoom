import assert from 'node:assert/strict'
import test from 'node:test'
import { touchAreaAround, touchablesReachedAt, type ScreenBox, type TouchableOnScreen } from '../../Apps/Engine/TouchAreasOnScreen.ts'

const smallBoxAt100And200: ScreenBox = { left: 100, top: 200, right: 110, bottom: 206 }

test('touchArea_ofABoxSmallerThanAFingertip_grows44PixelsWideAndHighAroundItsMiddle', () => {
  assert.deepEqual(touchAreaAround(smallBoxAt100And200), { left: 83, top: 181, right: 127, bottom: 225 })
})

test('touchArea_ofABoxLargerThanAFingertip_isTheBoxItself', () => {
  const largeBox: ScreenBox = { left: 100, top: 200, right: 200, bottom: 260 }

  assert.deepEqual(touchAreaAround(largeBox), largeBox)
})

test('touchable_whenTheFingerIsJustInsideItsGrownArea_isReached', () => {
  const bowl = touchable('bowl', smallBoxAt100And200)

  assert.equal(touchablesReachedAt({ x: 126, y: 224 }, [bowl])[0]?.target, 'bowl')
})

test('touchable_whenTheFingerIsJustOutsideItsGrownArea_isNotReached', () => {
  const bowl = touchable('bowl', smallBoxAt100And200)

  assert.deepEqual(touchablesReachedAt({ x: 128, y: 203 }, [bowl]), [])
})

test('touchables_whoseAreasBothHoldTheFinger_theNearerToTheFingerOnTheScreenIsReached', () => {
  const nearTheFinger = touchable('nearTheFinger', { left: 100, top: 100, right: 110, bottom: 110 }, { nearestDistance: 3 })
  const nearTheCamera = touchable('nearTheCamera', { left: 125, top: 100, right: 135, bottom: 110 }, { nearestDistance: 1 })

  assert.equal(touchablesReachedAt({ x: 115, y: 105 }, [nearTheCamera, nearTheFinger])[0]?.target, 'nearTheFinger')
})

test('touchables_underTheFingerOnTheScreen_theNearerToTheCameraIsReached', () => {
  const behind = touchable('behind', { left: 100, top: 100, right: 140, bottom: 140 }, { nearestDistance: 3 })
  const inFront = touchable('inFront', { left: 110, top: 110, right: 130, bottom: 130 }, { nearestDistance: 1 })

  assert.equal(touchablesReachedAt({ x: 120, y: 120 }, [behind, inFront])[0]?.target, 'inFront')
})

test('touchable_whoseMiddleIsHiddenBehindSomethingNearer_isNotReached', () => {
  const hidden = touchable('hidden', smallBoxAt100And200, { nearestDistance: 3, distanceSeenAtItsMiddle: 2 })

  assert.deepEqual(touchablesReachedAt({ x: 105, y: 203 }, [hidden]), [])
})

test('touchable_whoseMiddleShowsItselfOrWhatIsBehindIt_isReached', () => {
  const seenItself = touchable('seenItself', smallBoxAt100And200, { nearestDistance: 3, distanceSeenAtItsMiddle: 3 })
  const seenThrough = touchable('seenThrough', { left: 300, top: 200, right: 310, bottom: 206 }, { nearestDistance: 3, distanceSeenAtItsMiddle: 5 })

  assert.deepEqual([touchablesReachedAt({ x: 105, y: 203 }, [seenItself])[0]?.target, touchablesReachedAt({ x: 305, y: 203 }, [seenThrough])[0]?.target], ['seenItself', 'seenThrough'])
})

test('touchable_drawnOverTheScene_isReachedBeforeOneInTheSceneNearerTheFinger', () => {
  const heldOverTheScene = touchable('held', { left: 0, top: 500, right: 160, bottom: 660 }, { isDrawnOverTheScene: true })
  const standingInTheScene = touchable('standing', { left: 150, top: 500, right: 170, bottom: 520 })

  assert.equal(touchablesReachedAt({ x: 158, y: 510 }, [standingInTheScene, heldOverTheScene])[0]?.target, 'held')
})

function touchable(target: string, box: ScreenBox, seen: Partial<Pick<TouchableOnScreen<string>, 'isDrawnOverTheScene' | 'nearestDistance' | 'distanceSeenAtItsMiddle'>> = {}): TouchableOnScreen<string> {
  return { target, box, isDrawnOverTheScene: false, nearestDistance: 2, distanceSeenAtItsMiddle: null, ...seen }
}
