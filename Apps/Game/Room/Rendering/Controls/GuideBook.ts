import { text, textWith, type TextKey } from '../../../Texts/Texts.ts'
import { button, pageElement, SheetOverTheScene } from '../../../../Engine/Rendering/Controls/PageControls.ts'

type GuideSection = {
  readonly title: TextKey
  readonly body: TextKey
}

const sections: readonly GuideSection[] = [
  { title: 'guide.taking.title', body: 'guide.taking.text' },
  { title: 'guide.pouring.title', body: 'guide.pouring.text' },
  { title: 'guide.looking.title', body: 'guide.looking.text' },
  { title: 'guide.washing.title', body: 'guide.washing.text' },
]

export class GuideBook {
  private readonly book: SheetOverTheScene
  private readonly sectionTitle: HTMLElement
  private readonly sectionBody: HTMLElement
  private readonly pageNumber: HTMLElement
  private readonly previousButton: HTMLButtonElement
  private readonly nextButton: HTMLButtonElement
  private readonly pageTurned: () => void
  private sectionIndex = 0

  constructor(container: HTMLElement, pageTurned: () => void) {
    this.pageTurned = pageTurned
    this.book = new SheetOverTheScene(container, 'guide', 'guide-book')
    this.sectionTitle = pageElement('h2', 'guide-section-title')
    const leftPage = pageElement('div', 'guide-page guide-page-left')
    leftPage.append(pageElement('p', 'guide-book-title', text('guide.title')), this.sectionTitle)
    this.sectionBody = pageElement('p', 'guide-section-text')
    const rightPage = pageElement('div', 'guide-page guide-page-right')
    rightPage.append(this.sectionBody)
    const spread = pageElement('div', 'guide-spread')
    spread.append(leftPage, rightPage)
    this.previousButton = button('guide-turn', text('guide.previous'), () => this.turnThePageTo(this.sectionIndex - 1))
    this.pageNumber = pageElement('span', 'guide-page-number')
    this.nextButton = button('guide-turn', text('guide.next'), () => this.turnThePageTo(this.sectionIndex + 1))
    for (const turnButton of [this.previousButton, this.nextButton]) turnButton.dataset['hasItsOwnSound'] = 'yes'
    const buttons = pageElement('div', 'guide-buttons')
    buttons.append(this.previousButton, this.pageNumber, this.nextButton, button('guide-close', text('guide.close'), () => this.book.hide()))
    this.book.sheet.append(spread, buttons)
  }

  show(): void {
    this.turnTo(0)
    this.book.show()
  }

  private turnThePageTo(sectionIndex: number): void {
    this.pageTurned()
    this.turnTo(sectionIndex)
  }

  private turnTo(sectionIndex: number): void {
    const section = sections[sectionIndex]
    if (section === undefined) return
    this.sectionIndex = sectionIndex
    this.sectionTitle.textContent = text(section.title)
    this.sectionBody.textContent = text(section.body)
    this.pageNumber.textContent = textWith('guide.pageNumber', { page: String(sectionIndex + 1), pages: String(sections.length) })
    this.previousButton.disabled = sectionIndex === 0
    this.nextButton.disabled = sectionIndex === sections.length - 1
  }
}
