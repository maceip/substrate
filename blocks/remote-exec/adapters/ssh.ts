// adapters/ssh.ts — ELEMENTARY grade (a single declared SSH host)
//
// The same port, now pointed at ONE real remote host. run() builds `ssh user@host <cmd>`
// argv and hands it to the injectable executor; push()/pull() build `scp` argv. Because the
// command and paths are passed as argv ARRAY ELEMENTS (never concatenated into a shell line
// on this side), there is no argument injection, and -i carries the key PATH while the key
// BYTES never appear in argv or in any returned value (PORT GUARANTEES 2 + 3). A remote
// command that exits nonzero comes back as {code} (GUARANTEE 1); only an unreachable host /
// failed spawn throws. Still one host, so it tops out at `elementary`.
//
// The executor is injectable for exactly the reason ai-model's transport is: tests pass a
// fake that records the ssh/scp argv and returns canned output — NO real ssh, NO network.

import type { Adapter, Executor, HostConfig, OpenOptions, RemoteHost, RunResult } from '../port.ts'
import { realExecutor, scpPullArgv, scpPushArgv, sshArgv, validatePath } from './_exec.ts'

function resolveHost(opts: OpenOptions): HostConfig {
  if (opts.host) return opts.host
  const host = process.env.REMOTE_HOST
  if (!host) throw new Error('remote-exec: the ssh adapter needs a host — pass opts.host or set REMOTE_HOST (and optionally REMOTE_USER / REMOTE_PORT / REMOTE_KEY)')
  return {
    host,
    user: process.env.REMOTE_USER,
    port: process.env.REMOTE_PORT ? Number(process.env.REMOTE_PORT) : undefined,
    keyPath: process.env.REMOTE_KEY, // a PATH only — never key bytes
  }
}

class SshHost implements RemoteHost {
  private executor: Executor
  private cfg: HostConfig

  constructor(executor: Executor, cfg: HostConfig) {
    this.executor = executor
    this.cfg = cfg
  }

  async run(cmd: string): Promise<RunResult> {
    const { code, stdout, stderr } = await this.executor.exec('ssh', sshArgv(this.cfg, cmd))
    return { code, stdout, stderr } // nonzero is surfaced; transport failure rejected by exec
  }

  async push(localPath: string, remotePath: string): Promise<void> {
    validatePath(localPath, 'local')
    validatePath(remotePath, 'remote')
    await this.executor.exec('scp', scpPushArgv(this.cfg, localPath, remotePath))
  }

  async pull(remotePath: string, localPath: string): Promise<void> {
    validatePath(remotePath, 'remote')
    validatePath(localPath, 'local')
    await this.executor.exec('scp', scpPullArgv(this.cfg, remotePath, localPath))
  }

  async close(): Promise<void> {}
}

export const adapter: Adapter = {
  name: 'ssh',
  maxGrade: 'elementary',
  // exit-code-surfaced + no-secret-leak are the requirements the first gate activates; the
  // ssh adapter satisfies both (argv arrays, key path never echoed). No fleet capabilities.
  capabilities: ['exit-code-surfaced', 'no-secret-leak'],
  async open(opts: OpenOptions = {}): Promise<RemoteHost> {
    return new SshHost(opts.executor ?? realExecutor, resolveHost(opts))
  },
}
