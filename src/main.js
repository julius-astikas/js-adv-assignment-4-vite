import "./style.css";
import confetti from "canvas-confetti";

// --- DOM elements ---
const pitch = document.getElementById("pitch");
const ball = document.getElementById("ball");
const startMark = document.getElementById("startMark");
const goalkeeper = document.getElementById("goalkeeper");
const shootBtn = document.getElementById("shootBtn");
const resultEl = document.getElementById("result");

// --- Movement settings (step scales with pitch size) ---
const MOVE_INTERVAL_MS = 40;
const STEP_PCT = 0.018; // ~1.8% of pitch width per tick

let isShooting = false;
const keysPressed = new Set();
let moveTimer = null;

// Read shared layout % from CSS custom properties on .pitch
function getPitchPct(name) {
  return parseFloat(getComputedStyle(pitch).getPropertyValue(name));
}

function getShootLineTop() {
  return (getPitchPct("--shoot-line-pct") / 100) * pitch.clientHeight;
}

function getStartTop() {
  return (getPitchPct("--start-top-pct") / 100) * pitch.clientHeight;
}

function getStartLeft() {
  return (pitch.clientWidth - ball.offsetWidth) / 2;
}

function getStep() {
  return Math.max(4, pitch.clientWidth * STEP_PCT);
}

// Place the subtle start-mark circle under the default ball spot
function placeStartMark() {
  startMark.style.left = pitch.clientWidth / 2 + "px";
  startMark.style.top = getStartTop() + ball.offsetHeight / 2 + "px";
}

// Place the ball using absolute left/top inside the pitch
function setBallPosition(left, top) {
  const maxLeft = pitch.clientWidth - ball.offsetWidth;
  const maxTop = pitch.clientHeight - ball.offsetHeight;
  const shootLine = getShootLineTop();

  // Keep the ball inside the pitch and below the shoot line
  const clampedLeft = Math.min(Math.max(0, left), maxLeft);
  const clampedTop = Math.min(Math.max(shootLine, top), maxTop);

  ball.style.left = clampedLeft + "px";
  ball.style.top = clampedTop + "px";
}

function resetBall() {
  ball.classList.remove("shooting");
  setBallPosition(getStartLeft(), getStartTop());
}

// Reset keeper to center using current pitch size
function centerGoalkeeper() {
  const keeperW = goalkeeper.offsetWidth;
  goalkeeper.style.left = "50%";
  goalkeeper.style.marginLeft = -keeperW / 2 + "px";
}

// Move one step based on currently held arrow keys
function moveBallFromKeys() {
  if (isShooting || keysPressed.size === 0) return;

  const step = getStep();
  let left = parseFloat(ball.style.left);
  let top = parseFloat(ball.style.top);

  if (Number.isNaN(left)) left = getStartLeft();
  if (Number.isNaN(top)) top = getStartTop();

  if (keysPressed.has("ArrowLeft")) left -= step;
  if (keysPressed.has("ArrowRight")) left += step;
  if (keysPressed.has("ArrowUp")) top -= step;
  if (keysPressed.has("ArrowDown")) top += step;

  setBallPosition(left, top);
}

function startMoveLoop() {
  if (moveTimer !== null) return;
  moveBallFromKeys(); // short press moves a little right away
  moveTimer = setInterval(moveBallFromKeys, MOVE_INTERVAL_MS);
}

function stopMoveLoop() {
  if (moveTimer === null) return;
  clearInterval(moveTimer);
  moveTimer = null;
}

// Random outcome: GOAL / SAVED often, MISS more rarely
function pickShotResult() {
  const roll = Math.random();
  if (roll < 0.4) return "GOAL";
  if (roll < 0.85) return "SAVED";
  return "MISS";
}

function showResult(text) {
  resultEl.textContent = text;
  resultEl.className = "result result-" + text.toLowerCase();
}

function clearResult() {
  resultEl.textContent = "";
  resultEl.className = "result";
}

// Animate ball + keeper, then reset after the shot
function shoot() {
  if (isShooting) return;
  isShooting = true;
  shootBtn.disabled = true;
  clearResult();
  keysPressed.clear();
  stopMoveLoop();

  const result = pickShotResult();
  const pitchW = pitch.clientWidth;
  const pitchH = pitch.clientHeight;
  const ballW = ball.offsetWidth;
  const keeperW = goalkeeper.offsetWidth;

  // Goalkeeper dives to a random side (scaled to pitch width)
  const keeperLeft = pitchW * 0.08 + Math.random() * (pitchW * 0.84 - keeperW);
  goalkeeper.style.left = keeperLeft + "px";
  goalkeeper.style.marginLeft = "0";

  // Ball flies toward the goal area with some randomness
  let targetLeft;
  let targetTop;

  if (result === "GOAL") {
    targetLeft = pitchW / 2 - ballW / 2 + (Math.random() - 0.5) * pitchW * 0.16;
    targetTop = pitchH * 0.02 + Math.random() * pitchH * 0.05;
  } else if (result === "SAVED") {
    targetLeft = keeperLeft + keeperW * 0.15;
    targetTop = pitchH * 0.13 + Math.random() * pitchH * 0.05;
  } else {
    // MISS — ball goes wide of the goal
    targetLeft =
      Math.random() < 0.5 ? pitchW * 0.04 : pitchW - ballW - pitchW * 0.04;
    targetTop = pitchH * 0.01 + Math.random() * pitchH * 0.1;
  }

  ball.classList.add("shooting");
  // During the shot animation we allow going past the shoot line
  ball.style.left = Math.min(Math.max(0, targetLeft), pitchW - ballW) + "px";
  ball.style.top = Math.max(0, targetTop) + "px";

  setTimeout(function () {
    showResult(result);

    if (result === "GOAL") {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, 400);

  // After the attempt, return ball to the start
  setTimeout(function () {
    resetBall();
    centerGoalkeeper();
    isShooting = false;
    shootBtn.disabled = false;
  }, 1600);
}

function isSpaceKey(event) {
  return event.code === "Space" || event.key === " ";
}

// --- Keyboard: arrows move, Space shoots (once per press while idle) ---
document.addEventListener("keydown", function (event) {
  if (isSpaceKey(event)) {
    event.preventDefault();
    // Ignore held-key repeats and shots already in progress
    if (event.repeat || isShooting) return;
    shoot();
    return;
  }

  if (
    event.key === "ArrowUp" ||
    event.key === "ArrowDown" ||
    event.key === "ArrowLeft" ||
    event.key === "ArrowRight"
  ) {
    event.preventDefault();
    if (isShooting) return;
    keysPressed.add(event.key);
    startMoveLoop();
  }
});

document.addEventListener("keyup", function (event) {
  if (
    event.key === "ArrowUp" ||
    event.key === "ArrowDown" ||
    event.key === "ArrowLeft" ||
    event.key === "ArrowRight"
  ) {
    keysPressed.delete(event.key);
    if (keysPressed.size === 0) stopMoveLoop();
  }
});

// --- Mouse: click pitch to place the ball (below shoot line) ---
pitch.addEventListener("click", function (event) {
  if (isShooting) return;

  const rect = pitch.getBoundingClientRect();
  const left = event.clientX - rect.left - ball.offsetWidth / 2;
  const top = event.clientY - rect.top - ball.offsetHeight / 2;

  setBallPosition(left, top);
  clearResult();
});

// --- Shoot button ---
shootBtn.addEventListener("click", function () {
  shoot();
});

// Keep start mark and ball aligned when the window is resized
window.addEventListener("resize", function () {
  placeStartMark();
  if (!isShooting) {
    const left = parseFloat(ball.style.left);
    const top = parseFloat(ball.style.top);
    if (!Number.isNaN(left) && !Number.isNaN(top)) {
      setBallPosition(left, top);
    } else {
      resetBall();
    }
    centerGoalkeeper();
  }
});

// Start with the ball covering the start mark
resetBall();
placeStartMark();
centerGoalkeeper();
