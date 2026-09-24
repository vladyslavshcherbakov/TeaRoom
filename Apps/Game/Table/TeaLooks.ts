export type LeafShape = 'needle' | 'ball' | 'chunk'

export type TeaLook = {
  readonly liquorColour: string
  readonly leafColour: string
  readonly leafShape: LeafShape
}

const teaLooksByTeaId: Readonly<Record<string, TeaLook>> = {
  sencha: { liquorColour: '#b8c46a', leafColour: '#3f5f24', leafShape: 'needle' },
  oolong: { liquorColour: '#d99a3e', leafColour: '#4a5a2c', leafShape: 'ball' },
  shouPuerh: { liquorColour: '#5a2a14', leafColour: '#3b2417', leafShape: 'chunk' },
}

const lookOfAnUnknownTea: TeaLook = { liquorColour: '#a89a5a', leafColour: '#4d4a2a', leafShape: 'needle' }

export function teaLookFor(teaId: string | null): TeaLook {
  return teaId === null ? lookOfAnUnknownTea : (teaLooksByTeaId[teaId] ?? lookOfAnUnknownTea)
}
