import type { CommandEntry } from '../../Engine/Commands.ts'
import type { Command, CommandOfType } from './Command.ts'
import type { Draft } from './Draft.ts'

export type TeaCommandEntry<Type extends Command['type']> = CommandEntry<Draft, CommandOfType<Type>>
