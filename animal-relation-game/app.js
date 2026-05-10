const WDQS_ENDPOINT = "https://query.wikidata.org/sparql";
const WIKIDATA_API_ENDPOINT = "https://www.wikidata.org/w/api.php";
const API_USER_AGENT = "AnimalRelationGame/0.1 (https://jon-mellon.github.io/animal-relation-game/)";
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const ASSET_VERSION = "20260510-5";

// Taxonomy is not a perfectly regular tree. We use rank specificity as a game-friendly approximation.
const RANK_DEPTH = {
  subspecies: 100,
  species: 95,
  subgenus: 92,
  genus: 90,
  subtribe: 85,
  tribe: 80,
  subfamily: 75,
  family: 70,
  superfamily: 65,
  infraorder: 62,
  suborder: 60,
  order: 55,
  superorder: 50,
  infraclass: 47,
  subclass: 45,
  class: 40,
  clade: 38,
  subphylum: 35,
  phylum: 30,
  kingdom: 10
};

const TAXON_DEPTH = {
  Aves: 44,
  Mammalia: 44,
  Amphibia: 44,
  Reptilia: 42,
  Amniota: 39,
  Tetrapoda: 38,
  Sarcopterygii: 37,
  Vertebrata: 35,
  Chordata: 30,
  Arthropoda: 30,
  Mollusca: 30,
  Annelida: 30,
  Echinodermata: 30,
  Cnidaria: 30,
  Deuterostomia: 28,
  Ecdysozoa: 27,
  Lophotrochozoa: 27,
  Protostomia: 26,
  Bilateria: 24,
  Eumetazoa: 18,
  Animalia: 10
};

const DISPLAY_RANKS = new Set([
  "species",
  "genus",
  "subfamily",
  "family",
  "superfamily",
  "order",
  "class",
  "clade",
  "subphylum",
  "phylum",
  "kingdom"
]);

const state = {
  pool: [],
  currentAnimals: [],
  lineages: {},
  pairResults: [],
  bestPairs: [],
  selectedPairKey: null,
  selectedQids: [],
  answered: false,
  lcaInfo: null,
  ready: false
};

const lineageCache = new Map();
const lcaInfoCache = new Map();
const summaryCache = new Map();
const badLineageQids = new Set();

const els = {
  status: document.querySelector("#status"),
  animals: document.querySelector("#animals"),
  selectionStatus: document.querySelector("#selectionStatus"),
  checkAnswer: document.querySelector("#checkAnswer"),
  answer: document.querySelector("#answer"),
  nextRound: document.querySelector("#nextRound")
};

async function init() {
  els.nextRound.addEventListener("click", startRound);
  els.checkAnswer.addEventListener("click", submitSelectedPair);

  try {
    const res = await fetch(`./data/animals.json?v=${ASSET_VERSION}`);
    if (!res.ok) throw new Error(`Animal pool failed: ${res.status}`);
    state.pool = await res.json();
    await startRound();
  } catch (err) {
    console.error(err);
    renderError("Could not load the local animal pool.");
  }
}

async function startRound() {
  resetStateForRound();
  renderStatus("Choosing animals and loading taxonomy...");
  renderQuestion();

  try {
    let lastError = null;

    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        state.currentAnimals = sampleThreeGoodAnimals(state.pool);
        renderQuestion();

        const qids = state.currentAnimals.map(animal => animal.qid);
        state.lineages = await fetchLineages(qids);
        state.pairResults = computePairResults(state.currentAnimals, state.lineages);
        state.bestPairs = getBestPairs(state.pairResults);

        if (isPlayableRound()) {
          state.ready = true;
          renderStatus("Taxonomy loaded. Select two animals.");
          renderQuestion();
          return;
        }

        lastError = new Error("Round had no single closest pair");
      } catch (err) {
        lastError = err;
        renderStatus("That set was ambiguous. Trying another set...");
      }
    }

    throw lastError ?? new Error("Could not find a playable animal triple");
  } catch (err) {
    console.error(err);
    renderError("Could not load taxonomy for this round. Try another round.");
    renderQuestion();
  }
}

function resetStateForRound() {
  state.currentAnimals = [];
  state.lineages = {};
  state.pairResults = [];
  state.bestPairs = [];
  state.selectedPairKey = null;
  state.selectedQids = [];
  state.answered = false;
  state.lcaInfo = null;
  state.ready = false;
  els.answer.classList.add("hidden");
  els.answer.innerHTML = "";
  renderSelectionStatus();
}

async function runSparql(query) {
  const url = new URL(WDQS_ENDPOINT);
  url.searchParams.set("query", query);
  url.searchParams.set("format", "json");

  const res = await fetchWithRetry(url.toString(), {
    headers: {
      Accept: "application/sparql-results+json"
    }
  });

  if (!res.ok) throw new Error(`SPARQL failed: ${res.status}`);
  return res.json();
}

async function fetchLineages(qids) {
  const lineages = {};
  const missing = [];
  const animalsByQid = new Map(state.currentAnimals.map(animal => [animal.qid, animal]));

  for (const qid of qids) {
    const cached = animalsByQid.get(qid)?.lineage ?? lineageCache.get(qid) ?? cacheGet(`lineage:${qid}`);
    if (cached) {
      lineages[qid] = cached;
    } else {
      missing.push(qid);
    }
  }

  if (missing.length) {
    const fetched = await fetchMissingLineages(missing);

    for (const qid of missing) {
      if (!fetched[qid] || fetched[qid].length < 3) {
        badLineageQids.add(qid);
        throw new Error(`Insufficient lineage for ${qid}`);
      }

      lineageCache.set(qid, fetched[qid]);
      cacheSet(`lineage:${qid}`, fetched[qid]);
      lineages[qid] = fetched[qid];
    }
  }

  return lineages;
}

async function fetchMissingLineages(qids) {
  return fetchLineagesViaWikidataApi(qids);
}

function lineageQuery(qids) {
  const values = qids.map(qid => `wd:${qid}`).join(" ");

  return `
SELECT ?animal ?ancestor ?ancestorLabel ?rank ?rankLabel WHERE {
  VALUES ?animal { ${values} }

  ?animal wdt:P171* ?ancestor.

  OPTIONAL { ?ancestor wdt:P105 ?rank. }

  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "en".
  }
}
`;
}

function parseLineageResults(data) {
  const output = {};

  for (const row of data.results.bindings) {
    const animalQid = qidFromEntityUrl(row.animal?.value);
    const ancestorQid = qidFromEntityUrl(row.ancestor?.value);
    if (!animalQid || !ancestorQid) continue;

    output[animalQid] ??= [];
    output[animalQid].push({
      qid: ancestorQid,
      label: row.ancestorLabel?.value ?? ancestorQid,
      rankQid: qidFromEntityUrl(row.rank?.value),
      rankLabel: normalizeRank(row.rankLabel?.value)
    });
  }

  for (const lineage of Object.values(output)) {
    lineage.sort((a, b) => getRankScore(b) - getRankScore(a));
  }

  return output;
}

async function fetchLineagesViaWikidataApi(qids) {
  const entityCache = new Map();
  const lineages = {};
  const rankQids = new Set();

  for (const qid of qids) {
    const lineage = [];
    const seen = new Set();
    let frontier = [qid];

    for (let depth = 0; frontier.length && depth < 70; depth++) {
      const infos = await getWikidataEntities(frontier, entityCache);
      const next = [];

      for (const currentQid of frontier) {
        if (seen.has(currentQid)) continue;
        seen.add(currentQid);

        const info = infos.get(currentQid);
        if (!info) continue;

        if (info.rankQid) rankQids.add(info.rankQid);
        lineage.push({
          qid: currentQid,
          label: info.label || currentQid,
          rankQid: info.rankQid,
          rankLabel: ""
        });

        for (const parentQid of info.parentQids) {
          if (!seen.has(parentQid)) next.push(parentQid);
        }
      }

      frontier = [...new Set(next)];
    }

    lineages[qid] = lineage;
  }

  const rankEntities = await getWikidataEntities([...rankQids], entityCache);
  for (const lineage of Object.values(lineages)) {
    for (const ancestor of lineage) {
      ancestor.rankLabel = normalizeRank(rankEntities.get(ancestor.rankQid)?.label);
    }
    lineage.sort((a, b) => getRankScore(b) - getRankScore(a));
  }

  return lineages;
}

async function getWikidataEntities(qids, entityCache) {
  const output = new Map();
  const missing = qids.filter(qid => qid && !entityCache.has(qid));

  for (let offset = 0; offset < missing.length; offset += 50) {
    const batch = missing.slice(offset, offset + 50);
    if (!batch.length) continue;

    const data = await wikidataAction({
      action: "wbgetentities",
      ids: batch.join("|"),
      props: "claims|labels",
      languages: "en"
    });

    for (const [qid, entity] of Object.entries(data.entities ?? {})) {
      const info = parseWikidataEntity(qid, entity);
      entityCache.set(qid, info);
    }
  }

  for (const qid of qids) {
    if (entityCache.has(qid)) output.set(qid, entityCache.get(qid));
  }

  return output;
}

function parseWikidataEntity(qid, entity) {
  return {
    qid,
    label: entity?.labels?.en?.value ?? qid,
    rankQid: claimEntityQids(entity, "P105")[0] ?? null,
    parentQids: claimEntityQids(entity, "P171")
  };
}

function claimEntityQids(entity, propertyId) {
  return (entity?.claims?.[propertyId] ?? [])
    .map(claim => claim.mainsnak?.datavalue?.value?.id)
    .filter(Boolean);
}

async function wikidataAction(params) {
  const url = new URL(WIKIDATA_API_ENDPOINT);
  url.searchParams.set("origin", "*");
  url.searchParams.set("format", "json");

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetchWithRetry(url.toString(), { headers: {} });

  if (!res.ok) throw new Error(`Wikidata API failed: ${res.status}`);
  return res.json();
}

async function fetchLcaInfo(ancestor) {
  if (!ancestor?.qid) return null;

  if (!ancestor.qid.startsWith("Q")) {
    return {
      qid: ancestor.qid,
      label: ancestor.label,
      description: `${ancestor.label} is the shared taxonomic group for the closest pair in this round.`,
      articleUrl: articleUrlForTitle(ancestor.label),
      image: null,
      summary: null
    };
  }

  const cached = lcaInfoCache.get(ancestor.qid) ?? cacheGet(`lcaInfo:${ancestor.qid}`);
  if (cached) return cached;

  const data = await wikidataAction({
    action: "wbgetentities",
    ids: ancestor.qid,
    props: "labels|descriptions|claims|sitelinks",
    languages: "en",
    sitefilter: "enwiki"
  });
  const entity = data.entities?.[ancestor.qid];
  const title = entity?.sitelinks?.enwiki?.title ?? null;
  const articleUrl = title ? articleUrlForTitle(title) : null;
  const summary = title ? await fetchWikipediaSummary(title) : null;
  const imageFile = claimStringValues(entity, "P18")[0] ?? null;

  const info = {
    qid: ancestor.qid,
    label: entity?.labels?.en?.value ?? ancestor.label,
    description: entity?.descriptions?.en?.value ?? "",
    articleUrl,
    image: summary?.thumbnail?.source ?? commonsFilePath(imageFile),
    summary
  };

  lcaInfoCache.set(ancestor.qid, info);
  cacheSet(`lcaInfo:${ancestor.qid}`, info);
  return info;
}

function claimStringValues(entity, propertyId) {
  return (entity?.claims?.[propertyId] ?? [])
    .map(claim => claim.mainsnak?.datavalue?.value)
    .filter(value => typeof value === "string" && value);
}

function commonsFilePath(filename) {
  if (!filename) return null;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename.replaceAll(" ", "_"))}`;
}

function lcaInfoQuery(qid) {
  return `
SELECT ?article ?ancestorLabel ?ancestorDescription ?image WHERE {
  VALUES ?ancestor { wd:${qid} }

  OPTIONAL {
    ?article schema:about ?ancestor;
             schema:isPartOf <https://en.wikipedia.org/>.
  }

  OPTIONAL { ?ancestor wdt:P18 ?image. }

  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "en".
  }
}
LIMIT 1
`;
}

async function fetchWikipediaSummary(title) {
  const cached = summaryCache.get(title) ?? cacheGet(`summary:${title}`);
  if (cached) return cached;

  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetchWithRetry(url, { headers: {} });

  if (!res.ok) return null;
  const summary = await res.json();
  summaryCache.set(title, summary);
  cacheSet(`summary:${title}`, summary);
  return summary;
}

async function fetchWithRetry(url, options) {
  let lastError = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchWithTimeout(url, options);
      if (res.ok || ![429, 500, 502, 503, 504].includes(res.status)) return res;
    } catch (err) {
      lastError = err;
    }

    await delay(650);
  }

  if (lastError) throw lastError;
  return fetchWithTimeout(url, options);
}

async function fetchWithTimeout(url, options, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function computePairResults(animals, lineages) {
  const pairs = [
    [animals[0], animals[1]],
    [animals[0], animals[2]],
    [animals[1], animals[2]]
  ];

  return pairs.map(([a, b]) => {
    const lca = findLCA(lineages[a.qid], lineages[b.qid]);
    return {
      a,
      b,
      key: pairKey(a, b),
      lca,
      score: getAncestorScore(lca)
    };
  });
}

function findLCA(lineageA = [], lineageB = []) {
  const bByQid = new Map(lineageB.map((ancestor, index) => [ancestor.qid, { ancestor, index }]));
  const common = lineageA
    .map((ancestor, indexA) => ({ ancestor, indexA, matchB: bByQid.get(ancestor.qid) }))
    .filter(item => item.matchB)
    .map(({ ancestor, indexA, matchB }) => ({
      ...ancestor,
      rankLabel: ancestor.rankLabel || matchB.ancestor?.rankLabel || "",
      specificityScore: 1000 - ((indexA + matchB.index) / 2)
    }));

  common.sort((x, y) => getAncestorScore(y) - getAncestorScore(x));
  return common.find(ancestor => DISPLAY_RANKS.has(ancestor.rankLabel)) ?? common[0] ?? null;
}

function getBestPairs(pairResults) {
  const sorted = [...pairResults].sort((a, b) => b.score - a.score);
  const bestScore = sorted[0]?.score ?? 0;
  return sorted.filter(result => result.score === bestScore);
}

function isPlayableRound() {
  if (state.pairResults.length !== 3) return false;
  if (state.pairResults.some(result => !result.lca || result.score <= 0)) return false;
  if (state.bestPairs.length !== 1) return false;
  if (state.bestPairs[0].lca?.label === "Animalia") return false;
  return Math.max(...state.pairResults.map(result => result.score)) >= RANK_DEPTH.kingdom;
}

function toggleAnimalSelection(animal) {
  if (state.answered || !state.ready) return;

  if (state.selectedQids.includes(animal.qid)) {
    state.selectedQids = state.selectedQids.filter(qid => qid !== animal.qid);
  } else {
    if (state.selectedQids.length >= 2) state.selectedQids.shift();
    state.selectedQids.push(animal.qid);
  }

  renderQuestion();
  renderSelectionStatus();
}

function submitSelectedPair() {
  if (state.selectedQids.length !== 2) return;
  const animals = state.selectedQids.map(qid => state.currentAnimals.find(animal => animal.qid === qid));
  choosePair(animals[0], animals[1]);
}

function choosePair(a, b) {
  if (state.answered || !state.ready) return;

  state.answered = true;
  state.selectedPairKey = pairKey(a, b);
  renderQuestion();
  renderSelectionStatus();
  renderAnswerLoading();

  fetchLcaInfo(state.bestPairs[0]?.lca)
    .then(info => {
      state.lcaInfo = info;
      renderAnswer();
    })
    .catch(err => {
      console.error(err);
      renderAnswer();
    });
}

function sampleThreeGoodAnimals(pool) {
  for (let attempt = 0; attempt < 300; attempt++) {
    const sample = shuffle(pool).slice(0, 3);

    if (new Set(sample.map(animal => animal.qid)).size < 3) continue;
    if (sample.some(animal => !animal.label || !animal.qid)) continue;
    if (sample.some(animal => badLineageQids.has(animal.qid))) continue;

    return sample;
  }

  throw new Error("Could not sample three animals");
}

function renderQuestion() {
  if (!state.currentAnimals.length) {
    els.animals.innerHTML = "";
    renderSelectionStatus();
    return;
  }

  const bestKeys = new Set(state.bestPairs.map(pair => pair.key));

  els.animals.innerHTML = state.currentAnimals.map((animal, index) => {
    const selected = state.selectedQids.includes(animal.qid);
    const selectedPairIsBest = state.selectedPairKey && bestKeys.has(state.selectedPairKey);
    const isInBestPair = state.answered && state.bestPairs.some(pair => pair.a.qid === animal.qid || pair.b.qid === animal.qid);
    const isInWrongSelectedPair = state.answered && !selectedPairIsBest && selected;
    const classes = [
      "animal-card",
      state.ready && !state.answered ? "selectable" : "",
      selected ? "selected" : "",
      isInBestPair ? "correct-card" : "",
      isInWrongSelectedPair ? "incorrect-card" : ""
    ].filter(Boolean).join(" ");

    return `
    <article class="${classes}" role="button" tabindex="${state.ready && !state.answered ? "0" : "-1"}" aria-pressed="${selected ? "true" : "false"}" data-animal-index="${index}">
      ${animal.image
        ? `<img src="${escapeAttr(animal.image)}" alt="">`
        : `<div class="image-placeholder" aria-hidden="true">No image</div>`}
      <div class="animal-card-body">
        <h3>${escapeHtml(animal.label)}</h3>
        <p>${escapeHtml(animal.description ?? "")}</p>
      </div>
    </article>
    `;
  }).join("");

  els.animals.querySelectorAll("[data-animal-index]").forEach(card => {
    const animal = state.currentAnimals[Number(card.dataset.animalIndex)];
    card.addEventListener("click", () => toggleAnimalSelection(animal));
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleAnimalSelection(animal);
      }
    });
  });

  renderSelectionStatus();
}

function renderSelectionStatus() {
  if (!els.selectionStatus || !els.checkAnswer) return;

  if (state.answered) {
    els.selectionStatus.textContent = "Answer checked.";
    els.checkAnswer.disabled = true;
    return;
  }

  if (!state.ready) {
    els.selectionStatus.textContent = "Loading taxonomy before answers are enabled.";
    els.checkAnswer.disabled = true;
    return;
  }

  const needed = 2 - state.selectedQids.length;
  els.selectionStatus.textContent = needed > 0
    ? `Select ${needed} more ${needed === 1 ? "animal" : "animals"}.`
    : "Ready to check your answer.";
  els.checkAnswer.disabled = state.selectedQids.length !== 2;
}

function renderAnswerLoading() {
  els.answer.classList.remove("hidden");
  els.answer.innerHTML = `
    <div class="answer-header">
      <div>
        <h3>Checking the shared ancestor...</h3>
        <p>Loading a short explanation from Wikipedia or Wikidata.</p>
      </div>
    </div>
  `;
}

function renderAnswer() {
  const best = state.bestPairs[0];
  const selectedIsCorrect = best?.key === state.selectedPairKey;
  const lca = best?.lca;
  const info = state.lcaInfo;
  const summaryText = info?.summary?.extract || info?.description || "No English Wikipedia summary was found for this ancestor.";
  const image = info?.image;
  const articleUrl = info?.summary?.content_urls?.desktop?.page || info?.articleUrl;
  const wikidataUrl = lca?.qid?.startsWith("Q") ? `https://www.wikidata.org/wiki/${encodeURIComponent(lca.qid)}` : null;
  const resultTitle = `Closest pair: ${formatPair(best.a, best.b)}`;

  els.answer.classList.remove("hidden");
  els.answer.innerHTML = `
    <div class="answer-header">
      <div>
        <h3>${escapeHtml(resultTitle)}</h3>
        <p>This pair shares the most specific ranked ancestor in the round.</p>
      </div>
      <span class="result-badge ${selectedIsCorrect ? "correct" : "incorrect"}">
        ${selectedIsCorrect ? "Correct" : "Not quite"}
      </span>
    </div>
    <div class="answer-body">
      <div>
        <h3>Last common ancestor: ${escapeHtml(lca?.label ?? "Unknown")}</h3>
        <div class="ancestor-meta">
          ${lca?.rankLabel ? `<span class="meta-pill">Rank: ${escapeHtml(lca.rankLabel)}</span>` : ""}
          ${lca?.qid?.startsWith("Q") ? `<span class="meta-pill">${escapeHtml(lca.qid)}</span>` : ""}
        </div>
        <p>${escapeHtml(summaryText)}</p>
        <div class="source-links">
          ${articleUrl ? `<a class="source-link" href="${escapeAttr(articleUrl)}" target="_blank" rel="noreferrer">Read on Wikipedia</a>` : ""}
          ${wikidataUrl ? `<a class="source-link" href="${escapeAttr(wikidataUrl)}" target="_blank" rel="noreferrer">View on Wikidata</a>` : ""}
        </div>
        <h3>Why</h3>
        <ul class="why-list">
          ${state.pairResults.map(result => `
            <li>
              <strong>${escapeHtml(formatPair(result.a, result.b))}</strong>
              <span>${escapeHtml(result.lca?.label ?? "Unknown")} ${result.lca?.rankLabel ? `(${escapeHtml(result.lca.rankLabel)})` : ""}</span>
            </li>
          `).join("")}
        </ul>
      </div>
      <div class="answer-media">
        ${image ? `<img src="${escapeAttr(image)}" alt="">` : `<div class="image-placeholder">No image</div>`}
      </div>
    </div>
  `;

  renderQuestion();
  renderSelectionStatus();
}

function renderStatus(message) {
  els.status.classList.remove("error");
  els.status.textContent = message;
}

function renderError(message) {
  els.status.classList.add("error");
  els.status.textContent = message;
}

function formatPair(a, b) {
  return `${a.label} + ${b.label}`;
}

function pairKey(a, b) {
  return [a.qid, b.qid].sort().join("|");
}

function getRankScore(ancestor) {
  return RANK_DEPTH[ancestor?.rankLabel] ?? 0;
}

function getAncestorScore(ancestor) {
  if (!ancestor) return 0;
  const baseScore = TAXON_DEPTH[ancestor.label] ?? getRankScore(ancestor);
  const tieBreak = ancestor.specificityScore ? ancestor.specificityScore / 10000 : 0;
  return baseScore + tieBreak;
}

function normalizeRank(value) {
  return String(value ?? "").trim().toLowerCase();
}

function qidFromEntityUrl(value) {
  const match = String(value ?? "").match(/\/entity\/(Q\d+)$/);
  return match?.[1] ?? null;
}

function wikipediaTitleFromUrl(url) {
  const marker = "/wiki/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length)).replaceAll("_", " ");
}

function articleUrlForTitle(title) {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(" ", "_"))}`;
}

function shuffle(values) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cacheSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify({
      savedAt: Date.now(),
      value
    }));
  } catch {
    // localStorage can be unavailable in private windows or strict browser settings.
  }
}

function cacheGet(key, maxAgeMs = CACHE_MAX_AGE_MS) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.savedAt > maxAgeMs) return null;
    return parsed.value;
  } catch {
    return null;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

init();
