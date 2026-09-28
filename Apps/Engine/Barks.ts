import type { AppLog } from './AppLog.ts'

export type HowOften = { readonly kind: 'everyTime' } | { readonly kind: 'upTo'; readonly timesAVisit: number } | { readonly kind: 'apart'; readonly seconds: number }

export type BarkRule<Kind extends string, Fact, Context> = {
  readonly kind: Kind
  readonly howOften: HowOften
  readonly isEarnedBy: (fact: Fact, context: Context) => boolean
}

export type Bark<Kind extends string, Fact> = {
  readonly kind: Kind
  readonly timesMade: number
  readonly fact: Fact
}

export type FactsHeard<Fact> = {
  readonly describe: (fact: Fact) => string
  readonly secondsOf: (fact: Fact) => number | null
}

export const everyTime: HowOften = { kind: 'everyTime' }
export const onceAVisit: HowOften = { kind: 'upTo', timesAVisit: 1 }

export class Barks<Kind extends string, Fact, Context> {
  private readonly rulesInOrder: readonly BarkRule<Kind, Fact, Context>[]
  private readonly facts: FactsHeard<Fact>
  private readonly log: AppLog
  private readonly timesMade = new Map<Kind, number>()
  private readonly lastMadeAtSeconds = new Map<Kind, number>()

  constructor(rulesInOrder: readonly BarkRule<Kind, Fact, Context>[], facts: FactsHeard<Fact>, log: AppLog) {
    this.rulesInOrder = rulesInOrder
    this.facts = facts
    this.log = log
  }

  barkEarnedBy(fact: Fact, context: Context): Bark<Kind, Fact> | null {
    const earned = this.rulesInOrder.filter((candidate) => candidate.isEarnedBy(fact, context))
    const rule = earned.find((candidate) => this.whyItIsKeptQuiet(candidate, fact) === null)
    if (rule === undefined) {
      for (const quiet of earned) this.log(`the player keeps quiet about ${quiet.kind}: ${this.whyItIsKeptQuiet(quiet, fact) ?? ''}`)
      return null
    }
    const timesMade = (this.timesMade.get(rule.kind) ?? 0) + 1
    this.timesMade.set(rule.kind, timesMade)
    const seconds = this.facts.secondsOf(fact)
    if (seconds !== null) this.lastMadeAtSeconds.set(rule.kind, seconds)
    this.log(`${this.facts.describe(fact)} earns the bark ${rule.kind}, made ${timesMade} times this visit${describeHowOften(rule.howOften)}`)
    return { kind: rule.kind, timesMade, fact }
  }

  private whyItIsKeptQuiet(rule: BarkRule<Kind, Fact, Context>, fact: Fact): string | null {
    const timesMade = this.timesMade.get(rule.kind) ?? 0
    switch (rule.howOften.kind) {
      case 'everyTime':
        return null
      case 'upTo':
        return timesMade < rule.howOften.timesAVisit ? null : `made ${timesMade} times this visit already, and never more`
      case 'apart': {
        const lastAtSeconds = this.lastMadeAtSeconds.get(rule.kind)
        const seconds = this.facts.secondsOf(fact)
        if (lastAtSeconds === undefined || seconds === null) return null
        const secondsSince = seconds - lastAtSeconds
        return secondsSince >= rule.howOften.seconds ? null : `the last one was ${Math.round(secondsSince)} s ago, less than ${rule.howOften.seconds} s`
      }
    }
  }
}

function describeHowOften(howOften: HowOften): string {
  switch (howOften.kind) {
    case 'everyTime':
      return ''
    case 'upTo':
      return `, at most ${howOften.timesAVisit}`
    case 'apart':
      return `, at least ${howOften.seconds} s apart`
  }
}
