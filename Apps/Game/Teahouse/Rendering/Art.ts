const urlsByPath = import.meta.glob<string>('../Art/*.svg', { eager: true, query: '?url', import: 'default' })

const urlsByName = new Map(Object.entries(urlsByPath).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -'.svg'.length), url]))

export function artUrl(name: string): string | null {
  return urlsByName.get(name) ?? null
}

export function loadEveryPictureAhead(): void {
  for (const url of urlsByName.values()) new Image().src = url
}
