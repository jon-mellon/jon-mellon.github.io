const boardElement = document.querySelector("#board");
const fleetElement = document.querySelector("#fleet");
const statusElement = document.querySelector("#status-text");
const dateElement = document.querySelector("#puzzle-date");
const checkButton = document.querySelector("#check-button");
const resetButton = document.querySelector("#reset-button");
const revealButton = document.querySelector("#reveal-button");
const modeButtons = Array.from(document.querySelectorAll(".mode-button"));

const SIZE = 8;
let puzzle = null;
let state = null;
let mode = "letter";

function utcDateString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function blankMatrix(value = "") {
  return Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => value));
}

function storageKey(date) {
  return `vocabble:${date}`;
}

function setStatus(text, className = "") {
  statusElement.textContent = text;
  statusElement.className = className;
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
      if (parsed && parsed.date === currentPuzzle.date) {
        parsed.fleet = normalizeFleetState(parsed.fleet, currentPuzzle.fleetLengths);
        parsed.maybe = normalizeBoardLayer(parsed.maybe);
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
    board,
    marks,
    maybe: blankMatrix(""),
    top: currentPuzzle.topWord.split("").map((letter, index) => currentPuzzle.topVisible[index] ? letter : ""),
    side: currentPuzzle.sideWord.split("").map((letter, index) => currentPuzzle.sideVisible[index] ? letter : ""),
    fleet: normalizeFleetState(null, currentPuzzle.fleetLengths),
    revealed: false
  };
}

function normalizeBoardLayer(layer) {
  return Array.from({ length: SIZE }, (_, row) => {
    const existingRow = Array.isArray(layer) && Array.isArray(layer[row]) ? layer[row] : [];
    return Array.from({ length: SIZE }, (_, col) => normalizeLetter(existingRow[col] || ""));
  });
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
    if (!isBoardGiven(nextRow, nextCol)) {
      return boardElement.querySelector(`[data-row="${nextRow}"][data-col="${nextCol}"] input`);
    }
  }
  return null;
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
      square.addEventListener("click", (event) => handleCellClick(event, row, col));
      const input = makeInput(
        boardDisplayValue(row, col),
        isBoardGiven(row, col) || state.revealed,
        `Row ${row + 1}, column ${col + 1}`,
        (value) => {
          if (mode === "maybe") {
            state.maybe[row][col] = value;
            state.board[row][col] = "";
          } else {
            state.board[row][col] = value;
            state.maybe[row][col] = "";
          }
          if (value) {
            state.marks[row][col] = "";
          }
          saveState();
          renderCell(row, col);
          updateCompletion();
          if (value) nextEditableBoardInput(row, col)?.focus();
        }
      );
      input.addEventListener("keydown", (event) => {
        if (event.key === "Backspace" && !input.value) {
          nextEditableBoardInput(row, col, -1)?.focus();
        }
      });
      square.append(input);
      boardElement.append(square);
    }
  }
}

function squareClass(row, col) {
  const classes = ["square", "board-square"];
  if (isBoardGiven(row, col)) classes.push("is-given");
  if (!isBoardGiven(row, col) && !state.revealed) classes.push("is-editable");
  if (state.marks[row][col] === "water") classes.push("is-water");
  if (state.maybe[row][col] && !state.board[row][col]) classes.push("is-maybe-letter");
  return classes.join(" ");
}

function renderCell(row, col) {
  const square = boardElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  if (!square) return;
  square.className = squareClass(row, col);
}

function handleCellClick(event, row, col) {
  if (isBoardGiven(row, col) || state.revealed) return;
  if (mode === "letter" || mode === "maybe") {
    event.currentTarget.querySelector("input").focus();
    return;
  }

  state.board[row][col] = "";
  state.maybe[row][col] = "";
  state.marks[row][col] = state.marks[row][col] === mode ? "" : mode;
  saveState();
  renderBoard();
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
    setStatus("Complete", "complete");
  } else {
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
    setStatus("Complete", "complete");
  } else if (wrongCount > 0) {
    setStatus(`${wrongCount} to revisit`, "error");
  } else {
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
  setStatus("Revealed");
}

function resetPuzzle() {
  localStorage.removeItem(storageKey(puzzle.date));
  state = initialStateFromPuzzle(puzzle);
  renderBoard();
  renderFleet();
  setStatus("In progress");
}

function setupControls() {
  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      mode = button.dataset.mode;
      modeButtons.forEach((candidate) => candidate.classList.toggle("is-active", candidate === button));
    });
  });

  checkButton.addEventListener("click", markWrongInputs);
  resetButton.addEventListener("click", resetPuzzle);
  revealButton.addEventListener("click", revealPuzzle);
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
