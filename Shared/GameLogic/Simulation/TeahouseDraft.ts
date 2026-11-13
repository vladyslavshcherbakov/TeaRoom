import type { Draft } from '../../Engine/Draft.ts'
import type { TeahouseCatalog } from '../Definitions/TeahouseCatalog.ts'
import type { TeahouseState } from '../State/TeahouseState.ts'
import type { TeahouseEvent } from './TeahouseEvents.ts'

export type TeahouseDraft = Draft<TeahouseState, TeahouseCatalog, TeahouseEvent>
