import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { GlowStandIns } from '../../../Apps/Game/Room/Views/RoomGlow.ts'

const strengthOfTheHeatersNixieTubes = 0.125
const strengthOfAnUnmarkedMesh = 0

test('glowStandIn_ofAMaterialSharedByAMarkedAndAnUnmarkedMesh_isOneForEachMesh', () => {
  const standIns = new GlowStandIns()
  const sharedMaterial = new THREE.MeshStandardMaterial()
  const standInOfTheMarkedMesh = standIns.standInFor(sharedMaterial, strengthOfTheHeatersNixieTubes)

  const standInOfTheUnmarkedMesh = standIns.standInFor(sharedMaterial, strengthOfAnUnmarkedMesh)

  assert.notEqual(standInOfTheUnmarkedMesh, standInOfTheMarkedMesh)
})

test('glowStandIn_ofTheSameMaterialAndStrengthInTheNextFrame_isTheSameOne', () => {
  const standIns = new GlowStandIns()
  const material = new THREE.MeshStandardMaterial()
  const standInOfTheFirstFrame = standIns.standInFor(material, strengthOfTheHeatersNixieTubes)

  const standInOfTheNextFrame = standIns.standInFor(material, strengthOfTheHeatersNixieTubes)

  assert.equal(standInOfTheNextFrame, standInOfTheFirstFrame)
})
