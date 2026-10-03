import * as THREE from 'three'
import { pointAwayFromTheWall, turnFacingTheRoom, type RoomLayout, type SpotOnAWall } from '../Layout/RoomLayout.ts'
import { guideBookModel } from './GuideBookModel.ts'
import type { SurfaceMaterials } from './RoomMaterials.ts'
import type { TapTargetTag } from '../Input/TapTarget.ts'
import { SettingsGear } from './SettingsGear.ts'

type Tagger = (object: THREE.Object3D, tag: TapTargetTag) => void

const medalRadiusMetres = 0.13
const medalThicknessMetres = 0.025
const medalRibbonWidthMetres = 0.09
const medalRibbonLengthMetres = 0.3
const medalRibbonTiltRadians = 0.35
const gearAwayFromTheWallMetres = 0.006

export class WallThings {
  private readonly materials: SurfaceMaterials
  readonly medal: THREE.Group
  readonly settingsGear: SettingsGear
  readonly guideBook: THREE.Group

  constructor(materials: SurfaceMaterials, layout: Pick<RoomLayout, 'medal' | 'settingsGear' | 'guideBook'>, tag: Tagger) {
    this.materials = materials
    this.medal = this.medalOn(layout.medal)
    tag(this.medal, { kind: 'medal' })
    this.settingsGear = new SettingsGear(materials)
    placeOnTheWall(this.settingsGear.root, layout.settingsGear, gearAwayFromTheWallMetres)
    tag(this.settingsGear.root, { kind: 'settingsGear' })
    this.guideBook = guideBookModel(materials)
    placeOnTheWall(this.guideBook, layout.guideBook, 0)
    tag(this.guideBook, { kind: 'guideBook' })
  }

  get roots(): readonly THREE.Object3D[] {
    return [this.medal, this.settingsGear.root, this.guideBook]
  }

  private medalOn(spot: SpotOnAWall): THREE.Group {
    const medal = new THREE.Group()
    for (const side of [-1, 1]) {
      const ribbon = new THREE.Mesh(new THREE.BoxGeometry(medalRibbonWidthMetres, medalRibbonLengthMetres, 0.004), this.materials.materialFor('medalRibbon'))
      ribbon.position.set(side * medalRibbonWidthMetres * 0.45, medalRadiusMetres + medalRibbonLengthMetres * 0.42, 0.004)
      ribbon.rotation.z = side * medalRibbonTiltRadians
      ribbon.receiveShadow = true
      medal.add(ribbon)
    }
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(medalRadiusMetres, medalRadiusMetres, medalThicknessMetres, 32), this.materials.materialFor('gildedRim'))
    disc.rotation.x = Math.PI / 2
    disc.position.z = medalThicknessMetres / 2 + 0.008
    disc.castShadow = true
    medal.add(disc)
    placeOnTheWall(medal, spot, 0)
    medal.visible = false
    return medal
  }
}

function placeOnTheWall(object: THREE.Object3D, spot: SpotOnAWall, intoTheRoom: number): void {
  const { x, y, z } = pointAwayFromTheWall(spot, intoTheRoom)
  object.position.set(x, y, z)
  object.rotation.y = turnFacingTheRoom(spot.wall)
}
