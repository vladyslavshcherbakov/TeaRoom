import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { steepestTiltDegrees } from '../../../Apps/Game/Room/AimedPour.ts'
import { carriedShapeOf, layoutByShape } from '../../../Apps/Game/Room/CarriedShapes.ts'
import { sinkBasin } from '../../../Apps/Game/Room/RoomLayout.ts'
import { aimOver } from '../../../Apps/Game/Room/Views/Carried/AimedVessel.ts'
import { newCarriedModel, type CarriedModel } from '../../../Apps/Game/Room/Views/Carried/CarriedModel.ts'
import { holdInView } from '../../../Apps/Game/Room/Views/Carried/HeldInView.ts'
import type { CarriedModelMaterials } from '../../../Apps/Game/Room/Views/Carried/ItemParts.ts'
import { overflowSideFromTheGaugeRadians, overflowStreamRadiusMetres } from '../../../Apps/Game/Room/Views/Carried/WaterStreams.ts'
import type { SurfaceMaterials } from '../../../Apps/Game/Room/Views/RoomMaterials.ts'
import { tableViewState } from '../../../Apps/Game/Table/TablePresenter.ts'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import { definitionIn } from '../../../Shared/Simulation/Definitions/Catalog.ts'
import { carriedItemIdsIn } from '../../../Shared/Simulation/Ritual/Reach.ts'
import { assertNear } from '../../Support/Assertions.ts'
import { TestRitual } from '../../Support/TestRitual.ts'

const teaTableTopMetres = 0.42
const drawingToleranceMetres = 0.001
const streamTouchesTheWallWithinMetres = 0.002
const tiltsDegrees = [0, 10, 20, 30, steepestTiltDegrees]
const spoutDirections = [{ x: 1, z: 0 }, { x: 0, z: 1 }, { x: -0.6, z: -0.8 }]
const portraitPhoneAspects = [375 / 667, 390 / 844, 412 / 915]
const closeUpAndFirstPersonFieldsOfViewDegrees = [30, 70]
const overflowSide = new THREE.Vector3(Math.sin(overflowSideFromTheGaugeRadians), 0, Math.cos(overflowSideFromTheGaugeRadians))

test('aimedVessel_ofEveryShapeAtEveryTilt_staysAboveTheSurfaceItPoursOver', () => {
  const target = new THREE.Group()
  target.position.y = teaTableTopMetres

  for (const model of vesselModelsInTheQuietRoom()) {
    for (const tiltDegrees of tiltsDegrees) {
      for (const spoutDirection of spoutDirections) {
        aimOver(model, { sourceId: model.itemId, targetId: 'target', spout: { x: 0, z: 0 }, spoutDirection, tiltDegrees }, { root: target, rimHeight: 0 })

        const lowest = drawnBoundsOf(model).min.y
        assert.ok(lowest >= teaTableTopMetres - drawingToleranceMetres, `${model.itemId} at ${tiltDegrees}° reaches ${(teaTableTopMetres - lowest).toFixed(4)} m under the surface`)
      }
    }
  }
})

test('lid_ofEveryShape_isInTheModelExactlyWhenTheLayoutKeepsAPlaceForIt', () => {
  for (const model of modelsInTheQuietRoom()) {
    assert.equal(model.lid !== null, layoutByShape[model.shape].lid !== null, model.itemId)
  }
})

test('openLid_ofEveryShape_isDrawnNoWiderThanThePlaceKeptForItBesideTheItem', () => {
  for (const model of modelsInTheQuietRoom()) {
    const lyingLid = layoutByShape[model.shape].lid
    if (model.lid === null || lyingLid === null) continue

    const drawnRadius = horizontalRadiusOf(model.lid, model)

    assert.ok(drawnRadius <= lyingLid.lyingRadiusMetres + drawingToleranceMetres, `${model.itemId}'s lid is ${drawnRadius.toFixed(4)} m wide, ${lyingLid.lyingRadiusMetres} m is kept for it`)
  }
})

test('fire_ofEveryShape_isDrawnExactlyWhenTheItemCanCharAndTheTableSaysHowFar', () => {
  const ritual = new TestRitual(defaultCatalog, 'quietRoom')
  const charringByItem = tableViewState(ritual.state, defaultCatalog).charringByItem

  for (const model of modelsInTheQuietRoom()) {
    const hasFire = model.look.fire !== null
    assert.equal(model.charTo !== null, hasFire, model.itemId)
    assert.equal(charringByItem[model.itemId] !== undefined, hasFire, model.itemId)
  }
})

test('itemInTheSink_standsOnTheTopOfTheSinksFloorPlate', () => {
  const tap = definitionIn(defaultCatalog, 'rooms', 'quietRoom').tap

  assert.ok(tap !== null, 'the quiet room has a tap')
  assertNear(tap.sinkSpot.y, sinkBasin.floorHeight + sinkBasin.plateMetres)
})

test('heldItem_ofEveryShapeInEitherHand_staysInsideAPortraitPhoneScreen', () => {
  for (const aspect of portraitPhoneAspects) {
    for (const fieldOfViewDegrees of closeUpAndFirstPersonFieldsOfViewDegrees) {
      const camera = new THREE.PerspectiveCamera(fieldOfViewDegrees, aspect, 0.1, 100)
      camera.updateMatrixWorld(true)
      for (const model of modelsInTheQuietRoom()) {
        for (const handIndex of [0, 1] as const) {
          for (const chosenHandIndex of [null, handIndex]) {
            holdInView(model, handIndex, { camera, chosenHandIndex })

            const farthest = farthestFromTheScreensCentre(model, camera)
            assert.ok(farthest <= 1, `${model.itemId} in hand ${handIndex}, ${aspect.toFixed(2)} aspect, ${fieldOfViewDegrees}°: reaches ${farthest.toFixed(3)} of the half screen`)
          }
        }
      }
    }
  }
})

test('overflow_ofEveryVessel_runsDownBelowTheRimTouchingTheOutsideOfItsWall', () => {
  for (const model of vesselModelsInTheQuietRoom()) {
    const points = model.pointsDownTheSide
    assert.notEqual(points, null, `${model.itemId} has no overflow path`)

    const pointsBesideTheWall = (points ?? []).flatMap((point, index) => {
      const previous = points?.[index - 1]
      assert.ok(previous === undefined || point.height <= previous.height, `${model.itemId}'s overflow rises at point ${index}`)
      const wall = point.height < model.rimHeight ? wallDistanceAt(model, point.height) : null
      return wall === null ? [] : [{ point, wall }]
    })

    assert.ok(pointsBesideTheWall.length > 0, `${model.itemId}'s overflow never passes its wall`)
    for (const { point, wall } of pointsBesideTheWall) {
      assert.ok(point.distance >= wall - drawingToleranceMetres, `${model.itemId}'s overflow at ${point.height.toFixed(3)} m runs ${(wall - point.distance).toFixed(4)} m inside its wall`)
      assert.ok(point.distance <= wall + overflowStreamRadiusMetres + streamTouchesTheWallWithinMetres, `${model.itemId}'s overflow at ${point.height.toFixed(3)} m runs ${(point.distance - wall).toFixed(4)} m away from its wall`)
    }
  }
})

function modelsInTheQuietRoom(): CarriedModel[] {
  const state = new TestRitual(defaultCatalog, 'quietRoom').state
  const materials = plainMaterials()
  return carriedItemIdsIn(state).flatMap((itemId) => {
    const shape = carriedShapeOf(state, itemId)
    return shape === undefined ? [] : [newCarriedModel(itemId, shape, materials)]
  })
}

function vesselModelsInTheQuietRoom(): CarriedModel[] {
  const state = new TestRitual(defaultCatalog, 'quietRoom').state
  return modelsInTheQuietRoom().filter((model) => state.vessels[model.itemId] !== undefined)
}

function plainMaterials(): CarriedModelMaterials {
  const plain = (): THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial({ side: THREE.DoubleSide })
  const room: SurfaceMaterials = { materialFor: plain, unsharedMaterialFor: plain, colourOf: () => new THREE.Color() }
  return { room, claySeenFromInside: plain(), touchPad: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }), cloth: plain() }
}

function drawnMeshesUnder(object: THREE.Object3D, model: CarriedModel): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = []
  object.traverseVisible((part) => {
    const isInvisibleTouchArea = part instanceof THREE.Mesh && part.material instanceof THREE.MeshBasicMaterial && part.material.opacity === 0
    const isLiquid = part === model.liquid || part === model.liquidVolume
    if (part instanceof THREE.Mesh && !isInvisibleTouchArea && !isLiquid) meshes.push(part)
  })
  return meshes
}

function drawnBoundsOf(model: CarriedModel): THREE.Box3 {
  model.root.updateMatrixWorld(true)
  const bounds = new THREE.Box3()
  for (const mesh of drawnMeshesUnder(model.root, model)) bounds.expandByObject(mesh, true)
  return bounds
}

function horizontalRadiusOf(lid: THREE.Object3D, model: CarriedModel): number {
  const lidAlone = lid.clone()
  lidAlone.position.set(0, 0, 0)
  lidAlone.updateMatrixWorld(true)
  let radius = 0
  for (const mesh of drawnMeshesUnder(lidAlone, model)) {
    const positions = mesh.geometry.getAttribute('position')
    const corner = new THREE.Vector3()
    for (let index = 0; index < positions.count; index += 1) {
      corner.fromBufferAttribute(positions, index).applyMatrix4(mesh.matrixWorld)
      radius = Math.max(radius, Math.hypot(corner.x, corner.z))
    }
  }
  return radius
}

function farthestFromTheScreensCentre(model: CarriedModel, camera: THREE.PerspectiveCamera): number {
  model.root.updateMatrixWorld(true)
  let farthest = 0
  const point = new THREE.Vector3()
  for (const mesh of drawnMeshesUnder(model.root, model)) {
    const positions = mesh.geometry.getAttribute('position')
    for (let index = 0; index < positions.count; index += 1) {
      point.fromBufferAttribute(positions, index).applyMatrix4(mesh.matrixWorld).project(camera)
      farthest = Math.max(farthest, Math.abs(point.x), Math.abs(point.y))
    }
  }
  return farthest
}

function wallDistanceAt(model: CarriedModel, height: number): number | null {
  model.root.updateMatrixWorld(true)
  const walls = drawnMeshesUnder(model.root, model).filter((mesh) => !isPartOf(mesh, model.lid))
  const outside = overflowSide.clone().setY(height)
  const [nearestHit] = new THREE.Raycaster(outside, overflowSide.clone().negate()).intersectObjects(walls, false)
  return nearestHit === undefined ? null : 1 - nearestHit.distance
}

function isPartOf(mesh: THREE.Object3D, group: THREE.Object3D | null): boolean {
  for (let part: THREE.Object3D | null = mesh; part !== null; part = part.parent) if (part === group) return true
  return false
}
