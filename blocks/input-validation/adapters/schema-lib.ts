// adapters/schema-lib.ts — GRADUATED grade.
//
// A real schema library (zod/typebox) behind the SAME port, so the SAME schema validates at the
// boundary AND generates client/server types — the `shared-schema` + `type-generation`
// capabilities the gate requires once a separate client consumes these shapes. Needs the lib,
// so it does not run in the bare nursery.
//
// To activate:  npm i zod   and set  VALIDATE_IMPL=schema-lib   then map FieldRule -> z schema.

import type { Validator } from '../port.ts'

export const validator: Validator = {
  name: 'schema-lib',
  maxGrade: 'graduated',
  capabilities: ['detailed-errors', 'coercion', 'shared-schema', 'type-generation'],
  parse() {
    throw new Error('schema-lib adapter not wired: npm i zod and compile Schema -> z object in parse()')
  },
}
