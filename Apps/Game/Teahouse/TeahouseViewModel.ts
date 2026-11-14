import type { TeahouseCatalog, TeahouseCommand, TeahouseSession } from '../../../Shared/GameLogic/GameLogic.ts'
import type { AppLog } from '../../Engine/AppLog.ts'
import type { Moment } from '../Presentation/Moment.ts'
import { MomentPresenter } from '../Presentation/MomentPresenter.ts'
import { sceneOf } from '../Presentation/ScenePresenter.ts'
import { emptyStage, stagedAfter, type Staging } from '../Presentation/Staging.ts'
import type { GameTexts } from '../Texts/Texts.ts'
import type { TeahouseViewState } from './TeahouseViewState.ts'

export class TeahouseViewModel {
  private readonly session: TeahouseSession
  private readonly catalog: TeahouseCatalog
  private readonly texts: GameTexts
  private readonly log: AppLog
  private readonly momentPresenter: MomentPresenter
  private readonly startOver: () => void
  private momentKey = ''
  private beatsRead = 0
  private beatsStaged = 0
  private staging: Staging = emptyStage

  constructor(session: TeahouseSession, catalog: TeahouseCatalog, texts: GameTexts, log: AppLog, startOver: () => void) {
    this.session = session
    this.catalog = catalog
    this.texts = texts
    this.log = log
    this.momentPresenter = new MomentPresenter(catalog, texts)
    this.startOver = startOver
  }

  viewState(): TeahouseViewState {
    const moment = this.currentMoment()
    const lastBeat = moment.beats.length - 1
    const beatShown = Math.min(this.beatsRead, lastBeat)
    this.stageTheBeatsThrough(moment, beatShown)
    return {
      scene: sceneOf(this.session.state, this.catalog, this.texts, this.staging),
      panel: { key: `${moment.key}#${beatShown}`, beat: moment.beats[beatShown] ?? null, prompt: beatShown === lastBeat ? moment.prompt : null, nextLabel: this.texts.text('action.next') },
    }
  }

  framePassed(seconds: number): void {
    this.session.advance(seconds)
  }

  nextTapped(): void {
    const moment = this.currentMoment()
    if (this.beatsRead >= moment.beats.length - 1) return
    this.beatsRead += 1
  }

  commandChosen(command: TeahouseCommand): void {
    const refusal = this.session.dispatch(command).find((event) => event.type === 'actionRefused')
    if (refusal !== undefined) this.log(`the teahouse refused ${command.type}: ${refusal.reason}`, 'error')
  }

  holdStarted(): void {
    this.commandChosen({ type: 'holdTheSteep' })
  }

  holdReleased(): void {
    this.commandChosen({ type: 'pourTheSteep' })
  }

  holdInterrupted(): void {
    if (this.session.wouldRefuse([{ type: 'pauseTheSteep' }]) !== null) return
    this.commandChosen({ type: 'pauseTheSteep' })
  }

  startOverTapped(): void {
    this.log('the keeper starts the story over')
    this.startOver()
  }

  private stageTheBeatsThrough(moment: Moment, beatShown: number): void {
    const beatsToStage = moment.beats.slice(this.beatsStaged, beatShown + 1)
    this.staging = stagedAfter(this.staging, beatsToStage.flatMap((beat) => beat.cues))
    this.beatsStaged = Math.max(this.beatsStaged, beatShown + 1)
  }

  private currentMoment(): Moment {
    const moment = this.momentPresenter.moment(this.session.state)
    if (moment.key !== this.momentKey) {
      this.momentKey = moment.key
      this.beatsRead = 0
      this.beatsStaged = 0
      if (moment.startsAnEvening) this.staging = emptyStage
    }
    return moment
  }
}
