import type * as THREE from 'three'
import type { SurfaceMaterials } from '../RoomMaterials.ts'
import type { LampDisplay } from '../LampDisplay.ts'
import type { GaugeStrip } from './GaugeStrip.ts'

export type ItemParts = {
  readonly meshes: THREE.Object3D[]
  readonly lid: THREE.Object3D | null
  readonly spoutTip: THREE.Vector3
  readonly rimHeight: number
  readonly liquidLevel: LiquidLevel | null
  readonly liquidVolumeAt: LiquidVolumeAt | null
  readonly pointsDownTheSide: readonly PointDownTheSide[] | null
  readonly heldInViewLook: HeldInViewLook | null
  readonly glowingShell: GlowingShell | null
  readonly gaugeWater: GaugeStrip | null
  readonly kettleWater: THREE.Mesh | null
  readonly liquidTint: THREE.Color | null
  readonly charTo: CharTo | null
  readonly thermometer: LampDisplay | null
  readonly levelsOfDetail: readonly LevelOfDetail[]
}

export type LevelOfDetail = {
  readonly mesh: THREE.Mesh
  readonly near: THREE.BufferGeometry
  readonly far: THREE.BufferGeometry | null
}

export type PointDownTheSide = { readonly distance: number; readonly height: number }

export type LiquidLevel = (fillShare: number) => { readonly heightMetres: number; readonly radiusMetres: number }

export type CharTo = (charring: number) => void

export type LiquidVolumeAt = (surfaceHeightMetres: number) => THREE.BufferGeometry

export type GlowingShell = {
  readonly metal: THREE.MeshStandardMaterial
  readonly coolColour: THREE.Color
  readonly coolMetalness: number
  readonly hotColour: THREE.Color
  readonly dullHeatGlow: THREE.Color
  readonly brightHeatGlow: THREE.Color
}

export type HeldInViewLook = {
  readonly mesh: THREE.Mesh
  readonly inRoom: THREE.Material
  readonly heldInView: THREE.Material
}

export type CarriedModelMaterials = {
  readonly room: SurfaceMaterials
  readonly cloth: THREE.Material
}

export const overflowOverTheLipMetres = 0.003
export const liquidBelowTheRimMetres = 0.006
