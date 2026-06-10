# async-jobs — insights (FoT)

Distilled, cross-project lessons. **Merged, not appended. Capped.** Each entry is the
abstracted lesson only — not raw data, not code. A lesson here was learned in one project
and is meant to save the next one from relearning it. The test of FoT: a lesson crossed a
repo boundary without being hand-copied.

> Seeded from the substrate design work; entries below are starting hypotheses, replaced as
> real projects deposit real lessons.

- **The job id is the contract; timing is not.** enqueue() returns a handle, and the only
  thing the port guarantees is the terminal state behind it. The moment app code peeks at
  intermediate states ("is it running yet?") it has coupled itself to one adapter's
  scheduling — and the swap to a real queue breaks it.
- **Retries without a dead-letter list just relocate the silence.** Re-attempting and then
  dropping the job is the same incident, delayed. The pair travels together: retry the
  transient, quarantine the exhausted, and make the quarantine inspectable — that is why
  one gate activates both requirements at once.
- **An in-memory queue reads as "working" right up until the deploy.** A restart between
  enqueue and execution silently loses accepted work in production. The gate signal is not
  "the queue looks fine" but `instances>1` / real volume — wire the gate, let it fire, and
  graduate to a durable queue before the loss, not after.

<!-- fot:federated:begin -->
## Federated lessons (auto-synced from the FoT store — do not edit by hand)

_None yet — lessons deposited via the federation store appear here._
<!-- fot:federated:end -->
