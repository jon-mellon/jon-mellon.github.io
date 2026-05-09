# Animal Relatives

Static browser game hosted on GitHub Pages. Players choose which two of three animals share the most recent common ancestor.

## Data Sources

- Local `data/animals.json` for random animal selection.
- Wikidata Query Service for taxonomic lineages.
- English Wikipedia REST page summary endpoint for readable explanations.

The browser app uses `Api-User-Agent` headers for Wikimedia requests where browsers permit custom headers, keeps live queries small, and caches repeat taxonomy and summary lookups in `localStorage`.

## Development

Open the page through a local server:

```bash
python3 -m http.server 8000
```

Then visit:

```text
http://localhost:8000/animal-relation-game/
```

Do not open the file directly as `file://`, because browser module loading and CORS behavior may differ.

## Updating the Animal Pool

Edit `tools/seed-animals.json`, then run:

```bash
node animal-relation-game/tools/build-animal-pool.js
```

The script resolves each Wikipedia article title to a Wikidata QID and writes `data/animals.json`.

Each animal record contains:

- `qid`
- `label`
- `description`
- `articleTitle`
- `articleUrl`
- `image`
- `rank`

## Deployment

This repository publishes GitHub Pages from `docs/`. Keep the playable app in `static/animal-relation-game/`; Hugo copies that folder to `public/animal-relation-game/`, and `build.R` copies `public/` to `docs/`.

For immediate deployment without a full site rebuild, also keep `docs/animal-relation-game/` in sync. The current URL is:

```text
https://jon-mellon.github.io/animal-relation-game/
```

No backend or API keys are needed.
