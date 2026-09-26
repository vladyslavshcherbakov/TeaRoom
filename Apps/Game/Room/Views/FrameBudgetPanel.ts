import { text, textWith } from '../../Texts/Texts.ts'
import type { FrameBudgetReport } from '../FrameBudget.ts'

export type SceneCounts = {
  readonly drawCallsPerFrame: number
  readonly trianglesPerFrame: number
  readonly geometries: number
  readonly textures: number
  readonly shaderPrograms: number
  readonly sceneObjects: number
  readonly pageElements: number
}

export class FrameBudgetPanel {
  private readonly element: HTMLElement

  constructor(container: HTMLElement) {
    this.element = document.createElement('div')
    this.element.className = 'frame-budget'
    this.element.hidden = true
    container.append(this.element)
  }

  hide(): void {
    this.element.hidden = true
  }

  show(report: FrameBudgetReport, counts: SceneCounts): void {
    this.element.textContent = linesOf(report, counts).join('\n')
    this.element.hidden = false
  }
}

export function linesOf(report: FrameBudgetReport, counts: SceneCounts): readonly string[] {
  return [
    textWith('frameBudget.frame', { framesPerSecond: report.framesPerSecond.toFixed(0), average: report.averageFrameMilliseconds.toFixed(1), longest: report.longestFrameMilliseconds.toFixed(0) }),
    ...report.millisecondsPerFrameByPhase.map(([phase, milliseconds]) => textWith('frameBudget.phase', { phase: text(`frameBudget.phase.${phase}`), milliseconds: milliseconds.toFixed(2) })),
    textWith('frameBudget.drawing', { drawCalls: String(counts.drawCallsPerFrame), triangles: String(counts.trianglesPerFrame) }),
    textWith('frameBudget.memory', { geometries: String(counts.geometries), textures: String(counts.textures), programs: String(counts.shaderPrograms) }),
    textWith('frameBudget.counts', { objects: String(counts.sceneObjects), elements: String(counts.pageElements) }),
  ]
}
