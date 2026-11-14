import type { SceneCue } from './SceneCue.ts'

export type Beat = {
  readonly speakerId: string | null
  readonly text: string
  readonly cues: readonly SceneCue[]
}

type CueMaker = (argument: string) => SceneCue

const speakerTag = /^\{(\w+)\}/
const cueTag = /^\[(\w+)(?: ([\w-]+))?\]/
const stageDirection = /^\*[^*]+\*$/
const cueMakers: Readonly<Record<string, CueMaker>> = {
  show: (thing) => ({ kind: 'show', thing }),
  hide: () => ({ kind: 'hide' }),
  mood: (portrait) => ({ kind: 'mood', portrait }),
  shine: (petId) => ({ kind: 'shine', petId }),
}

export function beatsOf(line: string, speakerId: string | null): readonly Beat[] {
  return line.split('\n').map((paragraph) => beatOf(paragraph, speakerId))
}

export function isAStageDirection(text: string): boolean {
  return stageDirection.test(text)
}

export function unknownCuesIn(line: string): readonly string[] {
  return line.split('\n').flatMap((paragraph) => tagsAtTheStartOf(paragraph).cueTags.filter((tagged) => cueMakers[tagged.verb] === undefined).map((tagged) => tagged.verb))
}

function beatOf(paragraph: string, defaultSpeakerId: string | null): Beat {
  const { speakerId, cueTags, text } = tagsAtTheStartOf(paragraph)
  const cues = cueTags.flatMap((tagged) => {
    const make = cueMakers[tagged.verb]
    return make === undefined ? [] : [make(tagged.argument)]
  })
  return { speakerId: isAStageDirection(text) ? null : (speakerId ?? defaultSpeakerId), text, cues }
}

function tagsAtTheStartOf(paragraph: string): { readonly speakerId: string | null; readonly cueTags: readonly { readonly verb: string; readonly argument: string }[]; readonly text: string } {
  let text = paragraph
  let speakerId: string | null = null
  const cueTags: { readonly verb: string; readonly argument: string }[] = []
  for (;;) {
    const speaker = speakerTag.exec(text)
    const cue = cueTag.exec(text)
    if (speaker !== null) speakerId = speaker[1] ?? null
    if (cue !== null) cueTags.push({ verb: cue[1] ?? '', argument: cue[2] ?? '' })
    const tag = speaker ?? cue
    if (tag === null) return { speakerId, cueTags, text }
    text = text.slice(tag[0].length)
  }
}
