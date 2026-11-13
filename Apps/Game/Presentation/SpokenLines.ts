export type Beat = {
  readonly speakerId: string | null
  readonly text: string
}

const speakerTag = /^\{(\w+)\}/
const stageDirection = /^\*[^*]+\*$/

export function beatsOf(line: string, speakerId: string | null): readonly Beat[] {
  return line.split('\n').map((paragraph) => beatOf(paragraph, speakerId))
}

export function isAStageDirection(text: string): boolean {
  return stageDirection.test(text)
}

function beatOf(paragraph: string, defaultSpeakerId: string | null): Beat {
  const tagged = speakerTag.exec(paragraph)
  const text = tagged === null ? paragraph : paragraph.slice(tagged[0].length)
  const speakerId = tagged?.[1] ?? defaultSpeakerId
  return { speakerId: isAStageDirection(text) ? null : speakerId, text }
}
