import type { Prompt, SpokenBeat } from '../Presentation/Moment.ts'
import type { SceneViewState } from '../Presentation/SceneViewState.ts'

export type PanelViewState = {
  readonly key: string
  readonly beat: SpokenBeat | null
  readonly prompt: Prompt | null
  readonly nextLabel: string
}

export type TeahouseViewState = {
  readonly scene: SceneViewState
  readonly panel: PanelViewState
}
