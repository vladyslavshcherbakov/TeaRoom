import * as THREE from 'three'

export type CreepingSource = {
  readonly path: THREE.TubeGeometry
  readonly position: THREE.Vector3
  readonly quaternion: THREE.Quaternion
}

const creepMetresPerSecond = 0.12
const indicesPerSideOfASegment = 6

export class CreepingStream {
  readonly mesh: THREE.Mesh
  private startedAtSeconds: number | null = null

  constructor(material: THREE.Material) {
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), material)
    this.mesh.visible = false
  }

  show(source: CreepingSource | null, timeSeconds: number): void {
    if (source === null) {
      this.startedAtSeconds = null
      this.mesh.visible = false
      return
    }
    this.startedAtSeconds ??= timeSeconds
    const { tubularSegments, radialSegments } = source.path.parameters
    const crept = creepMetresPerSecond * (timeSeconds - this.startedAtSeconds)
    const segmentsReached = Math.min(tubularSegments, Math.ceil((crept / source.path.parameters.path.getLength()) * tubularSegments))
    source.path.setDrawRange(0, segmentsReached * radialSegments * indicesPerSideOfASegment)
    this.mesh.geometry = source.path
    this.mesh.position.copy(source.position)
    this.mesh.quaternion.copy(source.quaternion)
    this.mesh.visible = segmentsReached > 0
  }
}
