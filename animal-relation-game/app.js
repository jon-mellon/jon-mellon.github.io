const WDQS_ENDPOINT = "https://query.wikidata.org/sparql";
const API_USER_AGENT = "AnimalRelationGame/0.1 (https://jon-mellon.github.io/animal-relation-game/)";
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

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
  subphylum: 35,
  phylum: 30,
  kingdom: 10
};

const DISPLAY_RANKS = new Set([
  "species",
  "genus",
  "subfamily",
  "family",
  "superfamily",
  "order",
  "class",
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
  answered: false,
  lcaInfo: null,
  ready: false
};

const lineageCache = new Map();
const lcaInfoCache = new Map();
const summaryCache = new Map();

const els = {
  status: document.querySelector("#status"),
  animals: document.querySelector("#animals"),
  choices: document.querySelector("#choices"),
  answer: document.querySelector("#answer"),
  nextRound: document.querySelector("#nextRound")
};

async function init() {
  els.nextRound.addEventListener("click", startRound);

  try {
    const res = await fetch("./data/animals.json");
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
    for (let attempt = 0; attempt < 10; attempt++) {
      state.currentAnimals = sampleThreeGoodAnimals(state.pool);
      renderQuestion();

      const qids = state.currentAnimals.map(animal => animal.qid);
      state.lineages = await fetchLineages(qids);
      state.pairResults = computePairResults(state.currentAnimals, state.lineages);
      state.bestPairs = getBestPairs(state.pairResults);

      if (isPlayableRound()) {
        state.ready = true;
        renderStatus("Taxonomy loaded. Choose the closest pair.");
        renderQuestion();
        return;
      }
    }

    throw new Error("Could not find a playable animal triple");
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
  state.answered = false;
  state.lcaInfo = null;
  state.ready = false;
  els.answer.classList.add("hidden");
  els.answer.innerHTML = "";
}

async function runSparql(query) {
  const url = new URL(WDQS_ENDPOINT);
  url.searchParams.set("query", query);
  url.searchParams.set("format", "json");

  const res = await fetchWithRetry(url.toString(), {
    headers: {
      Accept: "application/sparql-results+json",
      "Api-User-Agent": API_USER_AGENT
    }
  });

  if (!res.ok) throw new Error(`SPARQL failed: ${res.status}`);
  return res.json();
}

async function fetchLineages(qids) {
  const lineages = {};
  const missing = [];

  for (const qid of qids) {
    const cached = lineageCache.get(qid) ?? cacheGet(`lineage:${qid}`);
    if (cached) {
      lineages[qid] = cached;
    } else {
      missing.push(qid);
    }
  }

  if (missing.length) {
    const data = await runSparql(lineageQuery(missing));
    const fetched = parseLineageResults(data);

    for (const qid of missing) {
      if (!fetched[qid] || fetched[qid].length < 3) {
        throw new Error(`Insufficient lineage for ${qid}`);
      }

      lineageCache.set(qid, fetched[qid]);
      cacheSet(`lineage:${qid}`, fetched[qid]);
      lineages[qid] = fetched[qid];
    }
  }

  return lineages;
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

async function fetchLcaInfo(ancestor) {
  if (!ancestor?.qid) return null;

  const cached = lcaInfoCache.get(ancestor.qid) ?? cacheGet(`lcaInfo:${ancestor.qid}`);
  if (cached) return cached;

  const data = await runSparql(lcaInfoQuery(ancestor.qid));
  const binding = data.results.bindings[0];

  const articleUrl = binding?.article?.value ?? null;
  const title = articleUrl ? wikipediaTitleFromUrl(articleUrl) : null;
  const summary = title ? await fetchWikipediaSummary(title) : null;

  const info = {
    qid: ancestor.qid,
    label: binding?.ancestorLabel?.value ?? ancestor.label,
    description: binding?.ancestorDescription?.value ?? "",
    articleUrl,
    image: summary?.thumbnail?.source ?? binding?.image?.value ?? null,
    summary
  };

  lcaInfoCache.set(ancestor.qid, info);
  cacheSet(`lcaInfo:${ancestor.qid}`, info);
  return info;
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
  const res = await fetchWithRetry(url, {
    headers: {
      "Api-User-Agent": API_USER_AGENT
    }
  });

  if (!res.ok) return null;
  const summary = await res.json();
  summaryCache.set(title, summary);
  cacheSet(`summary:${title}`, summary);
  return summary;
}

async function fetchWithRetry(url, options) {
  const first = await fetch(url, options);
  if (first.ok || ![429, 500, 502, 503, 504].includes(first.status)) return first;
  await delay(650);
  return fetch(url, options);
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
      score: getRankScore(lca)
    };
  });
}

function findLCA(lineageA = [], lineageB = []) {
  const bByQid = new Map(lineageB.map(ancestor => [ancestor.qid, ancestor]));
  const common = lineageA
    .filter(ancestor => bByQid.has(ancestor.qid))
    .map(ancestor => ({
      ...ancestor,
      rankLabel: ancestor.rankLabel || bByQid.get(ancestor.qid)?.rankLabel || ""
    }));

  common.sort((x, y) => getRankScore(y) - getRankScore(x));
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
  return Math.max(...state.pairResults.map(result => result.score)) > RANK_DEPTH.kingdom;
}

function choosePair(a, b) {
  if (state.answered || !state.ready) return;

  state.answered = true;
  state.selectedPairKey = pairKey(a, b);
  renderPairButtons();
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
  for (let attempt = 0; attempt < 200; attempt++) {
    const sample = shuffle(pool).slice(0, 3);

    if (new Set(sample.map(animal => animal.qid)).size < 3) continue;
    if (sample.some(animal => !animal.label || !animal.qid)) continue;

    return sample;
  }

  throw new Error("Could not sample three animals");
}

function renderQuestion() {
  if (!state.currentAnimals.length) {
    els.animals.innerHTML = "";
    els.choices.innerHTML = "";
    return;
  }

  els.animals.innerHTML = state.currentAnimals.map(animal => `
    <article class="animal-card">
      ${animal.image
        ? `<img src="${escapeAttr(animal.image)}" alt="">`
        : `<div class="image-placeholder" aria-hidden="true">No image</div>`}
      <div class="animal-card-body">
        <h3>${escapeHtml(animal.label)}</h3>
        <p>${escapeHtml(animal.description ?? "")}</p>
      </div>
    </article>
  `).join("");

  renderPairButtons();
}

function renderPairButtons() {
  if (state.currentAnimals.length !== 3) {
    els.choices.innerHTML = "";
    return;
  }

  const [a, b, c] = state.currentAnimals;
  const pairs = [[a, b], [a, c], [b, c]];
  const bestKeys = new Set(state.bestPairs.map(pair => pair.key));

  els.choices.innerHTML = pairs.map(([x, y], i) => {
    const key = pairKey(x, y);
    const classes = [
      "choice-button",
      state.selectedPairKey === key ? "selected" : "",
      state.answered && bestKeys.has(key) ? "correct-choice" : "",
      state.answered && state.selectedPairKey === key && !bestKeys.has(key) ? "incorrect-choice" : ""
    ].filter(Boolean).join(" ");

    return `
      <button type="button" class="${classes}" data-pair-index="${i}" ${!state.ready || state.answered ? "disabled" : ""}>
        ${escapeHtml(x.label)} + ${escapeHtml(y.label)}
      </button>
    `;
  }).join("");

  els.choices.querySelectorAll("[data-pair-index]").forEach((btn, i) => {
    btn.addEventListener("click", () => choosePair(...pairs[i]));
  });
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
  const selectedIsCorrect = state.bestPairs.some(pair => pair.key === state.selectedPairKey);
  const best = state.bestPairs[0];
  const lca = best?.lca;
  const info = state.lcaInfo;
  const summaryText = info?.summary?.extract || info?.description || "No English Wikipedia summary was found for this ancestor.";
  const image = info?.image;
  const articleUrl = info?.summary?.content_urls?.desktop?.page || info?.articleUrl;
  const wikidataUrl = lca ? `https://www.wikidata.org/wiki/${encodeURIComponent(lca.qid)}` : null;
  const hasTie = state.bestPairs.length > 1;
  const resultTitle = hasTie
    ? `There was a tie: ${formatBestPairs()}`
    : `Closest pair: ${formatBestPairs()}`;

  els.answer.classList.remove("hidden");
  els.answer.innerHTML = `
    <div class="answer-header">
      <div>
        <h3>${escapeHtml(resultTitle)}</h3>
        <p>${hasTie
          ? "Any of the tied pairs counts as correct."
          : "This pair shares the most specific ranked ancestor in the round."}</p>
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
          ${lca?.qid ? `<span class="meta-pill">${escapeHtml(lca.qid)}</span>` : ""}
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

  renderPairButtons();
}

function renderStatus(message) {
  els.status.classList.remove("error");
  els.status.textContent = message;
}

function renderError(message) {
  els.status.classList.add("error");
  els.status.textContent = message;
}

function formatBestPairs() {
  return state.bestPairs.map(pair => formatPair(pair.a, pair.b)).join(" and ");
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
