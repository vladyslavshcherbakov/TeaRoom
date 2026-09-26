import { text, textWith, type TextKey } from '../../Texts/Texts.ts'

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
  private readonly element: HTMLElement
  private readonly sectionTitle: HTMLElement
  private readonly sectionBody: HTMLElement
  private readonly pageNumber: HTMLElement
  private readonly previousButton: HTMLButtonElement
  private readonly nextButton: HTMLButtonElement
  private sectionIndex = 0

  constructor(container: HTMLElement) {
    this.element = document.createElement('div')
    this.element.className = 'guide'
    this.element.hidden = true
    this.element.addEventListener('click', (event) => {
      if (event.target === this.element) this.hide()
    })
    const spread = document.createElement('div')
    spread.className = 'guide-spread'
    const leftPage = document.createElement('div')
    leftPage.className = 'guide-page guide-page-left'
    const bookTitle = document.createElement('p')
    bookTitle.className = 'guide-book-title'
    bookTitle.textContent = text('guide.title')
    this.sectionTitle = document.createElement('h2')
    this.sectionTitle.className = 'guide-section-title'
    leftPage.append(bookTitle, this.sectionTitle)
    const rightPage = document.createElement('div')
    rightPage.className = 'guide-page guide-page-right'
    this.sectionBody = document.createElement('p')
    this.sectionBody.className = 'guide-section-text'
    rightPage.append(this.sectionBody)
    spread.append(leftPage, rightPage)
    const buttons = document.createElement('div')
    buttons.className = 'guide-buttons'
    this.previousButton = this.button('guide-turn', text('guide.previous'), () => this.turnTo(this.sectionIndex - 1))
    this.pageNumber = document.createElement('span')
    this.pageNumber.className = 'guide-page-number'
    this.nextButton = this.button('guide-turn', text('guide.next'), () => this.turnTo(this.sectionIndex + 1))
    const closeButton = this.button('guide-close', text('guide.close'), () => this.hide())
    buttons.append(this.previousButton, this.pageNumber, this.nextButton, closeButton)
    const book = document.createElement('div')
    book.className = 'guide-book'
    book.append(spread, buttons)
    this.element.append(book)
    container.append(this.element)
  }

  show(): void {
    this.turnTo(0)
    this.element.hidden = false
  }

  private hide(): void {
    this.element.hidden = true
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

  private button(className: string, label: string, tapped: () => void): HTMLButtonElement {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = className
    button.textContent = label
    button.addEventListener('click', tapped)
    return button
  }
}
