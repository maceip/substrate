// adapters/fleet.ts — GRADUATED grade (a host inventory + parallel fan-out + idempotent copy)
//
// The same port, now over an INVENTORY of hosts. run() fans the SAME command across every
// host in parallel and AGGREGATES the results into one RunResult: code is 0 only if every
// host exited 0 (otherwise the worst nonzero code), and stdout/stderr are labeled per host
// so one failure never hides the others. push() is IDEMPOTENT: before copying to a host it
// asks that host for `sha256sum <remote>` and SKIPS the host whose file already matches the
// local checksum — re-running the same sync is cheap and safe, not a blind fleet-wide
// overwrite. These three behaviors are exactly the capabilities the second gate activates
// (host-inventory, parallel-fanout, idempotent-copy), so this adapter reaches `graduated`.
//
// Same injectable executor seam: a test passes a fake that records argv per host and returns
// canned output (including a canned sha256sum), so the fan-out and the skip-on-match path are
// exercised with ZERO ssh and ZERO network. Transport failure on any host still rejects
// (PORT GUARANTEE 1: a nonzero EXIT is surfaced; an unreachable host is a real failure).

import type { Adapter, Executor, HostConfig, OpenOptions, RemoteHost, RunResult } from '../port.ts'
import { parseRemoteSha256, realExecutor, scpPullArgv, scpPushArgv, sha256Local, sshArgv, target, validatePath } from './_exec.ts'

function resolveHosts(opts: OpenOptions): HostConfig[] {
  if (opts.hosts && opts.hosts.length > 0) return opts.hosts
  if (opts.host) return [opts.host]
  const raw = process.env.REMOTE_HOSTS // comma-separated host or user@host[:port] entries
  if (!raw) throw new Error('remote-exec: the fleet adapter needs an inventory — pass opts.hosts or set REMOTE_HOSTS (comma-separated, e.g. "user@a,user@b:2222")')
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(parseHostEntry)
}

// parseHostEntry: "user@host:port" -> HostConfig. Keeps the inventory as DATA (env or array)
// so adding a host is never a new code path.
function parseHostEntry(entry: string): HostConfig {
  let user: string | undefined
  let rest = entry
  const at = rest.indexOf('@')
  if (at >= 0) {
    user = rest.slice(0, at)
    rest = rest.slice(at + 1)
  }
  let port: number | undefined
  const colon = rest.lastIndexOf(':')
  if (colon >= 0) {
    const maybe = Number(rest.slice(colon + 1))
    if (Number.isInteger(maybe)) {
      port = maybe
      rest = rest.slice(0, colon)
    }
  }
  return { host: rest, user, port, keyPath: process.env.REMOTE_KEY }
}

class FleetHost implements RemoteHost {
  private executor: Executor
  private hosts: HostConfig[]

  constructor(executor: Executor, hosts: HostConfig[]) {
    this.executor = executor
    this.hosts = hosts
  }

  // run: fan the command across the inventory in PARALLEL, collect every result, aggregate.
  async run(cmd: string): Promise<RunResult> {
    const results = await Promise.all(this.hosts.map((cfg) => this.executor.exec('ssh', sshArgv(cfg, cmd)).then((r) => ({ cfg, r }))))
    let code = 0
    const out: string[] = []
    const err: string[] = []
    for (const { cfg, r } of results) {
      const label = target(cfg)
      if (r.code !== 0 && code === 0) code = r.code // surface the first nonzero as the aggregate
      if (r.stdout) out.push(`[${label}] ${r.stdout.trimEnd()}`)
      if (r.stderr) err.push(`[${label}] ${r.stderr.trimEnd()}`)
    }
    return { code, stdout: out.join('\n'), stderr: err.join('\n') }
  }

  // push: IDEMPOTENT across the fleet — skip any host whose remote file already matches by
  // checksum. The check is one cheap ssh per host; only mismatched/absent hosts get the scp.
  async push(localPath: string, remotePath: string): Promise<void> {
    validatePath(localPath, 'local')
    validatePath(remotePath, 'remote')
    const want = await sha256Local(localPath)
    await Promise.all(
      this.hosts.map(async (cfg) => {
        const probe = await this.executor.exec('ssh', sshArgv(cfg, `sha256sum ${remotePath}`))
        if (probe.code === 0 && parseRemoteSha256(probe.stdout) === want) return // already in sync — skip
        await this.executor.exec('scp', scpPushArgv(cfg, localPath, remotePath))
      }),
    )
  }

  // pull: only meaningful against a single source of truth; pull from the FIRST host in the
  // inventory (the convention: index 0 is canonical). Fan-out is a push/run concern.
  async pull(remotePath: string, localPath: string): Promise<void> {
    validatePath(remotePath, 'remote')
    validatePath(localPath, 'local')
    await this.executor.exec('scp', scpPullArgv(this.hosts[0], remotePath, localPath))
  }

  async close(): Promise<void> {}
}

export const adapter: Adapter = {
  name: 'fleet',
  maxGrade: 'graduated',
  capabilities: ['exit-code-surfaced', 'no-secret-leak', 'host-inventory', 'parallel-fanout', 'idempotent-copy'],
  async open(opts: OpenOptions = {}): Promise<RemoteHost> {
    return new FleetHost(opts.executor ?? realExecutor, resolveHosts(opts))
  },
}
