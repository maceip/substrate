// contract.ts — PROTOCOL S7: remote-exec's port promises as DATA.
//
// PRIMARY OUTPUT: the RunResult that run() resolves with for any command that executed.
// Port guarantee 1 (a nonzero exit is DATA, not an exception) is behavioral — it cannot be
// read off a single value — but its precondition is value-shaped: code is always an integer
// exit code with captured streams. Guarantee 3 IS value-shaped and is the forbidden rule:
// key material never crosses the port surface, so no returned stream may carry a private key.

import { z } from 'zod'
import type { PortContract } from '../_kernel/contract.ts'

const runResultShape = z.object({
  code: z.number().int(),
  stdout: z.string(),
  stderr: z.string(),
})

export const CONTRACT: PortContract = {
  block: 'remote-exec',
  output: runResultShape,
  assertions: [],
  forbidden: [
    {
      id: 'no-key-material-in-streams',
      describe: 'secrets never cross the port surface: stdout/stderr must not contain private-key material (PEM "BEGIN ... PRIVATE KEY" blocks)',
      violatedBy: (v) => {
        const r = v as { stdout: string; stderr: string }
        const pem = /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/
        return pem.test(r.stdout) || pem.test(r.stderr)
      },
    },
  ],
}

// A known-good output (a successful `uname -a`-style run) that CONTRACT must accept. A
// nonzero `code` with captured stderr would be equally valid — surfaced, never thrown.
export const SAMPLE: unknown = {
  code: 0,
  stdout: 'Darwin substrate-host 25.5.0 arm64\n',
  stderr: '',
}
