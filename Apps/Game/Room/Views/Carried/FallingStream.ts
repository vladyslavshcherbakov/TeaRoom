import * as THREE from 'three'

export type StreamSource = {
  readonly top: THREE.Vector3
  readonly bottomY: number
}

type Flow = {
  readonly top: THREE.Vector3
  readonly bottomY: number
  readonly startedAtSeconds: number
  readonly stoppedAtSeconds: number | null
}

const fallAccelerationMetresPerSecondSquared = 3

export class FallingStream {
  private flow: Flow | null = null
  readonly mesh: THREE.Mesh

  constructor(radiusMetres: number, material: THREE.Material) {
    this.mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusMetres, radiusMetres, 1, 6), material)
    this.mesh.visible = false
  }

  show(source: StreamSource | null, timeSeconds: number): void {
    this.flow = flowAfter(this.flow, source, timeSeconds)
    const flow = this.flow
    if (flow === null) {
      this.mesh.visible = false
      return
    }
    const headY = Math.max(flow.bottomY, flow.top.y - fallenMetres(timeSeconds - flow.startedAtSeconds))
    const tailY = flow.stoppedAtSeconds === null ? flow.top.y : flow.top.y - fallenMetres(timeSeconds - flow.stoppedAtSeconds)
    if (tailY <= headY) {
      this.mesh.visible = false
      if (flow.stoppedAtSeconds !== null) this.flow = null
      return
    }
    this.mesh.visible = true
    this.mesh.position.set(flow.top.x, (headY + tailY) / 2, flow.top.z)
    this.mesh.scale.set(1, tailY - headY, 1)
  }
}

function flowAfter(flow: Flow | null, source: StreamSource | null, timeSeconds: number): Flow | null {
  if (source === null) return flow === null || flow.stoppedAtSeconds !== null ? flow : { ...flow, stoppedAtSeconds: timeSeconds }
  const isStartingAgain = flow === null || flow.stoppedAtSeconds !== null
  return { top: source.top.clone(), bottomY: source.bottomY, startedAtSeconds: isStartingAgain ? timeSeconds : flow.startedAtSeconds, stoppedAtSeconds: null }
}

function fallenMetres(seconds: number): number {
  return (fallAccelerationMetresPerSecondSquared * seconds * seconds) / 2
}
