
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let W = 0;
let H = 0;

function resize() {
  W = canvas.width = window.innerWidth * devicePixelRatio;
  H = canvas.height = window.innerHeight * devicePixelRatio;

  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";

  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}

window.addEventListener("resize", resize);
resize();

const keys = {};

window.addEventListener("keydown", e => {
  keys[e.code] = true;

  if (
    ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]
      .includes(e.code)
  ) {
    e.preventDefault();
  }
});

window.addEventListener("keyup", e => {
  keys[e.code] = false;
});

const FIELD = {
  width: 1600,
  height: 900,
  goalDepth: 180
};

const camera = {
  x: 0,
  y: 0,
  zoom: 1
};

const player = {
  x: -400,
  y: 0,
  vx: 0,
  vy: 0,
  angle: 0,
  speed: 0,
  radius: 34,
  boost: 100,
  z: 0,
  vz: 0,
  grounded: true,
  team: "blue"
};

const bots = [];

for (let i = 0; i < 3; i++) {
  bots.push({
    x: 350 + i * 100,
    y: -250 + i * 250,
    vx: 0,
    vy: 0,
    angle: Math.PI,
    radius: 34,
    z: 0,
    vz: 0,
    grounded: true,
    team: "orange",
    boost: 100
  });
}

const ball = {
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  z: 35,
  vz: 0,
  radius: 35
};

let blueScore = 0;
let orangeScore = 0;
let timeLeft = 300;
let playing = false;
let lastTime = performance.now();

const blueScoreEl = document.getElementById("blueScore");
const orangeScoreEl = document.getElementById("orangeScore");
const timerEl = document.getElementById("timer");
const boostFill = document.getElementById("boostFill");
const messageEl = document.getElementById("message");

document.getElementById("play").onclick = () => {
  document.getElementById("menu").style.display = "none";
  playing = true;
  resetMatch();
};

function resetMatch() {
  player.x = -500;
  player.y = 0;
  player.vx = 0;
  player.vy = 0;
  player.angle = 0;
  player.z = 0;
  player.vz = 0;
  player.boost = 100;

  bots.forEach((b, i) => {
    b.x = 350 + i * 100;
    b.y = -250 + i * 250;
    b.vx = 0;
    b.vy = 0;
    b.z = 0;
    b.vz = 0;
    b.boost = 100;
  });

  ball.x = 0;
  ball.y = 0;
  ball.vx = 0;
  ball.vy = 0;
  ball.z = 35;
  ball.vz = 0;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function length(x, y) {
  return Math.sqrt(x * x + y * y);
}

function normalize(x, y) {
  const l = length(x, y);

  if (l === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: x / l,
    y: y / l
  };
}

function rotatePoint(x, y, a) {
  return {
    x: x * Math.cos(a) - y * Math.sin(a),
    y: x * Math.sin(a) + y * Math.cos(a)
  };
}

function updatePlayer(dt) {
  const forward = {
    x: Math.cos(player.angle),
    y: Math.sin(player.angle)
  };

  const reverse = {
    x: -forward.x,
    y: -forward.y
  };

  const accelerating =
    keys["KeyW"] || keys["ArrowUp"];

  const braking =
    keys["KeyS"] || keys["ArrowDown"];

  const steering =
    (keys["KeyD"] || keys["ArrowRight"] ? 1 : 0) -
    (keys["KeyA"] || keys["ArrowLeft"] ? 1 : 0);

  let maxSpeed = 720;

  if (accelerating) {
    player.vx += forward.x * 900 * dt;
    player.vy += forward.y * 900 * dt;
  }

  if (braking) {
    player.vx += reverse.x * 650 * dt;
    player.vy += reverse.y * 650 * dt;
  }

  if (Math.abs(player.vx) + Math.abs(player.vy) > 40) {
    const speed = length(player.vx, player.vy);

    player.angle +=
      steering *
      3.0 *
      dt *
      clamp(speed / 400, .25, 1);
  }

  if (keys["ShiftLeft"] || keys["ShiftRight"]) {
    if (player.boost > 0) {
      player.vx += forward.x * 1500 * dt;
      player.vy += forward.y * 1500 * dt;

      player.boost -= 35 * dt;
    }
  } else {
    player.boost += 12 * dt;
  }

  player.boost = clamp(player.boost, 0, 100);

  const speed = length(player.vx, player.vy);

  if (speed > maxSpeed) {
    player.vx *= maxSpeed / speed;
    player.vy *= maxSpeed / speed;
  }

  player.vx *= Math.pow(.985, dt * 60);
  player.vy *= Math.pow(.985, dt * 60);

  player.x += player.vx * dt;
  player.y += player.vy * dt;

  if (keys["Space"] && player.grounded) {
    player.vz = 550;
    player.grounded = false;
  }

  player.vz -= 1200 * dt;
  player.z += player.vz * dt;

  if (player.z <= 0) {
    player.z = 0;
    player.vz = 0;
    player.grounded = true;
  }

  keepCarInField(player);
}

function keepCarInField(car) {
  const halfW = FIELD.width / 2;
  const halfH = FIELD.height / 2;

  if (car.x < -halfW + car.radius) {
    car.x = -halfW + car.radius;
    car.vx *= -.35;
  }

  if (car.x > halfW - car.radius) {
    car.x = halfW - car.radius;
    car.vx *= -.35;
  }

  if (car.y < -halfH + car.radius) {
    car.y = -halfH + car.radius;
    car.vy *= -.35;
  }

  if (car.y > halfH - car.radius) {
    car.y = halfH - car.radius;
    car.vy *= -.35;
  }
}

function updateBots(dt) {
  for (const bot of bots) {
    const dx = ball.x - bot.x;
    const dy = ball.y - bot.y;

    const targetAngle = Math.atan2(dy, dx);

    let difference =
      targetAngle - bot.angle;

    while (difference > Math.PI)
      difference -= Math.PI * 2;

    while (difference < -Math.PI)
      difference += Math.PI * 2;

    bot.angle += clamp(difference, -2.5 * dt, 2.5 * dt);

    const forward = {
      x: Math.cos(bot.angle),
      y: Math.sin(bot.angle)
    };

    bot.vx += forward.x * 480 * dt;
    bot.vy += forward.y * 480 * dt;

    const speed = length(bot.vx, bot.vy);

    if (speed > 480) {
      bot.vx *= 480 / speed;
      bot.vy *= 480 / speed;
    }

    bot.vx *= Math.pow(.985, dt * 60);
    bot.vy *= Math.pow(.985, dt * 60);

    bot.x += bot.vx * dt;
    bot.y += bot.vy * dt;

    keepCarInField(bot);
  }
}

function updateBall(dt) {
  ball.vz -= 1000 * dt;
  ball.z += ball.vz * dt;

  if (ball.z <= ball.radius) {
    ball.z = ball.radius;
    ball.vz *= -.7;
  }

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  ball.vx *= Math.pow(.992, dt * 60);
  ball.vy *= Math.pow(.992, dt * 60);

  const halfW = FIELD.width / 2;
  const halfH = FIELD.height / 2;

  if (ball.y < -halfH + ball.radius) {
    ball.y = -halfH + ball.radius;
    ball.vy *= -.8;
  }

  if (ball.y > halfH - ball.radius) {
    ball.y = halfH - ball.radius;
    ball.vy *= -.8;
  }

  if (
    ball.x < -halfW - FIELD.goalDepth
  ) {
    orangeScore++;
    goal("ORANGE SCORES!");
    return;
  }

  if (
    ball.x > halfW + FIELD.goalDepth
  ) {
    blueScore++;
    goal("BLUE SCORES!");
    return;
  }

  if (ball.x < -halfW + ball.radius) {
    ball.x = -halfW + ball.radius;
    ball.vx *= -.8;
  }

  if (ball.x > halfW - ball.radius) {
    ball.x = halfW - ball.radius;
    ball.vx *= -.8;
  }

  collideCarBall(player);

  for (const bot of bots) {
    collideCarBall(bot);
  }
}

function collideCarBall(car) {
  const dx = ball.x - car.x;
  const dy = ball.y - car.y;

  const dist = length(dx, dy);

  if (dist > car.radius + ball.radius) {
    return;
  }

  const n = normalize(dx, dy);

  const relativeVelocity =
    (ball.vx - car.vx) * n.x +
    (ball.vy - car.vy) * n.y;

  if (relativeVelocity < 0) {
    return;
  }

  const hitStrength =
    500 +
    length(car.vx, car.vy) * .9 +
    Math.max(0, car.vz) * .5;

  ball.vx += n.x * hitStrength;
  ball.vy += n.y * hitStrength;

  if (car.z > 10) {
    ball.vz += car.vz * .25;
  }

  ball.x =
    car.x + n.x * (car.radius + ball.radius + 1);

  ball.y =
    car.y + n.y * (car.radius + ball.radius + 1);
}

function goal(text) {
  messageEl.textContent = text;

  setTimeout(() => {
    messageEl.textContent = "";
    resetMatch();
  }, 1500);
}

function updateCamera() {
  camera.x +=
    (player.x - camera.x) * .08;

  camera.y +=
    (player.y - camera.y) * .08;

  camera.zoom = 0.75;
}

function worldToScreen(x, y) {
  return {
    x:
      window.innerWidth / 2 +
      (x - camera.x) * camera.zoom,

    y:
      window.innerHeight / 2 +
      (y - camera.y) * camera.zoom
  };
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(
    0,
    0,
    0,
    window.innerHeight
  );

  gradient.addColorStop(0, "#06101e");
  gradient.addColorStop(1, "#02050a");

  ctx.fillStyle = gradient;
  ctx.fillRect(
    0,
    0,
    window.innerWidth,
    window.innerHeight
  );
}

function drawArena() {
  const p1 =
    worldToScreen(
      -FIELD.width / 2,
      -FIELD.height / 2
    );

  const width =
    FIELD.width * camera.zoom;

  const height =
    FIELD.height * camera.zoom;

  ctx.fillStyle = "#17652f";

  ctx.fillRect(
    p1.x,
    p1.y,
    width,
    height
  );

  // grass stripes
  ctx.globalAlpha = .15;

  for (let x = 0; x < 16; x++) {
    ctx.fillStyle =
      x % 2 === 0
        ? "#ffffff"
        : "#000000";

    ctx.fillRect(
      p1.x + x * width / 16,
      p1.y,
      width / 16,
      height
    );
  }

  ctx.globalAlpha = 1;

  // boundary
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 5;

  ctx.strokeRect(
    p1.x,
    p1.y,
    width,
    height
  );

  // center line
  ctx.beginPath();

  ctx.moveTo(
    window.innerWidth / 2,
    p1.y
  );

  ctx.lineTo(
    window.innerWidth / 2,
    p1.y + height
  );

  ctx.stroke();

  // center circle
  ctx.beginPath();

  ctx.arc(
    window.innerWidth / 2,
    window.innerHeight / 2,
    130 * camera.zoom,
    0,
    Math.PI * 2
  );

  ctx.stroke();

  // goals
  drawGoal(-1);
  drawGoal(1);
}

function drawGoal(side) {
  const halfW = FIELD.width / 2;

  const x =
    side < 0
      ? -halfW - FIELD.goalDepth
      : halfW;

  const top =
    -FIELD.height / 2 + 180;

  const bottom =
    FIELD.height / 2 - 180;

  const p1 = worldToScreen(x, top);
  const p2 = worldToScreen(
    x + FIELD.goalDepth * side,
    bottom
  );

  ctx.strokeStyle =
    side < 0
      ? "#28a9ff"
      : "#ff7b20";

  ctx.lineWidth = 12;

  ctx.strokeRect(
    Math.min(p1.x, p2.x),
    Math.min(p1.y, p2.y),
    Math.abs(p2.x - p1.x),
    Math.abs(p2.y - p1.y)
  );
}

function drawBall() {
  const p =
    worldToScreen(ball.x, ball.y);

  const height =
    ball.z * camera.zoom;

  ctx.save();

  ctx.shadowBlur = 25;
  ctx.shadowColor = "white";

  ctx.fillStyle = "#ffffff";

  ctx.beginPath();

  ctx.arc(
    p.x,
    p.y - height,
    ball.radius * camera.zoom,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.shadowBlur = 0;

  ctx.strokeStyle = "#222";
  ctx.lineWidth = 3;

  ctx.stroke();

  ctx.restore();
}

function drawCar(car, isPlayer = false) {
  const p =
    worldToScreen(car.x, car.y);

  const scale =
    camera.zoom;

  ctx.save();

  ctx.translate(
    p.x,
    p.y - car.z * scale
  );

  ctx.rotate(car.angle);

  // shadow
  ctx.restore();

  ctx.save();

  const shadow =
    worldToScreen(car.x, car.y);

  ctx.fillStyle = "rgba(0,0,0,.35)";

  ctx.beginPath();

  ctx.ellipse(
    shadow.x,
    shadow.y + 22 * scale,
    45 * scale,
    18 * scale,
    0,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.translate(
    p.x,
    p.y - car.z * scale
  );

  ctx.rotate(car.angle);

  // body
  ctx.fillStyle =
    isPlayer
      ? "#168cff"
      : "#ff6d18";

  ctx.beginPath();

  ctx.roundRect(
    -48 * scale,
    -27 * scale,
    96 * scale,
    54 * scale,
    12 * scale
  );

  ctx.fill();

  // roof
  ctx.fillStyle =
    isPlayer
      ? "#8ed7ff"
      : "#ffc08c";

  ctx.beginPath();

  ctx.roundRect(
    -25 * scale,
    -20 * scale,
    42 * scale,
    40 * scale,
    8 * scale
  );

  ctx.fill();

  // windshield
  ctx.fillStyle = "#14202c";

  ctx.beginPath();

  ctx.moveTo(
    5 * scale,
    -18 * scale
  );

  ctx.lineTo(
    25 * scale,
    -13 * scale
  );

  ctx.lineTo(
    25 * scale,
    13 * scale
  );

  ctx.lineTo(
    5 * scale,
    18 * scale
  );

  ctx.closePath();

  ctx.fill();

  // wheels
  ctx.fillStyle = "#090909";

  for (const y of [-31, 31]) {
    ctx.beginPath();

    ctx.arc(
      -22 * scale,
      y * scale,
      10 * scale,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.beginPath();

    ctx.arc(
      25 * scale,
      y * scale,
      10 * scale,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  // boost flame
  if (
    isPlayer &&
    (keys["ShiftLeft"] ||
      keys["ShiftRight"]) &&
    player.boost > 0
  ) {
    ctx.fillStyle = "#ffd23c";

    ctx.beginPath();

    ctx.moveTo(-48 * scale, 0);

    ctx.lineTo(
      -85 * scale,
      -12 * scale
    );

    ctx.lineTo(
      -70 * scale,
      0
    );

    ctx.lineTo(
      -85 * scale,
      12 * scale
    );

    ctx.closePath();

    ctx.fill();
  }

  ctx.restore();
}

function render() {
  drawBackground();

  drawArena();

  drawBall();

  for (const bot of bots) {
    drawCar(bot);
  }

  drawCar(player, true);
}

function updateHUD() {
  blueScoreEl.textContent = blueScore;
  orangeScoreEl.textContent = orangeScore;

  const minutes =
    Math.floor(timeLeft / 60);

  const seconds =
    Math.floor(timeLeft % 60)
      .toString()
      .padStart(2, "0");

  timerEl.textContent =
    `${minutes}:${seconds}`;

  boostFill.style.transform =
    `scaleX(${player.boost / 100})`;
}

function gameLoop(now) {
  const dt =
    Math.min(
      (now - lastTime) / 1000,
      .033
    );

  lastTime = now;

  if (playing) {
    timeLeft -= dt;

    if (timeLeft <= 0) {
      timeLeft = 0;
      playing = false;

      messageEl.textContent =
        blueScore === orangeScore
          ? "DRAW!"
          : "MATCH OVER";

      setTimeout(() => {
        blueScore = 0;
        orangeScore = 0;
        timeLeft = 300;
        messageEl.textContent = "";
        resetMatch();
        playing = true;
      }, 2500);
    }

    updatePlayer(dt);
    updateBots(dt);
    updateBall(dt);
    updateCamera();
    updateHUD();
  }

  render();

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
