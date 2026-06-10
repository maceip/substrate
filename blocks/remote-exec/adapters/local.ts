// adapters/local.ts — NURSERY grade (the default, safe out of the box)
//
// The thinnest thing that satisfies the port, and the only grade that needs no network at
// all: run() executes the command on LOCALHOST through the injectable executor (real =
// child_process), push()/pull() copy files via the injectable copy fn (real = fs.copyFile).
// There is no host, no ssh, no key — so it tops out at `nursery`. It is REAL (a deploy
// script wired against the port works against localhost unchanged) and it is what tests and
// the first five minutes run against. The moment the work leaves localhost, the gate fires.
//
// run() honors PORT GUARANTEE 1: a command that exits nonzero RESOLVES with that code; only
// a command that could not be spawned at all throws. We invoke the shell deliberately here
// (sh -c) because a "command" on localhost is a shell line — but push/pull validate their
// paths (GUARANTEE 2) and no key material is ever involved (GUARANTEE 3 is trivially held).

import type { Adapter, Executor, OpenOptions, RemoteHost, RunResult } from '../port.ts'
import { realExecutor, validatePath } from './_exec.ts'

class LocalHost implements RemoteHost {
  private executor: Executor

  constructor(executor: Executor) {
    this.executor = executor
  }

  async run(cmd: string): Promise<RunResult> {
    // localhost "run a command" is a shell line; sh -c keeps it one argv element so the
    // executor never has to parse it. A nonzero exit comes back as {code}, never thrown.
    const { code, stdout, stderr } = await this.executor.exec('/bin/sh', ['-c', cmd])
    return { code, stdout, stderr }
  }

  async push(localPath: string, remotePath: string): Promise<void> {
    validatePath(localPath, 'local')
    validatePath(remotePath, 'remote')
    await this.executor.copy(localPath, remotePath) // "remote" == another local path at nursery
  }

  async pull(remotePath: string, localPath: string): Promise<void> {
    validatePath(remotePath, 'remote')
    validatePath(localPath, 'local')
    await this.executor.copy(remotePath, localPath)
  }

  async close(): Promise<void> {}
}

export const adapter: Adapter = {
  name: 'local',
  maxGrade: 'nursery',
  capabilities: [], // no remote host, no fan-out, no idempotent copy
  async open(opts: OpenOptions = {}): Promise<RemoteHost> {
    return new LocalHost(opts.executor ?? realExecutor)
  },
}
