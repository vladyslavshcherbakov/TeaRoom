import type { GlassThatClears } from '../../../../Engine/Rendering/Looks.ts'
import type * as THREE from 'three'
import type { AppLog } from '../../../../Engine/AppLog.ts'
import type { SurfaceMaterials } from '../RoomMaterials.ts'
import type { ClothView, VesselView } from '../../../Presentation/WorldViewState.ts'
import type { ClothPattern } from '../../RoomArrangement.ts'
import type { TemperatureUnit } from '../../../../Engine/Temperatures.ts'
import type { Wave } from './Wave.ts'
import type { VesselProfile } from './VesselProfile.ts'
import type { LevelOfDetail } from '../../../../Engine/Rendering/LevelsOfDetail.ts'

export type ItemParts = {
  readonly meshes: THREE.Object3D[]
  readonly lid: THREE.Object3D | null
  readonly heightMetres: number
  readonly vessel: VesselParts | null
  readonly displays: readonly Display[]
  readonly lookByWhereItIsDrawn: LookByWhereItIsDrawn | null
  readonly glassThatClears: GlassThatClears | null
  readonly charTo: CharTo | null
  readonly levelsOfDetail: readonly LevelOfDetail[]
}

export type VesselParts = {
  readonly profile: VesselProfile
  readonly spoutTip: THREE.Vector3
  readonly liquid: LiquidParts | null
}

export type LiquidParts = {
  readonly tint: THREE.Color | null
  readonly volumeAt: LiquidVolumeAt | null
}

export type CharTo = (charredShare: number) => void

export type LiquidVolumeAt = (surfaceHeightMetres: number) => THREE.BufferGeometry

export type Display = (shown: ShownOnTheItem) => void

export type ShownOnTheItem = {
  readonly vessel: VesselView | undefined
  readonly cloth: ClothView | undefined
  readonly wave: Wave
  readonly temperatureUnit: TemperatureUnit | null
}

export type LookByWhereItIsDrawn = {
  readonly mesh: THREE.Mesh
  readonly inRoom: THREE.Material
  readonly heldInView: THREE.Material
}

export type ItemSetUp = {
  readonly room: SurfaceMaterials
  readonly clothPatternOf: (clothId: string) => ClothPattern
  readonly bowlIdWithTheToadUnderneath: string
  readonly log: AppLog
}
