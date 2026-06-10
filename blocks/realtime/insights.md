# realtime — insights (FoT)

Distilled, cross-project lessons. **Merged, not appended. Capped.** Each entry is the
abstracted lesson only — not raw data, not code. A lesson here was learned in one project
and is meant to save the next one from relearning it. The test of FoT: a lesson crossed a
repo boundary without being hand-copied.

> Seeded from the substrate design work; entries below are starting hypotheses, replaced as
> real projects deposit real lessons.

- **Replay-on-reconnect is the contract, not a feature.** Every live client WILL disconnect —
  laptops sleep, mobile networks flap. The per-topic seq + `fromSeq` pair turns a reconnect
  from "events silently lost" into an ordered catch-up. Put seq in the port on day one;
  bolting it on later renumbers history under every consumer that stored one.
- **Backpressure is a stated policy or it is a memory leak.** A slow consumer is a certainty,
  not an edge case. Decide out loud what happens when its queue fills — here: bounded queue,
  drop-oldest, counted and observable via stats(). The only unacceptable choice is the
  implicit one: unbounded buffering that reads as "working" until the process dies.
- **Fanout topology is the engine, not the port.** In-process set, SSE bridge, real broker —
  the app says publish/subscribe either way. What actually forces graduation is `instances>1`:
  the moment a subscriber can be attached to a different process, in-process fanout is
  silently wrong, not slow. Wire the gate, let it fire.

<!-- fot:federated:begin -->
## Federated lessons (auto-synced from the FoT store — do not edit by hand)

_None yet — lessons deposited via the federation store appear here._
<!-- fot:federated:end -->
