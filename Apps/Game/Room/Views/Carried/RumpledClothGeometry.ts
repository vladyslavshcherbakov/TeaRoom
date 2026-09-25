import * as THREE from 'three'

export const clothLengthMetres = 0.28
const clothWidthMetres = 0.2

const segmentsAlong = 42
const segmentsAcross = 30
const lowestAboveTheSurfaceMetres = 0.001
const restingHeightMetres = 0.004
const edgeDroopMetres = 0.003
const edgeDroopReachMetres = 0.025
const foldHeightMetres = 0.011
const foldHalfWidthMetres = 0.018
const foldSlope = 0.35
const foldOffsetMetres = 0.03
const rippleHeightMetres = 0.0025
const creaseHeightMetres = 0.0012
const edgeWanderMetres = 0.004
const charSpreadsFromTheMiddleShare = 0.75
const charEdgeRaggedness = 0.25
const charFrontSoftness = 0.12
const charThresholdAttribute = 'charThreshold'

export function rumpledClothGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(clothLengthMetres, clothWidthMetres, segmentsAlong, segmentsAcross)
  geometry.rotateX(-Math.PI / 2)
  const position = geometry.getAttribute('position')
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const z = position.getZ(index)
    position.setXYZ(index, x + edgeWanderAt(z, x, clothLengthMetres / 2), heightAt(x, z), z + edgeWanderAt(x, z, clothWidthMetres / 2))
  }
  geometry.computeVertexNormals()
  geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(position.count * 3).fill(1), 3))
  geometry.setAttribute(charThresholdAttribute, new THREE.BufferAttribute(charThresholdsOf(position), 1))
  return geometry
}

export function charTheCloth(geometry: THREE.BufferGeometry, charring: number, charredColour: THREE.Color): void {
  const thresholds = geometry.getAttribute(charThresholdAttribute)
  const colours = geometry.getAttribute('color')
  if (thresholds === undefined || colours === undefined) return
  for (let index = 0; index < thresholds.count; index += 1) {
    const burnt = THREE.MathUtils.clamp((charring * (1 + charFrontSoftness) - thresholds.getX(index)) / charFrontSoftness, 0, 1)
    colours.setXYZ(index, 1 + (charredColour.r - 1) * burnt, 1 + (charredColour.g - 1) * burnt, 1 + (charredColour.b - 1) * burnt)
  }
  colours.needsUpdate = true
}

function charThresholdsOf(position: THREE.BufferAttribute | THREE.InterleavedBufferAttribute): Float32Array {
  const thresholds = new Float32Array(position.count)
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const z = position.getZ(index)
    const distanceFromTheMiddle = Math.hypot(x / (clothLengthMetres / 2), z / (clothWidthMetres / 2)) / Math.SQRT2
    const ragged = 0.5 + 0.5 * Math.sin(x * 97 + z * 61) * Math.sin(x * 41 - z * 83)
    thresholds[index] = distanceFromTheMiddle * charSpreadsFromTheMiddleShare + ragged * charEdgeRaggedness
  }
  return thresholds
}

function heightAt(x: number, z: number): number {
  const lifted = restingHeightMetres + foldAt(x, z) + ripplesAt(x, z) - droopAt(x, z)
  return Math.max(lowestAboveTheSurfaceMetres, lifted)
}

function foldAt(x: number, z: number): number {
  const distanceToTheFold = (x - foldOffsetMetres - foldSlope * z) / Math.hypot(1, foldSlope)
  return foldHeightMetres * Math.exp(-((distanceToTheFold / foldHalfWidthMetres) ** 2))
}

function ripplesAt(x: number, z: number): number {
  const ripple = Math.sin(x * 31 + z * 9) * Math.cos(z * 23 - x * 6)
  const crease = Math.sin(x * 83 - z * 57 + 1.3)
  return rippleHeightMetres * ripple + creaseHeightMetres * crease
}

function droopAt(x: number, z: number): number {
  const distanceToTheEdge = Math.min(clothLengthMetres / 2 - Math.abs(x), clothWidthMetres / 2 - Math.abs(z))
  const nearness = Math.max(0, 1 - distanceToTheEdge / edgeDroopReachMetres)
  return edgeDroopMetres * nearness * nearness
}

function edgeWanderAt(along: number, across: number, halfSize: number): number {
  const edgeShare = Math.abs(across) / halfSize
  return edgeWanderMetres * edgeShare * edgeShare * Math.sin(along * 47 + across * 13)
}
