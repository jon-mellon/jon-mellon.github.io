# GSS Change Decomposition

This folder contains the data generator for the static GSS viewer at
`static/gss-change/`.

The generator uses:

- `gssr::gss_all` for the cumulative General Social Survey file.
- `socialchange::cr_ic()` for the algebraic intracohort change and cohort
  replacement decomposition.
- `wtssps` as the survey weight, so the 2021, 2022, and 2024 GSS waves are
  included.

Run:

```sh
Rscript gss-change/generate_decompositions.R --limit=100
```

The script writes `static/gss-change/data/decompositions.json`. Mirror the
static folder to `public/gss-change/` and `docs/gss-change/` after regenerating
if you are not rebuilding the full Hugo site.
