import * as THREE from 'three'
import type { RoomMaterials, Surface } from './RoomMaterials.ts'

const pageWidthMetres = 0.16
const pageHeightMetres = 0.22
const pagesOpenRadians = 0.2
const coverOverhangMetres = 0.012
const coverThicknessMetres = 0.014
const pageBlockThicknessMetres = 0.024
const pageBulgeMetres = 0.012
const pageSegmentsAcross = 16
const ribbonWidthMetres = 0.012
const ribbonBelowTheBookMetres = 0.11
const ledgeDepthMetres = 0.09
const ledgeThicknessMetres = 0.02
const ledgeOverhangMetres = 0.03
const leanAgainstTheWallRadians = 0.12

export function guideBookModel(materials: RoomMaterials): THREE.Group {
  const book = new THREE.Group()
  const openBook = new THREE.Group()
  openBook.add(bookHalf(materials, -1), bookHalf(materials, 1), ribbon(materials))
  openBook.rotation.x = -leanAgainstTheWallRadians
  openBook.position.z = ledgeDepthMetres / 2
  book.add(openBook, ledge(materials))
  return book
}

function bookHalf(materials: RoomMaterials, side: number): THREE.Group {
  const half = new THREE.Group()
  const coverWidth = pageWidthMetres + coverOverhangMetres
  half.add(
    box(materials, 'guideBookCover', coverWidth, pageHeightMetres + 2 * coverOverhangMetres, coverThicknessMetres, (side * coverWidth) / 2, 0, 0),
    box(materials, 'guideBookPageEdges', pageWidthMetres, pageHeightMetres, pageBlockThicknessMetres, (side * pageWidthMetres) / 2, 0, (coverThicknessMetres + pageBlockThicknessMetres) / 2),
    curvedPage(materials, side),
  )
  half.rotation.y = -side * pagesOpenRadians
  return half
}

function curvedPage(materials: RoomMaterials, side: number): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(pageWidthMetres, pageHeightMetres, pageSegmentsAcross, 1)
  const positions = geometry.attributes['position']
  if (positions !== undefined) {
    for (let index = 0; index < positions.count; index += 1) {
      const distanceAcrossThePage = positions.getX(index) + pageWidthMetres / 2
      positions.setZ(index, pageBulgeMetres * Math.pow(Math.sin((Math.PI * distanceAcrossThePage) / pageWidthMetres), 0.6))
    }
    geometry.computeVertexNormals()
  }
  const page = new THREE.Mesh(geometry, materials.materialFor('guideBookPage'))
  page.position.set((side * pageWidthMetres) / 2, 0, coverThicknessMetres / 2 + pageBlockThicknessMetres + 0.0005)
  return page
}

function ribbon(materials: RoomMaterials): THREE.Mesh {
  const length = pageHeightMetres + ribbonBelowTheBookMetres
  return box(materials, 'medalRibbon', ribbonWidthMetres, length, 0.002, 0, pageHeightMetres / 2 - length / 2, coverThicknessMetres / 2 + pageBlockThicknessMetres + pageBulgeMetres * 0.2)
}

function ledge(materials: RoomMaterials): THREE.Mesh {
  const width = 2 * (pageWidthMetres + coverOverhangMetres) + 2 * ledgeOverhangMetres
  return box(materials, 'darkWood', width, ledgeThicknessMetres, ledgeDepthMetres, 0, -pageHeightMetres / 2 - coverOverhangMetres - ledgeThicknessMetres / 2, ledgeDepthMetres / 2)
}

function box(materials: RoomMaterials, surface: Surface, width: number, height: number, depth: number, x: number, y: number, z: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), materials.materialFor(surface))
  mesh.position.set(x, y, z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}
