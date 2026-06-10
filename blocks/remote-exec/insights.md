# remote-exec — insights (FoT)

Distilled, cross-project lessons. **Merged, not appended. Capped.** Each entry is the
abstracted lesson only — not raw data, not code. A lesson here was learned in one project
and is meant to save the next one from relearning it. The test of FoT: a lesson crossed a
repo boundary without being hand-copied.

> Seeded from the substrate design work; entries below are starting hypotheses, replaced as
> real projects deposit real lessons.

- **Surface the exit code; do not throw on it.** A remote command that exits nonzero is DATA
  the caller must branch on — a failed migration step, a service that wouldn't restart. The
  moment a nonzero exit becomes an exception, the `while ssh host cmd; do ...` loop everyone
  writes turns into a swallowed failure or an unhandled rejection. Throwing is reserved for
  the host being unreachable — the command never ran. That distinction is the whole port.
- **Never echo key material; pass argv arrays, not shell lines.** The key lives on disk; the
  port carries a key PATH (ssh -i) and never the bytes, and nothing the host returns is
  scanned back into a log. Build `ssh user@host <cmd>` as an argv array so the remote command
  is ONE argument — a path with a space or a `;` in it cannot become a second command.
- **Idempotent copy by checksum, not by timestamp or blind overwrite.** Fan-out sync re-runs
  constantly (the same `scp` in a loop across five hosts). Compare the local sha256 to the
  host's `sha256sum` and SKIP the hosts already in sync — re-running is then cheap and safe,
  and a half-finished fleet push finishes cleanly instead of re-pushing everything.

<!-- fot:federated:begin -->
## Federated lessons (auto-synced from the FoT store — do not edit by hand)

_None yet — lessons deposited via the federation store appear here._
<!-- fot:federated:end -->
