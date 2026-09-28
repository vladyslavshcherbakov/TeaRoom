import * as THREE from 'three'

export type LayerRole = 'takesTaps' | 'decoration'

export type PassRules = { readonly touchAreasTakeTaps: boolean }

type PassLayers = Readonly<Record<LayerRole, number>>

const touchAreasLayer = 31

export class Layers<Pass extends string> {
  private readonly layersByPass: Readonly<Record<Pass, PassLayers>>
  private readonly rulesByPass: Readonly<Record<Pass, PassRules>>
  private readonly touchAreaMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })

  constructor(rulesByPass: Readonly<Record<Pass, PassRules>>) {
    this.rulesByPass = rulesByPass
    const passes = Object.keys(rulesByPass) as Pass[]
    this.layersByPass = Object.fromEntries(passes.map((pass, index) => [pass, { takesTaps: index * 2, decoration: index * 2 + 1 }])) as Record<Pass, PassLayers>
  }

  touchAreaOf(geometry: THREE.BufferGeometry): THREE.Mesh {
    const area = new THREE.Mesh(geometry, this.touchAreaMaterial)
    area.layers.set(touchAreasLayer)
    area.castShadow = false
    return area
  }

  isATouchArea(part: THREE.Object3D): boolean {
    return part instanceof THREE.Mesh && part.material === this.touchAreaMaterial
  }

  putOnLayer(root: THREE.Object3D, pass: Pass, role: LayerRole = 'takesTaps'): void {
    root.traverse((part) => {
      if (!this.isATouchArea(part)) return part.layers.set(this.layersByPass[pass][role])
      if (role === 'decoration' || !this.rulesByPass[pass].touchAreasTakeTaps) return part.layers.disableAll()
      part.layers.set(touchAreasLayer)
    })
  }

  showThePassTo(viewer: THREE.Object3D, pass: Pass): void {
    viewer.layers.set(this.layersByPass[pass].takesTaps)
    viewer.layers.enable(this.layersByPass[pass].decoration)
  }

  showEveryPassTo(viewer: THREE.Object3D): void {
    viewer.layers.enableAll()
  }

  letTapsReach(raycaster: THREE.Raycaster): void {
    raycaster.layers.disableAll()
    for (const layers of Object.values<PassLayers>(this.layersByPass)) raycaster.layers.enable(layers.takesTaps)
    raycaster.layers.enable(touchAreasLayer)
  }

  lookOnlyAtWhatTakesTapsIn(raycaster: THREE.Raycaster, pass: Pass): void {
    raycaster.layers.set(this.layersByPass[pass].takesTaps)
  }
}
