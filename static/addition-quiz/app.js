const leftNumber = document.querySelector("#left-number");
const rightNumber = document.querySelector("#right-number");
const counterRow = document.querySelector("#counter-row");
const choices = document.querySelector("#choices");
const message = document.querySelector("#message");
const scoreElement = document.querySelector("#score");
const soundButton = document.querySelector("#sound-button");
const newButton = document.querySelector("#new-button");
const newGardenButton = document.querySelector("#new-garden-button");
const celebration = document.querySelector("#celebration");
const questionPanel = document.querySelector(".question-panel");
const gardenBed = document.querySelector("#garden-bed");
const bloomCount = document.querySelector("#bloom-count");

const praise = [
  "You got it!",
  "Great adding!",
  "That is the one!",
  "Wonderful!",
  "Nice number work!",
  "Yes!"
];

let current = { a: 0, b: 0, answer: 0 };
let score = 0;
let soundOn = true;
let audioContext = null;
let locked = false;
let garden = [];

const gardenKey = "number-garden:v1";
const plantKinds = ["daisy", "round", "star", "tulip", "bell"];
const gardenDetails = makeGardenDetails();
const successMelodies = [
  [
    [523.25, 0, 0.12, "triangle", 0.07],
    [659.25, 0.12, 0.14, "triangle", 0.08],
    [783.99, 0.28, 0.2, "sine", 0.07]
  ],
  [
    [587.33, 0, 0.1, "sine", 0.06],
    [739.99, 0.1, 0.11, "triangle", 0.07],
    [880, 0.22, 0.16, "triangle", 0.07],
    [1174.66, 0.38, 0.2, "sine", 0.045]
  ],
  [
    [392, 0, 0.14, "triangle", 0.06],
    [523.25, 0.08, 0.16, "sine", 0.045],
    [659.25, 0.2, 0.18, "triangle", 0.07],
    [987.77, 0.38, 0.22, "sine", 0.05]
  ],
  [
    [659.25, 0, 0.09, "sine", 0.045],
    [783.99, 0.07, 0.09, "sine", 0.045],
    [1046.5, 0.14, 0.18, "triangle", 0.065],
    [1318.51, 0.34, 0.18, "sine", 0.04]
  ]
];
const natureMilestones = {
  5: "A garden helper found a pond spot.",
  6: "Water sparkles in the little pond.",
  7: "A duck landed for a swim.",
  9: "Another duck came to visit.",
  10: "Reeds are growing by the water.",
  13: "Lily pads opened on the pond.",
  16: "Dragonflies are dancing.",
  20: "Tiny mushrooms popped up.",
  24: "Fireflies are glowing."
};

function randomDigit() {
  return Math.floor(Math.random() * 10);
}

function randomBetween(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function shuffle(items) {
  return items
    .map((value) => ({ value, order: Math.random() }))
    .sort((left, right) => left.order - right.order)
    .map((item) => item.value);
}

function loadGarden() {
  const saved = localStorage.getItem(gardenKey);
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    if (!parsed || !Array.isArray(parsed.garden)) return;
    score = Number.isInteger(parsed.score) ? parsed.score : 0;
    garden = parsed.garden
      .filter((plant) => Number.isFinite(plant.x))
      .map((plant) => ({
        ...plant,
        row: Number.isFinite(plant.row) ? clamp(plant.row, 0, 3) : randomBetween(0, 3),
        hue: Number.isFinite(plant.hue) ? clamp(plant.hue, 190, 345) : randomBetween(205, 345),
        scale: Number.isFinite(plant.scale) ? clamp(plant.scale, 0.74, 1.12) : 1,
        maturity: Number.isFinite(plant.maturity) ? clamp(plant.maturity, 0, 4) : 0,
        kind: plant.kind || plantKinds[randomBetween(0, plantKinds.length - 1)],
        isNew: false
      }));
    scoreElement.textContent = score;
    renderGarden();
  } catch {
    localStorage.removeItem(gardenKey);
  }
}

function saveGarden() {
  localStorage.setItem(gardenKey, JSON.stringify({ score, garden }));
}

function startNewGarden() {
  score = 0;
  garden = [];
  scoreElement.textContent = score;
  bloomCount.textContent = score;
  localStorage.removeItem(gardenKey);
  renderGarden();
  message.textContent = "A fresh garden is ready.";
  playGardenStartSound();
}

function makeProblem() {
  const a = randomDigit();
  const b = randomDigit();
  current = { a, b, answer: a + b };
  locked = false;
  leftNumber.textContent = a;
  rightNumber.textContent = b;
  message.textContent = "Tap the answer.";
  questionPanel.classList.remove("is-celebrating");
  renderCounters(a, b);
  renderChoices();
}

function renderCounters(a, b) {
  counterRow.replaceChildren();

  for (let index = 0; index < a; index += 1) {
    counterRow.append(makeCounter());
  }

  const plus = document.createElement("span");
  plus.className = "plus-counter";
  plus.textContent = "+";
  counterRow.append(plus);

  for (let index = 0; index < b; index += 1) {
    counterRow.append(makeCounter());
  }
}

function makeCounter() {
  const counter = document.createElement("span");
  counter.className = "counter";
  return counter;
}

function renderChoices() {
  const answers = new Set([current.answer]);
  while (answers.size < 4) {
    answers.add(clamp(current.answer + randomBetween(-5, 5), 0, 18));
  }

  choices.replaceChildren();
  shuffle(Array.from(answers)).forEach((answer) => {
    const button = document.createElement("button");
    button.className = "choice-button";
    button.type = "button";
    button.textContent = answer;
    button.setAttribute("aria-label", `Answer ${answer}`);
    button.addEventListener("click", () => chooseAnswer(button, answer));
    choices.append(button);
  });
}

function chooseAnswer(button, answer) {
  if (locked) return;

  if (answer === current.answer) {
    locked = true;
    score += 1;
    scoreElement.textContent = score;
    button.classList.add("is-right");
    message.textContent = natureMilestones[score] || praise[Math.floor(Math.random() * praise.length)];
    growGarden();
    celebrate();
    playSuccessSound();
    window.setTimeout(makeProblem, 1250);
    return;
  }

  button.classList.remove("is-wrong");
  void button.offsetWidth;
  button.classList.add("is-wrong");
  message.textContent = "Try again.";
  playTryAgainSound();
}

function growGarden() {
  garden = garden
    .slice(-89)
    .map((plant) => ({
      ...plant,
      maturity: Math.min(4, plant.maturity + (Math.random() > 0.35 ? 1 : 0)),
      isNew: false
    }));

  const position = makePlantPosition();
  garden.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    x: position.x,
    row: position.row,
    hue: randomBetween(205, 345),
    scale: randomBetween(76, 112) / 100,
    lean: randomBetween(-7, 7),
    delay: randomBetween(0, 180),
    maturity: 0,
    kind: plantKinds[randomBetween(0, plantKinds.length - 1)],
    isNew: true
  });

  renderGarden();
  saveGarden();
}

function makePlantPosition() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const position = { x: randomBetween(5, 95), row: randomBetween(0, 3) };
    if (!isInPondFootprint(position.x, position.row)) return position;
  }

  return { x: Math.random() > 0.5 ? randomBetween(5, 25) : randomBetween(75, 95), row: randomBetween(0, 3) };
}

function isInPondFootprint(x, row) {
  return score >= 5 && x >= 28 && x <= 74 && row >= 0;
}

function displayPlantPosition(plant, index) {
  if (!isInPondFootprint(plant.x, plant.row)) return { x: plant.x, row: plant.row };

  const leftBank = 12 + (index % 4) * 4;
  const rightBank = 78 + (index % 4) * 4;
  return {
    x: index % 2 === 0 ? leftBank : rightBank,
    row: Math.min(3, Math.max(1, plant.row + 1))
  };
}

function renderGarden() {
  bloomCount.textContent = score;
  gardenBed.replaceChildren();
  renderGardenDetails();
  renderGardenStory();

  garden.forEach((plant, index) => {
    const position = displayPlantPosition(plant, index);
    const element = document.createElement("span");
    element.className = `plant kind-${plant.kind || "daisy"} level-${plant.maturity}${plant.isNew ? "" : " is-old"}`;
    element.style.setProperty("--x", `${position.x}%`);
    element.style.setProperty("--row", position.row);
    element.style.setProperty("--hue", plant.hue);
    element.style.setProperty("--scale", plant.scale);
    element.style.setProperty("--lean", `${plant.lean}deg`);
    element.style.setProperty("--delay", `${plant.delay}ms`);
    element.style.zIndex = 24 + position.row * 5;
    element.append(makePlantParts());
    gardenBed.append(element);
  });
}

function renderGardenStory() {
  if (score < 5) return;

  const story = document.createElement("div");
  story.className = "garden-story";
  gardenBed.append(story);

  const pond = document.createElement("span");
  pond.className = `pond-stage ${score >= 6 ? "has-water" : "is-hole"}${score === 5 ? " is-new" : ""}${score === 6 ? " is-filling" : ""}`;
  story.append(pond);

  if (score === 5 || score === 6) {
    const helper = document.createElement("span");
    helper.className = `garden-helper ${score === 5 ? "is-digging" : "is-watering"}`;
    helper.append(makeHelperParts());
    story.append(helper);
  }

  if (score >= 7) story.append(makeDuck("duck-one", score === 7));
  if (score >= 9) story.append(makeDuck("duck-two", score === 9));
  if (score >= 10) makeReeds(story);
  if (score >= 13) makeLilyPads(story);
  if (score >= 16) makeDragonflies(story);
  if (score >= 20) makeMushrooms(story);
  if (score >= 24) makeFireflies(story);
}

function makeHelperParts() {
  const fragment = document.createDocumentFragment();
  ["helper-head", "helper-hat", "helper-body", "helper-arm", "helper-tool"].forEach((className) => {
    const part = document.createElement("span");
    part.className = className;
    fragment.append(part);
  });
  return fragment;
}

function makeDuck(extraClass, isLanding) {
  const duck = document.createElement("span");
  duck.className = `duck ${extraClass}${isLanding ? " is-landing" : ""}`;
  ["duck-body", "duck-head", "duck-beak", "duck-wing", "duck-eye"].forEach((className) => {
    const part = document.createElement("span");
    part.className = className;
    duck.append(part);
  });
  return duck;
}

function makeReeds(container) {
  const reedPositions = [31, 34, 37, 63, 66, 69, 72];
  reedPositions.forEach((position, index) => {
    const reed = document.createElement("span");
    reed.className = "pond-reed";
    reed.style.setProperty("--x", `${position}%`);
    reed.style.setProperty("--height", `${34 + (index % 3) * 12}px`);
    reed.style.setProperty("--lean", `${-8 + index * 3}deg`);
    container.append(reed);
  });
}

function makeLilyPads(container) {
  [
    { x: 34, y: 37, scale: 1.04 },
    { x: 46, y: 51, scale: 0.86 },
    { x: 58, y: 35, scale: 1 },
    { x: 70, y: 50, scale: 0.92 }
  ].forEach((padConfig) => {
    const pad = document.createElement("span");
    pad.className = "lily-pad";
    pad.style.setProperty("--x", `${padConfig.x}%`);
    pad.style.setProperty("--y", `${padConfig.y}px`);
    pad.style.setProperty("--pad-scale", padConfig.scale);
    container.append(pad);
  });
}

function makeDragonflies(container) {
  for (let index = 0; index < 3; index += 1) {
    const dragonfly = document.createElement("span");
    dragonfly.className = "dragonfly";
    dragonfly.style.setProperty("--x", `${30 + index * 17}%`);
    dragonfly.style.setProperty("--y", `${28 + index * 11}px`);
    dragonfly.style.setProperty("--speed", `${3600 + index * 650}ms`);
    container.append(dragonfly);
  }
}

function makeMushrooms(container) {
  for (let index = 0; index < 5; index += 1) {
    const mushroom = document.createElement("span");
    mushroom.className = "mushroom";
    mushroom.style.setProperty("--x", `${12 + index * 18}%`);
    mushroom.style.setProperty("--size", `${0.82 + index * 0.06}`);
    container.append(mushroom);
  }
}

function makeFireflies(container) {
  for (let index = 0; index < 8; index += 1) {
    const firefly = document.createElement("span");
    firefly.className = "firefly";
    firefly.style.setProperty("--x", `${14 + index * 10}%`);
    firefly.style.setProperty("--y", `${18 + (index % 4) * 18}px`);
    firefly.style.setProperty("--delay", `${index * 210}ms`);
    container.append(firefly);
  }
}

function makePlantParts() {
  const fragment = document.createDocumentFragment();

  const stem = document.createElement("span");
  stem.className = "stem";
  const leftLeaf = document.createElement("span");
  leftLeaf.className = "leaf left";
  const rightLeaf = document.createElement("span");
  rightLeaf.className = "leaf right";
  const extraLeaf = document.createElement("span");
  extraLeaf.className = "leaf extra";
  const bloom = document.createElement("span");
  bloom.className = "bloom";

  for (let index = 0; index < 6; index += 1) {
    const petal = document.createElement("span");
    petal.className = "petal";
    bloom.append(petal);
  }

  const center = document.createElement("span");
  center.className = "center";
  bloom.append(center);
  fragment.append(stem, leftLeaf, rightLeaf, extraLeaf, bloom);
  return fragment;
}

function makeGardenDetails() {
  const details = [
    { type: "sun" },
    { type: "hill", layer: "back" },
    { type: "hill", layer: "front" }
  ];

  for (let index = 0; index < 42; index += 1) {
    details.push({
      type: "grass",
      x: randomBetween(2, 98),
      bottom: randomBetween(10, 72),
      height: randomBetween(22, 58),
      lean: randomBetween(-22, 22)
    });
  }

  for (let index = 0; index < 12; index += 1) {
    details.push({
      type: "stone",
      x: randomBetween(4, 96),
      bottom: randomBetween(10, 58),
      size: randomBetween(14, 28)
    });
  }

  for (let index = 0; index < 5; index += 1) {
    details.push({
      type: "butterfly",
      x: randomBetween(8, 88),
      top: randomBetween(34, 104),
      hue: randomBetween(28, 330),
      speed: randomBetween(3200, 5200)
    });
  }

  return details;
}

function renderGardenDetails() {
  gardenDetails.forEach((detail) => {
    const element = document.createElement("span");

    if (detail.type === "sun") {
      element.className = "garden-detail garden-sun";
    } else if (detail.type === "hill") {
      element.className = `garden-detail garden-hill ${detail.layer}`;
    } else if (detail.type === "grass") {
      element.className = "garden-detail grass-blade";
      element.style.setProperty("--x", `${detail.x}%`);
      element.style.setProperty("--bottom", `${detail.bottom}px`);
      element.style.setProperty("--height", `${detail.height}px`);
      element.style.setProperty("--lean", `${detail.lean}deg`);
    } else if (detail.type === "stone") {
      element.className = "garden-detail stone";
      element.style.setProperty("--x", `${detail.x}%`);
      element.style.setProperty("--bottom", `${detail.bottom}px`);
      element.style.setProperty("--size", `${detail.size}px`);
    } else if (detail.type === "butterfly") {
      element.className = "garden-detail butterfly";
      element.style.setProperty("--x", `${detail.x}%`);
      element.style.setProperty("--top", `${detail.top}px`);
      element.style.setProperty("--hue", detail.hue);
      element.style.setProperty("--speed", `${detail.speed}ms`);
    }

    gardenBed.append(element);
  });
}

function ensureAudio() {
  if (!soundOn) return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) {
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
  return audioContext;
}

function playTone(frequency, start, duration, type = "sine", volume = 0.08) {
  const context = ensureAudio();
  if (!context) return;

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

function playSuccessSound() {
  const context = ensureAudio();
  if (!context) return;
  const now = context.currentTime;
  const melody = successMelodies[randomBetween(0, successMelodies.length - 1)];
  melody.forEach(([frequency, offset, duration, type, volume]) => {
    playTone(frequency, now + offset, duration, type, volume);
  });

  if (Math.random() > 0.45) {
    playTone(1567.98, now + 0.5, 0.18, "sine", 0.025);
  }
}

function playTryAgainSound() {
  const context = ensureAudio();
  if (!context) return;
  const now = context.currentTime;
  playTone(220, now, 0.12, "sine", 0.045);
  playTone(196, now + 0.11, 0.16, "sine", 0.04);
}

function playGardenStartSound() {
  const context = ensureAudio();
  if (!context) return;
  const now = context.currentTime;
  playTone(329.63, now, 0.16, "triangle", 0.04);
  playTone(440, now + 0.16, 0.18, "sine", 0.045);
  playTone(587.33, now + 0.34, 0.24, "triangle", 0.05);
}

function celebrate() {
  questionPanel.classList.add("is-celebrating");
  celebration.replaceChildren();
  makeSparkles();
  makeFlowers();
}

function makeSparkles() {
  const colors = ["#ffd34e", "#f46182", "#24a79c", "#4787e9", "#8464dc"];
  for (let index = 0; index < 28; index += 1) {
    const sparkle = document.createElement("span");
    sparkle.className = "sparkle";
    sparkle.style.setProperty("--sparkle-color", colors[index % colors.length]);
    sparkle.style.setProperty("--sparkle-x", `${randomBetween(-260, 260)}px`);
    sparkle.style.setProperty("--sparkle-y", `${randomBetween(-230, 170)}px`);
    sparkle.style.left = `${randomBetween(32, 68)}vw`;
    sparkle.style.top = `${randomBetween(22, 58)}vh`;
    celebration.append(sparkle);
  }
}

function makeFlowers() {
  const flowers = ["✿", "●", "✦", "★"];
  for (let index = 0; index < 12; index += 1) {
    const flower = document.createElement("span");
    flower.className = "flower";
    flower.textContent = flowers[index % flowers.length];
    flower.style.left = `${randomBetween(7, 93)}vw`;
    flower.style.color = ["#f46182", "#ffd34e", "#4787e9", "#8464dc"][index % 4];
    flower.style.setProperty("--flower-spin", `${randomBetween(-30, 30)}deg`);
    celebration.append(flower);
  }
}

soundButton.addEventListener("click", () => {
  soundOn = !soundOn;
  soundButton.classList.toggle("is-on", soundOn);
  soundButton.setAttribute("aria-pressed", String(soundOn));
  soundButton.textContent = soundOn ? "Sound On" : "Sound Off";
  const context = ensureAudio();
  if (context) playTone(440, context.currentTime, 0.08, "sine", 0.04);
});

newButton.addEventListener("click", makeProblem);
newGardenButton.addEventListener("click", startNewGarden);

loadGarden();
renderGarden();
makeProblem();
