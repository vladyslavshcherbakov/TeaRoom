import * as THREE from 'three'

const bowlWallProfilePoints = 32
export const bowlInsideProfile = new THREE.SplineCurve([
  new THREE.Vector2(0, 0.009),
  new THREE.Vector2(0.03, 0.0085),
  new THREE.Vector2(0.045, 0.0095),
  new THREE.Vector2(0.06, 0.017),
  new THREE.Vector2(0.072, 0.034),
  new THREE.Vector2(0.08, 0.062),
]).getPoints(bowlWallProfilePoints)
export const bowlOutsideWall = new THREE.SplineCurve([
  new THREE.Vector2(0.048, 0.003),
  new THREE.Vector2(0.054, 0.0055),
  new THREE.Vector2(0.066, 0.014),
  new THREE.Vector2(0.078, 0.036),
  new THREE.Vector2(0.083, 0.062),
]).getPoints(bowlWallProfilePoints)
export const bowlUndersideAndFoot = [
  new THREE.Vector2(0, 0.004),
  new THREE.Vector2(0.039, 0.003),
  new THREE.Vector2(0.04, 0),
  new THREE.Vector2(0.047, 0),
]
export const bowlRimTop = new THREE.Vector2(0.0815, 0.0635)
export const bowlProfile = [...bowlUndersideAndFoot, ...bowlOutsideWall, bowlRimTop, ...[...bowlInsideProfile].reverse()]
