// adapters/_exec.ts — shared executor + argv/path helpers for the remote-exec adapters.
//
// One place that knows how to (a) actually spawn a process and capture its streams, (b)
// copy a local file, (c) build ssh/scp argv from a HostConfig, (d) validate a path, and
// (e) checksum a file — so the three grades don't each re-derive them. Everything here
// speaks the PORT types. Adapters add policy (which host, fan-out, idempotency), never the
// mechanics of spawning or argv construction.
//
// The REAL executor wraps node:child_process.execFile and node:fs.copyFile. It is the
// default; a test injects a fake Executor of the same shape and nothing here runs ssh.

import { execFile } from 'node:child_process'
import { copyFile, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import type { ExecResult, Executor, HostConfig } from '../port.ts'

// realExecutor: child_process + fs. The distinction the port relies on (PORT GUARANTEE 1)
// is preserved here: a process that SPAWNS and exits nonzero RESOLVES with that code; a
// process that could NOT be spawned (ENOENT, etc.) REJECTS. We capture stdout/stderr in
// both the success and the nonzero-exit case, which is why we don't let execFile's callback
// turn a nonzero exit into the error path.
export const realExecutor: Executor = {
  exec: (file, args) =>
    new Promise<ExecResult>((resolve, reject) => {
      execFile(file, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err && typeof (err as { code?: unknown }).code === 'number') {
          // ran and exited nonzero — SURFACE it, don't throw
          resolve({ code: (err as { code: number }).code, stdout, stderr })
        } else if (err) {
          // could not spawn (ENOENT / EACCES / killed by signal) — TRANSPORT failure
          reject(err)
        } else {
          resolve({ code: 0, stdout, stderr })
        }
      })
    }),
  copy: (src, dest) => copyFile(src, dest),
}

// --- Path validation (PORT GUARANTEE 2) ------------------------------------------------
// We always pass argv arrays (never a shell string), so paths are not interpreted by a
// shell. Validation is defense in depth: reject the inputs that have no business in a path
// and that would be dangerous IF a path ever reached a shell — empty, NUL, and the shell
// metacharacters. This runs before anything is spawned.

const SHELL_META = /[;&|`$()<>\n\r"'\\*?]/

export function validatePath(p: string, label: string): void {
  if (typeof p !== 'string' || p.length === 0) throw new Error(`remote-exec: ${label} path must be a non-empty string`)
  if (p.includes('\0')) throw new Error(`remote-exec: ${label} path contains a NUL byte`)
  if (SHELL_META.test(p)) throw new Error(`remote-exec: ${label} path contains a shell metacharacter — refused before spawn`)
}

// --- ssh/scp argv construction ---------------------------------------------------------
// Built as argv arrays so the remote command is one argument to ssh, never concatenated
// into a shell line on this side. BatchMode=yes makes a missing key fail fast (transport
// failure) instead of hanging on an interactive prompt. The key PATH may appear in argv via
// -i; the key BYTES never do (PORT GUARANTEE 3) — ssh reads the file itself.

function baseSshOpts(cfg: HostConfig): string[] {
  const opts = ['-o', 'BatchMode=yes']
  if (cfg.port) opts.push('-p', String(cfg.port))
  if (cfg.keyPath) opts.push('-i', cfg.keyPath) // a PATH, not the key material
  return opts
}

export function target(cfg: HostConfig): string {
  return cfg.user ? `${cfg.user}@${cfg.host}` : cfg.host
}

// ssh argv: `ssh [opts] user@host <cmd>`. The command is a single trailing argument.
export function sshArgv(cfg: HostConfig, cmd: string): string[] {
  return [...baseSshOpts(cfg), target(cfg), cmd]
}

// scp argv for an upload: `scp [opts] <local> user@host:<remote>`. scp uses -P (capital)
// for the port, unlike ssh's -p, so we build its opts separately.
function scpOpts(cfg: HostConfig): string[] {
  const opts = ['-o', 'BatchMode=yes']
  if (cfg.port) opts.push('-P', String(cfg.port))
  if (cfg.keyPath) opts.push('-i', cfg.keyPath)
  return opts
}

export function scpPushArgv(cfg: HostConfig, localPath: string, remotePath: string): string[] {
  return [...scpOpts(cfg), localPath, `${target(cfg)}:${remotePath}`]
}

export function scpPullArgv(cfg: HostConfig, remotePath: string, localPath: string): string[] {
  return [...scpOpts(cfg), `${target(cfg)}:${remotePath}`, localPath]
}

// --- Checksums (idempotent copy, graduated) --------------------------------------------
// sha256 of a LOCAL file, for comparing against a remote `sha256sum` so a push can skip a
// host whose file already matches. Pure read — never spawns.

export async function sha256Local(path: string): Promise<string> {
  const buf = await readFile(path)
  return createHash('sha256').update(buf).digest('hex')
}

// remoteSha256: parse the hex digest out of `sha256sum <path>` output (first whitespace
// token). Returns null when the remote command failed (file absent / tool missing), which
// the caller treats as "not matching — copy it".
export function parseRemoteSha256(stdout: string): string | null {
  const tok = stdout.trim().split(/\s+/)[0]
  return /^[0-9a-f]{64}$/.test(tok ?? '') ? tok : null
}
