import type { TeahouseCommand } from '../../../Shared/GameLogic/GameLogic.ts'

export type SpokenBeat = {
  readonly speaker: string | null
  readonly text: string
  readonly isAStageDirection: boolean
}

export type Choice = {
  readonly command: TeahouseCommand
  readonly label: string | null
  readonly text: string
  readonly detail: string | null
  readonly mark: string | null
}

export type Whisper = {
  readonly petName: string
  readonly text: string
}

export type Prompt =
  | { readonly kind: 'continue'; readonly label: string; readonly command: TeahouseCommand }
  | { readonly kind: 'choices'; readonly choices: readonly Choice[]; readonly whisper: Whisper | null; readonly note: string | null }
  | { readonly kind: 'hold'; readonly label: string }
  | { readonly kind: 'startOver'; readonly label: string }

export type Moment = {
  readonly key: string
  readonly beats: readonly SpokenBeat[]
  readonly prompt: Prompt
}
