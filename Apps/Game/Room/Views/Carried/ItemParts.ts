import type * as THREE from 'three'
import type { RoomMaterials } from '../RoomMaterials.ts'
import type { GaugeStrip } from './GaugeStrip.ts'

export type ItemParts = {
  readonly meshes: THREE.Object3D[]
  readonly lid: THREE.Object3D | null
  readonly spoutTip: THREE.Vector3
  readonly rimHeight: number
  readonly liquidLevel: LiquidLevel | null
  readonly heldInViewLook?: HeldInViewLook
  readonly glowingShell?: GlowingShell | undefined
  readonly isSeeThrough?: boolean
  readonly pointsDownTheSide?: readonly PointDownTheSide[]
  readonly gaugeWater?: GaugeStrip
  readonly kettleWater?: THREE.Mesh
}

export type PointDownTheSide = { readonly distance: number; readonly height: number }

export type LiquidLevel = (fillShare: number) => { readonly heightMetres: number; readonly radiusMetres: number }

export type GlowingShell = {
  readonly metal: THREE.MeshStandardMaterial
  readonly coolColour: THREE.Color
  readonly coolMetalness: number
}

export type HeldInViewLook = {
  readonly mesh: THREE.Mesh
  readonly inRoom: THREE.Material
  readonly heldInView: THREE.Material
}

export type CarriedModelMaterials = {
  readonly room: RoomMaterials
  readonly claySeenFromInside: THREE.Material
  readonly touchPad: THREE.Material
  readonly cloth: THREE.Material
}

export const overflowOverTheLipMetres = 0.003
export const liquidBelowTheRimMetres = 0.006
