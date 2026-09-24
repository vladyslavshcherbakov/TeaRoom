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
  return geometry
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
