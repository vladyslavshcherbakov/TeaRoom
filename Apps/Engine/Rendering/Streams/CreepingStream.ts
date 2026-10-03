import * as THREE from 'three'

export type CreepingSource = {
  readonly path: THREE.TubeGeometry
  readonly position: THREE.Vector3
  readonly quaternion: THREE.Quaternion
}

const creepMetresPerSecond = 0.12
const indicesPerSideOfASegment = 6

export class CreepingStream {
  private startedAtSeconds: number | null = null
  private pathLengthMetres = 0
  readonly mesh: THREE.Mesh

  constructor(material: THREE.Material) {
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), material)
    this.mesh.visible = false
  }

  get creepSeconds(): number {
    return this.startedAtSeconds === null ? 0 : this.pathLengthMetres / creepMetresPerSecond
  }

  show(source: CreepingSource | null, timeSeconds: number): void {
    if (source === null) {
      this.startedAtSeconds = null
      this.mesh.visible = false
      return
    }
    this.startedAtSeconds ??= timeSeconds
    this.pathLengthMetres = source.path.parameters.path.getLength()
    const { tubularSegments, radialSegments } = source.path.parameters
    const crept = creepMetresPerSecond * (timeSeconds - this.startedAtSeconds)
    const segmentsReached = Math.min(tubularSegments, Math.ceil((crept / this.pathLengthMetres) * tubularSegments))
    source.path.setDrawRange(0, segmentsReached * radialSegments * indicesPerSideOfASegment)
    this.mesh.geometry = source.path
    this.mesh.position.copy(source.position)
    this.mesh.quaternion.copy(source.quaternion)
    this.mesh.visible = segmentsReached > 0
  }
}
