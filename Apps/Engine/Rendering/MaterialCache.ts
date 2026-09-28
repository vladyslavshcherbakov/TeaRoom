import type * as THREE from 'three'

export class MaterialCache<Key, SomeMaterial extends THREE.Material> {
  private readonly materialByKey = new Map<Key, SomeMaterial>()
  private readonly make: (key: Key) => SomeMaterial

  constructor(make: (key: Key) => SomeMaterial) {
    this.make = make
  }

  sharedMaterialFor(key: Key): SomeMaterial {
    const existing = this.materialByKey.get(key)
    if (existing !== undefined) return existing
    const material = this.make(key)
    this.materialByKey.set(key, material)
    return material
  }
}
