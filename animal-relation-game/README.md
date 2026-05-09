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

Commit `index.html`, `styles.css`, `app.js`, `data/animals.json`, `tools/`, and this README. GitHub Pages can serve the folder directly with no backend and no API keys.
