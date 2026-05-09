#!/usr/bin/env node

const fs = require("node:fs/promises");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const SEED_PATH = path.join(__dirname, "seed-animals.json");
const OUT_PATH = path.join(ROOT, "data", "animals.json");
const API_USER_AGENT = "AnimalRelationGame/0.1 (https://jon-mellon.github.io/animal-relation-game/)";
const MEDIAWIKI_ENDPOINT = "https://en.wikipedia.org/w/api.php";

async function main() {
  const titles = JSON.parse(await fs.readFile(SEED_PATH, "utf8"));
  const byTitle = await fetchAnimalRecords(titles);
  const animals = [];
  const seenQids = new Set();

  for (const title of titles) {
    const animal = byTitle.get(title);

    if (!animal) {
      console.warn(`Skipping ${title}: no Wikidata item found`);
      continue;
    }

    if (seenQids.has(animal.qid)) {
      console.warn(`Skipping ${title}: duplicate ${animal.qid}`);
      continue;
    }

    seenQids.add(animal.qid);
    animals.push(animal);
    console.log(`${animals.length}. ${animal.label} (${animal.qid})`);
  }

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, `${JSON.stringify(animals, null, 2)}\n`);
  console.log(`Wrote ${animals.length} animals to ${path.relative(process.cwd(), OUT_PATH)}`);
}

async function fetchAnimalRecords(titles) {
  const output = new Map();

  for (let offset = 0; offset < titles.length; offset += 40) {
    const batch = titles.slice(offset, offset + 40);
    const batchRecords = await fetchAnimalRecordBatch(batch);

    for (const [title, animal] of batchRecords) {
      output.set(title, animal);
    }

    console.log(`Resolved title batch ${offset + 1}-${Math.min(offset + batch.length, titles.length)}`);
    await delay(800);
  }

  return output;
}

async function fetchAnimalRecordBatch(titles) {
  const body = new URLSearchParams();
  body.set("action", "query");
  body.set("format", "json");
  body.set("origin", "*");
  body.set("redirects", "1");
  body.set("titles", titles.join("|"));
  body.set("prop", "pageprops|pageimages|pageterms");
  body.set("ppprop", "wikibase_item");
  body.set("piprop", "original|thumbnail");
  body.set("pithumbsize", "700");
  body.set("wbptterms", "label|description");

  const res = await fetchWithRetry(MEDIAWIKI_ENDPOINT, {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": API_USER_AGENT,
      "Api-User-Agent": API_USER_AGENT
    }
  });

  if (!res.ok) throw new Error(`MediaWiki API failed: ${res.status}`);

  const json = await res.json();
  const byTitle = new Map();
  const seedByTitle = makeSeedTitleMap(titles, json.query);

  for (const page of Object.values(json.query?.pages ?? {})) {
    if (!page || page.missing || !page.pageprops?.wikibase_item) continue;

    const seedTitle = seedByTitle.get(normalizeTitle(page.title));
    if (!seedTitle) continue;

    const label = page.terms?.label?.[0] ?? page.title;
    const description = page.terms?.description?.[0] ?? "";
    const articleTitle = page.title;
    const articleUrl = articleUrlForTitle(articleTitle);
    const image = page.original?.source ?? page.thumbnail?.source ?? "";

    byTitle.set(seedTitle, {
      qid: page.pageprops.wikibase_item,
      label,
      description,
      articleTitle,
      articleUrl,
      image,
      rank: "species"
    });
  }

  return byTitle;
}

function makeSeedTitleMap(titles, query) {
  const byTitle = new Map(titles.map(title => [normalizeTitle(title), title]));
  const seedByTitle = new Map(byTitle);

  for (const item of query?.normalized ?? []) {
    const seed = byTitle.get(normalizeTitle(item.from));
    if (seed) seedByTitle.set(normalizeTitle(item.to), seed);
  }

  for (const item of query?.redirects ?? []) {
    const seed = seedByTitle.get(normalizeTitle(item.from)) ?? byTitle.get(normalizeTitle(item.from));
    if (seed) seedByTitle.set(normalizeTitle(item.to), seed);
  }

  return seedByTitle;
}

function articleUrlForTitle(title) {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(" ", "_"))}`;
}

function normalizeTitle(title) {
  return title.trim().replaceAll("_", " ").toLowerCase();
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options) {
  const delays = [0, 1500, 4000, 8000];

  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt]) await delay(delays[attempt]);

    const res = await fetchWithTimeout(url, options);
    if (res.ok || ![429, 500, 502, 503, 504].includes(res.status)) return res;
  }

  return fetchWithTimeout(url, options);
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
