// project-a.ts — a fictional FIRST project. It uses the persistence block, hits a real-world
// lesson, and deposits the distilled version into the federation. That is the only thing it
// shares with the world: not its code, not its data — one abstracted lesson.

import { learn } from '../persistence/index.ts'

const LESSON =
  'sqlite/file store: the single-writer assumption starts throwing EBUSY around 3 concurrent writers. ' +
  'Graduate to a server-backed adapter BEFORE adding the second writer, not after the incident.'

const added = learn(LESSON, 'project-a')
console.log(`[project-a] ${added ? 'deposited' : 'already had'} a persistence lesson into the federation`)
