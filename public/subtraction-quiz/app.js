const leftNumber = document.querySelector("#left-number");
const rightNumber = document.querySelector("#right-number");
const counterRow = document.querySelector("#counter-row");
const choices = document.querySelector("#choices");
const message = document.querySelector("#message");
const scoreElement = document.querySelector("#score");
const soundButton = document.querySelector("#sound-button");
const newButton = document.querySelector("#new-button");
const newGalaxyButton = document.querySelector("#new-galaxy-button");
const celebration = document.querySelector("#celebration");
const questionPanel = document.querySelector(".question-panel");
const galaxyBed = document.querySelector("#galaxy-bed");
const orbitCount = document.querySelector("#orbit-count");

const praise = [
  "You got it!",
  "Great subtracting!",
  "That is the one!",
  "Out of this world!",
  "Nice number work!",
  "Yes!"
];

let current = { a: 0, b: 0, answer: 0 };
let score = 0;
let soundOn = true;
let audioContext = null;
let locked = false;
let galaxy = [];
let astronautBodyId = null;
let leavingAstronautId = null;
let landingAstronaut = false;

const galaxyKey = "number-solar-system:v1";
const bodyKinds = ["planet", "planet", "planet", "ringed", "moon", "asteroid"];
const orbitRings = [0.3, 0.45, 0.6, 0.75, 0.9];
const starField = makeStarField();
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
const cosmicMilestones = {
  1: "Your first world is in orbit!",
  3: "A little solar system is forming.",
  7: "Your galaxy is really spinning now.",
  11: "So many worlds orbiting!",
  17: "A busy, beautiful galaxy.",
  23: "Explorer of the whole galaxy!"
};

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

function loadGalaxy() {
  const saved = localStorage.getItem(galaxyKey);
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    if (!parsed || !Array.isArray(parsed.galaxy)) return;
    score = Number.isInteger(parsed.score) ? parsed.score : 0;
    galaxy = parsed.galaxy
      .filter((body) => Number.isFinite(body.ring))
      .map((body) => ({
        ...body,
        kind: bodyKinds.includes(body.kind) ? body.kind : "planet",
        ring: clamp(body.ring, 0, orbitRings.length - 1),
        size: Number.isFinite(body.size) ? clamp(body.size, 8, 34) : 20,
        hue: Number.isFinite(body.hue) ? body.hue : randomBetween(0, 360),
        start: Number.isFinite(body.start) ? body.start : randomBetween(0, 359),
        duration: Number.isFinite(body.duration) ? body.duration : randomBetween(9000, 22000),
        reverse: Boolean(body.reverse),
        isNew: false
      }));
    astronautBodyId = galaxy.some((body) => body.id === parsed.astronautBodyId) ? parsed.astronautBodyId : null;
    scoreElement.textContent = score;
    renderGalaxy();
  } catch {
    localStorage.removeItem(galaxyKey);
  }
}

function saveGalaxy() {
  localStorage.setItem(galaxyKey, JSON.stringify({ score, galaxy, astronautBodyId }));
}

function startNewGalaxy() {
  score = 0;
  galaxy = [];
  astronautBodyId = null;
  leavingAstronautId = null;
  landingAstronaut = false;
  scoreElement.textContent = score;
  orbitCount.textContent = score;
  localStorage.removeItem(galaxyKey);
  renderGalaxy();
  message.textContent = "A fresh solar system is ready.";
  playGalaxyStartSound();
}

function makeProblem() {
  const a = randomBetween(1, 9);
  const b = randomBetween(0, a);
  current = { a, b, answer: a - b };
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
  const kept = a - b;

  for (let index = 0; index < a; index += 1) {
    const counter = document.createElement("span");
    counter.className = index < kept ? "counter" : "counter is-taken";
    counterRow.append(counter);
  }
}

function renderChoices() {
  const answers = new Set([current.answer]);
  while (answers.size < 4) {
    answers.add(clamp(current.answer + randomBetween(-4, 4), 0, 9));
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
    message.textContent = cosmicMilestones[score] || praise[Math.floor(Math.random() * praise.length)];
    const added = growGalaxy();
    celebrate();
    playSuccessSound();

    if (score % 6 === 0) triggerComet();

    if (score % 5 === 0 && galaxy.length > 0) {
      window.setTimeout(() => triggerBlackHole(added), 720);
      window.setTimeout(makeProblem, 2400);
    } else {
      window.setTimeout(makeProblem, 1250);
    }
    return;
  }

  button.classList.remove("is-wrong");
  void button.offsetWidth;
  button.classList.add("is-wrong");
  message.textContent = "Try again.";
  playTryAgainSound();
}

function leastUsedRing() {
  const counts = orbitRings.map(() => 0);
  galaxy.forEach((body) => {
    counts[body.ring] += 1;
  });
  let best = 0;
  for (let index = 1; index < counts.length; index += 1) {
    if (counts[index] < counts[best]) best = index;
  }
  return best;
}

function growGalaxy() {
  galaxy = galaxy.map((body) => ({ ...body, isNew: false }));

  // any astronaut from the previous turn flies off this turn
  leavingAstronautId = astronautBodyId;
  astronautBodyId = null;
  landingAstronaut = false;

  const kind = bodyKinds[randomBetween(0, bodyKinds.length - 1)];
  const sizeBase = kind === "moon" ? randomBetween(11, 16) : kind === "asteroid" ? randomBetween(8, 12) : randomBetween(18, 30);
  const body = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind,
    ring: leastUsedRing(),
    size: sizeBase,
    hue: randomBetween(0, 360),
    start: randomBetween(0, 359),
    duration: randomBetween(9000, 22000),
    reverse: Math.random() > 0.5,
    isNew: true
  };

  galaxy.push(body);

  // every 3rd correct answer an astronaut lands on a planet and plants a flag
  if (score % 3 === 0) {
    const planets = galaxy.filter((other) => other.kind === "planet" || other.kind === "ringed");
    if (planets.length > 0) {
      astronautBodyId = planets[randomBetween(0, planets.length - 1)].id;
      landingAstronaut = true;
    }
  }

  renderGalaxy();
  // transient land/leave states only animate on this render
  leavingAstronautId = null;
  landingAstronaut = false;
  saveGalaxy();
  return body;
}

function triggerComet() {
  const comet = document.createElement("span");
  comet.className = `comet${Math.random() > 0.5 ? " is-flip" : ""}`;
  comet.style.setProperty("--y-start", `${randomBetween(8, 40)}%`);
  comet.style.setProperty("--y-end", `${randomBetween(55, 90)}%`);
  comet.addEventListener("animationend", () => comet.remove());
  galaxyBed.append(comet);
  playCometSound();
}

function triggerBlackHole(protectBody) {
  const candidates = galaxy.length > 1 && protectBody
    ? galaxy.filter((body) => body.id !== protectBody.id)
    : galaxy.slice();
  if (candidates.length === 0) return;

  const target = candidates[randomBetween(0, candidates.length - 1)];
  const targetElement = galaxyBed.querySelector(`[data-id="${target.id}"] .body`);

  const bedRect = galaxyBed.getBoundingClientRect();
  const holeX = bedRect.width * 0.5;
  const holeY = bedRect.height * 0.5;

  const hole = document.createElement("span");
  hole.className = "black-hole";
  hole.style.setProperty("--hx", `${holeX}px`);
  hole.style.setProperty("--hy", `${holeY}px`);
  hole.addEventListener("animationend", () => hole.remove());
  playBlackHoleSound();

  const kindName = target.kind === "moon" ? "moon" : target.kind === "asteroid" ? "asteroid" : "planet";
  const article = kindName === "asteroid" ? "an" : "a";
  message.textContent = `A black hole pulled in ${article} ${kindName}!`;

  let flyer = null;
  if (targetElement) {
    const bodyRect = targetElement.getBoundingClientRect();
    const startX = bodyRect.left - bedRect.left + bodyRect.width / 2;
    const startY = bodyRect.top - bedRect.top + bodyRect.height / 2;

    flyer = targetElement.cloneNode(true);
    flyer.classList.add("captured-body");
    flyer.classList.remove("is-new");
    flyer.style.setProperty("--sx", `${startX}px`);
    flyer.style.setProperty("--sy", `${startY}px`);
    flyer.style.setProperty("--dx", `${holeX - startX}px`);
    flyer.style.setProperty("--dy", `${holeY - startY}px`);
    flyer.addEventListener("animationend", () => flyer.remove());
  }

  galaxy = galaxy.filter((body) => body.id !== target.id);
  renderGalaxy();
  galaxyBed.append(hole);
  if (flyer) galaxyBed.append(flyer);
  saveGalaxy();
}

function renderGalaxy() {
  orbitCount.textContent = galaxy.length;
  galaxyBed.replaceChildren();
  renderStarField();

  const sun = document.createElement("span");
  sun.className = "sun";
  galaxyBed.append(sun);

  const usedRings = new Set(galaxy.map((body) => body.ring));
  usedRings.forEach((ringIndex) => {
    const ring = document.createElement("span");
    ring.className = "orbit-ring";
    ring.style.setProperty("--diameter", `${orbitRings[ringIndex] * 100}%`);
    galaxyBed.append(ring);
  });

  galaxy.forEach((body) => {
    const orbit = document.createElement("span");
    orbit.className = `orbit${body.reverse ? " is-reverse" : ""}`;
    orbit.dataset.id = body.id;
    orbit.style.setProperty("--diameter", `${orbitRings[body.ring] * 100}%`);
    orbit.style.setProperty("--duration", `${body.duration}ms`);
    orbit.style.setProperty("--delay", `${-(body.start / 360) * body.duration}ms`);

    const upright = document.createElement("span");
    upright.className = "orbit-upright";
    upright.style.setProperty("--duration", `${body.duration}ms`);
    upright.style.setProperty("--delay", `${-(body.start / 360) * body.duration}ms`);

    const visual = makeBody(body);
    upright.append(visual);

    if (body.id === astronautBodyId) {
      upright.append(makeAstronaut(body, landingAstronaut ? "is-landing" : ""));
    } else if (body.id === leavingAstronautId) {
      upright.append(makeAstronaut(body, "is-leaving"));
    }

    orbit.append(upright);
    galaxyBed.append(orbit);
  });
}

function makeBody(body) {
  const element = document.createElement("span");
  element.className = `body kind-${body.kind}${body.isNew ? " is-new" : ""}`;
  element.style.setProperty("--size", `${body.size}px`);
  element.style.setProperty("--hue", body.hue);

  if (body.kind === "ringed") {
    const ring = document.createElement("span");
    ring.className = "planet-ring";
    element.append(ring);
  }

  if (body.kind === "planet" || body.kind === "ringed") {
    const spot = document.createElement("span");
    spot.className = "body-spot";
    element.append(spot);
  }

  if (body.kind === "moon") {
    for (let index = 0; index < 3; index += 1) {
      const crater = document.createElement("span");
      crater.className = "crater";
      crater.style.setProperty("--cx", `${randomBetween(20, 70)}%`);
      crater.style.setProperty("--cy", `${randomBetween(20, 70)}%`);
      crater.style.setProperty("--cs", `${randomBetween(18, 32)}%`);
      element.append(crater);
    }
  }

  return element;
}

function makeAstronaut(body, stateClass) {
  const astronaut = document.createElement("span");
  astronaut.className = `astronaut ${stateClass}`.trim();
  astronaut.style.setProperty("--planet-size", `${body.size}px`);

  ["astro-flag", "astro-pack", "astro-helmet", "astro-visor", "astro-body", "astro-arm", "astro-leg-left", "astro-leg-right"].forEach((className) => {
    const part = document.createElement("span");
    part.className = className;
    astronaut.append(part);
  });
  return astronaut;
}

function makeStarField() {
  const stars = [];
  for (let index = 0; index < 70; index += 1) {
    stars.push({
      type: "star",
      x: randomBetween(1, 99),
      y: randomBetween(2, 96),
      size: randomBetween(1, 3),
      twinkle: randomBetween(2200, 4600),
      delay: randomBetween(0, 3000)
    });
  }
  for (let index = 0; index < 3; index += 1) {
    stars.push({
      type: "nebula",
      x: randomBetween(10, 90),
      y: randomBetween(10, 80),
      size: randomBetween(120, 220),
      hue: randomBetween(0, 360)
    });
  }
  return stars;
}

function renderStarField() {
  starField.forEach((item) => {
    const element = document.createElement("span");
    if (item.type === "star") {
      element.className = "star";
      element.style.setProperty("--x", `${item.x}%`);
      element.style.setProperty("--y", `${item.y}%`);
      element.style.setProperty("--size", `${item.size}px`);
      element.style.setProperty("--twinkle", `${item.twinkle}ms`);
      element.style.setProperty("--delay", `${item.delay}ms`);
    } else {
      element.className = "nebula";
      element.style.setProperty("--x", `${item.x}%`);
      element.style.setProperty("--y", `${item.y}%`);
      element.style.setProperty("--size", `${item.size}px`);
      element.style.setProperty("--hue", item.hue);
    }
    galaxyBed.append(element);
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

function playGalaxyStartSound() {
  const context = ensureAudio();
  if (!context) return;
  const now = context.currentTime;
  playTone(329.63, now, 0.16, "triangle", 0.04);
  playTone(440, now + 0.16, 0.18, "sine", 0.045);
  playTone(587.33, now + 0.34, 0.24, "triangle", 0.05);
}

function playBlackHoleSound() {
  const context = ensureAudio();
  if (!context) return;
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(540, now);
  oscillator.frequency.exponentialRampToValueAtTime(70, now + 1.1);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.06, now + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 1.25);
}

function playCometSound() {
  const context = ensureAudio();
  if (!context) return;
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(1320, now);
  oscillator.frequency.exponentialRampToValueAtTime(420, now + 0.9);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.05, now + 0.06);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 1);
}

function celebrate() {
  questionPanel.classList.add("is-celebrating");
  celebration.replaceChildren();
  makeSparkles();
  makeStars();
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

function makeStars() {
  const shapes = ["✦", "★", "✧", "✶"];
  for (let index = 0; index < 12; index += 1) {
    const star = document.createElement("span");
    star.className = "flying-star";
    star.textContent = shapes[index % shapes.length];
    star.style.left = `${randomBetween(7, 93)}vw`;
    star.style.color = ["#f46182", "#ffd34e", "#4787e9", "#8464dc"][index % 4];
    star.style.setProperty("--star-spin", `${randomBetween(-30, 30)}deg`);
    celebration.append(star);
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
newGalaxyButton.addEventListener("click", startNewGalaxy);

loadGalaxy();
renderGalaxy();
makeProblem();
