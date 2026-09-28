import type * as THREE from 'three'

export function markAsGlowing(glowing: THREE.Object3D | THREE.Material, strength = 1): void {
  glowing.userData = { ...glowing.userData, glowStrength: strength }
}

export function glowStrengthOf(glowing: THREE.Object3D | THREE.Material): number {
  const strength: unknown = glowing.userData['glowStrength']
  return typeof strength === 'number' ? strength : 0
}
