const tag = /<(\/?)([A-Za-z][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*(?:"[^"<]*"|'[^'<]*'))*)\s*(\/?)>/y
const attributeName = /([\w:.-]+)\s*=/g
const prologOrComment = /<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<!DOCTYPE[^>]*>/y

export function xmlProblems(text: string): readonly string[] {
  const problems: string[] = []
  const openTags: string[] = []
  let position = 0
  while (position < text.length) {
    const nextTag = text.indexOf('<', position)
    if (nextTag < 0) break
    position = nextTag
    const skipped = matchAt(prologOrComment, text, position)
    if (skipped !== null) {
      position += skipped[0].length
      continue
    }
    const found = matchAt(tag, text, position)
    if (found === null) return [...problems, `no well-formed tag at character ${position}: ${text.slice(position, position + 60)}`]
    const [whole, closing, name, attributes, selfClosing] = found
    problems.push(...repeatedAttributes(attributes ?? '').map((attribute) => `<${name}> at character ${position} has the attribute ${attribute} twice`))
    if (closing === '/') {
      const open = openTags.pop()
      if (open !== name) problems.push(`</${name}> at character ${position} closes <${open ?? 'nothing'}>`)
    } else if (selfClosing !== '/') openTags.push(name ?? '')
    position += whole.length
  }
  return [...problems, ...openTags.map((name) => `<${name}> is never closed`)]
}

function matchAt(pattern: RegExp, text: string, position: number): RegExpExecArray | null {
  pattern.lastIndex = position
  return pattern.exec(text)
}

function repeatedAttributes(attributes: string): readonly string[] {
  const names = [...attributes.matchAll(attributeName)].map((match) => match[1] ?? '')
  return [...new Set(names.filter((name, index) => names.indexOf(name) !== index))]
}
