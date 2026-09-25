export class TapsInARow {
  private lastTapped: { readonly key: string; count: number } | null = null

  get countSoFar(): number {
    return this.lastTapped?.count ?? 0
  }

  isCounting(key: string): boolean {
    return this.lastTapped?.key === key
  }

  countTapOn(key: string): number {
    if (this.lastTapped?.key === key) this.lastTapped.count += 1
    else this.lastTapped = { key, count: 1 }
    return this.lastTapped.count
  }

  startAgain(): void {
    this.lastTapped = null
  }
}
