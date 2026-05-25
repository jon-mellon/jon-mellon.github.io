# GSS Change Decomposition

This folder contains the data generator for the static GSS viewer at
`static/gss-change/`.

The generator uses:

- `gssr::gss_all` for the cumulative General Social Survey file.
- `socialchange::cr_ic()` for the algebraic intracohort change and cohort
  replacement decomposition.
- `wtssps` as the survey weight, so the 2021, 2022, and 2024 GSS waves are
  included. The generator passes the weight column to `cr_ic()`, which computes
  weighted year-cohort means and weighted cohort proportions before the
  decomposition.
- A reviewed variable specification that drops non-substantive response codes
  such as other, don't know, refused, no-answer, IAP, and not-available codes.
  The displayed scale uses original response units and is oriented so larger
  values are the affirmative/agreement/approval or high-intensity end of the
  item wording. Multi-category items are ordinal original-unit indices, not
  percentages.

Run:

```sh
Rscript gss-change/generate_decompositions.R --limit=200
```

The script writes `static/gss-change/data/decompositions.json`. Mirror the
static folder to `public/gss-change/` and `docs/gss-change/` after regenerating
if you are not rebuilding the full Hugo site.
