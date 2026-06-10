// port.ts — THE PORT for remote-exec. [PROTECTED]
//
// The single narrow interface app code is allowed to import. Defined by the CHANGE it
// absorbs: swapping "run this on localhost" for "ssh to one declared host" for "fan the
// same command across an orchestrated fleet" must pass through here and change NOTHING
// above it. The catalog ladder this block implements: LOCAL executor -> a single declared
// SSH host -> a host inventory with parallel fan-out + idempotent copy. App code says
// `host.run('uname -a')` / `host.push(local, remote)` and never learns which grade answered.
//
// The TEST SEAM is part of the port: open() / the adapters accept an injectable EXECUTOR
// (shaped like node:child_process execFile, plus a copy fn), with the real ones as the
// default. Tests pass a fake executor that records argv and returns canned output, so the
// whole suite runs with ZERO ssh and ZERO network — exactly as ai-model injects a
// fetch-shaped transport. Production code passes nothing and gets the real executor.
//
// AEvo: this file is PROTECTED. An agent may TIGHTEN it (add a method, narrow a type, add a
// guarantee) but may not LOOSEN it (remove a method, widen a return, drop a guarantee).
// See the PROTECTED file and gates.assertNoLoosening.
//
// PORT GUARANTEES (the promises every adapter, at every grade, keeps):
//   1. EXIT CODES ARE SURFACED, NOT THROWN. run() resolves with {code,stdout,stderr} for
//      ANY command that actually executed — a nonzero exit is data, not an exception, so a
//      caller branches on `code` deterministically. Throwing is reserved for TRANSPORT
//      failure (host unreachable, spawn failed, copy I/O error) — the command never ran.
//   2. PATHS ARE VALIDATED. push()/pull() reject empty paths, NUL bytes, and shell
//      metacharacters before anything is spawned, so a path can never become an argument
//      injection. (We pass argv arrays, never a shell string — validation is defense in depth.)
//   3. SECRETS NEVER CROSS THE PORT SURFACE. Key material / identity-file contents are never
//      arguments to run/push/pull and never appear in any returned value. A key path may be
//      configured out-of-band, but the bytes of a key are never echoed back through the port.

export type { Grade } from '../_kernel/grade.ts'
export { gradeAtLeast } from '../_kernel/grade.ts'
import type { Grade } from '../_kernel/grade.ts'

// RunResult: what run() resolves with for any command that executed. A nonzero `code` is a
// normal result, never an error — see PORT GUARANTEE 1.
export interface RunResult {
  code: number // process exit code; 0 == success, nonzero is SURFACED not thrown
  stdout: string
  stderr: string
}

// RemoteHost: the contract. Every adapter, at every grade, satisfies exactly this.
export interface RemoteHost {
  run(cmd: string): Promise<RunResult> // never throws on a nonzero exit (guarantee 1)
  push(localPath: string, remotePath: string): Promise<void> // copy a file out to the host
  pull(remotePath: string, localPath: string): Promise<void> // copy a file back from the host
  close(): Promise<void>
}

// --- The injectable executor seam (guarantees this block tests with zero ssh) -------------
//
// ExecFn is shaped like node:child_process execFile's promisified form: given a program and
// an argv array, it spawns and resolves with the captured streams + exit code. The real one
// (adapters/_exec.ts) wraps child_process; a test passes a fake that records argv and returns
// canned output. CopyFn is the file-copy half (real = fs.copyFile), kept separate so the LOCAL
// adapter can copy without spawning anything.

export interface ExecResult {
  code: number
  stdout: string
  stderr: string
}

// execFile-shaped: (file, args) -> captured result. A REJECTION means the command could not
// be spawned at all (transport failure); a RESOLUTION with a nonzero code means it ran and
// exited nonzero (surfaced). Adapters preserve that distinction up to the port.
export type ExecFn = (file: string, args: string[]) => Promise<ExecResult>

// CopyFn: copy a local file to a local destination (fs.copyFile-shaped). Used by the LOCAL
// adapter for push/pull, and by the SSH adapters as the "stage a temp file" primitive.
export type CopyFn = (src: string, dest: string) => Promise<void>

export interface Executor {
  exec: ExecFn
  copy: CopyFn
}

// HostConfig: how to reach ONE host. `keyPath` is a PATH the underlying ssh/scp may read
// out-of-band — its CONTENTS never cross the port (guarantee 3). The LOCAL adapter ignores
// host/user entirely (it runs on localhost).
export interface HostConfig {
  host: string // hostname or alias; ignored by the local adapter
  user?: string
  port?: number
  keyPath?: string // identity file PATH only — never the key bytes
}

export interface OpenOptions {
  executor?: Executor // default: the real child_process/fs executor (adapters/_exec.ts)
  host?: HostConfig // the single declared host (elementary); ignored by local (nursery)
  hosts?: HostConfig[] // the inventory (graduated); fan-out runs the command on each
}

// Adapter: what each adapter file exports. The port is the SHAPE (RemoteHost); the adapter
// is the swappable thing behind it. `maxGrade` is the highest grade whose requirements this
// adapter can satisfy; `capabilities` are the named guarantees the gate evaluator checks.
export interface Adapter {
  name: string
  maxGrade: Grade
  capabilities: string[]
  open(opts?: OpenOptions): Promise<RemoteHost>
}
