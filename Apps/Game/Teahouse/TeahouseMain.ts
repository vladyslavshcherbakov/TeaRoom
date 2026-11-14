import { defaultCatalog } from '../../../Shared/Content/DefaultCatalog.ts'
import { linesNamedBy, openNewTeahouse } from '../../../Shared/GameLogic/GameLogic.ts'
import type { AppLog } from '../../Engine/AppLog.ts'
import { interfaceLinesNeededFor } from '../Presentation/MomentPresenter.ts'
import { russianLines } from '../Texts/RussianTexts.ts'
import { gameTexts, linesWithUnknownCues, missingLines } from '../Texts/Texts.ts'
import { loadEveryPictureAhead } from './Rendering/Art.ts'
import { PanelView } from './Rendering/PanelView.ts'
import { StageView } from './Rendering/StageView.ts'
import { TeahouseViewModel } from './TeahouseViewModel.ts'

const longestFrameSeconds = 0.25
const millisecondsInASecond = 1000

const log: AppLog = (message, level = 'info') => (level === 'error' ? console.error(`[teahouse] ${message}`) : console.info(`[teahouse] ${message}`))

function openTheTeahouse(page: HTMLElement): void {
  const texts = gameTexts(russianLines)
  const textProblems = [...missingLines(russianLines, [...linesNamedBy(defaultCatalog), ...interfaceLinesNeededFor(defaultCatalog)]), ...linesWithUnknownCues(russianLines)]
  const opening = openNewTeahouse(defaultCatalog, textProblems, { levelName: 'the teahouse', whatShowsInstead: 'an empty page', isDevelopmentBuild: import.meta.env.DEV }, { write: (line) => log(line.message, line.level === 'error' ? 'error' : 'info') })
  if (opening.kind === 'unavailable') return
  const viewModel = new TeahouseViewModel(opening.session, defaultCatalog, texts, log, () => openTheTeahouse(page))
  const panel = new PanelView(viewModel)
  const stage = new StageView(log, (index) => chooseOnTheTable(viewModel, index))
  page.replaceChildren(stage.element, panel.element)
  runTheFrames(viewModel, stage, panel, page)
}

function chooseOnTheTable(viewModel: TeahouseViewModel, index: number): void {
  const { prompt } = viewModel.viewState().panel
  const choice = prompt?.kind === 'choices' ? prompt.choices[index] : undefined
  if (choice !== undefined) viewModel.commandChosen(choice.command)
}

function runTheFrames(viewModel: TeahouseViewModel, stage: StageView, panel: PanelView, page: HTMLElement): void {
  let lastFrameAt = performance.now()
  const frame = (now: number): void => {
    if (!page.contains(stage.element)) return
    viewModel.framePassed(Math.min((now - lastFrameAt) / millisecondsInASecond, longestFrameSeconds))
    lastFrameAt = now
    const viewState = viewModel.viewState()
    stage.show(viewState.scene)
    panel.show(viewState.panel)
    requestAnimationFrame(frame)
  }
  window.addEventListener('blur', () => viewModel.holdInterrupted())
  requestAnimationFrame(frame)
}

const page = document.getElementById('teahouse')
if (page === null) throw new Error('the page has no #teahouse element')
loadEveryPictureAhead()
openTheTeahouse(page)
