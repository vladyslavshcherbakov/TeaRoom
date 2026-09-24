import * as THREE from 'three'
import type { RoomMaterials } from '../RoomMaterials.ts'

type BottomHeight = (distanceFromTheCentre: number) => number

type BodyFrame = {
  readonly centre: THREE.Vector2
  readonly forward: THREE.Vector2
  readonly side: THREE.Vector2
  readonly halfWidth: number
  readonly height: number
}

type RedPatch = {
  readonly alongTheBody: number
  readonly acrossTheBack: number
  readonly lengthShare: number
  readonly widthShare: number
}

const lengthMetres = 0.05
const headAheadOfTheCentreMetres = 0.006
const widestHalfWidthMetres = 0.0095
const heightShareOfTheWidth = 0.55
const headRoundness = 0.55
const tailWidthShare = 0.14
const swimBendMetres = 0.0035
const liftAboveTheBottomMetres = 0.0006
const bellyFlatness = 0.12
const segmentsAlongTheBody = 72
const segmentsAroundTheBody = 36
const scaleRows = 46
const scaleColumns = 10
const scaleShading = 0.07
const skinColour = new THREE.Color('#f7f2ea')
const bellyColour = new THREE.Color('#e9e4dc')
const redColour = new THREE.Color('#d2361a')
const redPatches: readonly RedPatch[] = [
  { alongTheBody: 0.9, acrossTheBack: 0, lengthShare: 0.08, widthShare: 0.5 },
  { alongTheBody: 0.62, acrossTheBack: 0.25, lengthShare: 0.13, widthShare: 0.75 },
  { alongTheBody: 0.36, acrossTheBack: -0.2, lengthShare: 0.11, widthShare: 0.7 },
  { alongTheBody: 0.16, acrossTheBack: 0.1, lengthShare: 0.06, widthShare: 0.6 },
]
const eyeAlongTheBody = 0.9
const eyeShareOfTheHalfWidth = 0.55
const eyeRadiusMetres = 0.0006
const finLiftMetres = 0.0009

export function newKoiCarp(materials: RoomMaterials, bottomHeightAt: BottomHeight): THREE.Group {
  const carp = new THREE.Group()
  const body = new THREE.Mesh(bodyGeometry(bottomHeightAt), materials.materialFor('koiSkin'))
  const fins = [
    tailFin(bottomHeightAt),
    sideFin(bottomHeightAt, 0.72, 1, 1),
    sideFin(bottomHeightAt, 0.72, -1, 1),
    sideFin(bottomHeightAt, 0.42, 1, 0.6),
    sideFin(bottomHeightAt, 0.42, -1, 0.6),
  ].map((geometry) => new THREE.Mesh(geometry, materials.materialFor('koiFin')))
  const eyes = ([1, -1] as const).map((side) => eye(bottomHeightAt, side, materials))
  carp.add(body, ...fins, ...eyes)
  carp.traverse((part) => (part.castShadow = false))
  return carp
}

function bodyGeometry(bottomHeightAt: BottomHeight): THREE.BufferGeometry {
  const positions: number[] = []
  const colours: number[] = []
  const indices: number[] = []
  for (let row = 0; row <= segmentsAlongTheBody; row += 1) {
    const along = row / segmentsAlongTheBody
    const frame = bodyFrameAt(along)
    for (let column = 0; column <= segmentsAroundTheBody; column += 1) {
      const around = (column / segmentsAroundTheBody) * Math.PI * 2
      const isTheBack = Math.sin(around) >= 0
      const across = Math.cos(around)
      const rise = Math.sin(around) * frame.height * (isTheBack ? 1 : bellyFlatness)
      const point = frame.centre.clone().addScaledVector(frame.side, across * frame.halfWidth)
      positions.push(point.x, bottomHeightAt(point.length()) + liftAboveTheBottomMetres + frame.height * bellyFlatness + rise, point.y)
      const colour = skinColourAt(along, across, isTheBack)
      colours.push(colour.r, colour.g, colour.b)
    }
  }
  const rowLength = segmentsAroundTheBody + 1
  for (let row = 0; row < segmentsAlongTheBody; row += 1) {
    for (let column = 0; column < segmentsAroundTheBody; column += 1) {
      const here = row * rowLength + column
      const ahead = here + rowLength
      indices.push(here, ahead, here + 1, here + 1, ahead, ahead + 1)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function bodyFrameAt(along: number): BodyFrame {
  const centre = centrelineAt(along)
  const forward = centrelineAt(Math.min(1, along + 0.01)).sub(centrelineAt(Math.max(0, along - 0.01))).normalize()
  const side = new THREE.Vector2(-forward.y, forward.x)
  const fullness = Math.pow(Math.sin(Math.PI * Math.pow(Math.min(along, 0.999), 0.72)), headRoundness)
  const halfWidth = widestHalfWidthMetres * Math.max(fullness, tailWidthShare * Math.pow(1 - along, 3))
  return { centre, forward, side, halfWidth, height: halfWidth * heightShareOfTheWidth }
}

function centrelineAt(along: number): THREE.Vector2 {
  const x = (along - 0.5) * lengthMetres + headAheadOfTheCentreMetres
  const bend = swimBendMetres * Math.sin(Math.PI * 1.6 * along + 0.4) * (0.35 + 0.65 * (1 - along))
  return new THREE.Vector2(x, bend)
}

function skinColourAt(along: number, across: number, isTheBack: boolean): THREE.Color {
  if (!isTheBack) return bellyColour.clone()
  const redness = Math.min(1, redPatches.reduce((sum, patch) => sum + patchStrength(patch, along, across), 0))
  const colour = skinColour.clone().lerp(redColour, smoothStep(0.35, 0.6, redness))
  const scale = Math.abs(Math.sin(along * scaleRows * Math.PI) * Math.sin(across * scaleColumns * Math.PI))
  return colour.multiplyScalar(1 - scaleShading * scale)
}

function patchStrength(patch: RedPatch, along: number, across: number): number {
  const alongDistance = (along - patch.alongTheBody) / patch.lengthShare
  const acrossDistance = (across - patch.acrossTheBack) / patch.widthShare
  return Math.exp(-(alongDistance * alongDistance + acrossDistance * acrossDistance))
}

function smoothStep(from: number, to: number, value: number): number {
  const share = Math.min(1, Math.max(0, (value - from) / (to - from)))
  return share * share * (3 - 2 * share)
}

function tailFin(bottomHeightAt: BottomHeight): THREE.BufferGeometry {
  const outline = new THREE.Shape()
  outline.moveTo(0, 0.0012)
  outline.bezierCurveTo(0.004, 0.003, 0.009, 0.009, 0.014, 0.0105)
  outline.bezierCurveTo(0.0125, 0.006, 0.0105, 0.002, 0.0085, 0)
  outline.bezierCurveTo(0.0105, -0.002, 0.0125, -0.006, 0.014, -0.0105)
  outline.bezierCurveTo(0.009, -0.009, 0.004, -0.003, 0, -0.0012)
  outline.closePath()
  const tail = bodyFrameAt(0)
  return finLaidOnTheBottom(outline, tail.centre, tail.forward.clone().negate(), tail.side, bottomHeightAt)
}

function sideFin(bottomHeightAt: BottomHeight, along: number, side: 1 | -1, size: number): THREE.BufferGeometry {
  const outline = new THREE.Shape()
  outline.moveTo(0, 0)
  outline.bezierCurveTo(0.003 * size, 0.001 * size, 0.008 * size, -0.002 * size, 0.009 * size, -0.006 * size)
  outline.bezierCurveTo(0.0085 * size, -0.009 * size, 0.005 * size, -0.011 * size, 0.003 * size, -0.01 * size)
  outline.bezierCurveTo(0.002 * size, -0.006 * size, 0.001 * size, -0.003 * size, 0, -0.002 * size)
  outline.closePath()
  const frame = bodyFrameAt(along)
  const outward = frame.side.clone().multiplyScalar(side)
  const root = frame.centre.clone().addScaledVector(outward, frame.halfWidth * 0.8)
  return finLaidOnTheBottom(outline, root, outward, frame.forward, bottomHeightAt)
}

function finLaidOnTheBottom(outline: THREE.Shape, root: THREE.Vector2, outward: THREE.Vector2, across: THREE.Vector2, bottomHeightAt: BottomHeight): THREE.BufferGeometry {
  const geometry = new THREE.ShapeGeometry(outline, 24)
  const position = geometry.getAttribute('position')
  for (let index = 0; index < position.count; index += 1) {
    const point = root.clone().addScaledVector(outward, position.getX(index)).addScaledVector(across, position.getY(index))
    position.setXYZ(index, point.x, bottomHeightAt(point.length()) + finLiftMetres, point.y)
  }
  geometry.computeVertexNormals()
  return geometry
}

function eye(bottomHeightAt: BottomHeight, side: 1 | -1, materials: RoomMaterials): THREE.Mesh {
  const frame = bodyFrameAt(eyeAlongTheBody)
  const place = frame.centre.clone().addScaledVector(frame.side, side * frame.halfWidth * eyeShareOfTheHalfWidth)
  const eye = new THREE.Mesh(new THREE.SphereGeometry(eyeRadiusMetres, 12, 8), materials.materialFor('koiEye'))
  eye.position.set(place.x, bottomHeightAt(place.length()) + liftAboveTheBottomMetres + frame.height * (1 + bellyFlatness) * 0.8, place.y)
  return eye
}
