const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const restartBtn = document.getElementById("restart");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const GROUND_Y = HEIGHT * 0.75;

const GRAVITY = 0.35;
const FLAP_STRENGTH = -6.5;
const PIPE_GAP = 150;
const PIPE_WIDTH = 80;
const PIPE_INTERVAL = 1500;
const PIPE_SPEED = 2.8;

const clouds = Array.from({ length: 6 }, (_, i) => ({
  x: Math.random() * WIDTH,
  y: 60 + (i % 3) * 45 + Math.random() * 20,
  radius: 30 + Math.random() * 20,
  speed: 0.3 + Math.random() * 0.25,
}));

let lastTimestamp = 0;
let lastPipeTime = 0;
let animationId;

const sparrow = {
  x: WIDTH * 0.25,
  y: HEIGHT * 0.5,
  radius: 22,
  velocity: 0,
  rotation: 0,
};

function loadBestScore() {
  try {
    const stored = localStorage.getItem("sparrow-best");
    return stored ? Number(stored) || 0 : 0;
  } catch (error) {
    return 0;
  }
}

function saveBestScore(value) {
  try {
    localStorage.setItem("sparrow-best", String(value));
  } catch (error) {
    // Ignore storage failures (private browsing, etc.)
  }
}

let pipes = [];
let score = 0;
let bestScore = loadBestScore();
let gameState = "ready"; // "ready" | "playing" | "over"

bestEl.textContent = String(bestScore);

function resetGame() {
  sparrow.y = HEIGHT * 0.5;
  sparrow.velocity = 0;
  sparrow.rotation = 0;
  pipes = [];
  score = 0;
  scoreEl.textContent = String(score);
  lastPipeTime = 0;
  lastTimestamp = 0;
  gameState = "ready";
  restartBtn.classList.add("hidden");
}

function startGame() {
  if (gameState === "playing") return;
  if (gameState === "over") {
    resetGame();
  }
  gameState = "playing";
}

function spawnPipe() {
  const minGapY = 120;
  const maxGapY = GROUND_Y - 120 - PIPE_GAP;
  const gapY = Math.random() * (maxGapY - minGapY) + minGapY;
  pipes.push({
    x: WIDTH + PIPE_WIDTH,
    gapY,
    passed: false,
  });
}

function updateSparrow(delta) {
  sparrow.velocity += GRAVITY * delta;
  sparrow.y += sparrow.velocity * delta;
  sparrow.rotation = Math.min(Math.max(sparrow.velocity * 0.08, -0.6), 1.1);

  if (sparrow.y + sparrow.radius >= GROUND_Y - 6) {
    sparrow.y = GROUND_Y - 6 - sparrow.radius;
    gameOver();
  }

  if (sparrow.y - sparrow.radius <= 0) {
    sparrow.y = sparrow.radius;
    sparrow.velocity = 0;
  }
}

function updatePipes(delta) {
  const distance = PIPE_SPEED * delta;
  pipes.forEach((pipe) => {
    pipe.x -= distance;

    if (!pipe.passed && pipe.x + PIPE_WIDTH < sparrow.x - sparrow.radius) {
      pipe.passed = true;
      score += 1;
      scoreEl.textContent = String(score);
      if (score > bestScore) {
        bestScore = score;
        bestEl.textContent = String(bestScore);
        saveBestScore(bestScore);
      }
    }

    const topBottom = getPipeRects(pipe);
    if (rectCircleCollide(topBottom.top) || rectCircleCollide(topBottom.bottom)) {
      gameOver();
    }
  });

  pipes = pipes.filter((pipe) => pipe.x + PIPE_WIDTH > -50);
}

function rectCircleCollide(rect) {
  const closestX = clamp(sparrow.x, rect.x, rect.x + rect.width);
  const closestY = clamp(sparrow.y, rect.y, rect.y + rect.height);
  const distX = sparrow.x - closestX;
  const distY = sparrow.y - closestY;
  return distX * distX + distY * distY < sparrow.radius * sparrow.radius;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getPipeRects(pipe) {
  return {
    top: {
      x: pipe.x,
      y: 0,
      width: PIPE_WIDTH,
      height: pipe.gapY,
    },
    bottom: {
      x: pipe.x,
      y: pipe.gapY + PIPE_GAP,
      width: PIPE_WIDTH,
      height: Math.max(GROUND_Y - (pipe.gapY + PIPE_GAP), 0),
    },
  };
}

function gameOver() {
  if (gameState === "over") return;
  gameState = "over";
  restartBtn.classList.remove("hidden");
}

function flap() {
  if (gameState === "ready") {
    startGame();
  }
  if (gameState !== "playing") return;
  sparrow.velocity = FLAP_STRENGTH;
}

function drawBackground(delta) {
  ctx.fillStyle = "#8fd4ff";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#56c2ff";
  ctx.fillRect(0, HEIGHT * 0.55, WIDTH, HEIGHT * 0.45);

  ctx.fillStyle = "#2f8f3b";
  ctx.fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);

  ctx.fillStyle = "#fff";
  ctx.globalAlpha = 0.55;
  clouds.forEach((cloud) => {
    cloud.x -= cloud.speed * delta * 10;
    if (cloud.x < -cloud.radius * 2) {
      cloud.x = WIDTH + cloud.radius * 2 + Math.random() * 40;
      cloud.y = 40 + Math.random() * 120;
    }
    drawCloud(cloud.x, cloud.y, cloud.radius);
  });
  ctx.globalAlpha = 1;
}

function drawCloud(x, y, radius) {
  ctx.beginPath();
  ctx.fillStyle = "#fff";
  ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2);
  ctx.arc(x + radius * 0.7, y - radius * 0.2, radius * 0.5, 0, Math.PI * 2);
  ctx.arc(x + radius, y + radius * 0.1, radius * 0.45, 0, Math.PI * 2);
  ctx.fill();
}

function drawPipes() {
  ctx.fillStyle = "#3e5d23";
  pipes.forEach((pipe) => {
    const { top, bottom } = getPipeRects(pipe);
    drawPipeRect(top);
    drawPipeRect(bottom);
  });
}

function drawPipeRect(rect) {
  if (rect.height <= 0) {
    return;
  }
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.fillStyle = "#4f752d";
  ctx.fillRect(rect.x - 4, rect.y, rect.width + 8, 14);
  ctx.fillStyle = "#3e5d23";
}

function drawSparrow() {
  ctx.save();
  ctx.translate(sparrow.x, sparrow.y);
  ctx.rotate(sparrow.rotation);

  ctx.fillStyle = "#f2d0a7";
  ctx.beginPath();
  ctx.ellipse(-4, 0, sparrow.radius * 0.9, sparrow.radius * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#c97b3e";
  ctx.beginPath();
  ctx.ellipse(8, -6, sparrow.radius * 0.5, sparrow.radius * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f79c1c";
  ctx.beginPath();
  ctx.moveTo(sparrow.radius * 0.8, -2);
  ctx.lineTo(sparrow.radius * 1.2, 0);
  ctx.lineTo(sparrow.radius * 0.8, 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(6, -10, sparrow.radius * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#123";
  ctx.beginPath();
  ctx.arc(6, -10, sparrow.radius * 0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#c97b3e";
  ctx.beginPath();
  ctx.moveTo(-sparrow.radius, 0);
  ctx.lineTo(-sparrow.radius - 18, -8);
  ctx.lineTo(-sparrow.radius - 12, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawMessage() {
  ctx.fillStyle = "rgba(18, 34, 51, 0.75)";
  ctx.font = "32px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (gameState === "ready") {
    ctx.fillText("Tap to take off!", WIDTH / 2, HEIGHT / 2 - 60);
  } else if (gameState === "over") {
    ctx.fillText("Ouch!", WIDTH / 2, HEIGHT / 2 - 80);
    ctx.font = "24px 'Segoe UI', sans-serif";
    ctx.fillText("Score: " + score, WIDTH / 2, HEIGHT / 2 - 40);
    ctx.fillText("Tap restart", WIDTH / 2, HEIGHT / 2);
  }
}

function update(timestamp) {
  const delta = Math.min((timestamp - lastTimestamp) / 16.666, 1.5);
  lastTimestamp = timestamp;

  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackground(delta);

  if (gameState === "playing") {
    if (timestamp - lastPipeTime > PIPE_INTERVAL) {
      spawnPipe();
      lastPipeTime = timestamp;
    }
    updateSparrow(delta);
    updatePipes(delta);
  }

  drawPipes();
  drawSparrow();
  drawMessage();

  animationId = requestAnimationFrame(update);
}

function handlePointer() {
  if (gameState === "over") {
    resetGame();
    startGame();
  }
  flap();
}

function handleKey(e) {
  if (e.code === "Space" || e.code === "ArrowUp") {
    e.preventDefault();
    if (gameState === "over") {
      resetGame();
      startGame();
    }
    flap();
  } else if (e.code === "Enter" && gameState === "over") {
    e.preventDefault();
    resetGame();
    startGame();
  }
}

canvas.addEventListener("pointerdown", handlePointer);
document.addEventListener("keydown", handleKey);
restartBtn.addEventListener("click", () => {
  resetGame();
  startGame();
});

resetGame();
animationId = requestAnimationFrame(update);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    cancelAnimationFrame(animationId);
  } else {
    lastTimestamp = performance.now();
    animationId = requestAnimationFrame(update);
  }
});
