const elements = {
  status: document.querySelector("#data-status"),
  sourceYears: document.querySelector("#source-years"),
  variableCount: document.querySelector("#variable-count"),
  visibleCount: document.querySelector("#visible-count"),
  variableSearch: document.querySelector("#variable-search"),
  variableList: document.querySelector("#variable-list"),
  modeTabs: document.querySelector("#mode-tabs"),
  sortTabs: document.querySelector("#sort-tabs"),
  chartTabs: document.querySelector("#chart-tabs"),
  stratumBox: document.querySelector("#stratum-box"),
  stratumSelect: document.querySelector("#stratum-select"),
  copyLinkButton: document.querySelector("#copy-link-button"),
  selectedCode: document.querySelector("#selected-code"),
  selectedTitle: document.querySelector("#selected-title"),
  rangeChip: document.querySelector("#range-chip"),
  lowLabel: document.querySelector("#low-label"),
  highLabel: document.querySelector("#high-label"),
  metricBaseline: document.querySelector("#metric-baseline"),
  metricEnd: document.querySelector("#metric-end"),
  metricTotal: document.querySelector("#metric-total"),
  metricRange: document.querySelector("#metric-range"),
  metricChange: document.querySelector("#metric-change"),
  metricReplacement: document.querySelector("#metric-replacement"),
  metricWithinShare: document.querySelector("#metric-within-share"),
  metricBetweenShare: document.querySelector("#metric-between-share"),
  metricN: document.querySelector("#metric-n"),
  chartTitle: document.querySelector("#chart-title"),
  chart: document.querySelector("#trend-chart"),
  chartLegend: document.querySelector("#chart-legend"),
  componentPeriod: document.querySelector("#component-period"),
  componentBars: document.querySelector("#component-bars"),
  strataTable: document.querySelector("#strata-table"),
  modeLabel: document.querySelector("#mode-label"),
  methodNote: document.querySelector("#method-note"),
  generatedNote: document.querySelector("#generated-note")
};

const state = {
  data: null,
  variableId: null,
  mode: "none",
  stratum: "all",
  query: "",
  sort: "magnitude",
  chart: "levels"
};

const changeSeriesConfig = [
  { key: "observed", label: "Observed total", color: "#22292c" },
  { key: "change", label: "Intracohort change", color: "#146c6d" },
  { key: "replacement", label: "Cohort replacement", color: "#b65d2f" }
];

const levelSeriesConfig = [
  { key: "score", label: "Observed level", color: "#22292c" },
  { key: "change_level", label: "Within-only path", color: "#146c6d" },
  { key: "replacement_level", label: "Replacement-only path", color: "#b65d2f" }
];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatNumber(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  });
}

function formatSigned(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  const number = Number(value);
  const formatted = Math.abs(number).toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  });
  if (number > 0) return `+${formatted}`;
  if (number < 0) return `-${formatted}`;
  return formatted;
}

function compactNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return `${formatNumber(value, 1)}%`;
}

function readHashState() {
  const raw = window.location.hash.replace(/^#/, "");
  const params = new URLSearchParams(raw);
  return {
    variableId: params.get("v"),
    mode: params.get("mode"),
    stratum: params.get("stratum"),
    chart: params.get("chart")
  };
}

function updateHash() {
  if (!state.variableId) return;
  const params = new URLSearchParams();
  params.set("v", state.variableId);
  params.set("mode", state.mode);
  params.set("stratum", state.stratum);
  params.set("chart", state.chart);
  const next = `${window.location.pathname}${window.location.search}#${params.toString()}`;
  if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== next) {
    window.history.replaceState(null, "", next);
  }
}

function resultKey(variable, mode, stratum) {
  return `${variable}::${mode}::${stratum}`;
}

function indexData(data) {
  data.variableMap = new Map(data.variables.map((variable) => [variable.id, variable]));
  data.resultsByKey = new Map();
  data.resultsByVariableMode = new Map();

  data.results.forEach((result) => {
    data.resultsByKey.set(resultKey(result.variable, result.mode, result.stratum), result);
    const modeKey = `${result.variable}::${result.mode}`;
    if (!data.resultsByVariableMode.has(modeKey)) data.resultsByVariableMode.set(modeKey, []);
    data.resultsByVariableMode.get(modeKey).push(result);
  });

  data.resultsByVariableMode.forEach((results) => {
    results.sort((left, right) => left.stratum_label.localeCompare(right.stratum_label));
  });
}

function getVariable() {
  return state.data.variableMap.get(state.variableId) || state.data.variables[0];
}

function getAvailableResults(variableId = state.variableId, mode = state.mode) {
  return state.data.resultsByVariableMode.get(`${variableId}::${mode}`) || [];
}

function getResult() {
  return state.data.resultsByKey.get(resultKey(state.variableId, state.mode, state.stratum));
}

function syncStratum() {
  const available = getAvailableResults();
  if (!available.length) {
    state.mode = "none";
    state.stratum = "all";
    return;
  }
  if (!available.some((result) => result.stratum === state.stratum)) {
    state.stratum = available[0].stratum;
  }
}

function setStatus(text, isError = false) {
  elements.status.textContent = text;
  elements.status.style.color = isError ? "#a13f2c" : "";
}

function renderModeTabs() {
  elements.modeTabs.replaceChildren();
  state.data.metadata.modes.forEach((mode) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = mode.label;
    button.dataset.mode = mode.id;
    button.className = mode.id === state.mode ? "is-active" : "";
    button.addEventListener("click", () => {
      state.mode = mode.id;
      syncStratum();
      render();
    });
    elements.modeTabs.append(button);
  });
}

function renderSortTabs() {
  elements.sortTabs.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.sort === state.sort);
  });
}

function renderChartTabs() {
  elements.chartTabs.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.chart === state.chart);
  });
}

function filteredVariables() {
  const query = state.query.trim().toLowerCase();
  let variables = state.data.variables.filter((variable) => {
    if (!query) return true;
    return `${variable.id} ${variable.label}`.toLowerCase().includes(query);
  });

  if (state.sort === "name") {
    variables = variables.sort((left, right) => left.label.localeCompare(right.label));
  } else if (state.sort === "within") {
    variables = variables.sort((left, right) => {
      const shift = Number(right.within_abs_share || -1) - Number(left.within_abs_share || -1);
      return shift || left.label.localeCompare(right.label);
    });
  } else if (state.sort === "between") {
    variables = variables.sort((left, right) => {
      const shift = Number(right.between_abs_share || -1) - Number(left.between_abs_share || -1);
      return shift || left.label.localeCompare(right.label);
    });
  } else {
    variables = variables.sort((left, right) => {
      const shift = Math.abs(right.total || 0) - Math.abs(left.total || 0);
      return shift || left.label.localeCompare(right.label);
    });
  }
  return variables;
}

function renderVariableList() {
  const variables = filteredVariables();
  elements.variableList.replaceChildren();
  elements.variableCount.textContent = `${state.data.variables.length} variables`;
  elements.visibleCount.textContent = `${variables.length} shown`;

  if (!variables.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No matching variables.";
    elements.variableList.append(empty);
    return;
  }

  variables.forEach((variable) => {
    const button = document.createElement("button");
    const sideMetric = state.sort === "within"
      ? `Within ${formatPercent(variable.within_abs_share)}`
      : state.sort === "between"
        ? `Repl. ${formatPercent(variable.between_abs_share)}`
        : formatSigned(variable.total);
    button.type = "button";
    button.className = `variable-button${variable.id === state.variableId ? " is-active" : ""}`;
    button.innerHTML = `
      <span class="variable-name">${escapeHtml(variable.label)}</span>
      <span class="variable-shift">${escapeHtml(sideMetric)}</span>
      <span class="variable-code">${escapeHtml(variable.id)}</span>
      <span class="variable-code">${variable.first_year}-${variable.last_year}</span>
    `;
    button.addEventListener("click", () => {
      state.variableId = variable.id;
      syncStratum();
      render();
    });
    elements.variableList.append(button);
  });
}

function renderStratumSelect() {
  const available = getAvailableResults();
  elements.stratumSelect.replaceChildren();

  if (state.mode === "none") {
    elements.stratumBox.style.display = "none";
  } else {
    elements.stratumBox.style.display = "";
  }

  available.forEach((result) => {
    const option = document.createElement("option");
    option.value = result.stratum;
    option.textContent = result.stratum_label;
    option.selected = result.stratum === state.stratum;
    elements.stratumSelect.append(option);
  });
}

function renderHeading(variable, result) {
  elements.selectedCode.textContent = variable.id;
  elements.selectedTitle.textContent = variable.label;
  elements.rangeChip.textContent = `${result.first_year}-${result.last_year} · observed ${formatNumber(result.observed_min_score)}-${formatNumber(result.observed_max_score)}`;
  elements.lowLabel.textContent = `${variable.low_label} (raw ${variable.low_value})`;
  elements.highLabel.textContent = `${variable.high_label} (raw ${variable.high_value})`;
}

function renderMetrics(result) {
  elements.metricBaseline.textContent = formatNumber(result.baseline ?? result.start_score);
  elements.metricEnd.textContent = formatNumber(result.end_score);
  elements.metricTotal.textContent = formatSigned(result.total);
  elements.metricRange.textContent = formatNumber(result.observed_range);
  elements.metricChange.textContent = formatSigned(result.change);
  elements.metricReplacement.textContent = formatSigned(result.replacement);
  elements.metricWithinShare.textContent = formatPercent(result.within_abs_share);
  elements.metricBetweenShare.textContent = formatPercent(result.between_abs_share);
  elements.metricN.textContent = compactNumber(result.n);
}

function renderLegend() {
  elements.chartLegend.replaceChildren();
  const seriesConfig = state.chart === "levels" ? levelSeriesConfig : changeSeriesConfig;
  elements.chartTitle.textContent = state.chart === "levels" ? "Response Level" : "Cumulative Change";
  seriesConfig.forEach((item) => {
    const legend = document.createElement("span");
    legend.className = "legend-item";
    legend.innerHTML = `
      <span class="legend-swatch" style="background:${item.color}"></span>
      ${escapeHtml(item.label)}
    `;
    elements.chartLegend.append(legend);
  });
}

function svgNode(name, attributes = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}

function makePath(points) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point[0].toFixed(2)},${point[1].toFixed(2)}`).join(" ");
}

function renderChart(result) {
  const svg = elements.chart;
  svg.replaceChildren();
  const seriesConfig = state.chart === "levels" ? levelSeriesConfig : changeSeriesConfig;
  const width = 940;
  const height = 430;
  const margin = { top: 22, right: 34, bottom: 40, left: 58 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const series = (result.series || []).filter((row) => row.year !== null && row.year !== undefined);
  if (!series.length) return;

  const years = series.map((row) => Number(row.year));
  const values = [];
  series.forEach((row) => {
    seriesConfig.forEach((item) => {
      const value = Number(row[item.key]);
      if (Number.isFinite(value)) values.push(value);
    });
  });

  let yMin;
  let yMax;
  if (state.chart === "levels") {
    yMin = 0;
    yMax = 100;
  } else {
    yMin = Math.min(0, ...values);
    yMax = Math.max(0, ...values);
    if (yMin === yMax) {
      yMin -= 1;
      yMax += 1;
    }
    const yPad = (yMax - yMin) * 0.12;
    yMin -= yPad;
    yMax += yPad;
  }
  const xMin = Math.min(...years);
  const xMax = Math.max(...years);

  const xScale = (year) => margin.left + ((year - xMin) / (xMax - xMin || 1)) * plotWidth;
  const yScale = (value) => margin.top + (1 - (value - yMin) / (yMax - yMin || 1)) * plotHeight;

  const yTicks = Array.from({ length: 6 }, (_, index) => yMin + ((yMax - yMin) * index) / 5);
  yTicks.forEach((tick) => {
    const y = yScale(tick);
    svg.append(svgNode("line", {
      x1: margin.left,
      x2: width - margin.right,
      y1: y,
      y2: y,
      class: Math.abs(tick) < (yMax - yMin) / 100 ? "zero-line" : "grid-line"
    }));
    const label = svgNode("text", {
      x: margin.left - 10,
      y: y + 4,
      "text-anchor": "end",
      class: "chart-label"
    });
    label.textContent = formatNumber(tick, 0);
    svg.append(label);
  });

  const xTickYears = years.filter((year, index) => index === 0 || index === years.length - 1 || index % Math.ceil(years.length / 6) === 0);
  xTickYears.forEach((year) => {
    const x = xScale(year);
    svg.append(svgNode("line", {
      x1: x,
      x2: x,
      y1: margin.top,
      y2: height - margin.bottom,
      class: "grid-line"
    }));
    const label = svgNode("text", {
      x,
      y: height - 12,
      "text-anchor": "middle",
      class: "chart-label"
    });
    label.textContent = year;
    svg.append(label);
  });

  seriesConfig.forEach((item) => {
    const points = series
      .map((row) => [Number(row.year), Number(row[item.key])])
      .filter((point) => Number.isFinite(point[1]))
      .map((point) => [xScale(point[0]), yScale(point[1])]);

    if (!points.length) return;
    svg.append(svgNode("path", {
      d: makePath(points),
      class: "trend-line",
      stroke: item.color
    }));
    points.forEach((point, index) => {
      if (index % 2 !== 0 && index !== points.length - 1) return;
      svg.append(svgNode("circle", {
        cx: point[0],
        cy: point[1],
        r: index === points.length - 1 ? 4 : 3,
        fill: item.color,
        class: "trend-point"
      }));
    });
  });

  const yAxisLabel = svgNode("text", {
    x: 16,
    y: margin.top + plotHeight / 2,
    transform: `rotate(-90 16 ${margin.top + plotHeight / 2})`,
    "text-anchor": "middle",
    class: "chart-label"
  });
  yAxisLabel.textContent = state.chart === "levels" ? "Oriented response score" : "Cumulative change in response score";
  svg.append(yAxisLabel);
}

function renderComponentBars(result) {
  elements.componentPeriod.textContent = `${result.first_year}-${result.last_year}`;
  elements.componentBars.replaceChildren();

  const rows = [
    { key: "total", label: "Observed total", color: "#22292c", share: null },
    { key: "change", label: "Intracohort change", color: "#146c6d", share: result.change_share },
    { key: "replacement", label: "Cohort replacement", color: "#b65d2f", share: result.replacement_share }
  ];
  const extent = Math.max(1, ...rows.map((row) => Math.abs(Number(result[row.key]) || 0)));

  rows.forEach((row) => {
    const value = Number(result[row.key]) || 0;
    const width = Math.min(49, (Math.abs(value) / extent) * 49);
    const wrapper = document.createElement("div");
    wrapper.className = "component-row";
    const share = row.share === null || row.share === undefined ? "" : ` · ${formatNumber(row.share, 1)}%`;
    wrapper.innerHTML = `
      <div class="component-meta">
        <span>${escapeHtml(row.label)}</span>
        <strong>${formatSigned(value)}${escapeHtml(share)}</strong>
      </div>
      <div class="bar-track">
        <span class="bar-fill ${value < 0 ? "negative" : "positive"}" style="width:${width}%; background:${row.color}"></span>
      </div>
    `;
    elements.componentBars.append(wrapper);
  });
}

function renderStrataTable() {
  const rows = getAvailableResults();
  elements.strataTable.replaceChildren();
  const mode = state.data.metadata.modes.find((candidate) => candidate.id === state.mode);
  elements.modeLabel.textContent = mode ? mode.label : state.mode;

  rows.forEach((result) => {
    const row = document.createElement("tr");
    row.className = result.stratum === state.stratum ? "is-selected" : "";
    row.innerHTML = `
      <td>${escapeHtml(result.stratum_label)}</td>
      <td>${formatSigned(result.total)}</td>
      <td>${formatSigned(result.change)}</td>
      <td>${formatSigned(result.replacement)}</td>
      <td>${formatPercent(result.within_abs_share)}</td>
      <td>${formatPercent(result.between_abs_share)}</td>
    `;
    elements.strataTable.append(row);
  });
}

function renderNotes() {
  const metadata = state.data.metadata;
  elements.methodNote.textContent = metadata.weight_note || metadata.method;
  elements.generatedNote.textContent = metadata.generated_at ? `Generated ${metadata.generated_at}` : "";
  elements.sourceYears.textContent = metadata.source_years || "GSS";
}

function render() {
  if (!state.data) return;
  syncStratum();
  const variable = getVariable();
  const result = getResult();
  if (!result) return;

  renderModeTabs();
  renderSortTabs();
  renderChartTabs();
  renderVariableList();
  renderStratumSelect();
  renderHeading(variable, result);
  renderMetrics(result);
  renderLegend();
  renderChart(result);
  renderComponentBars(result);
  renderStrataTable();
  renderNotes();
  updateHash();
}

elements.variableSearch.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderVariableList();
});

elements.sortTabs.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-sort]");
  if (!button) return;
  state.sort = button.dataset.sort;
  render();
});

elements.chartTabs.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-chart]");
  if (!button) return;
  state.chart = button.dataset.chart;
  render();
});

elements.stratumSelect.addEventListener("change", (event) => {
  state.stratum = event.target.value;
  render();
});

elements.copyLinkButton.addEventListener("click", async () => {
  updateHash();
  const url = window.location.href;
  try {
    await navigator.clipboard.writeText(url);
    elements.copyLinkButton.textContent = "Copied";
    window.setTimeout(() => {
      elements.copyLinkButton.textContent = "Copy link";
    }, 1400);
  } catch {
    window.prompt("Copy this link", url);
  }
});

window.addEventListener("hashchange", () => {
  if (!state.data) return;
  const hashState = readHashState();
  if (state.data.variableMap.has(hashState.variableId)) state.variableId = hashState.variableId;
  if (state.data.metadata.modes.some((mode) => mode.id === hashState.mode)) state.mode = hashState.mode;
  if (hashState.chart === "levels" || hashState.chart === "change") state.chart = hashState.chart;
  syncStratum();
  if (hashState.stratum && getAvailableResults().some((result) => result.stratum === hashState.stratum)) {
    state.stratum = hashState.stratum;
  }
  render();
});

async function init() {
  try {
    const response = await fetch("data/decompositions.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`Data request failed: ${response.status}`);
    const data = await response.json();
    indexData(data);
    state.data = data;
    const hashState = readHashState();
    state.variableId = data.variableMap.has(hashState.variableId)
      ? hashState.variableId
      : filteredVariables()[0]?.id || data.variables[0]?.id || null;
    if (data.metadata.modes.some((mode) => mode.id === hashState.mode)) {
      state.mode = hashState.mode;
    }
    if (hashState.chart === "levels" || hashState.chart === "change") {
      state.chart = hashState.chart;
    }
    syncStratum();
    if (hashState.stratum && getAvailableResults().some((result) => result.stratum === hashState.stratum)) {
      state.stratum = hashState.stratum;
    }
    setStatus(`${data.metadata.variable_count} precomputed variables`);
    render();
  } catch (error) {
    setStatus("Data unavailable", true);
    elements.selectedTitle.textContent = "Decomposition data was not found";
    elements.variableList.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
}

init();
