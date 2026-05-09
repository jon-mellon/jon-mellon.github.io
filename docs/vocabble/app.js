const boardElement = document.querySelector("#board");
const fleetElement = document.querySelector("#fleet");
const statusElement = document.querySelector("#status-text");
const dateElement = document.querySelector("#puzzle-date");
const checkButton = document.querySelector("#check-button");
const resetButton = document.querySelector("#reset-button");
const revealButton = document.querySelector("#reveal-button");
const soundButton = document.querySelector("#sound-button");
const celebrationElement = document.querySelector("#completion-celebration");
const modeButtons = Array.from(document.querySelectorAll(".mode-button"));

const SIZE = 8;
const STORAGE_VERSION = "v3";
let puzzle = null;
let state = null;
let mode = "letter";
let selectedCell = null;
let ignoreNextSelectedClick = false;
let pointerDownCell = null;
let audioContext = null;
let soundEnabled = localStorage.getItem("vocabble:sound") === "on";

function utcDateString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function blankMatrix(value = "") {
  return Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => value));
}

function storageKey(date) {
  return `vocabble:${STORAGE_VERSION}:${date}`;
}

function updateSoundButton() {
  if (!soundButton) return;
  soundButton.textContent = soundEnabled ? "Sound on" : "Sound off";
  soundButton.setAttribute("aria-pressed", soundEnabled ? "true" : "false");
}

function ensureAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
  return audioContext;
}

function playTone(frequency, duration = 0.08, type = "sine", delay = 0) {
  if (!soundEnabled) return;
  const context = ensureAudioContext();
  if (!context) return;

  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.05, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function playSound(kind) {
  if (!soundEnabled) return;
  const patterns = {
    type: [[520, 0.045, "triangle", 0]],
    water: [[240, 0.055, "sine", 0], [190, 0.06, "sine", 0.035]],
    maybe: [[420, 0.045, "triangle", 0], [610, 0.05, "triangle", 0.045]],
    clear: [[300, 0.05, "sine", 0]],
    check: [[520, 0.05, "triangle", 0], [660, 0.06, "triangle", 0.055]],
    wrong: [[180, 0.08, "sawtooth", 0]],
    complete: [[330, 0.07, "triangle", 0], [440, 0.07, "triangle", 0.055], [660, 0.09, "triangle", 0.12], [880, 0.12, "triangle", 0.2], [990, 0.12, "sine", 0.3]],
    reset: [[260, 0.06, "sine", 0]],
    reveal: [[330, 0.06, "triangle", 0], [494, 0.08, "triangle", 0.06]]
  };
  (patterns[kind] || patterns.type).forEach(([frequency, duration, type, delay]) => {
    playTone(frequency, duration, type, delay);
  });
}

function puzzleSignature(currentPuzzle) {
  return JSON.stringify({
    solution: currentPuzzle.solution,
    puzzle: currentPuzzle.puzzle,
    topWord: currentPuzzle.topWord,
    sideWord: currentPuzzle.sideWord,
    topVisible: currentPuzzle.topVisible,
    sideVisible: currentPuzzle.sideVisible,
    fleetLengths: currentPuzzle.fleetLengths,
    ships: currentPuzzle.ships
  });
}

function setStatus(text, className = "") {
  statusElement.textContent = text;
  statusElement.className = className;
}

function clearCelebration() {
  document.body.classList.remove("is-complete");
  celebrationElement?.replaceChildren();
}

function celebrateCompletion() {
  document.body.classList.add("is-complete");
  if (!celebrationElement) return;

  celebrationElement.replaceChildren();
  const banner = document.createElement("div");
  banner.className = "completion-banner";
  banner.setAttribute("role", "status");
  banner.innerHTML = "<strong>Fleet complete</strong><span>Daily puzzle solved</span>";
  celebrationElement.append(banner);

  const colors = ["#1f6f5b", "#a45d18", "#2f3336", "#5a96aa", "#d7b15c"];
  for (let ii = 0; ii < 46; ii += 1) {
    const piece = document.createElement("i");
    piece.className = "confetti-piece";
    piece.style.setProperty("--x", `${Math.random() * 100}vw`);
    piece.style.setProperty("--dx", `${Math.random() * 42 - 21}vw`);
    piece.style.setProperty("--delay", `${Math.random() * 0.28}s`);
    piece.style.setProperty("--duration", `${0.85 + Math.random() * 0.75}s`);
    piece.style.setProperty("--turn", `${Math.random() * 540 - 270}deg`);
    piece.style.background = colors[ii % colors.length];
    celebrationElement.append(piece);
  }

  window.setTimeout(() => {
    celebrationElement.querySelectorAll(".confetti-piece").forEach((node) => node.remove());
  }, 2200);
}

function embeddedPuzzleForDate(date) {
  const fallbackElement = document.querySelector("#fallback-puzzle");
  if (!fallbackElement) return null;
  try {
    const embeddedPuzzle = JSON.parse(fallbackElement.textContent);
    return embeddedPuzzle.date === date ? embeddedPuzzle : null;
  } catch {
    return null;
  }
}

async function loadPuzzle() {
  const today = utcDateString();
  dateElement.textContent = `${today} UTC`;

  try {
    const response = await fetch("puzzles/manifest.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("Puzzle manifest unavailable");
    const manifest = await response.json();
    const entry = manifest.puzzles.find((candidate) => candidate.date === today);
    if (!entry) throw new Error("No puzzle is published for today");

    const puzzleResponse = await fetch(`puzzles/${entry.file}`, { cache: "no-cache" });
    if (!puzzleResponse.ok) throw new Error("Puzzle file unavailable");
    return puzzleResponse.json();
  } catch (error) {
    const embeddedPuzzle = embeddedPuzzleForDate(today);
    if (embeddedPuzzle) return embeddedPuzzle;
    throw error;
  }
}

function initialStateFromPuzzle(currentPuzzle) {
  const saved = localStorage.getItem(storageKey(currentPuzzle.date));
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.date === currentPuzzle.date && parsed.puzzleSignature === puzzleSignature(currentPuzzle)) {
        parsed.fleet = normalizeFleetState(parsed.fleet, currentPuzzle.fleetLengths);
        parsed.board = normalizeBoardLayer(parsed.board);
        parsed.marks = normalizeMarkLayer(parsed.marks);
        parsed.maybe = normalizeBoardLayer(parsed.maybe);
        applyCurrentGivens(parsed, currentPuzzle);
        return parsed;
      }
    } catch {
      localStorage.removeItem(storageKey(currentPuzzle.date));
    }
  }

  const board = blankMatrix("");
  const marks = blankMatrix("");
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      board[row][col] = currentPuzzle.puzzle[row][col] || "";
    }
  }

  return {
    date: currentPuzzle.date,
    puzzleSignature: puzzleSignature(currentPuzzle),
    board,
    marks,
    maybe: blankMatrix(""),
    top: currentPuzzle.topWord.split("").map((letter, index) => currentPuzzle.topVisible[index] ? letter : ""),
    side: currentPuzzle.sideWord.split("").map((letter, index) => currentPuzzle.sideVisible[index] ? letter : ""),
    fleet: normalizeFleetState(null, currentPuzzle.fleetLengths),
    completed: false,
    revealed: false
  };
}

function normalizeBoardLayer(layer) {
  return Array.from({ length: SIZE }, (_, row) => {
    const existingRow = Array.isArray(layer) && Array.isArray(layer[row]) ? layer[row] : [];
    return Array.from({ length: SIZE }, (_, col) => normalizeLetter(existingRow[col] || ""));
  });
}

function normalizeMarkLayer(layer) {
  const validMarks = new Set(["", "water", "maybe"]);
  return Array.from({ length: SIZE }, (_, row) => {
    const existingRow = Array.isArray(layer) && Array.isArray(layer[row]) ? layer[row] : [];
    return Array.from({ length: SIZE }, (_, col) => {
      const value = existingRow[col] || "";
      return validMarks.has(value) ? value : "";
    });
  });
}

function applyCurrentGivens(savedState, currentPuzzle) {
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (currentPuzzle.puzzle[row][col]) {
        savedState.board[row][col] = currentPuzzle.puzzle[row][col];
        savedState.marks[row][col] = "";
        savedState.maybe[row][col] = "";
      }
    }
  }
  savedState.top = currentPuzzle.topWord.split("").map((letter, index) => currentPuzzle.topVisible[index] ? letter : normalizeLetter(savedState.top?.[index] || ""));
  savedState.side = currentPuzzle.sideWord.split("").map((letter, index) => currentPuzzle.sideVisible[index] ? letter : normalizeLetter(savedState.side?.[index] || ""));
  savedState.puzzleSignature = puzzleSignature(currentPuzzle);
}

function normalizeFleetState(fleet, lengths) {
  return lengths.map((length, shipIndex) => {
    const existing = Array.isArray(fleet) && Array.isArray(fleet[shipIndex]) ? fleet[shipIndex] : [];
    return Array.from({ length }, (_, letterIndex) => normalizeLetter(existing[letterIndex] || ""));
  });
}

function saveState() {
  localStorage.setItem(storageKey(puzzle.date), JSON.stringify(state));
}

function isBoardGiven(row, col) {
  return Boolean(puzzle.puzzle[row][col]);
}

function isTopGiven(col) {
  return Boolean(puzzle.topVisible[col]);
}

function isSideGiven(row) {
  return Boolean(puzzle.sideVisible[row]);
}

function normalizeLetter(value) {
  return value.replace(/[^a-z]/gi, "").slice(-1).toUpperCase();
}

function makeInput(value, readonly, label, onInput) {
  const input = document.createElement("input");
  input.className = "cell-input";
  input.value = value || "";
  input.maxLength = 1;
  input.inputMode = "text";
  input.autocomplete = "off";
  input.autocapitalize = "characters";
  input.spellcheck = false;
  input.readOnly = readonly;
  input.setAttribute("aria-label", label);
  input.addEventListener("input", () => {
    input.value = normalizeLetter(input.value);
    onInput(input.value);
  });
  return input;
}

function nextEditableBoardInput(row, col, direction = 1) {
  const start = row * SIZE + col;
  for (let offset = 1; offset < SIZE * SIZE; offset += 1) {
    const index = (start + offset * direction + SIZE * SIZE) % (SIZE * SIZE);
    const nextRow = Math.floor(index / SIZE);
    const nextCol = index % SIZE;
    if (!isBoardGiven(nextRow, nextCol) && state.marks[nextRow][nextCol] !== "water") {
      return boardElement.querySelector(`[data-row="${nextRow}"][data-col="${nextCol}"] input`);
    }
  }
  return null;
}

function setMode(nextMode) {
  mode = nextMode;
  modeButtons.forEach((candidate) => candidate.classList.toggle("is-active", candidate.dataset.mode === mode));
}

function cellInputMode(row, col) {
  if (state.marks[row][col] === "water") return "water";
  if (state.marks[row][col] === "maybe" || (state.maybe[row][col] && !state.board[row][col])) return "maybe";
  return "letter";
}

function setSelectedCell(row, col) {
  selectedCell = { row, col };
  setMode(cellInputMode(row, col));
  renderSelectedCell();
}

function isSelectedCell(row, col) {
  return selectedCell && selectedCell.row === row && selectedCell.col === col;
}

function renderSelectedCell() {
  boardElement.querySelectorAll(".is-selected").forEach((node) => node.classList.remove("is-selected"));
  if (!selectedCell) return;
  const square = boardElement.querySelector(`[data-row="${selectedCell.row}"][data-col="${selectedCell.col}"]`);
  if (square) square.classList.add("is-selected");
}

function cycleCellState(row, col) {
  const current = cellInputMode(row, col);
  state.board[row][col] = "";
  state.maybe[row][col] = "";
  state.marks[row][col] = "";

  if (current === "letter") {
    state.marks[row][col] = "water";
    setMode("water");
    playSound("water");
  } else if (current === "water") {
    state.marks[row][col] = "maybe";
    setMode("maybe");
    playSound("maybe");
  } else {
    setMode("letter");
    playSound("clear");
  }

  saveState();
  renderBoard();
  const input = boardElement.querySelector(`[data-row="${row}"][data-col="${col}"] input`);
  if (cellInputMode(row, col) !== "water") input?.focus();
}

function boardDisplayValue(row, col) {
  return state.board[row][col] || state.maybe[row][col] || "";
}

function renderBoard() {
  boardElement.replaceChildren();

  const corner = document.createElement("div");
  corner.className = "square corner-square";
  boardElement.append(corner);

  for (let col = 0; col < SIZE; col += 1) {
    const square = document.createElement("div");
    square.className = `square edge-square top-edge${isTopGiven(col) ? " is-given" : ""}`;
    square.append(makeInput(
      state.top[col],
      isTopGiven(col) || state.revealed,
      `Top word letter ${col + 1}`,
      (value) => {
        state.top[col] = value;
        saveState();
        updateCompletion();
      }
    ));
    boardElement.append(square);
  }

  for (let row = 0; row < SIZE; row += 1) {
    const edge = document.createElement("div");
    edge.className = `square edge-square side-edge${isSideGiven(row) ? " is-given" : ""}`;
    edge.append(makeInput(
      state.side[row],
      isSideGiven(row) || state.revealed,
      `Side word letter ${row + 1}`,
      (value) => {
        state.side[row] = value;
        saveState();
        updateCompletion();
      }
    ));
    boardElement.append(edge);

    for (let col = 0; col < SIZE; col += 1) {
      const square = document.createElement("div");
      square.className = squareClass(row, col);
      square.dataset.row = row;
      square.dataset.col = col;
      square.addEventListener("pointerdown", () => {
        pointerDownCell = { row, col, wasSelected: isSelectedCell(row, col) };
      });
      square.addEventListener("click", (event) => handleCellClick(event, row, col));
      const input = makeInput(
        boardDisplayValue(row, col),
        isBoardGiven(row, col) || state.revealed,
        `Row ${row + 1}, column ${col + 1}`,
        (value) => {
          if (mode === "maybe") {
            state.maybe[row][col] = value;
            state.board[row][col] = "";
            state.marks[row][col] = value ? "" : "maybe";
          } else {
            state.board[row][col] = value;
            state.maybe[row][col] = "";
          }
          if (value && mode !== "maybe") {
            state.marks[row][col] = "";
          }
          saveState();
          renderCell(row, col);
          updateCompletion();
          if (value) {
            playSound(mode === "maybe" ? "maybe" : "type");
            nextEditableBoardInput(row, col)?.focus();
          }
        }
      );
      input.addEventListener("keydown", (event) => {
        if (event.key === "Backspace" && !input.value) {
          nextEditableBoardInput(row, col, -1)?.focus();
        }
      });
      input.addEventListener("focus", () => {
        if (pointerDownCell && pointerDownCell.row === row && pointerDownCell.col === col && !pointerDownCell.wasSelected) {
          ignoreNextSelectedClick = true;
        }
        setSelectedCell(row, col);
      });
      square.append(input);
      boardElement.append(square);
    }
  }
  renderSelectedCell();
}

function squareClass(row, col) {
  const classes = ["square", "board-square"];
  if (isBoardGiven(row, col)) classes.push("is-given");
  if (!isBoardGiven(row, col) && !state.revealed) classes.push("is-editable");
  if (isSelectedCell(row, col)) classes.push("is-selected");
  if (state.marks[row][col] === "water") classes.push("is-water");
  if (state.marks[row][col] === "maybe" || (state.maybe[row][col] && !state.board[row][col])) classes.push("is-maybe-letter");
  return classes.join(" ");
}

function renderCell(row, col) {
  const square = boardElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  if (!square) return;
  square.className = squareClass(row, col);
}

function handleCellClick(event, row, col) {
  if (isBoardGiven(row, col) || state.revealed) return;
  if (!isSelectedCell(row, col)) {
    setSelectedCell(row, col);
    if (cellInputMode(row, col) !== "water") event.currentTarget.querySelector("input").focus();
    ignoreNextSelectedClick = false;
    pointerDownCell = null;
    return;
  }
  if (ignoreNextSelectedClick) {
    ignoreNextSelectedClick = false;
    pointerDownCell = null;
    return;
  }
  pointerDownCell = null;
  cycleCellState(row, col);
}

function renderFleet() {
  fleetElement.replaceChildren();
  puzzle.fleetLengths.forEach((length, index) => {
    const item = document.createElement("div");
    item.className = "fleet-item";
    const label = document.createElement("span");
    label.textContent = `Ship ${index + 1}`;
    const cells = document.createElement("div");
    cells.className = "fleet-cells";
    cells.style.gridTemplateColumns = `repeat(${length}, var(--fleet-cell-size))`;
    for (let ii = 0; ii < length; ii += 1) {
      const cell = document.createElement("label");
      cell.className = "fleet-cell";
      cell.append(makeInput(
        state.fleet[index][ii],
        false,
        `Ship ${index + 1} planning letter ${ii + 1}`,
        (value) => {
          state.fleet[index][ii] = value;
          saveState();
          if (value) playSound("type");
        }
      ));
      cells.append(cell);
    }
    item.append(label, cells);
    fleetElement.append(item);
  });
}

function expectedTop() {
  return puzzle.topWord.split("");
}

function expectedSide() {
  return puzzle.sideWord.split("");
}

function isComplete() {
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (puzzle.solution[row][col] && state.board[row][col] !== puzzle.solution[row][col]) {
        return false;
      }
    }
  }
  return state.top.join("") === puzzle.topWord && state.side.join("") === puzzle.sideWord;
}

function updateCompletion() {
  clearWrongMarks();
  if (isComplete()) {
    document.body.classList.add("is-complete");
    if (!state.completed) {
      state.completed = true;
      saveState();
      playSound("complete");
      celebrateCompletion();
    } else if (celebrationElement && !celebrationElement.querySelector(".completion-banner")) {
      const banner = document.createElement("div");
      banner.className = "completion-banner is-settled";
      banner.innerHTML = "<strong>Fleet complete</strong><span>Daily puzzle solved</span>";
      celebrationElement.append(banner);
    }
    setStatus("Fleet complete", "complete");
  } else {
    state.completed = false;
    clearCelebration();
    setStatus("In progress");
  }
}

function clearWrongMarks() {
  boardElement.querySelectorAll(".is-wrong").forEach((node) => node.classList.remove("is-wrong"));
}

function markWrongInputs() {
  clearWrongMarks();
  let wrongCount = 0;

  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const value = state.board[row][col];
      if (value && value !== puzzle.solution[row][col]) {
        const square = boardElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        square.classList.add("is-wrong");
        wrongCount += 1;
      }
    }
  }

  const top = expectedTop();
  const side = expectedSide();
  Array.from(boardElement.children).forEach((square, index) => {
    const gridRow = Math.floor(index / 9);
    const gridCol = index % 9;
    if (gridRow === 0 && gridCol > 0) {
      const value = state.top[gridCol - 1];
      if (value && value !== top[gridCol - 1]) {
        square.classList.add("is-wrong");
        wrongCount += 1;
      }
    }
    if (gridCol === 0 && gridRow > 0) {
      const value = state.side[gridRow - 1];
      if (value && value !== side[gridRow - 1]) {
        square.classList.add("is-wrong");
        wrongCount += 1;
      }
    }
  });

  if (isComplete()) {
    playSound("complete");
    celebrateCompletion();
    setStatus("Fleet complete", "complete");
  } else if (wrongCount > 0) {
    playSound("wrong");
    setStatus(`${wrongCount} to revisit`, "error");
  } else {
    playSound("check");
    setStatus("No conflicts found");
  }
}

function revealPuzzle() {
  state.board = puzzle.solution.map((row) => row.slice());
  state.top = expectedTop();
  state.side = expectedSide();
  state.marks = blankMatrix("");
  state.maybe = blankMatrix("");
  state.revealed = true;
  saveState();
  renderBoard();
  renderFleet();
  clearCelebration();
  setStatus("Revealed");
  playSound("reveal");
}

function resetPuzzle() {
  localStorage.removeItem(storageKey(puzzle.date));
  state = initialStateFromPuzzle(puzzle);
  renderBoard();
  renderFleet();
  clearCelebration();
  setStatus("In progress");
  playSound("reset");
}

function setupControls() {
  updateSoundButton();
  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setMode(button.dataset.mode);
    });
  });

  checkButton.addEventListener("click", markWrongInputs);
  resetButton.addEventListener("click", resetPuzzle);
  revealButton.addEventListener("click", revealPuzzle);
  soundButton?.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem("vocabble:sound", soundEnabled ? "on" : "off");
    updateSoundButton();
    if (soundEnabled) {
      ensureAudioContext();
      playSound("check");
    }
  });
}

async function init() {
  setupControls();
  try {
    puzzle = await loadPuzzle();
    state = initialStateFromPuzzle(puzzle);
    renderFleet();
    renderBoard();
    updateCompletion();
  } catch (error) {
    setStatus(error.message, "error");
    boardElement.innerHTML = "";
  }
}

init();
