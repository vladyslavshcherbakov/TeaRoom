import * as THREE from 'three'
import type { ScreenPoint } from '../../../Engine/ScreenPoint.ts'
import type { TapTarget, TapTargetTag } from '../TapTarget.ts'
import { isReachedThroughItsAreaOnTheScreen, tapTargetAmong, type AreaSetAside, type TapReach } from '../TapTargetAmong.ts'
import { fingertipAround, isInTheTouchAreaOf, middleOf, smallestTouchAreaPixels, touchablesReachedAt, type ScreenBox, type TouchableOnScreen } from '../../../Engine/TouchAreasOnScreen.ts'
import { roomLayers } from './RoomLayers.ts'
import { hitsSeenBy as hitsOfTheRaySeenBy, isDrawnWithin, isShown, isUnderAnyOf, pointerAt, screenBoxOf, tagOf, type ScreenRectangle } from '../../../Engine/Rendering/Picking.ts'

export type TappablePass = {
  readonly camera: THREE.PerspectiveCamera
  readonly tappable: readonly THREE.Object3D[]
  readonly areasOnTheScreen: readonly THREE.Object3D[]
  readonly isDrawnOverTheScene: boolean
}

type TouchablesUnderTheFinger = {
  readonly reached: readonly TouchableOnScreen<TapTarget>[]
  readonly setAside: readonly AreaSetAside[]
}

type PointTouchedInTheRoom = {
  readonly distance: number
}

type TargetParts = {
  readonly target: TapTarget
  readonly meshes: THREE.Mesh[]
  readonly roots: Set<THREE.Object3D>
}

const smallestUpwardNormalOfASurface = 0.7
const metresAlwaysReachedPastWhatTheFingerTouched = 0.05
const pointsTriedAlongEachSideOfABox = 9
const raycaster = raycasterSeeingEveryTappableLayer()

export function tapTargetUnderTheFinger(finger: ScreenPoint, screen: ScreenRectangle, passesDrawnLastFirst: readonly TappablePass[], doesATapReachPastTheHands: (target: TapTarget) => boolean): TapReach {
  const pointer = pointerAt(finger, screen)
  const hitsOfEachPass = passesDrawnLastFirst.map((pass) => ({ pass, hits: hitsSeenBy(pass.camera, pointer, pass.tappable) }))
  const firstPassHit = hitsOfEachPass.find(({ hits }) => hits.length > 0)
  const nearestHit = firstPassHit?.hits[0]
  const touched = nearestHit === undefined ? { kind: 'nothing' as const } : tapTargetOf(nearestHit)
  const pointTouchedInTheRoom = nearestHit === undefined || firstPassHit?.pass.isDrawnOverTheScene !== false ? null : { distance: nearestHit.distance }
  const underTheFingerInEachPass = passesDrawnLastFirst.map((pass) => touchablesUnderTheFinger(finger, pass, screen, pointTouchedInTheRoom))
  const areasHoldingTheFinger = touchablesReachedAt(finger, underTheFingerInEachPass.flatMap(({ reached }) => reached)).map((touchable) => touchable.target)
  const areasSetAside = underTheFingerInEachPass.flatMap(({ setAside }) => setAside)
  return { target: tapTargetAmong(touched, areasHoldingTheFinger, doesATapReachPastTheHands), touched, areasHoldingTheFinger, areasSetAside }
}

export function touchablesUnderTheFinger(finger: ScreenPoint, pass: TappablePass, screen: ScreenRectangle, pointTouchedInTheRoom: PointTouchedInTheRoom | null): TouchablesUnderTheFinger {
  pass.camera.updateMatrixWorld()
  const cameraPosition = pass.camera.getWorldPosition(new THREE.Vector3())
  const fingertip = fingertipAround(finger)
  const reached: TouchableOnScreen<TapTarget>[] = []
  const setAside: AreaSetAside[] = []
  for (const { target, meshes, roots } of partsOfEachTargetIn(pass)) {
    const box = screenBoxOf(meshes, pass.camera, screen)
    if (box === null || !isInTheTouchAreaOf(finger, box)) continue
    if (!pass.isDrawnOverTheScene && !isDrawnWithin(fingertip, meshes, pass.camera, screen)) {
      setAside.push({ target, reason: 'drawnFartherThanAFingertip' })
      continue
    }
    const nearestDistance = Math.min(...meshes.map((mesh) => new THREE.Box3().setFromObject(mesh).distanceToPoint(cameraPosition)))
    if (!pass.isDrawnOverTheScene && pointTouchedInTheRoom !== null && pointTouchedInTheRoom.distance < nearestDistance - metresAFingertipSpansAt(pointTouchedInTheRoom.distance, pass.camera, screen)) {
      setAside.push({ target, reason: 'behindWhatTheFingerTouched' })
      continue
    }
    reached.push({ target, box, isDrawnOverTheScene: pass.isDrawnOverTheScene, nearestDistance, distanceSeenAtItsMiddle: distanceSeenAt(middleOf(box), screen, pass, roots) })
  }
  return { reached, setAside }
}

export function screenPointThatTapsTheTarget(target: TapTarget, passes: readonly TappablePass[], screen: ScreenRectangle, targetTappedAt: (point: ScreenPoint) => TapTarget): ScreenPoint | null {
  const box = screenBoxOfTheTarget(target, passes, screen)
  if (box === null) return null
  const middle = middleOf(box)
  const pointsNearestTheMiddleFirst = pointsAcross(box, screen).sort((first, second) => screenDistanceSquared(first, middle) - screenDistanceSquared(second, middle))
  const key = JSON.stringify(target)
  return pointsNearestTheMiddleFirst.find((point) => JSON.stringify(tagOfTheTappedTarget(targetTappedAt(point))) === key) ?? null
}

function screenBoxOfTheTarget(target: TapTarget, passes: readonly TappablePass[], screen: ScreenRectangle): ScreenBox | null {
  const key = JSON.stringify(target)
  for (const pass of passes) {
    const meshes: THREE.Mesh[] = []
    for (const root of pass.tappable) root.traverseVisible((part) => {
      if (part instanceof THREE.Mesh && JSON.stringify(tapTargetTagOf(part)) === key) meshes.push(part)
    })
    const box = meshes.length === 0 ? null : screenBoxOf(meshes, pass.camera, screen)
    if (box !== null) return box
  }
  return null
}

function pointsAcross(box: ScreenBox, screen: ScreenRectangle): ScreenPoint[] {
  const left = Math.max(box.left, screen.left)
  const right = Math.min(box.right, screen.left + screen.width)
  const top = Math.max(box.top, screen.top)
  const bottom = Math.min(box.bottom, screen.top + screen.height)
  if (left > right || top > bottom) return []
  const shares = Array.from({ length: pointsTriedAlongEachSideOfABox }, (_, index) => (index + 0.5) / pointsTriedAlongEachSideOfABox)
  return shares.flatMap((acrossShare) => shares.map((downShare) => ({ x: left + (right - left) * acrossShare, y: top + (bottom - top) * downShare })))
}

function screenDistanceSquared(first: ScreenPoint, second: ScreenPoint): number {
  return (first.x - second.x) ** 2 + (first.y - second.y) ** 2
}

function tagOfTheTappedTarget(target: TapTarget): TapTargetTag | null {
  switch (target.kind) {
    case 'floor':
      return { kind: 'floor' }
    case 'surface':
      return { kind: 'furniture', furnitureId: target.furnitureId }
    case 'nothing':
      return null
    case 'furniture':
    case 'item':
    case 'heater':
    case 'heaterSwitch':
    case 'heaterPanel':
    case 'thermostatArrow':
    case 'thermostatButton':
    case 'faucet':
    case 'sink':
    case 'hand':
    case 'inventorySlot':
    case 'lid':
    case 'opening':
    case 'figurine':
    case 'roseBush':
    case 'medal':
    case 'settingsGear':
    case 'guideBook':
      return target
  }
}

function partsOfEachTargetIn(pass: TappablePass): TargetParts[] {
  const partsByTargetKey = new Map<string, TargetParts>()
  const collect = (root: THREE.Object3D, isAnAreaOnTheScreen: boolean): void => {
    root.updateWorldMatrix(true, true)
    root.traverseVisible((part) => {
      if (!(part instanceof THREE.Mesh) || part instanceof THREE.InstancedMesh || !isShown(part)) return
      const isDrawnOrAnAreaOnTheScreen = isAnAreaOnTheScreen || (!roomLayers.isATouchArea(part) && part.layers.test(raycaster.layers))
      if (!isDrawnOrAnAreaOnTheScreen) return
      const tag = tapTargetTagOf(part)
      const target = tag === undefined ? null : tapTargetReachedWithoutAPoint(tag)
      if (target === null || !isReachedThroughItsAreaOnTheScreen(target, pass.isDrawnOverTheScene)) return
      const key = JSON.stringify(target)
      const parts = partsByTargetKey.get(key) ?? { target, meshes: [], roots: new Set() }
      parts.meshes.push(part)
      parts.roots.add(root)
      partsByTargetKey.set(key, parts)
    })
  }
  for (const root of pass.tappable) collect(root, false)
  for (const area of pass.areasOnTheScreen) collect(area, true)
  return [...partsByTargetKey.values()]
}

function distanceSeenAt(point: ScreenPoint, screen: ScreenRectangle, pass: TappablePass, rootsOfTheTarget: ReadonlySet<THREE.Object3D>): number | null {
  const [nearestHit] = hitsSeenBy(pass.camera, pointerAt(point, screen), pass.tappable).filter((hit) => !roomLayers.isATouchArea(hit.object) && !isUnderAnyOf(rootsOfTheTarget, hit.object))
  return nearestHit?.distance ?? null
}

function metresAFingertipSpansAt(distance: number, camera: THREE.PerspectiveCamera, screen: ScreenRectangle): number {
  const metresPerPixel = (2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / screen.height
  return Math.max(metresAlwaysReachedPastWhatTheFingerTouched, metresPerPixel * smallestTouchAreaPixels)
}

function hitsSeenBy(camera: THREE.PerspectiveCamera, pointer: THREE.Vector2, tappable: readonly THREE.Object3D[]): THREE.Intersection[] {
  return hitsOfTheRaySeenBy(raycaster, camera, pointer, tappable)
}

function tapTargetOf(hit: THREE.Intersection): TapTarget {
  const tag = tapTargetTagOf(hit.object)
  if (tag === undefined) return { kind: 'nothing' }
  if (tag.kind === 'floor') return { kind: 'floor', point: { x: hit.point.x, z: hit.point.z } }
  if (tag.kind !== 'furniture') return tag
  const upwardNormal = hit.face?.normal.clone().transformDirection(hit.object.matrixWorld).y ?? 0
  if (upwardNormal < smallestUpwardNormalOfASurface) return tag
  return { kind: 'surface', furnitureId: tag.furnitureId, point: { x: hit.point.x, y: hit.point.y, z: hit.point.z } }
}

function tapTargetReachedWithoutAPoint(tag: TapTargetTag): TapTarget | null {
  return tag.kind === 'floor' || tag.kind === 'furniture' ? null : tag
}

function tapTargetTagOf(object: THREE.Object3D): TapTargetTag | undefined {
  return tagOf<TapTargetTag>(object, 'tapTarget')
}

function raycasterSeeingEveryTappableLayer(): THREE.Raycaster {
  const seeingEveryTappableLayer = new THREE.Raycaster()
  roomLayers.letTapsReach(seeingEveryTappableLayer)
  return seeingEveryTappableLayer
}
