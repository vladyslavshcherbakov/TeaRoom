import { note, noteDetail } from './Draft.ts'
import type { LogLine } from './Log.ts'

export type Command = { readonly type: string }

export type ActionRefused<CommandType extends string, Reason extends string> = {
  readonly type: 'actionRefused'
  readonly command: CommandType
  readonly reason: Reason
}

export type Refusal<Reason extends string> = { readonly reason: Reason; readonly values: string }

export type Check<SomeDraft, Reason extends string> = (draft: SomeDraft) => Refusal<Reason> | null

export type Found<Subject, Reason extends string> = { readonly kind: 'found'; readonly subject: Subject } | { readonly kind: 'refused'; readonly refusal: Refusal<Reason> }

export type CommandEntry<SomeDraft, SomeCommand> = {
  readonly isLoggedOnReceipt: boolean
  readonly checkAndCarryOut: (draft: SomeDraft, command: SomeCommand) => void
}

export type CommandBook<SomeDraft, SomeCommand extends Command> = {
  readonly [Type in SomeCommand['type']]: CommandEntry<SomeDraft, Extract<SomeCommand, { readonly type: Type }>>
}

type RefusingDraft<CommandType extends string, Reason extends string> = {
  readonly events: { push: (event: ActionRefused<CommandType, Reason>) => unknown }
  readonly logLines: LogLine[]
}

type CommandRule<SomeDraft, SomeCommand, Reason extends string> = {
  readonly isLoggedOnReceipt?: boolean
  readonly checks?: (command: SomeCommand) => readonly Check<SomeDraft, Reason>[]
  readonly carryOut: (draft: SomeDraft, command: SomeCommand) => void
}

type CommandRuleOnASubject<SomeDraft, SomeCommand, Reason extends string, Subject> = {
  readonly isLoggedOnReceipt?: boolean
  readonly find: (draft: SomeDraft, command: SomeCommand) => Found<Subject, Reason>
  readonly checks?: (subject: Subject, command: SomeCommand) => readonly Check<SomeDraft, Reason>[]
  readonly carryOut: (draft: SomeDraft, subject: Subject, command: SomeCommand) => void
}

export function commandRule<SomeDraft extends RefusingDraft<SomeCommand['type'], Reason>, SomeCommand extends Command, Reason extends string = never>(rule: CommandRule<SomeDraft, SomeCommand, Reason>): CommandEntry<SomeDraft, SomeCommand> {
  return {
    isLoggedOnReceipt: rule.isLoggedOnReceipt ?? true,
    checkAndCarryOut: (draft, command) => {
      if (wasRefusedByAnyOf(draft, command, rule.checks?.(command) ?? [])) return
      rule.carryOut(draft, command)
    },
  }
}

export function commandRuleOnASubject<SomeDraft extends RefusingDraft<SomeCommand['type'], Reason>, SomeCommand extends Command, Subject, Reason extends string = never>(
  rule: CommandRuleOnASubject<SomeDraft, SomeCommand, Reason, Subject>,
): CommandEntry<SomeDraft, SomeCommand> {
  return {
    isLoggedOnReceipt: rule.isLoggedOnReceipt ?? true,
    checkAndCarryOut: (draft, command) => {
      const found = rule.find(draft, command)
      if (found.kind === 'refused') return refuse(draft, command, found.refusal.reason, found.refusal.values)
      if (wasRefusedByAnyOf(draft, command, rule.checks?.(found.subject, command) ?? [])) return
      rule.carryOut(draft, found.subject, command)
    },
  }
}

export function carryOutCommand<SomeDraft extends { readonly logLines: LogLine[] }, SomeCommand extends Command>(draft: SomeDraft, command: SomeCommand, book: CommandBook<SomeDraft, SomeCommand>): void {
  const entry = entryFor(book, command)
  if (entry.isLoggedOnReceipt) noteDetail(draft, `received ${JSON.stringify(command)}`)
  entry.checkAndCarryOut(draft, command)
}

export function found<Subject>(subject: Subject): Found<Subject, never> {
  return { kind: 'found', subject }
}

export function refusedWith<Reason extends string>(reason: Reason, values: string): Found<never, Reason> {
  return { kind: 'refused', refusal: { reason, values } }
}

export function firstRefusalAmong<SomeDraft, Reason extends string>(draft: SomeDraft, checks: readonly Check<SomeDraft, Reason>[]): Refusal<Reason> | null {
  for (const check of checks) {
    const refusal = check(draft)
    if (refusal !== null) return refusal
  }
  return null
}

export function refuse<CommandType extends string, Reason extends string>(draft: RefusingDraft<CommandType, Reason>, command: { readonly type: CommandType }, reason: Reason, decidingValues = ''): void {
  const { type, ...commandValues } = command
  const values = decidingValues === '' ? '' : `, ${decidingValues}`
  note(draft, `${type} refused (${reason}): ${JSON.stringify(commandValues)}${values}`)
  draft.events.push({ type: 'actionRefused', command: type, reason })
}

function wasRefusedByAnyOf<SomeDraft extends RefusingDraft<SomeCommand['type'], Reason>, SomeCommand extends Command, Reason extends string>(draft: SomeDraft, command: SomeCommand, checks: readonly Check<SomeDraft, Reason>[]): boolean {
  const refusal = firstRefusalAmong(draft, checks)
  if (refusal === null) return false
  refuse(draft, command, refusal.reason, refusal.values)
  return true
}

function entryFor<SomeDraft, SomeCommand extends Command>(book: CommandBook<SomeDraft, SomeCommand>, command: SomeCommand): CommandEntry<SomeDraft, SomeCommand> {
  return book[command.type as SomeCommand['type']] as CommandEntry<SomeDraft, SomeCommand>
}
