export type Phrases<Phrase extends string> = Readonly<Record<Phrase, readonly [string, ...string[]]>>

export class Texts<Key extends string, Phrase extends string> {
  private readonly lines: Readonly<Record<Key, string>>
  private readonly phrases: Phrases<Phrase>

  constructor(lines: Readonly<Record<Key, string>>, phrases: Phrases<Phrase>) {
    this.lines = lines
    this.phrases = phrases
  }

  text(key: Key): string {
    return this.lines[key]
  }

  textWith(key: Key, values: Readonly<Record<string, string>>): string {
    return lineFilledWith(this.text(key), values)
  }

  phraseVariantsOf(phrase: Phrase): number {
    return this.phrases[phrase].length
  }

  phraseLineAtTurn(phrase: Phrase, voiceSeed: number, turn: number, values: Readonly<Record<string, string>> = {}): string {
    const variants = this.phrases[phrase]
    const lineIndex = (phraseVariantAmong(phrase, voiceSeed, variants.length) - 1 + turn - 1) % variants.length
    return lineFilledWith(variants[lineIndex] ?? variants[0], values)
  }
}

function lineFilledWith(line: string, values: Readonly<Record<string, string>>): string {
  return line.replace(/\{(\w+)\}/g, (placeholder, name: string) => values[name] ?? placeholder)
}

function phraseVariantAmong(phrase: string, voiceSeed: number, variantCount: number): number {
  let hash = 2166136261 ^ voiceSeed
  for (const character of phrase) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  return ((hash >>> 0) % variantCount) + 1
}
