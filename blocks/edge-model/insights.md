# edge-model — insights (FoT)

Distilled, cross-project lessons. **Merged, not appended. Capped.** Each entry is the
abstracted lesson only — not raw data, not code. A lesson here was learned in one project
and is meant to save the next one from relearning it. The test of FoT: a lesson crossed a
repo boundary without being hand-copied.

> Seeded from the substrate design work; entries below are starting hypotheses, replaced as
> real projects deposit real lessons.

- **Content-address everything you download.** Name the artifact by the sha256 of its bytes, not
  by the URL or the repo coordinate. Then a re-fetch of the same ref is a cache hit by
  construction — the same multi-gigabyte model is never pulled twice — and two refs that
  resolve to identical bytes dedup for free. The URL is where it came from; the digest is what
  it *is*.
- **Verify the checksum on LOAD, not just on download.** The failure that bites local model work
  hardest is a half-downloaded or bit-rotted gguf that still "loads" and emits quiet garbage.
  Re-hash on every read out of the cache and reject a mismatch loudly. A download that succeeded
  once is not a guarantee the bytes on disk are still the bytes you fetched.
- **A warm pool beats reload-per-call.** Loading weights from disk on every inference is the
  bottleneck nobody profiles until it hurts. Load the artifact once, hold it, reuse it across
  run() calls — and let `info().loaded` tell the truth about whether you actually did. The
  per-call re-read reads as "stateless and clean" right up until it dominates the latency.

<!-- fot:federated:begin -->
## Federated lessons (auto-synced from the FoT store — do not edit by hand)

_None yet — lessons deposited via the federation store appear here._
<!-- fot:federated:end -->
