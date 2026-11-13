import type { Condition, EndingDefinition, ExchangeDefinition, VisitDefinition } from '../Definitions/Conversation.ts'
import type { TeahouseCatalog } from '../Definitions/TeahouseCatalog.ts'

export function catalogProblems(catalog: TeahouseCatalog): readonly string[] {
  const { opening } = catalog
  return [
    ...(opening.firstVisitId in catalog.visits ? [] : [`the opening names the unknown visit ${opening.firstVisitId}`]),
    ...(opening.petFedBeforeTheFirstEvening in catalog.pets ? [] : [`the opening names the unknown pet ${opening.petFedBeforeTheFirstEvening}`]),
    ...Object.entries(catalog.visits).flatMap(([visitId, visit]) => visitProblems(catalog, visitId, visit)),
  ]
}

export function linesNamedBy(catalog: TeahouseCatalog): readonly string[] {
  const lines = [catalog.opening.firstRumour, ...Object.values(catalog.visits).flatMap(linesOfAVisit)]
  return [...new Set(lines)]
}

function visitProblems(catalog: TeahouseCatalog, visitId: string, visit: VisitDefinition): readonly string[] {
  const missing = (what: string): string => `visit ${visitId}: ${what}`
  return [
    ...(visit.firstExchangeId in visit.exchanges ? [] : [missing(`the first exchange ${visit.firstExchangeId} is unknown`)]),
    ...(visit.whenTheTeaRunsOut in visit.endings ? [] : [missing(`the ending ${visit.whenTheTeaRunsOut} for the tea running out is unknown`)]),
    ...Object.keys(visit.bowlRemarks).filter((bowlId) => !(bowlId in catalog.bowls)).map((bowlId) => missing(`a remark is about the unknown bowl ${bowlId}`)),
    ...Object.entries(visit.exchanges).flatMap(([exchangeId, exchange]) => exchangeProblems(catalog, visit, exchange).map((problem) => missing(`exchange ${exchangeId}: ${problem}`))),
    ...Object.entries(visit.endings).flatMap(([endingId, ending]) => endingProblems(catalog, ending).map((problem) => missing(`ending ${endingId}: ${problem}`))),
  ]
}

function exchangeProblems(catalog: TeahouseCatalog, visit: VisitDefinition, exchange: ExchangeDefinition): readonly string[] {
  return [
    ...Object.keys(exchange.whispers).filter((petId) => !(petId in catalog.pets)).map((petId) => `the unknown pet ${petId} whispers`),
    ...exchange.replies.flatMap((reply) => [
      ...(hasAnOutcomeThatAlwaysHolds(reply.outcomes.map((outcome) => outcome.when)) ? [] : [`reply ${reply.id} has no outcome that always holds`]),
      ...reply.outcomes.filter((outcome) => !(outcome.then.kind === 'exchange' ? outcome.then.exchangeId in visit.exchanges : outcome.then.endingId in visit.endings)).map((outcome) => `reply ${reply.id} leads to the unknown ${JSON.stringify(outcome.then)}`),
    ]),
  ]
}

function endingProblems(catalog: TeahouseCatalog, ending: EndingDefinition): readonly string[] {
  return [
    ...ending.makesImmortal.filter((petId) => !(petId in catalog.pets)).map((petId) => `it makes the unknown pet ${petId} immortal`),
    ...(ending.tomorrow === null || ending.tomorrow.visitId in catalog.visits ? [] : [`tomorrow's visit ${ending.tomorrow.visitId} is unknown`]),
  ]
}

function hasAnOutcomeThatAlwaysHolds(conditions: readonly Condition[]): boolean {
  return conditions.at(-1)?.kind === 'always'
}

function linesOfAVisit(visit: VisitDefinition): readonly string[] {
  return [
    visit.opening,
    ...Object.values(visit.bowlRemarks).map((remark) => remark.line),
    ...Object.values(visit.exchanges).flatMap((exchange) => [
      ...(exchange.prompt === null ? [] : [exchange.prompt]),
      ...Object.values(exchange.whispers),
      ...exchange.replies.flatMap((reply) => [reply.says, ...reply.outcomes.map((outcome) => outcome.answer)]),
    ]),
    ...Object.values(visit.endings).flatMap((ending) => [ending.parting, ...(ending.tomorrow === null ? [] : [ending.tomorrow.rumour])]),
  ]
}
