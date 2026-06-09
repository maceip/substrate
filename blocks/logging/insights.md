# logging / observability — insights (FoT)

Distilled cross-project lessons. Merged, capped — not a log.

- **Redaction belongs in the logger, not at every call site.** If a dev has to remember not to
  log a password, one will. The structured adapter scrubs known secret keys centrally; that is
  why redaction is a graduation requirement, not a code-review note.
- **A string log is a future regret in production.** `console.log("user " + id + " did X")` is
  unparseable the moment you have volume. The prod gate forces JSON before that bites.
- **Correlation id is the cheapest thing that makes multi-instance logs usable.** Add it via
  `child({ correlationId })` at the request boundary once, and every downstream line inherits it.
