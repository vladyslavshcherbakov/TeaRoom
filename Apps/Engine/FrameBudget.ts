export type FrameBudgetReport<Phase extends string> = {
  readonly framesPerSecond: number
  readonly averageFrameMilliseconds: number
  readonly longestFrameMilliseconds: number
  readonly millisecondsPerFrameByPhase: readonly (readonly [Phase, number])[]
}

const secondsBetweenReports = 2

export class FrameBudget<Phase extends string> {
  private readonly millisecondsByPhase = new Map<Phase, number>()
  private frameBeganAtMilliseconds = 0
  private lapBeganAtMilliseconds = 0
  private reportBeganAtMilliseconds: number | null = null
  private framesSinceTheReport = 0
  private frameMillisecondsSinceTheReport = 0
  private longestFrameMilliseconds = 0

  frameBegan(nowMilliseconds: number): void {
    this.frameBeganAtMilliseconds = nowMilliseconds
    this.lapBeganAtMilliseconds = nowMilliseconds
    this.reportBeganAtMilliseconds ??= nowMilliseconds
  }

  phaseEnded(phase: Phase, nowMilliseconds: number): void {
    this.millisecondsByPhase.set(phase, (this.millisecondsByPhase.get(phase) ?? 0) + nowMilliseconds - this.lapBeganAtMilliseconds)
    this.lapBeganAtMilliseconds = nowMilliseconds
  }

  frameEnded(nowMilliseconds: number): FrameBudgetReport<Phase> | null {
    const frameMilliseconds = nowMilliseconds - this.frameBeganAtMilliseconds
    this.framesSinceTheReport += 1
    this.frameMillisecondsSinceTheReport += frameMilliseconds
    this.longestFrameMilliseconds = Math.max(this.longestFrameMilliseconds, frameMilliseconds)
    const reportBeganAt = this.reportBeganAtMilliseconds ?? nowMilliseconds
    const secondsSinceTheReport = (nowMilliseconds - reportBeganAt) / 1000
    if (secondsSinceTheReport < secondsBetweenReports) return null
    const report = this.reportOver(secondsSinceTheReport)
    this.startTheNextReport(nowMilliseconds)
    return report
  }

  private reportOver(seconds: number): FrameBudgetReport<Phase> {
    const frames = this.framesSinceTheReport
    const millisecondsPerFrameByPhase = [...this.millisecondsByPhase].map(([phase, milliseconds]) => [phase, milliseconds / frames] as const).sort((first, second) => second[1] - first[1])
    return { framesPerSecond: frames / seconds, averageFrameMilliseconds: this.frameMillisecondsSinceTheReport / frames, longestFrameMilliseconds: this.longestFrameMilliseconds, millisecondsPerFrameByPhase }
  }

  private startTheNextReport(nowMilliseconds: number): void {
    this.millisecondsByPhase.clear()
    this.reportBeganAtMilliseconds = nowMilliseconds
    this.framesSinceTheReport = 0
    this.frameMillisecondsSinceTheReport = 0
    this.longestFrameMilliseconds = 0
  }
}
