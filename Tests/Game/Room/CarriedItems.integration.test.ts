import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { carriedShapeOf, layoutByShape } from '../../../Apps/Game/Room/CarriedShapes.ts'
import { quietRoomLayout } from '../../../Apps/Game/Room/RoomLayout.ts'
import { aimOver } from '../../../Apps/Game/Room/Views/Carried/AimedVessel.ts'
import { newCarriedModel, type CarriedModel } from '../../../Apps/Game/Room/Views/Carried/CarriedModel.ts'
import { holdInView } from '../../../Apps/Game/Room/Views/Carried/HeldInView.ts'
import { inspectInView } from '../../../Apps/Game/Room/Views/Carried/InspectedInView.ts'
import type { CarriedModelMaterials } from '../../../Apps/Game/Room/Views/Carried/ItemParts.ts'
import { overflowSideFromTheGaugeRadians, overflowStreamRadiusMetres } from '../../../Apps/Game/Room/Views/Carried/WaterStreams.ts'
import { isATouchArea, putOnLayer, roomLayers } from '../../../Apps/Game/Room/Views/RoomLayers.ts'
import type { SurfaceMaterials } from '../../../Apps/Game/Room/Views/RoomMaterials.ts'
import { tableViewState } from '../../../Apps/Game/Table/TablePresenter.ts'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import { tiltOfFullFlowDegrees } from '../../../Shared/Simulation/Physics/Pouring.ts'
import { definitionIn } from '../../../Shared/Simulation/Definitions/Catalog.ts'
import { carriedItemIdsIn } from '../../../Shared/Simulation/Ritual/Reach.ts'
import { firstPersonFieldOfViewDegrees } from '../../../Apps/Game/Room/Camera/FirstPersonLook.ts'
import { assertNear } from '../../Support/Assertions.ts'
import { TestRitual } from '../../Support/TestRitual.ts'

const teaTableTopMetres = 0.42
const drawingToleranceMetres = 0.001
const streamTouchesTheWallWithinMetres = 0.002
const tiltsDegrees = [0, 10, 20, 30, tiltOfFullFlowDegrees]
const spoutDirections = [{ x: 1, z: 0 }, { x: 0, z: 1 }, { x: -0.6, z: -0.8 }]
const portraitPhoneAspects = [375 / 667, 390 / 844, 412 / 915]
const closeUpAndFirstPersonFieldsOfViewDegrees = [30, 70]
const heldInViewCameras = [
  ...closeUpAndFirstPersonFieldsOfViewDegrees.map((fieldOfViewDegrees) => ({ fieldOfViewDegrees, isFirstPerson: false, pitchRadians: 0 })),
  ...[-1, 0, 1].map((pitchRadians) => ({ fieldOfViewDegrees: firstPersonFieldOfViewDegrees, isFirstPerson: true, pitchRadians })),
]
const inspectionTurnsRadians = [[0, 0.55], [Math.PI / 2, Math.PI / 2], [Math.PI / 4, Math.PI], [1, -1]] as const
const undersideProbesMetres = [0, 0.02]
const undersideHeightMetres = 0.01
const besideTheSpoutMetres = 0.12
const middleShelfBoardTopMetres = 0.72
const upperShelfBoardUndersideMetres = 1.18
const overflowSide =new THREE.Vector3(Math.sin(overflowSideFromTheGaugeRadians), 0, Math.cos(overflowSideFromTheGaugeRadians))

test('aimedVessel_ofEveryShapeAtEveryTilt_staysAboveTheSurfaceItPoursOver', () => {
  const target = new THREE.Group()
  target.position.y = teaTableTopMetres

  for (const model of vesselModelsInTheQuietRoom()) {
    for (const tiltDegrees of tiltsDegrees) {
      for (const spoutDirection of spoutDirections) {
        aimOver(model, { sourceId: model.itemId, targetId: 'target', spout: { x: 0, z: 0 }, spoutDirection, tiltDegrees }, { root: target, rimHeight: 0 }, [])

        const lowest = drawnBoundsOf(model).min.y
        assert.ok(lowest >= teaTableTopMetres - drawingToleranceMetres, `${model.itemId} at ${tiltDegrees}° reaches ${(teaTableTopMetres - lowest).toFixed(4)} m under the surface`)
      }
    }
  }
})

test('aimedVessel_ofEveryShapeOverEveryItemItPoursInto_staysAboveIt', () => {
  const standingModels = modelsInTheQuietRoom()

  for (const model of vesselModelsInTheQuietRoom()) {
    for (const standing of standingModels.filter((candidate) => candidate.itemId !== model.itemId)) {
      standing.root.position.set(0, teaTableTopMetres, 0)
      for (const tiltDegrees of tiltsDegrees) {
        for (const spoutDirection of spoutDirections) {
          aimOver(model, { sourceId: model.itemId, targetId: standing.itemId, spout: { x: 0, z: 0 }, spoutDirection, tiltDegrees }, standing, [standing.root])

          const sinking = sinkingInto(standing, model)
          assert.ok(sinking <= drawingToleranceMetres, `${model.itemId} at ${tiltDegrees}° sinks ${sinking.toFixed(4)} m into ${standing.itemId}`)
        }
      }
    }
  }
})

test('aimedVessel_ofEveryShapeOverEveryItemItPoursInto_keepsItsSpoutAtOneHeightWhileItTilts', () => {
  const standingModels = modelsInTheQuietRoom()

  for (const model of vesselModelsInTheQuietRoom()) {
    for (const standing of standingModels.filter((candidate) => candidate.itemId !== model.itemId)) {
      standing.root.position.set(0, teaTableTopMetres, 0)
      const spoutHeights = tiltsDegrees.map((tiltDegrees) => {
        aimOver(model, { sourceId: model.itemId, targetId: standing.itemId, spout: { x: 0, z: 0 }, spoutDirection: { x: 1, z: 0 }, tiltDegrees }, standing, [standing.root])
        model.root.updateMatrixWorld(true)
        return model.spoutTip.clone().applyMatrix4(model.root.matrixWorld).y
      })

      const drop = Math.max(...spoutHeights) - Math.min(...spoutHeights)
      assert.ok(drop <= drawingToleranceMetres, `${model.itemId}'s spout over ${standing.itemId} moves ${drop.toFixed(4)} m up or down as it tilts`)
    }
  }
})

test('aimedVessel_ofEveryShapeOverABowlOnAShelfBoard_staysUnderTheBoardAbove', () => {
  const bowl = modelsInTheQuietRoom().find((candidate) => candidate.shape === 'bowl')
  assert.ok(bowl !== undefined)
  bowl.root.position.set(0, middleShelfBoardTopMetres, 0)

  for (const model of vesselModelsInTheQuietRoom().filter((candidate) => candidate.itemId !== bowl.itemId)) {
    for (const tiltDegrees of tiltsDegrees) {
      aimOver(model, { sourceId: model.itemId, targetId: bowl.itemId, spout: { x: 0, z: 0 }, spoutDirection: { x: 1, z: 0 }, tiltDegrees }, bowl, [bowl.root], upperShelfBoardUndersideMetres)

      const highest = drawnBoundsOf(model).max.y
      assert.ok(highest <= upperShelfBoardUndersideMetres + drawingToleranceMetres, `${model.itemId} at ${tiltDegrees}° reaches ${(highest - upperShelfBoardUndersideMetres).toFixed(4)} m into the board above`)
    }
  }
})

test('aimedVessel_ofEveryShapeOverASurface_staysAboveEveryItemStandingBesideTheSpout', () => {
  const target = new THREE.Group()
  target.position.y = teaTableTopMetres
  const standingModels = modelsInTheQuietRoom()

  for (const model of vesselModelsInTheQuietRoom()) {
    for (const standing of standingModels.filter((candidate) => candidate.itemId !== model.itemId)) {
      for (const spoutDirection of spoutDirections) {
        standing.root.position.set(-spoutDirection.x * besideTheSpoutMetres, teaTableTopMetres, -spoutDirection.z * besideTheSpoutMetres)
        aimOver(model, { sourceId: model.itemId, targetId: 'target', spout: { x: 0, z: 0 }, spoutDirection, tiltDegrees: tiltOfFullFlowDegrees }, { root: target, rimHeight: 0 }, [standing.root])

        const sinking = sinkingInto(standing, model)
        assert.ok(sinking <= drawingToleranceMetres, `${model.itemId} sinks ${sinking.toFixed(4)} m into ${standing.itemId} standing beside the spout`)
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

test('touchAreas_ofEveryShapeStandingHeldWipingOrInspected_areNeverDrawnByTheCamera', () => {
  const layersTheCameraDraws = new THREE.Layers()
  for (const layer of [roomLayers.room, roomLayers.untappableRoom, roomLayers.heldInView, roomLayers.inspected]) layersTheCameraDraws.enable(layer)

  for (const model of modelsInTheQuietRoom()) {
    for (const layer of [roomLayers.room, roomLayers.heldInView, roomLayers.untappableRoom, roomLayers.inspected]) {
      putOnLayer(model.root, layer)

      const drawnTouchAreas = meshesUnder(model.root).filter((mesh) => isATouchArea(mesh) && mesh.layers.test(layersTheCameraDraws))
      assert.deepEqual(drawnTouchAreas.map((mesh) => mesh.name), [], `${model.itemId} on layer ${layer}`)
    }
  }
})

test('touchAreas_ofEveryShape_catchTapsWhileStandingOrHeldAndLetThemThroughWhileWipingOrInspected', () => {
  const raycaster = new THREE.Raycaster()
  raycaster.layers.enableAll()
  raycaster.layers.disable(roomLayers.untappableRoom)
  const layersAndWhetherTapsAreCaught = [[roomLayers.room, true], [roomLayers.heldInView, true], [roomLayers.untappableRoom, false], [roomLayers.inspected, false]] as const

  for (const model of modelsInTheQuietRoom()) {
    for (const [layer, isCaught] of layersAndWhetherTapsAreCaught) {
      putOnLayer(model.root, layer)

      const touchAreas = meshesUnder(model.root).filter((mesh) => isATouchArea(mesh))
      assert.ok(touchAreas.every((mesh) => mesh.layers.test(raycaster.layers) === isCaught), `${model.itemId} on layer ${layer}`)
    }
  }
})

test('invisibleMeshes_ofEveryShape_areAllTouchAreas', () => {
  for (const model of modelsInTheQuietRoom()) {
    const invisibleMeshes = meshesUnder(model.root).filter((mesh) => mesh.material instanceof THREE.Material && mesh.material.transparent && mesh.material.opacity === 0)

    assert.ok(invisibleMeshes.every((mesh) => isATouchArea(mesh)), model.itemId)
  }
})

test('itemInTheSink_standsOnTheTopOfTheSinksFloorPlate', () => {
  const tap = definitionIn(defaultCatalog, 'rooms', 'quietRoom').tap

  assert.ok(tap !== null, 'the quiet room has a tap')
  assertNear(tap.sinkSpot.y, quietRoomLayout.sinkBasin.floorHeight + quietRoomLayout.sinkBasin.plateMetres)
})

test('heldItem_ofEveryShapeInEitherHandInACloseUpOrInFirstPersonLookingUpOrDown_staysInsideAPortraitPhoneScreen', () => {
  for (const aspect of portraitPhoneAspects) {
    for (const { fieldOfViewDegrees, isFirstPerson, pitchRadians } of heldInViewCameras) {
      const camera = new THREE.PerspectiveCamera(fieldOfViewDegrees, aspect, 0.1, 100)
      camera.rotation.set(pitchRadians, 0, 0)
      camera.updateMatrixWorld(true)
      for (const model of modelsInTheQuietRoom()) {
        for (const handIndex of [0, 1] as const) {
          for (const chosenHandIndex of [null, handIndex]) {
            holdInView(model, handIndex, { camera, chosenHandIndex, isFirstPerson })

            const farthest = farthestFromTheScreensCentre(model, camera)
            assert.ok(farthest <= 1, `${model.itemId} in hand ${handIndex}, ${isFirstPerson ? 'in first person' : 'in a close-up'}, pitch ${pitchRadians}, ${aspect.toFixed(2)} aspect, ${fieldOfViewDegrees}°: reaches ${farthest.toFixed(3)} of the half screen`)
          }
        }
      }
    }
  }
})

test('inspectedItem_ofEveryShapeTurnedAnyWayAtItsUsualSize_staysInsideAPortraitPhoneScreen', () => {
  for (const aspect of portraitPhoneAspects) {
    for (const fieldOfViewDegrees of closeUpAndFirstPersonFieldsOfViewDegrees) {
      const camera = new THREE.PerspectiveCamera(fieldOfViewDegrees, aspect, 0.1, 100)
      camera.updateMatrixWorld(true)
      for (const model of modelsInTheQuietRoom()) {
        for (const [yawRadians, pitchRadians] of inspectionTurnsRadians) {
          inspectInView(model, { camera, inspection: { itemId: model.itemId, handIndex: 0, yawRadians, pitchRadians, magnification: 1 } })

          const farthest = farthestFromTheScreensCentre(model, camera)
          assert.ok(farthest <= 1, `${model.itemId} turned ${yawRadians.toFixed(2)} and ${pitchRadians.toFixed(2)}, ${aspect.toFixed(2)} aspect, ${fieldOfViewDegrees}°: reaches ${farthest.toFixed(3)} of the half screen`)
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

test('underside_ofEveryVessel_isDrawnFacingDownWhereItStands', () => {
  for (const model of vesselModelsInTheQuietRoom()) {
    model.root.updateMatrixWorld(true)
    const meshes = drawnMeshesUnder(model.root, model).filter((mesh) => !isPartOf(mesh, model.lid))
    for (const across of undersideProbesMetres) {
      const [lowestHit] = new THREE.Raycaster(new THREE.Vector3(across, -1, 0), new THREE.Vector3(0, 1, 0)).intersectObjects(meshes, false)
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(lowestHit?.object.matrixWorld ?? new THREE.Matrix4())
      const facing = lowestHit?.face?.normal.clone().applyMatrix3(normalMatrix).y ?? 0

      assert.ok(lowestHit !== undefined && lowestHit.point.y <= undersideHeightMetres && facing < 0, `${model.itemId} seen from below ${across} m off its middle shows ${lowestHit === undefined ? 'nothing' : `a face at ${lowestHit.point.y.toFixed(3)} m turned ${facing < 0 ? 'down' : 'up'}`}`)
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
  const room: SurfaceMaterials = { materialFor: plain, unsharedMaterialFor: plain, colourOf: () => new THREE.Color(), bowlIdWithTheToadUnderneath: 'bowl1' }
  return { room, claySeenFromInside: plain(), cloth: plain() }
}

function drawnMeshesUnder(object: THREE.Object3D, model: CarriedModel): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = []
  object.traverseVisible((part) => {
    const isLiquid = part === model.liquid || part === model.liquidVolume
    if (part instanceof THREE.Mesh && !isATouchArea(part) && !isLiquid) meshes.push(part)
  })
  return meshes
}

function drawnBoundsOf(model: CarriedModel): THREE.Box3 {
  model.root.updateMatrixWorld(true)
  const bounds = new THREE.Box3()
  for (const mesh of drawnMeshesUnder(model.root, model)) bounds.expandByObject(mesh, true)
  return bounds
}

function sinkingInto(standing: CarriedModel, aimed: CarriedModel): number {
  standing.root.updateMatrixWorld(true)
  aimed.root.updateMatrixWorld(true)
  const partsBelow = drawnMeshesUnder(standing.root, standing).map((mesh) => new THREE.Box3().setFromObject(mesh, true))
  let sinking = 0
  for (const mesh of drawnMeshesUnder(aimed.root, aimed)) {
    const positions: THREE.BufferAttribute | THREE.InterleavedBufferAttribute | undefined = mesh.geometry.getAttribute('position')
    if (positions === undefined) continue
    const point = new THREE.Vector3()
    for (let index = 0; index < positions.count; index += 1) {
      point.fromBufferAttribute(positions, index).applyMatrix4(mesh.matrixWorld)
      for (const part of partsBelow.filter((bounds) => bounds.containsPoint(point))) sinking = Math.max(sinking, part.max.y - point.y)
    }
  }
  return sinking
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

function meshesUnder(object: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = []
  object.traverse((part) => {
    if (part instanceof THREE.Mesh) meshes.push(part)
  })
  return meshes
}

function isPartOf(mesh: THREE.Object3D, group: THREE.Object3D | null): boolean {
  for (let part: THREE.Object3D | null = mesh; part !== null; part = part.parent) if (part === group) return true
  return false
}
