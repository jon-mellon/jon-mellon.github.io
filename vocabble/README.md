# Vocabble

Vocabble is served as static files from `static/vocabble/`, which Hugo publishes to
`/vocabble/`. The checked-in `public/vocabble/` and `docs/vocabble/` copies are
generated publishing outputs.

Generate a new static batch:

```sh
Rscript vocabble/generate_puzzles.R 90 2026-05-03
```

Validate generated puzzles:

```sh
Rscript vocabble/test_generator.R
```

The current batch generator uses validated deterministic board fixtures plus
date-seeded clue masks. It is structured so richer board-search generation can
replace or augment those fixtures without changing the frontend JSON contract.

The browser selects exactly one puzzle by UTC date from
`static/vocabble/puzzles/manifest.json`. The UI does not expose archive
navigation, although future puzzle JSON is intentionally present as static data.
