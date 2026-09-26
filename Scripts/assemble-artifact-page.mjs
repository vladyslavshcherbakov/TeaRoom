import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, sep } from 'node:path'

const [buildFolder, pagePath] = process.argv.slice(2)
if (buildFolder === undefined || pagePath === undefined) throw new Error('usage: assemble-artifact-page.mjs <build folder> <page path>')

const builtPage = readFileSync(join(buildFolder, 'index.html'), 'utf8')
const title = onlyMatch(builtPage, /<title>[\s\S]*?<\/title>/g, 'title')
const styles = builtPage.match(/<style>[\s\S]*?<\/style>/g) ?? []
const body = onlyMatch(builtPage, /<body>([\s\S]*?)<\/body>/g, 'body').replace(/^<body>|<\/body>$/g, '')
const scriptPath = /<script type="module" crossorigin src="\.\/([^"]+)"><\/script>/.exec(builtPage)?.[1]
if (scriptPath === undefined) throw new Error('the built page loads no module script')
const elementsTheOnePageWouldDrop = elementsLoadingOtherFiles(builtPage, scriptPath)
if (elementsTheOnePageWouldDrop.length > 0) throw new Error(`the built page loads more than its one script, and the one page would drop: ${elementsTheOnePageWouldDrop.join(', ')}`)
const filesTheOnePageWouldDrop = filesIn(buildFolder).filter((path) => path !== 'index.html' && path !== scriptPath)
if (filesTheOnePageWouldDrop.length > 0) throw new Error(`the build holds files besides the page and its script, and the one page would drop: ${filesTheOnePageWouldDrop.join(', ')}`)
const script = readFileSync(join(buildFolder, scriptPath), 'utf8')
if (script.includes('</script')) throw new Error('the script holds a closing script tag and cannot be inlined')

const page = [title, ...styles, body.trim(), `<script type="module">${script}</script>`].join('\n')
writeFileSync(pagePath, page)
console.log(`Wrote ${pagePath}: ${(page.length / 1024).toFixed(0)} KB, with ${styles.length} style block and the script ${scriptPath} inlined`)

function onlyMatch(text, pattern, name) {
  const matches = text.match(pattern) ?? []
  if (matches.length !== 1) throw new Error(`the built page has ${matches.length} ${name} elements, expected one`)
  return matches[0]
}

function elementsLoadingOtherFiles(page, inlinedScriptPath) {
  const links = page.match(/<link\b[^>]*>/g) ?? []
  const otherScripts = (page.match(/<script\b[^>]*>/g) ?? []).filter((element) => !element.includes(`src="./${inlinedScriptPath}"`))
  return [...links, ...otherScripts]
}

function filesIn(folder) {
  return readdirSync(folder, { recursive: true })
    .filter((path) => statSync(join(folder, path)).isFile())
    .map((path) => path.split(sep).join('/'))
}
