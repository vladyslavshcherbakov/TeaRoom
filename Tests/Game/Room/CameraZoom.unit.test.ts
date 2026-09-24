import assert from 'node:assert/strict'
import test from 'node:test'
import { CameraZoom } from '../../../Apps/Game/Room/Camera/CameraZoom.ts'

test('roomZoom_whileTheKeeperWalksToFurniture_staysWhereThePlayerSetIt', () => {
  const zoom = new CameraZoom()
  zoom.viewShown({ kind: 'overview' })
  zoom.zoomTo(0.6)

  zoom.viewShown({ kind: 'approaching', furnitureId: 'shelf' })

  assert.equal(zoom.distanceShare, 0.6)
})

test('closeUp_whenShown_startsAtItsUsualDistance', () => {
  const zoom = new CameraZoom()
  zoom.zoomTo(0.6)

  zoom.viewShown({ kind: 'closeUp', furnitureId: 'shelf' })

  assert.equal(zoom.distanceShare, 1)
})

test('roomZoom_afterAZoomedCloseUp_isRestored', () => {
  const zoom = new CameraZoom()
  zoom.zoomTo(0.6)
  zoom.viewShown({ kind: 'closeUp', furnitureId: 'shelf' })
  zoom.zoomTo(1.4)

  zoom.viewShown({ kind: 'overview' })

  assert.equal(zoom.distanceShare, 0.6)
})

test('closeUp_whenShownAgainAfterTheRoom_startsAtItsUsualDistanceAgain', () => {
  const zoom = new CameraZoom()
  zoom.viewShown({ kind: 'closeUp', furnitureId: 'shelf' })
  zoom.zoomTo(1.4)
  zoom.viewShown({ kind: 'overview' })

  zoom.viewShown({ kind: 'closeUp', furnitureId: 'shelf' })

  assert.equal(zoom.distanceShare, 1)
})
