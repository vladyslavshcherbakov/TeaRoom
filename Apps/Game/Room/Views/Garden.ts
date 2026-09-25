import * as THREE from 'three'
import { gardenPlants, roseBushCentreHeightMetres, roseBushRadiusMetres, roseBushSquash, type Plant, type PlantKind } from '../GardenLayout.ts'
import type { RoomMaterials, Surface } from './RoomMaterials.ts'
import type { TapTargetTag } from './RoomModel.ts'

type PlantPart = {
  readonly geometry: THREE.BufferGeometry
  readonly surface: Surface
  readonly offset: THREE.Matrix4
}

const groundSizeMetres = 60
const groundBelowTheFloorMetres = 0.1
const kindsThatOpenTheDebugMenu: ReadonlySet<PlantKind> = new Set(['roseBush', 'rose'])
const roseBushTag: TapTargetTag = { isRoseBush: true }

const partsByKind: Readonly<Record<PlantKind, readonly PlantPart[]>> = {
  grassTuft: [part(new THREE.ConeGeometry(0.035, 0.14, 3, 1, true), 'bloom', 0, 0.07, 0)],
  marigold: [stem(0.22), part(new THREE.OctahedronGeometry(0.07, 0).scale(1, 0.6, 1), 'foliage', 0, 0.05, 0), part(new THREE.IcosahedronGeometry(0.04, 0).scale(1, 0.75, 1), 'bloom', 0, 0.24, 0)],
  daisy: [stem(0.3), part(new THREE.CylinderGeometry(0.045, 0.045, 0.006, 8), 'daisyPetals', 0, 0.3, 0), part(new THREE.IcosahedronGeometry(0.015, 0), 'flowerHeart', 0, 0.305, 0)],
  poppy: [stem(0.42), part(new THREE.CylinderGeometry(0.048, 0.018, 0.045, 7, 1, true), 'bloom', 0, 0.44, 0), part(new THREE.IcosahedronGeometry(0.013, 0), 'poppyHeart', 0, 0.445, 0)],
  tulip: [stem(0.32), part(new THREE.ConeGeometry(0.02, 0.16, 3, 1, true), 'foliage', 0.015, 0.08, 0), part(new THREE.IcosahedronGeometry(0.028, 0).scale(1, 1.5, 1), 'bloom', 0, 0.35, 0)],
  sunflower: [
    part(new THREE.CylinderGeometry(0.014, 0.018, 1.6, 6), 'stem', 0, 0.8, 0),
    part(new THREE.ConeGeometry(0.07, 0.25, 4), 'foliage', 0.06, 0.7, 0),
    part(new THREE.ConeGeometry(0.07, 0.25, 4), 'foliage', -0.06, 1.05, 0),
    tiltedTowardsTheRoom(new THREE.CylinderGeometry(0.2, 0.2, 0.01, 18), 'bloom', 1.65, 0),
    tiltedTowardsTheRoom(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 18), 'sunflowerHeart', 1.65, 0.012),
  ],
  roseBush: [part(new THREE.IcosahedronGeometry(roseBushRadiusMetres, 1).scale(1, roseBushSquash, 1), 'bloom', 0, roseBushCentreHeightMetres, 0)],
  rose: [part(new THREE.IcosahedronGeometry(0.05, 0), 'bloom', 0, 0, 0)],
}

export class Garden {
  readonly root = new THREE.Group()
  readonly tappableMeshes: THREE.Object3D[] = []

  constructor(materials: RoomMaterials) {
    this.root.add(ground(materials))
    const plantsByKind = new Map<PlantKind, Plant[]>()
    for (const plant of gardenPlants()) {
      const plantsOfTheKind = plantsByKind.get(plant.kind) ?? []
      plantsOfTheKind.push(plant)
      plantsByKind.set(plant.kind, plantsOfTheKind)
    }
    for (const [kind, plantsOfTheKind] of plantsByKind) {
      for (const plantPart of partsByKind[kind]) this.addInstances(kind, instancesOf(plantPart, plantsOfTheKind, materials))
    }
  }

  private addInstances(kind: PlantKind, instances: THREE.InstancedMesh): void {
    this.root.add(instances)
    if (!kindsThatOpenTheDebugMenu.has(kind)) return
    instances.userData = { ...instances.userData, tapTarget: roseBushTag }
    this.tappableMeshes.push(instances)
  }
}

function ground(materials: RoomMaterials): THREE.Mesh {
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(groundSizeMetres, groundSizeMetres), materials.materialFor('lawn'))
  lawn.rotation.x = -Math.PI / 2
  lawn.position.y = -groundBelowTheFloorMetres
  lawn.receiveShadow = true
  return lawn
}

function instancesOf(plantPart: PlantPart, plants: readonly Plant[], materials: RoomMaterials): THREE.InstancedMesh {
  const material = materials.materialFor(plantPart.surface)
  const mesh = new THREE.InstancedMesh(plantPart.geometry, material, plants.length)
  const placement = new THREE.Matrix4()
  const turn = new THREE.Quaternion()
  plants.forEach((plant, index) => {
    turn.setFromAxisAngle(new THREE.Vector3(0, 1, 0), plant.turnRadians)
    placement.compose(new THREE.Vector3(plant.x, plant.y - groundBelowTheFloorMetres, plant.z), turn, new THREE.Vector3(plant.scale, plant.scale, plant.scale))
    mesh.setMatrixAt(index, placement.multiply(plantPart.offset))
    if (plantPart.surface === 'bloom') mesh.setColorAt(index, new THREE.Color(plant.bloomColour))
  })
  mesh.castShadow = false
  mesh.receiveShadow = true
  mesh.computeBoundingSphere()
  return mesh
}

function stem(heightMetres: number): PlantPart {
  return part(new THREE.CylinderGeometry(0.005, 0.006, heightMetres, 3, 1, true), 'stem', 0, heightMetres / 2, 0)
}

function part(geometry: THREE.BufferGeometry, surface: Surface, x: number, y: number, z: number): PlantPart {
  return { geometry, surface, offset: new THREE.Matrix4().makeTranslation(x, y, z) }
}

function tiltedTowardsTheRoom(geometry: THREE.BufferGeometry, surface: Surface, height: number, forward: number): PlantPart {
  const tilt = new THREE.Matrix4().makeRotationZ(Math.PI / 2 - 0.35)
  const place = new THREE.Matrix4().makeTranslation(-forward, height, 0)
  return { geometry, surface, offset: place.multiply(tilt) }
}
