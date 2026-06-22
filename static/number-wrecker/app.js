const leftNumber = document.querySelector("#left-number");
const rightNumber = document.querySelector("#right-number");
const choices = document.querySelector("#choices");
const message = document.querySelector("#message");
const scoreElement = document.querySelector("#score");
const soundButton = document.querySelector("#sound-button");
const newButton = document.querySelector("#new-button");
const newWallButton = document.querySelector("#new-wall-button");
const celebration = document.querySelector("#celebration");
const questionPanel = document.querySelector(".question-panel");
const wall = document.querySelector("#wall");
const bestHeightElement = document.querySelector("#best-height");

const praise = ["Nice!", "Great job!", "You got it!", "Awesome!", "Keep going!", "Excellent!"];

let current = { a: 0, b: 0, answer: 0 };
let score = 0;
let bestHeight = 0;
let soundOn = true;
let audioContext = null;
let locked = false;

const wreckKey = "number-wrecker:v1";

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

function load() {
  const saved = localStorage.getItem(wreckKey);
  if (!saved) return;
  try {
    const parsed = JSON.parse(saved);
    score = Number.isInteger(parsed.score) ? parsed.score : 0;
    bestHeight = Number.isInteger(parsed.bestHeight) ? parsed.bestHeight : 0;
    scoreElement.textContent = score;
    bestHeightElement.textContent = bestHeight;
  } catch {
    localStorage.removeItem(wreckKey);
  }
}

function save() {
  localStorage.setItem(wreckKey, JSON.stringify({ score, bestHeight }));
}

function startNew() {
  score = 0;
  bestHeight = 0;
  scoreElement.textContent = score;
  bestHeightElement.textContent = bestHeight;
  localStorage.removeItem(wreckKey);
  wall.innerHTML = "";
  message.textContent = "Start solving!";
}

function makeProblem() {
  const a = randomBetween(1, 9);
  const b = randomBetween(1, 9);
  current = { a, b, answer: a + b };
  locked = false;
  leftNumber.textContent = a;
  rightNumber.textContent = b;
  message.textContent = "Tap the answer.";
  questionPanel.classList.remove("is-celebrating");
  renderChoices();
}

function renderChoices() {
  const answers = new Set([current.answer]);
  while (answers.size < 4) {
    answers.add(clamp(current.answer + randomBetween(-6, 6), 2, 18));
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
    playSound(440 + Math.random() * 160, 0.12);

    setTimeout(() => {
      dropItem();
      setTimeout(() => makeProblem(), 1200);
    }, 900);
    return;
  }

  button.classList.remove("is-wrong");
  void button.offsetWidth;
  button.classList.add("is-wrong");
  message.textContent = "Try again.";
  playSound(220, 0.12);
}

function dropItem() {
  const type = Math.random();
  const baseX = 135;
  const x = baseX + (Math.random() - 0.5) * 20;
  const hue = randomBetween(0, 360);
  const wallHeight = wall.offsetHeight;
  const wallWidth = wall.offsetWidth;

  const item = document.createElement("div");
  item.style.position = "absolute";
  item.style.left = x + "px";
  item.style.top = "0px";
  item.style.zIndex = "20";
  item.style.transition = "none";

  let itemWidth = 56;
  let itemHeight = 56;

  if (type < 0.6) {
    itemWidth = 56;
    itemHeight = 56;
    item.style.width = "56px";
    item.style.height = "56px";
    item.style.borderRadius = "4px";
    item.style.background = `hsl(${hue}, 80%, 60%)`;
    item.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
  } else if (type < 0.8) {
    itemWidth = 48;
    itemHeight = 48;
    item.style.width = "48px";
    item.style.height = "48px";
    item.style.borderRadius = "50%";
    item.style.background = `hsl(${hue}, 85%, 65%)`;
    item.style.boxShadow = "inset -4px -4px 6px rgba(0,0,0,0.3), 0 6px 12px rgba(0,0,0,0.3)";
  } else {
    itemWidth = 36;
    itemHeight = 44;
    item.style.width = "36px";
    item.style.height = "44px";
    item.style.background = `radial-gradient(circle at 35% 35%, hsl(${hue}, 88%, 70%), hsl(${hue}, 82%, 58%))`;
    item.style.borderRadius = "50% 50% 50% 50%";
    item.style.boxShadow = "0 4px 10px rgba(0,0,0,0.2)";
  }

  wall.appendChild(item);

  let y = 0;
  let vy = 0;
  let px = x;
  let vx = (Math.random() - 0.5) * 2.2;
  const gravity = type < 0.8 ? 0.7 : -0.6;
  let settled = false;
  let bounceCount = 0;
  let rotation = 0;
  let angularVel = 0;
  let support = null;

  function getStackTop(checkPx) {
    let lowestPoint = wallHeight - itemHeight;
    let supportItem = null;
    wall.querySelectorAll("div").forEach((other) => {
      if (other === item) return;
      const ox = parseFloat(other.style.left);
      const oy = parseFloat(other.style.top);
      const ow = parseFloat(other.style.width);
      const oh = parseFloat(other.style.height);
      if (isNaN(ox) || isNaN(oy) || isNaN(ow) || isNaN(oh)) return;
      if (ow === 0 || oh === 0) return;
      const overlaps = (checkPx + itemWidth > ox) && (checkPx < ox + ow);
      if (overlaps) {
        const otherTop = oy;
        if (otherTop < lowestPoint) {
          lowestPoint = otherTop;
          supportItem = other;
        }
      }
    });
    support = supportItem;
    return lowestPoint - itemHeight;
  }

  function checkBalance(px) {
    if (!support) return 1; // Fully balanced if on ground
    const ox = parseFloat(support.style.left);
    const ow = parseFloat(support.style.width);
    const itemCenter = px + itemWidth / 2;
    const supportCenter = ox + ow / 2;
    const offset = Math.abs(itemCenter - supportCenter);
    const maxOffset = (itemWidth + ow) / 2 - 5;
    return Math.max(0, 1 - offset / (maxOffset * 0.7));
  }

  function animate() {
    if (settled) return;

    vy += gravity;
    y += vy;

    px += vx;
    vx *= 0.98;

    if (px < 0 || px + itemWidth > wallWidth) vx *= -0.8;
    px = Math.max(0, Math.min(wallWidth - itemWidth, px));

    rotation += angularVel;
    angularVel *= 0.96;

    item.style.left = px + "px";
    item.style.top = y + "px";
    if (Math.abs(rotation) > 0.05) {
      item.style.transform = `rotate(${rotation}rad)`;
    }

    const stackTop = getStackTop(px);

    if (type >= 0.8) {
      // Balloon floats away
      if (y < -100) {
        item.remove();
        return;
      }
    } else if (y >= stackTop) {
      // Collision: bounce once then settle
      y = stackTop;
      item.style.top = y + "px";
      vy *= -0.55;
      vx *= 0.65;
      bounceCount++;

      // Settle after one bounce if moving slow, or two bounces regardless
      if ((bounceCount >= 1 && Math.abs(vy) < 1.2) || bounceCount >= 2) {
        settled = true;
        item.style.opacity = "0.9";

        // Apply unbalancing: items off-center will tilt and slide
        const balance = checkBalance(px);

        if (balance < 0.6 && support) {
          // Unstable - apply tilt and sliding
          const unbalance = 1 - balance;
          const tiltDirection = px + itemWidth / 2 < (parseFloat(support.style.left) + parseFloat(support.style.width) / 2) ? -1 : 1;
          angularVel = tiltDirection * unbalance * 0.08;
          vx = tiltDirection * unbalance * 1.5;

          // Don't settle immediately - let it slide
          settled = false;
          return;
        }

        item.style.transform = "";
        bestHeight = Math.max(bestHeight, Math.ceil((wallHeight - y) / 30));
        bestHeightElement.textContent = bestHeight;
        save();
        return;
      }
    } else if (settled === false && Math.abs(rotation) > 0.3 && support) {
      // Tipped too far, slide off
      vx += rotation * 2;
      vy = 2;
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

function celebrate() {
  questionPanel.classList.add("is-celebrating");
  celebration.replaceChildren();
  const colors = ["#ffd34e", "#f46182", "#24a79c", "#4787e9", "#8464dc"];
  for (let i = 0; i < 20; i++) {
    const sparkle = document.createElement("span");
    sparkle.style.position = "fixed";
    sparkle.style.left = (randomBetween(20, 80) + "vw");
    sparkle.style.top = (randomBetween(30, 70) + "vh");
    sparkle.style.width = "10px";
    sparkle.style.height = "10px";
    sparkle.style.borderRadius = "50%";
    sparkle.style.background = colors[i % colors.length];
    sparkle.style.pointerEvents = "none";
    sparkle.style.zIndex = "100";
    sparkle.style.animation = `sparkle-fly 900ms ease-out forwards`;
    sparkle.style.animationDelay = (i * 30) + "ms";
    celebration.appendChild(sparkle);
  }
}

function playSound(freq, duration) {
  if (!soundOn) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  if (!audioContext) audioContext = new AudioContextClass();
  if (audioContext.state === "suspended") audioContext.resume();

  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.frequency.value = freq;
  osc.type = "sine";
  gain.gain.setValueAtTime(0.05, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(audioContext.currentTime);
  osc.stop(audioContext.currentTime + duration);
}

soundButton.addEventListener("click", () => {
  soundOn = !soundOn;
  soundButton.classList.toggle("is-on", soundOn);
  soundButton.textContent = soundOn ? "Sound On" : "Sound Off";
});

newButton.addEventListener("click", makeProblem);
newWallButton.addEventListener("click", startNew);

load();
makeProblem();
