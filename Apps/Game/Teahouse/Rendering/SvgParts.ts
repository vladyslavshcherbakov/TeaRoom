import type { AppLog } from '../../../Engine/AppLog.ts'
import { artUrl } from './Art.ts'

export type Box = { readonly x: number; readonly y: number; readonly width: number; readonly height: number }

const svgNamespace = 'http://www.w3.org/2000/svg'

export function svgElement<Name extends keyof SVGElementTagNameMap>(name: Name, attributes: Readonly<Record<string, string | number>> = {}): SVGElementTagNameMap[Name] {
  const element = document.createElementNS(svgNamespace, name)
  for (const [attribute, value] of Object.entries(attributes)) element.setAttribute(attribute, String(value))
  return element
}

export function picture(box: Box, className = ''): SVGImageElement {
  const image = svgElement('image', { ...box, preserveAspectRatio: 'xMidYMid meet' })
  if (className !== '') image.setAttribute('class', className)
  return image
}

export function showArt(image: SVGImageElement, artName: string | null, log: AppLog): void {
  const url = artName === null ? null : artUrl(artName)
  if (artName !== null && url === null && image.dataset.missing !== artName) {
    image.dataset.missing = artName
    log(`no picture named ${artName}, the place stays empty`, 'error')
  }
  image.style.display = url === null ? 'none' : ''
  if (url === null || image.getAttribute('href') === url) return
  image.style.opacity = '0'
  image.addEventListener('load', () => (image.style.opacity = ''), { once: true })
  image.setAttribute('href', url)
}

export function setShown(element: SVGElement, isShown: boolean): void {
  element.style.display = isShown ? '' : 'none'
}
