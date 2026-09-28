import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { GlassThatClears } from '../../../Apps/Engine/Rendering/Looks.ts'
import { carriedShapeOf, footprintCirclesOf, layoutByShape } from '../../../Apps/Game/Room/CarriedShapes.ts'
import { LyingLids } from '../../../Apps/Game/Room/Placement.ts'
import { turnOfItemAt, type FurnitureId } from '../../../Apps/Game/Room/RoomLayout.ts'
import { standingAt } from '../../../Apps/Engine/Walking/Walk.ts'
import { aimOver, type AimedModel } from '../../../Apps/Game/Room/Rendering/Carried/Hands/AimedVessel.ts'
import type { CarriedItemsScene } from '../../../Apps/Game/Room/Rendering/Carried/CarriedItemsScene.ts'
import { newCarriedModel, type CarriedModel } from '../../../Apps/Game/Room/Rendering/Carried/CarriedModel.ts'
import { clearTheGlassAtItsSize, drawInTheDetailItsSizeNeeds } from '../../../Apps/Game/Room/Rendering/CarriedItems.ts'
import { holdInView } from '../../../Apps/Game/Room/Rendering/Carried/Hands/HeldInView.ts'
import { inspectInView } from '../../../Apps/Game/Room/Rendering/Carried/Hands/InspectedInView.ts'
import { showContentsOf } from '../../../Apps/Game/Room/Rendering/Carried/ItemContents.ts'
import type { ItemSetUp } from '../../../Apps/Game/Room/Rendering/Carried/ItemParts.ts'
import { pathDownTheOutside } from '../../../Apps/Game/Room/Rendering/Carried/VesselProfile.ts'
import { bowlUndersideAndFoot } from '../../../Apps/Game/Room/Rendering/Carried/Shapes/BowlProfile.ts'
import { overflowSideFromTheGaugeRadians, overflowStreamRadiusMetres } from '../../../Apps/Game/Room/Rendering/Carried/Streams/WaterStreams.ts'
import { roomLayers, type Pass } from '../../../Apps/Game/Room/Rendering/RoomLayers.ts'
import type { LayerRole } from '../../../Apps/Engine/Rendering/Layers.ts'
import type { SurfaceMaterials } from '../../../Apps/Game/Room/Rendering/RoomMaterials.ts'
import { worldViewState } from '../../../Apps/Game/Presentation/WorldPresenter.ts'
import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import { teaBowlIds } from '../../../Shared/Content/Rooms.ts'
import { definitionIn } from '../../../Shared/Engine/Catalog.ts'
import { tiltOfFullFlowDegrees } from '../../../Shared/GameLogic/Chemistry/Pouring.ts'
import { carriedItemIdsIn, itemLocationIn } from '../../../Shared/GameLogic/State/WhereItemsAre.ts'
import type { DeepReadonly } from '../../../Shared/Engine/DeepReadonly.ts'
import type { SessionState } from '../../../Shared/GameLogic/State/SessionState.ts'
import { cameraFieldOfViewDegrees } from '../../../Apps/Game/Room/Camera/CameraPoses.ts'
import { TestTeaSession } from '../../Support/TestTeaSession.ts'
import { quietRoomLayout, TestRoom } from '../../Support/TestRoom.ts'

const teaTableTopMetres = 0.42
const passes: readonly Pass[] = ['room', 'heldInView', 'inspected']
const standingHeldWipingAndInspected: readonly (readonly [Pass, LayerRole])[] = [['room', 'takesTaps'], ['heldInView', 'takesTaps'], ['room', 'decoration'], ['inspected', 'takesTaps']]
const drawingToleranceMetres = 0.001
const streamTouchesTheWallWithinMetres = 0.002
const tiltsDegrees = [0, 10, 20, 30, tiltOfFullFlowDegrees]
const spoutDirections = [{ x: 1, z: 0 }, { x: 0, z: 1 }, { x: -0.6, z: -0.8 }]
const portraitPhoneAspects = [375 / 667, 390 / 844, 412 / 915]
const closeUpAndFirstPersonFieldsOfViewDegrees = [30, 70]
const heldInViewCameras = [
  ...closeUpAndFirstPersonFieldsOfViewDegrees.map((fieldOfViewDegrees) => ({ fieldOfViewDegrees, isFirstPerson: false, pitchRadians: 0, screenHeightShareTakenByControls: 0 })),
  ...[-1, 0, 1].flatMap((pitchRadians) => [0, 0.34].map((screenHeightShareTakenByControls) => ({ fieldOfViewDegrees: cameraFieldOfViewDegrees, isFirstPerson: true, pitchRadians, screenHeightShareTakenByControls }))),
]
const inspectionTurnsRadians = [[0, 0.55], [Math.PI / 2, Math.PI / 2], [Math.PI / 4, Math.PI], [1, -1]] as const
const undersideProbesMetres = [0, 0.02]
const undersideHeightMetres = 0.01
const besideTheSpoutMetres = 0.12
const middleShelfBoardTopMetres = 0.72
const upperShelfBoardUndersideMetres = 1.18
const mouthProbeDirections = 12
const mouthProbeStepMetres = 0.00025
const streamFallsIntoTheMouthBelowTheTopMetres = 0.01
const everyFurnitureId: readonly FurnitureId[] = ['counter', 'shelf', 'teaTable']
const quietRoomSurroundings = { layout: quietRoomLayout, heaterSpot: definitionIn(defaultCatalog, 'rooms', 'quietRoom').heaterSpot }
const overflowSide =new THREE.Vector3(Math.sin(overflowSideFromTheGaugeRadians), 0, Math.cos(overflowSideFromTheGaugeRadians))

test('aimedVessel_ofEveryShapeAtEveryTilt_staysAboveTheSurfaceItPoursOver', () => {
  const target = new THREE.Group()
  target.position.y = teaTableTopMetres

  for (const model of oneVesselModelOfEachGeometry()) {
    for (const tiltDegrees of tiltsDegrees) {
      for (const spoutDirection of spoutDirections) {
        aimOver(aimed(model), { sourceId: model.itemId, targetId: 'target', spout: { x: 0, z: 0 }, spoutDirection, tiltDegrees }, { root: target, heightMetres: 0 }, [])

        const lowest = drawnBoundsOf(model).min.y
        assert.ok(lowest >= teaTableTopMetres - drawingToleranceMetres, `${model.itemId} at ${tiltDegrees}° reaches ${(teaTableTopMetres - lowest).toFixed(4)} m under the surface`)
      }
    }
  }
})

test('aimedVessel_ofEveryShapeOverEveryItemItPoursInto_staysAboveIt', () => {
  const standingModels = oneModelOfEachGeometry()

  for (const model of oneVesselModelOfEachGeometry()) {
    for (const standing of standingModels.filter((candidate) => candidate.itemId !== model.itemId)) {
      standing.root.position.set(0, teaTableTopMetres, 0)
      for (const tiltDegrees of tiltsDegrees) {
        for (const spoutDirection of spoutDirections) {
          aimOver(aimed(model), { sourceId: model.itemId, targetId: standing.itemId, spout: { x: 0, z: 0 }, spoutDirection, tiltDegrees }, standing, [standing.root])

          const sinking = sinkingInto(standing, model)
          assert.ok(sinking <= drawingToleranceMetres, `${model.itemId} at ${tiltDegrees}° sinks ${sinking.toFixed(4)} m into ${standing.itemId}`)
        }
      }
    }
  }
})

test('aimedVessel_ofEveryShapeOverEveryItemItPoursInto_keepsItsSpoutAtOneHeightWhileItTilts', () => {
  const standingModels = oneModelOfEachGeometry()

  for (const model of oneVesselModelOfEachGeometry()) {
    for (const standing of standingModels.filter((candidate) => candidate.itemId !== model.itemId)) {
      standing.root.position.set(0, teaTableTopMetres, 0)
      const spoutHeights = tiltsDegrees.map((tiltDegrees) => {
        aimOver(aimed(model), { sourceId: model.itemId, targetId: standing.itemId, spout: { x: 0, z: 0 }, spoutDirection: { x: 1, z: 0 }, tiltDegrees }, standing, [standing.root])
        model.root.updateMatrixWorld(true)
        return aimed(model).spoutTip.clone().applyMatrix4(model.root.matrixWorld).y
      })

      const drop = Math.max(...spoutHeights) - Math.min(...spoutHeights)
      assert.ok(drop <= drawingToleranceMetres, `${model.itemId}'s spout over ${standing.itemId} moves ${drop.toFixed(4)} m up or down as it tilts`)
    }
  }
})

test('aimedVessel_ofEveryShapeOverABowlOnAShelfBoard_staysUnderTheBoardAbove', () => {
  const bowl = oneModelOfEachGeometry().find((candidate) => candidate.shape === 'bowl')
  assert.ok(bowl !== undefined)
  bowl.root.position.set(0, middleShelfBoardTopMetres, 0)

  for (const model of oneVesselModelOfEachGeometry().filter((candidate) => candidate.itemId !== bowl.itemId)) {
    for (const tiltDegrees of tiltsDegrees) {
      aimOver(aimed(model), { sourceId: model.itemId, targetId: bowl.itemId, spout: { x: 0, z: 0 }, spoutDirection: { x: 1, z: 0 }, tiltDegrees }, bowl, [bowl.root], upperShelfBoardUndersideMetres)

      const highest = drawnBoundsOf(model).max.y
      assert.ok(highest <= upperShelfBoardUndersideMetres + drawingToleranceMetres, `${model.itemId} at ${tiltDegrees}° reaches ${(highest - upperShelfBoardUndersideMetres).toFixed(4)} m into the board above`)
    }
  }
})

test('aimedVessel_ofEveryShapeOverASurface_staysAboveEveryItemStandingBesideTheSpout', () => {
  const target = new THREE.Group()
  target.position.y = teaTableTopMetres
  const standingModels = oneModelOfEachGeometry()

  for (const model of oneVesselModelOfEachGeometry()) {
    for (const standing of standingModels.filter((candidate) => candidate.itemId !== model.itemId)) {
      for (const spoutDirection of spoutDirections) {
        standing.root.position.set(-spoutDirection.x * besideTheSpoutMetres, teaTableTopMetres, -spoutDirection.z * besideTheSpoutMetres)
        aimOver(aimed(model), { sourceId: model.itemId, targetId: 'target', spout: { x: 0, z: 0 }, spoutDirection, tiltDegrees: tiltOfFullFlowDegrees }, { root: target, heightMetres: 0 }, [standing.root])

        const sinking = sinkingInto(standing, model)
        assert.ok(sinking <= drawingToleranceMetres, `${model.itemId} sinks ${sinking.toFixed(4)} m into ${standing.itemId} standing beside the spout`)
      }
    }
  }
})

test('standingItem_ofEveryShape_isDrawnInsideItsFootprint', () => {
  for (const model of oneModelOfEachGeometry()) {
    const footprint = footprintCirclesOf(layoutByShape[model.shape])

    const farthestOutside = Math.max(...drawnPointsOf(model).map((point) => Math.min(...footprint.map((circle) => Math.hypot(point.x - circle.x, point.z - circle.z) - circle.radius))))

    assert.ok(farthestOutside <= drawingToleranceMetres, `${model.itemId} is drawn ${farthestOutside.toFixed(4)} m outside its footprint`)
  }
})

test('clothFootprint_reachesLessThanACentimetrePastTheClothsLongSides', () => {
  const cloth = oneModelOfEachGeometry().find((model) => model.shape === 'cloth')
  assert.ok(cloth !== undefined)
  const drawnHalfWidth = drawnBoundsOf(cloth).max.z

  const footprintHalfWidth = Math.max(...footprintCirclesOf(layoutByShape.cloth).map((circle) => Math.abs(circle.z) + circle.radius))

  assert.ok(footprintHalfWidth - drawnHalfWidth < 0.01, `the footprint reaches ${(footprintHalfWidth - drawnHalfWidth).toFixed(4)} m past the cloth's long sides`)
})

test('lid_ofEveryShape_isInTheModelExactlyWhenTheLayoutKeepsAPlaceForIt', () => {
  for (const model of oneModelOfEachGeometry()) {
    assert.equal(model.lid !== null, layoutByShape[model.shape].lid !== null, model.itemId)
  }
})

test('openLid_ofEveryShape_isDrawnNoWiderThanThePlaceKeptForItBesideTheItem', () => {
  for (const model of oneModelOfEachGeometry()) {
    const lyingLid = layoutByShape[model.shape].lid
    if (model.lid === null || lyingLid === null) continue

    const drawnRadius = horizontalRadiusOf(model.lid, model)

    assert.ok(drawnRadius <= lyingLid.lyingRadiusMetres + drawingToleranceMetres, `${model.itemId}'s lid is ${drawnRadius.toFixed(4)} m wide, ${lyingLid.lyingRadiusMetres} m is kept for it`)
  }
})

test('openLid_ofEveryShapeLyingBesideItsItem_restsOnTheSurface', () => {
  const state = stateWithEveryLidOpen()
  const modelsWithALid = oneModelOfEachGeometry().filter((model) => model.lid !== null)

  for (const model of modelsWithALid) showStandingWhereItIs(model, state)

  for (const model of modelsWithALid) {
    const location = itemLocationIn(state, model.itemId)
    assert.ok(location?.kind === 'onSurface', model.itemId)
    const lidBounds = drawnBoundsOfTheLid(model)
    const lidMiddle = lidBounds.getCenter(new THREE.Vector3())
    assert.ok(Math.hypot(lidMiddle.x - location.spot.x, lidMiddle.z - location.spot.z) > layoutByShape[model.shape].footprintRadiusMetres, `${model.itemId}'s lid does not lie beside it`)
    assert.ok(Math.abs(lidBounds.min.y - location.spot.y) <= drawingToleranceMetres, `${model.itemId}'s lid lies ${(lidBounds.min.y - location.spot.y).toFixed(4)} m above the surface`)
  }
})

test('fire_ofEveryShape_isDrawnExactlyWhenTheItemCanCharAndTheTableSaysHowFar', () => {
  const session = new TestTeaSession(defaultCatalog, 'quietRoom')
  const charringByItem = worldViewState(session.state, defaultCatalog).charringByItem

  for (const model of oneModelOfEachGeometry()) {
    const hasFire = model.look.fire !== null
    assert.equal(model.charTo !== null, hasFire, model.itemId)
    assert.equal(charringByItem[model.itemId] !== undefined, hasFire, model.itemId)
  }
})

test('touchAreas_ofEveryShapeStandingHeldWipingOrInspected_areNeverDrawnByTheCamera', () => {
  for (const model of oneModelOfEachGeometry()) {
    for (const [pass, role] of standingHeldWipingAndInspected) {
      roomLayers.putOnLayer(model.root, pass, role)

      const drawnTouchAreas = meshesUnder(model.root).filter((mesh) => roomLayers.isATouchArea(mesh) && isDrawnInAnyPass(mesh))
      assert.deepEqual(drawnTouchAreas.map((mesh) => mesh.name), [], `${model.itemId} in the ${pass} pass as ${role}`)
    }
  }
})

test('touchAreas_ofEveryShape_catchTapsWhileStandingOrHeldAndLetThemThroughWhileWipingOrInspected', () => {
  const isCaughtStandingHeldWipingAndInspected = [true, true, false, false]

  for (const model of oneModelOfEachGeometry()) {
    standingHeldWipingAndInspected.forEach(([pass, role], index) => {
      roomLayers.putOnLayer(model.root, pass, role)

      const touchAreas = meshesUnder(model.root).filter((mesh) => roomLayers.isATouchArea(mesh))
      assert.ok(touchAreas.every((mesh) => isReachedByATap(mesh) === isCaughtStandingHeldWipingAndInspected[index]), `${model.itemId} in the ${pass} pass as ${role}`)
    })
  }
})

test('decoration_inEveryPass_isDrawnThereAndTakesNoTap', () => {
  const decorations = passes.map((pass) => {
    const decoration = new THREE.Mesh(new THREE.PlaneGeometry(1, 1))
    roomLayers.putOnLayer(decoration, pass, 'decoration')
    return decoration
  })

  assert.deepEqual(decorations.map((decoration, index) => ({ isDrawn: isDrawnInThe(decoration, passes[index] ?? 'room'), takesATap: isReachedByATap(decoration) })), passes.map(() => ({ isDrawn: true, takesATap: false })))
})

test('invisibleMeshes_ofEveryShape_areAllTouchAreas', () => {
  for (const model of oneModelOfEachGeometry()) {
    const invisibleMeshes = meshesUnder(model.root).filter((mesh) => mesh.material instanceof THREE.Material && mesh.material.transparent && mesh.material.opacity === 0)

    assert.ok(invisibleMeshes.every((mesh) => roomLayers.isATouchArea(mesh)), model.itemId)
  }
})

test('heldItem_ofEveryShapeInEitherHandInACloseUpOrInFirstPersonLookingUpOrDownAboveTheSticks_staysInsideAPortraitPhoneScreen', () => {
  const models = oneModelOfEachGeometry()

  for (const aspect of portraitPhoneAspects) {
    for (const { fieldOfViewDegrees, isFirstPerson, pitchRadians, screenHeightShareTakenByControls } of heldInViewCameras) {
      const camera = new THREE.PerspectiveCamera(fieldOfViewDegrees, aspect, 0.1, 100)
      camera.rotation.set(pitchRadians, 0, 0)
      camera.updateMatrixWorld(true)
      for (const model of models) {
        for (const handIndex of [0, 1] as const) {
          for (const chosenHandIndex of [null, handIndex]) {
            holdInView(model, handIndex, { camera, chosenHandIndex, isFirstPerson, screenHeightShareTakenByControls })

            const farthest = farthestFromTheScreensCentre(model, camera)
            assert.ok(farthest <= 1, `${model.itemId} in hand ${handIndex}, ${isFirstPerson ? 'in first person' : 'in a close-up'}, pitch ${pitchRadians}, controls taking ${screenHeightShareTakenByControls}, ${aspect.toFixed(2)} aspect, ${fieldOfViewDegrees}°: reaches ${farthest.toFixed(3)} of the half screen`)
          }
        }
      }
    }
  }
})

test('inspectedItem_ofEveryShapeTurnedAnyWayAtItsUsualSize_staysInsideAPortraitPhoneScreen', () => {
  const models = oneModelOfEachGeometry()

  for (const aspect of portraitPhoneAspects) {
    for (const fieldOfViewDegrees of closeUpAndFirstPersonFieldsOfViewDegrees) {
      const camera = new THREE.PerspectiveCamera(fieldOfViewDegrees, aspect, 0.1, 100)
      camera.updateMatrixWorld(true)
      for (const model of models) {
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
  for (const model of oneVesselModelOfEachGeometry()) {
    assert.notEqual(model.vessel, null, `${model.itemId} is no vessel`)
    const points = model.vessel === null ? [] : pathDownTheOutside(model.vessel.profile)

    const pointsBesideTheWall = points.flatMap((point, index) => {
      const previous = points[index - 1]
      assert.ok(previous === undefined || point.heightMetres <= previous.heightMetres, `${model.itemId}'s overflow rises at point ${index}`)
      const isBesideTheWall = point.heightMetres > drawingToleranceMetres && point.heightMetres < model.heightMetres
      const wall = isBesideTheWall ? wallDistanceAt(model, point.heightMetres) : null
      return wall === null ? [] : [{ point, wall }]
    })

    assert.ok(pointsBesideTheWall.length > 0, `${model.itemId}'s overflow never passes its wall`)
    for (const { point, wall } of pointsBesideTheWall) {
      assert.ok(point.radiusMetres >= wall - drawingToleranceMetres, `${model.itemId}'s overflow at ${point.heightMetres.toFixed(3)} m runs ${(wall - point.radiusMetres).toFixed(4)} m inside its wall`)
      assert.ok(point.radiusMetres <= wall + overflowStreamRadiusMetres + streamTouchesTheWallWithinMetres, `${model.itemId}'s overflow at ${point.heightMetres.toFixed(3)} m runs ${(point.radiusMetres - wall).toFixed(4)} m away from its wall`)
    }
  }
})

test('opening_ofEveryVessel_isNoWiderThanItsDrawnMouth', () => {
  for (const model of oneVesselModelOfEachGeometry()) {
    const drawnMouthRadius = drawnMouthRadiusOf(model)

    const openingRadius = layoutByShape[model.shape].openingRadiusMetres

    assert.ok(openingRadius <= drawnMouthRadius + drawingToleranceMetres, `${model.itemId}'s opening is ${openingRadius} m wide, its drawn mouth ${drawnMouthRadius.toFixed(4)} m`)
  }
})

test('underside_ofEveryVessel_isDrawnFacingDownWhereItStands', () => {
  for (const model of oneVesselModelOfEachGeometry()) {
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

test('paintedBowl_smallOnTheScreen_isDrawnWithUnderTwoFifthsOfItsTriangles', () => {
  const { bowl, camera } = paintedBowlSeenFrom(10)
  const body = bowl.levelsOfDetail[0]
  const trianglesDrawnInFull = trianglesOf(body?.near)

  drawInTheDetailItsSizeNeeds(bowl, { camera, screenHeightPixels: 800 })

  assert.ok(trianglesOf(body?.mesh.geometry) * 5 < trianglesDrawnInFull * 2, `${trianglesOf(body?.mesh.geometry)} of ${trianglesDrawnInFull} triangles`)
})

test('bowlPainting_ofEveryPaintedBowlSmallOnTheScreen_showsAllItShowsOnTheBowlDrawnInFull', () => {
  const paintedBowls = teaBowlIds.map((bowlId) => paintedBowlSeenFrom(10, bowlId)).filter(({ bowl }) => paintingsOf(bowl).length > 0)
  const hiddenInFull = paintedBowls.map(({ bowl }) => paintingsOf(bowl).map((painting) => pointsOfThePaintingHiddenBy(painting, bowl)))

  for (const { bowl, camera } of paintedBowls) drawInTheDetailItsSizeNeeds(bowl, { camera, screenHeightPixels: 800 })

  assert.equal(paintedBowls.length, 5)
  paintedBowls.forEach(({ bowl }, bowlIndex) => {
    paintingsOf(bowl).forEach((painting, paintingIndex) => {
      const hiddenOnlyWhenSimpler = pointsOfThePaintingHiddenBy(painting, bowl).filter((point) => !hiddenInFull[bowlIndex]?.[paintingIndex]?.includes(point))
      assert.ok(painting.visible, `${bowl.itemId} hides a painting`)
      assert.deepEqual(hiddenOnlyWhenSimpler, [], `${bowl.itemId}'s simpler body covers its painting`)
    })
  })
})

test('paintedBowl_largeOnTheScreenOrHeldOrWithTheSettingOff_isDrawnInFull', () => {
  const near = paintedBowlSeenFrom(0.5)
  const held = paintedBowlSeenFrom(10)
  held.bowl.now.isHeldInView = true
  const settingOff = paintedBowlSeenFrom(10)

  drawInTheDetailItsSizeNeeds(near.bowl, { camera: near.camera, screenHeightPixels: 800 })
  drawInTheDetailItsSizeNeeds(held.bowl, { camera: held.camera, screenHeightPixels: 800 })
  drawInTheDetailItsSizeNeeds(settingOff.bowl, null)

  assert.deepEqual([near, held, settingOff].map(({ bowl }) => bowl.levelsOfDetail.every((level) => level.mesh.geometry === level.near && level.mesh.visible)), [true, true, true])
})

test('glassBowl_movingAwayFromTheCamera_turnsGraduallyIntoClearGlassThatTransmitsNothing', () => {
  const { bowl, camera } = paintedBowlSeenFrom(0.5, 'bowl8')
  const clearShares: number[] = []
  const transmissionsWhenClear: number[] = []

  for (let distanceMetres = 0.5; distanceMetres <= 10; distanceMetres += 0.02) {
    camera.position.set(0, 0, distanceMetres)
    clearTheGlassAtItsSize(bowl, { camera, screenHeightPixels: 800 })
    const glass = bowl.glassThatClears
    clearShares.push(glass?.clearShare ?? Number.NaN)
    if (glass?.clearShare === 1) transmissionsWhenClear.push(glass.material.transmission)
  }

  const partlyClear = clearShares.filter((share) => share > 0 && share < 1)
  assert.deepEqual([clearShares[0], clearShares.at(-1)], [0, 1])
  assert.ok(clearShares.every((share, index) => index === 0 || share >= (clearShares[index - 1] ?? 0)), 'the glass grew less clear on the way out')
  assert.ok(partlyClear.length >= 10, `only ${partlyClear.length} steps between transmitting and clear`)
  assert.deepEqual([...new Set(transmissionsWhenClear)], [0])
})

test('glassBowl_smallOnTheScreen_keepsAllItsTriangles', () => {
  const { bowl, camera } = paintedBowlSeenFrom(10, 'bowl8')
  const body = bowl.lookByWhereItIsDrawn?.mesh
  const geometryDrawnInFull = body?.geometry

  drawInTheDetailItsSizeNeeds(bowl, { camera, screenHeightPixels: 800 })

  assert.equal(body?.geometry, geometryDrawnInFull)
})

function paintedBowlSeenFrom(distanceMetres: number, bowlId = 'bowl1'): { readonly bowl: CarriedModel; readonly camera: THREE.PerspectiveCamera } {
  const bowl = newCarriedModel(bowlId, 'bowl', plainMaterials())
  const camera = new THREE.PerspectiveCamera(30, 0.5, 0.1, 100)
  camera.position.set(0, 0, distanceMetres)
  return { bowl, camera }
}

function isDrawnInAnyPass(mesh: THREE.Mesh): boolean {
  return passes.some((pass) => isDrawnInThe(mesh, pass))
}

function isDrawnInThe(mesh: THREE.Mesh, pass: Pass): boolean {
  const camera = new THREE.PerspectiveCamera()
  roomLayers.showThePassTo(camera, pass)
  return mesh.layers.test(camera.layers)
}

function isReachedByATap(mesh: THREE.Mesh): boolean {
  const raycaster = new THREE.Raycaster()
  roomLayers.letTapsReach(raycaster)
  return mesh.layers.test(raycaster.layers)
}

function paintingsOf(bowl: CarriedModel): THREE.Mesh[] {
  return drawnMeshesUnder(bowl.root, bowl).filter((mesh) => mesh.geometry instanceof THREE.PlaneGeometry)
}

function pointsOfThePaintingHiddenBy(painting: THREE.Mesh, bowl: CarriedModel): string[] {
  const body = bowl.levelsOfDetail[0]?.mesh ?? painting
  painting.updateWorldMatrix(true, false)
  const hiddenPoints: string[] = []
  for (const point of pointsAllOver(painting)) {
    const isInsideTheBowl = point.y > (bowlUndersideAndFoot[0]?.y ?? 0)
    const lookingAtIt = new THREE.Vector3(0, isInsideTheBowl ? -1 : 1, 0)
    const [firstHit] = new THREE.Raycaster(point.clone().addScaledVector(lookingAtIt, -1), lookingAtIt).intersectObjects([body, painting], false)
    if (firstHit?.object !== painting) hiddenPoints.push(`${point.x.toFixed(4)}, ${point.y.toFixed(4)}, ${point.z.toFixed(4)}`)
  }
  return hiddenPoints
}

function pointsAllOver(painting: THREE.Mesh): THREE.Vector3[] {
  const position = painting.geometry.getAttribute('position')
  const cornerOf = (vertex: number): THREE.Vector3 => new THREE.Vector3().fromBufferAttribute(position, vertex).applyMatrix4(painting.matrixWorld)
  const corners = Array.from({ length: position.count }, (_, vertex) => cornerOf(vertex))
  const index = painting.geometry.index
  if (index === null) return corners
  const middles = Array.from({ length: index.count / 3 }, (_, triangle) => [0, 1, 2].map((corner) => cornerOf(index.getX(triangle * 3 + corner))).reduce((sum, corner) => sum.add(corner), new THREE.Vector3()).divideScalar(3))
  return [...corners, ...middles]
}

function trianglesOf(geometry: THREE.BufferGeometry | undefined): number {
  const vertices = geometry?.index?.count ?? geometry?.getAttribute('position').count ?? 0
  return vertices / 3
}

function aimed(model: CarriedModel): AimedModel {
  assert.notEqual(model.vessel, null, `${model.itemId} has no spout`)
  return { root: model.root, bodyRadius: model.bodyRadius, spoutTip: model.vessel?.spoutTip ?? new THREE.Vector3() }
}

function oneModelOfEachGeometry(): CarriedModel[] {
  const modelByGeometry = new Map<string, CarriedModel>()
  for (const model of modelsInTheQuietRoom()) {
    const geometry = drawnGeometryOf(model)
    if (!modelByGeometry.has(geometry)) modelByGeometry.set(geometry, model)
  }
  return [...modelByGeometry.values()]
}

function oneVesselModelOfEachGeometry(): CarriedModel[] {
  const state = new TestTeaSession(defaultCatalog, 'quietRoom').state
  return oneModelOfEachGeometry().filter((model) => state.vessels[model.itemId] !== undefined)
}

function modelsInTheQuietRoom(): CarriedModel[] {
  const state = new TestTeaSession(defaultCatalog, 'quietRoom').state
  const materials = plainMaterials()
  return carriedItemIdsIn(state).flatMap((itemId) => {
    const shape = carriedShapeOf(state, itemId)
    return shape === undefined ? [] : [newCarriedModel(itemId, shape, materials)]
  })
}

function drawnGeometryOf(model: CarriedModel): string {
  model.root.updateMatrixWorld(true)
  return meshesUnder(model.root)
    .map((mesh) => {
      const bounds = new THREE.Box3().setFromObject(mesh, true)
      return [mesh.geometry.getAttribute('position')?.count ?? 0, ...bounds.min.toArray(), ...bounds.max.toArray()].map((value) => value.toFixed(4)).join(' ')
    })
    .join('; ')
}

function plainMaterials(): ItemSetUp {
  const plain = (): THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial({ side: THREE.DoubleSide })
  const room: SurfaceMaterials = { materialFor: plain, unsharedMaterialFor: plain, glassThatClears: () => new GlassThatClears('#ffffff', null), colourOf: () => new THREE.Color(), colourOfACloth: () => new THREE.Color() }
  return { room, clothPatternOf: () => 'blueStripes', bowlIdWithTheToadUnderneath: 'bowl1', log: () => {} }
}

function drawnMeshesUnder(object: THREE.Object3D, model: CarriedModel): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = []
  object.traverseVisible((part) => {
    const isLiquid = part === model.liquid || part === model.liquidVolume
    if (part instanceof THREE.Mesh && !roomLayers.isATouchArea(part) && !isLiquid) meshes.push(part)
  })
  return meshes
}

function stateWithEveryLidOpen(): DeepReadonly<SessionState> {
  const room = new TestRoom()
  for (const furnitureId of everyFurnitureId) {
    room.walkTo(furnitureId)
    for (const vesselId of Object.keys(room.state.vessels)) room.session.dispatch({ type: 'openVesselLid', vesselId })
  }
  return room.state
}

function showStandingWhereItIs(model: CarriedModel, state: DeepReadonly<SessionState>): void {
  const location = itemLocationIn(state, model.itemId)
  if (location?.kind !== 'onSurface') throw new Error(`${model.itemId} does not stand on a surface`)
  model.root.position.set(location.spot.x, location.spot.y, location.spot.z)
  model.root.rotation.y = turnOfItemAt(quietRoomLayout, location.spot)
  showContentsOf(model, sceneOf(state), new LyingLids(() => {}).layOpenLids(state, quietRoomSurroundings))
}

function sceneOf(state: DeepReadonly<SessionState>): CarriedItemsScene {
  return { state, view: worldViewState(state, defaultCatalog), walk: standingAt({ x: 0, z: 0 }), heldInView: null, inspected: null, aimedPour: null, clothWiping: null, sipGesture: null, timeSeconds: 0, temperatureUnitShown: null, distantDetail: null }
}

function drawnBoundsOfTheLid(model: CarriedModel): THREE.Box3 {
  model.root.updateMatrixWorld(true)
  const bounds = new THREE.Box3()
  for (const mesh of model.lid === null ? [] : drawnMeshesUnder(model.lid, model)) bounds.expandByObject(mesh, true)
  return bounds
}

function drawnPointsOf(model: CarriedModel): THREE.Vector3[] {
  model.root.updateMatrixWorld(true)
  return drawnMeshesUnder(model.root, model).flatMap((mesh) => {
    const positions = mesh.geometry.getAttribute('position')
    return Array.from({ length: positions.count }, (_, index) => new THREE.Vector3().fromBufferAttribute(positions, index).applyMatrix4(mesh.matrixWorld))
  })
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

function drawnMouthRadiusOf(model: CarriedModel): number {
  model.root.updateMatrixWorld(true)
  const walls = drawnMeshesUnder(model.root, model).filter((mesh) => !isPartOf(mesh, model.lid))
  const top = walls.reduce((bounds, mesh) => bounds.expandByObject(mesh, true), new THREE.Box3()).max.y
  const radiiAlongEachDirection = Array.from({ length: mouthProbeDirections }, (_, index) => {
    const angle = (2 * Math.PI * index) / mouthProbeDirections
    let radius = 0
    while (aStreamFallsIntoTheMouthAt({ x: (radius + mouthProbeStepMetres) * Math.cos(angle), z: (radius + mouthProbeStepMetres) * Math.sin(angle) }, walls, top)) radius += mouthProbeStepMetres
    return radius
  })
  return Math.min(...radiiAlongEachDirection)
}

function aStreamFallsIntoTheMouthAt(point: { readonly x: number; readonly z: number }, walls: readonly THREE.Mesh[], top: number): boolean {
  const [firstHit] = new THREE.Raycaster(new THREE.Vector3(point.x, top + 1, point.z), new THREE.Vector3(0, -1, 0)).intersectObjects([...walls], false)
  return firstHit !== undefined && firstHit.point.y < top - streamFallsIntoTheMouthBelowTheTopMetres
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
