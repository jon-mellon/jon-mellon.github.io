const leftNumber = document.querySelector("#left-number");
const rightNumber = document.querySelector("#right-number");
const counterRow = document.querySelector("#counter-row");
const choices = document.querySelector("#choices");
const message = document.querySelector("#message");
const scoreElement = document.querySelector("#score");
const soundButton = document.querySelector("#sound-button");
const newButton = document.querySelector("#new-button");
const celebration = document.querySelector("#celebration");
const questionPanel = document.querySelector(".question-panel");

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
    message.textContent = praise[Math.floor(Math.random() * praise.length)];
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
  playTone(523.25, now, 0.12, "triangle", 0.09);
  playTone(659.25, now + 0.11, 0.12, "triangle", 0.09);
  playTone(783.99, now + 0.22, 0.18, "triangle", 0.1);
  playTone(1046.5, now + 0.38, 0.22, "sine", 0.07);
}

function playTryAgainSound() {
  const context = ensureAudio();
  if (!context) return;
  const now = context.currentTime;
  playTone(220, now, 0.12, "sine", 0.045);
  playTone(196, now + 0.11, 0.16, "sine", 0.04);
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

makeProblem();
