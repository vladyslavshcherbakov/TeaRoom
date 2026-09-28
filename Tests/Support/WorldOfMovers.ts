import { commandRuleOnASubject, found, refusedWith, type ActionRefused } from '../../Shared/Engine/Commands.ts'
import type { Draft } from '../../Shared/Engine/Draft.ts'
import { Session, type GameRules } from '../../Shared/Engine/Session.ts'
import { firstEntityAcross, type Table } from '../../Shared/Engine/World.ts'

type Mover = { x: number; speed: number }

export type MoversWorld = { movers: Table<Mover>; seconds: number }

type MoversCommand = { readonly type: 'push'; readonly moverId: string }

type MoversEvent = { readonly type: 'pushed'; readonly moverId: string } | ActionRefused<'push', 'unknownMover'>

type MoversDraft = Draft<MoversWorld, null, MoversEvent>

const moversRules: GameRules<MoversWorld, null, MoversEvent, MoversCommand> = {
  commandBook: {
    push: commandRuleOnASubject({
      find: (draft: MoversDraft, command: MoversCommand) => {
        const mover = draft.state.movers[command.moverId]
        return mover === undefined ? refusedWith('unknownMover', command.moverId) : found(mover)
      },
      carryOut: (draft, mover, command) => {
        mover.speed += 1
        draft.events.push({ type: 'pushed', moverId: command.moverId })
      },
    }),
  },
  afterEachCommand: () => {},
  schedule: [moveEveryMover, moveTheClockOn],
  stepSeconds: 0.05,
  absenceStepSeconds: 1,
  longestLivedAbsenceSeconds: 60,
  clockOf: (world) => world.seconds,
  report: { everySeconds: 5, secondsAhead: 1, heading: 'the world', headingAfterAbsence: 'the world on return', stillLine: 'the world is still', reporters: [] },
}

export function moversSession(moverCount: number): Session<MoversWorld, null, MoversEvent, MoversCommand> {
  const movers = Object.fromEntries(Array.from({ length: moverCount }, (_, index) => [`mover${index}`, { x: 0, speed: 1 }]))
  return new Session(moversRules, null, { movers, seconds: 0 }, { write: () => {} }, false)
}

export function firstMoverPast(session: Session<MoversWorld, null, MoversEvent, MoversCommand>, x: number): string | null {
  return firstEntityAcross([session.state.movers], (mover) => mover.x > x)
}

function moveEveryMover(draft: MoversDraft, seconds: number): void {
  for (const mover of Object.values(draft.state.movers)) mover.x += mover.speed * seconds
}

function moveTheClockOn(draft: MoversDraft, seconds: number): void {
  draft.state.seconds += seconds
}
