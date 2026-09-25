import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { isSeenWhole } from '../../../Apps/Game/Room/Views/ProphecySighting.ts'

test('prophecy_facingTheCameraWhollyOnScreen_isSeenWhole', () => {
  const room = new RoomWithAnInscription()

  assert.equal(isSeenWhole(room.inscription, cameraAt(0, 0, 3), [room.root]), true)
})

test('prophecy_withOneEndOffTheScreen_isNotSeenWhole', () => {
  const room = new RoomWithAnInscription()

  assert.equal(isSeenWhole(room.inscription, cameraAt(0.4, 0, 1), [room.root]), false)
})

test('prophecy_seenFromBehind_isNotSeenWhole', () => {
  const room = new RoomWithAnInscription()

  assert.equal(isSeenWhole(room.inscription, cameraAt(0, 0, -3), [room.root]), false)
})

test('prophecy_behindAWall_isNotSeenWhole', () => {
  const room = new RoomWithAnInscription()
  room.addWallAt(1.5)

  assert.equal(isSeenWhole(room.inscription, cameraAt(0, 0, 3), [room.root]), false)
})

test('prophecy_behindAWallThatIsHidden_isSeenWhole', () => {
  const room = new RoomWithAnInscription()
  room.addWallAt(1.5).visible = false

  assert.equal(isSeenWhole(room.inscription, cameraAt(0, 0, 3), [room.root]), true)
})

class RoomWithAnInscription {
  readonly root = new THREE.Group()
  readonly inscription = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.2), new THREE.MeshBasicMaterial())

  constructor() {
    this.root.add(this.inscription)
    this.root.updateMatrixWorld(true)
  }

  addWallAt(z: number): THREE.Mesh {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 0.1), new THREE.MeshBasicMaterial())
    wall.position.z = z
    this.root.add(wall)
    this.root.updateMatrixWorld(true)
    return wall
  }
}

function cameraAt(x: number, y: number, z: number): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(50, 0.5, 0.1, 100)
  camera.position.set(x, y, z)
  camera.lookAt(x, y, 0)
  camera.updateMatrixWorld(true)
  return camera
}
