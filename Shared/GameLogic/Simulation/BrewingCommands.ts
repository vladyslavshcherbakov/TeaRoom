import { commandRuleOnASubject, found, refusedWith, type CommandEntry } from '../../Engine/Commands.ts'
import { definitionIn } from '../../Engine/Catalog.ts'
import { note } from '../../Engine/Draft.ts'
import { brewOf, steepVerdict, waterVerdict } from '../Judgement/BrewJudgement.ts'
import { phaseOfKind, visitOf } from './PhaseLookup.ts'
import type { TeahouseCommand } from './TeahouseCommands.ts'
import type { TeahouseDraft } from './TeahouseDraft.ts'

type Entry<Type extends TeahouseCommand['type']> = CommandEntry<TeahouseDraft, Extract<TeahouseCommand, { readonly type: Type }>>

export const startBrewing: Entry<'startBrewing'> = commandRuleOnASubject({
  find: (draft) => phaseOfKind(draft, 'guestSpeaks'),
  carryOut: (draft) => {
    draft.state.phase = { kind: 'choosingLeaf' }
    note(draft, 'the keeper turns to the jars')
  },
})

export const chooseLeaf: Entry<'chooseLeaf'> = commandRuleOnASubject({
  find: (draft, command) => {
    const phase = phaseOfKind(draft, 'choosingLeaf')
    if (phase.kind === 'refused') return phase
    return command.teaId in draft.catalog.teas ? found(command.teaId) : refusedWith('unknownTea', `teaId=${command.teaId}`)
  },
  carryOut: (draft, teaId) => {
    draft.state.phase = { kind: 'heatingWater', teaId, heat: 0 }
    note(draft, `leaf chosen: ${teaId}, the kettle goes on the coals`)
  },
})

export const takeTheKettleOff: Entry<'takeTheKettleOff'> = commandRuleOnASubject({
  find: (draft) => phaseOfKind(draft, 'heatingWater'),
  carryOut: (draft, heating) => {
    const water = waterVerdict(definitionIn(draft.catalog, 'teas', heating.teaId), heating.heat)
    draft.state.phase = { kind: 'steeping', teaId: heating.teaId, water, steepShare: 0, isHeld: false }
    draft.events.push({ type: 'kettleTakenOff', water })
    note(draft, `kettle taken off at heat ${heating.heat.toFixed(2)}: the water is ${water}`)
  },
})

export const holdTheSteep: Entry<'holdTheSteep'> = commandRuleOnASubject({
  isLoggedOnReceipt: false,
  find: (draft) => phaseOfKind(draft, 'steeping'),
  carryOut: (_draft, steeping) => {
    steeping.isHeld = true
  },
})

export const pauseTheSteep: Entry<'pauseTheSteep'> = commandRuleOnASubject({
  find: (draft) => phaseOfKind(draft, 'steeping'),
  carryOut: (draft, steeping) => {
    steeping.isHeld = false
    note(draft, `the steep pauses at ${steeping.steepShare.toFixed(2)}: the hold was interrupted`)
  },
})

export const pourTheSteep: Entry<'pourTheSteep'> = commandRuleOnASubject({
  find: (draft) => phaseOfKind(draft, 'steeping'),
  carryOut: (draft, steeping) => {
    const tea = definitionIn(draft.catalog, 'teas', steeping.teaId)
    const steep = steepVerdict(tea, steeping.steepShare)
    const brew = brewOf(tea, steeping.water, steep, draft.catalog.brewTimings)
    draft.state.phase = { kind: 'choosingBowl', brew }
    draft.events.push({ type: 'steepPoured', steep, cups: brew.cups })
    note(draft, `steep poured at ${steeping.steepShare.toFixed(2)}: ${steep}, water ${steeping.water}, the brew lasts ${brew.cups} cups`)
  },
})

export const serveIn: Entry<'serveIn'> = commandRuleOnASubject({
  find: (draft, command) => {
    const phase = phaseOfKind(draft, 'choosingBowl')
    if (phase.kind === 'refused') return phase
    return command.bowlId in draft.catalog.bowls ? found(phase.subject.brew) : refusedWith('unknownBowl', `bowlId=${command.bowlId}`)
  },
  carryOut: (draft, brew, command) => {
    const visit = visitOf(draft)
    const remark = visit.bowlRemarks[command.bowlId] ?? null
    for (const change of remark?.changes ?? []) draft.state.feelings[change.feeling] += change.by
    const cupPouredNow = 1
    draft.state.phase = { kind: 'talking', talk: { brew, bowlId: command.bowlId, bowlRemark: remark?.line ?? null, cupsLeft: brew.cups - cupPouredNow, exchangeId: visit.firstExchangeId, heard: null, hasAPetSmoothedAMistake: false } }
    draft.events.push({ type: 'teaServed', bowlId: command.bowlId })
    note(draft, `tea served in the ${command.bowlId} bowl, feelings ${JSON.stringify(draft.state.feelings)}, ${brew.cups - cupPouredNow} cups left`)
  },
})
