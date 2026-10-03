import type { ClothView } from '../../Presentation/WorldViewState.ts'

const settleSeconds = 0.6

export class ClothLookShown {
  private readonly shownByCloth = new Map<string, ClothView>()

  clothsAfterAFrame(cloths: Readonly<Record<string, ClothView>>, realSeconds: number): Record<string, ClothView> {
    return Object.fromEntries(Object.entries(cloths).map(([clothId, cloth]) => [clothId, this.shownAfterAFrame(clothId, cloth, realSeconds)]))
  }

  private shownAfterAFrame(clothId: string, cloth: ClothView, realSeconds: number): ClothView {
    const shownBefore = this.shownByCloth.get(clothId) ?? cloth
    const shareOfTheWay = 1 - Math.exp(-realSeconds / settleSeconds)
    const shown = { wetShare: shownBefore.wetShare + (cloth.wetShare - shownBefore.wetShare) * shareOfTheWay, teaStain: shownBefore.teaStain + (cloth.teaStain - shownBefore.teaStain) * shareOfTheWay }
    this.shownByCloth.set(clothId, shown)
    return shown
  }
}
