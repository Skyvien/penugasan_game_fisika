const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- State Variables ---
let projectile = { x: 0, y: 0, vx: 0, vy: 0, radius: 5, active: false };
let target = { x: 600, y: 350, width: 40, height: 40 };
let animationId;
let path = [];

// --- Data Pencatatan ---
let flightData = {
  timer: 0,
  maxHeight: 0,
  finalRange: 0,
};

// --- Physics Constants ---
const DT = 0.1;
// Catatan: GRAVITY sekarang diambil dinamis dari Slider

// --- DOM Elements ---
const angleInput = document.getElementById("angle");
const powerInput = document.getElementById("power");
const massInput = document.getElementById("mass");
const dragInput = document.getElementById("drag");
const gravityInput = document.getElementById("gravity"); // BARU
const statusMsg = document.getElementById("statusMessage");
const btnFire = document.getElementById("btn-fire");
const btnReset = document.getElementById("btn-reset");

// --- Event Listeners ---
btnFire.addEventListener("click", fireProjectile);
btnReset.addEventListener("click", resetTarget);

// Tambahkan gravityInput ke listener
[angleInput, powerInput, massInput, dragInput, gravityInput].forEach((el) => {
  el.addEventListener("input", updateLabels);
});

function updateLabels() {
  document.getElementById("angleVal").innerText = angleInput.value + "°";
  document.getElementById("powerVal").innerText = powerInput.value + " m/s";
  document.getElementById("massVal").innerText = massInput.value + " kg";
  document.getElementById("dragVal").innerText = (
    dragInput.value / 1000
  ).toFixed(3);
  document.getElementById("gravityVal").innerText =
    gravityInput.value + " m/s²"; // BARU
}

// --- Core Logic ---

function resetTarget() {
  target.x = Math.random() * (750 - 200) + 200;
  target.y = canvas.height - target.height;
  path = [];

  document.getElementById("resTime").innerText = "0.00";
  document.getElementById("resRange").innerText = "0.00";
  document.getElementById("resHeight").innerText = "0.00";

  draw();
  statusMsg.innerText = "Target dipindahkan.";
}

function fireProjectile() {
  if (projectile.active) return;

  const angleRad = (angleInput.value * Math.PI) / 180;
  const velocity = parseFloat(powerInput.value);

  // Posisi Awal
  projectile.x = 20;
  projectile.y = canvas.height - 20;

  // Kinematika Vektor Awal
  projectile.vx = velocity * Math.cos(angleRad);
  projectile.vy = -velocity * Math.sin(angleRad);

  // Reset Data
  flightData.timer = 0;
  flightData.maxHeight = 0;
  flightData.finalRange = 0;

  projectile.active = true;
  path = [];
  statusMsg.innerText = "Simulasi berjalan...";
  loop();
}

function loop() {
  if (!projectile.active) return;

  updatePhysicsRigorous();
  draw();
  checkCollision();

  if (projectile.active) {
    animationId = requestAnimationFrame(loop);
  }
}

function updatePhysicsRigorous() {
  const mass = parseFloat(massInput.value);
  const dragCoeff = parseFloat(dragInput.value) / 1000;
  const g = parseFloat(gravityInput.value); // Ambil nilai Gravitasi dari slider

  // 1. Hitung Speed
  const speed = Math.sqrt(
    projectile.vx * projectile.vx + projectile.vy * projectile.vy
  );

  // 2. Hitung Gaya Hambat
  const dragForce = dragCoeff * speed * speed;

  // 3. Uraikan Gaya
  let F_drag_x = 0;
  let F_drag_y = 0;
  if (speed > 0) {
    F_drag_x = dragForce * (projectile.vx / speed);
    F_drag_y = dragForce * (projectile.vy / speed);
  }

  // 4. Hitung Percepatan (a = F/m)
  const ax = -F_drag_x / mass;
  const ay = g + -F_drag_y / mass; // Gunakan variabel 'g'

  // 5. Integrasi
  projectile.vx += ax * DT;
  projectile.vy += ay * DT;

  projectile.x += projectile.vx * DT;
  projectile.y += projectile.vy * DT;

  // --- Pencatatan Data ---
  flightData.timer += DT;

  let currentRealHeight = canvas.height - projectile.y;
  if (currentRealHeight > flightData.maxHeight) {
    flightData.maxHeight = currentRealHeight;
  }

  if (
    path.length === 0 ||
    Math.abs(projectile.x - path[path.length - 1].x) > 5
  ) {
    path.push({ x: projectile.x, y: projectile.y });
  }

  // Batas Tanah
  if (projectile.y > canvas.height - projectile.radius) {
    projectile.y = canvas.height - projectile.radius;
    projectile.active = false;

    flightData.finalRange = projectile.x - 20;
    displayResults();

    statusMsg.innerText = "Selesai.";
  }

  if (projectile.x > canvas.width) {
    projectile.active = false;
    statusMsg.innerText = "Keluar jangkauan.";
  }
}

function displayResults() {
  document.getElementById("resTime").innerText = flightData.timer.toFixed(2);
  document.getElementById("resRange").innerText =
    flightData.finalRange.toFixed(2);
  document.getElementById("resHeight").innerText =
    flightData.maxHeight.toFixed(2);
}

function checkCollision() {
  if (
    projectile.x > target.x &&
    projectile.x < target.x + target.width &&
    projectile.y > target.y &&
    projectile.y < target.y + target.height
  ) {
    projectile.active = false;
    flightData.finalRange = projectile.x - 20;
    displayResults();
    statusMsg.innerText = "TARGET HANCUR!";
    draw();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Tanah
  ctx.fillStyle = "#333";
  ctx.fillRect(0, canvas.height - 2, canvas.width, 2);

  // Target
  ctx.fillStyle = "#e91e63";
  ctx.fillRect(target.x, target.y, target.width, target.height);

  // Jejak
  ctx.beginPath();
  ctx.strokeStyle = "rgba(0, 188, 212, 0.5)";
  ctx.lineWidth = 2;
  if (path.length > 0) {
    ctx.moveTo(path[0].x, path[0].y);
    for (let p of path) {
      ctx.lineTo(p.x, p.y);
    }
  }
  ctx.stroke();

  // Meriam
  ctx.save();
  ctx.translate(20, canvas.height - 20);
  const angleRad = (angleInput.value * Math.PI) / 180;
  ctx.rotate(-angleRad);
  ctx.fillStyle = "#bbb";
  ctx.fillRect(0, -5, 40, 10);
  ctx.restore();

  // Proyektil
  if (projectile.active || projectile.x > 0) {
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#00bcd4";
    ctx.fill();
    ctx.closePath();

    // --- FITUR BARU: Real-Time HUD (Posisi X, Y) ---
    // Menampilkan teks langsung di dekat bola atau di pojok
    ctx.fillStyle = "white";
    ctx.font = "14px monospace";

    // Konversi koordinat canvas ke koordinat fisika (y naik)
    let realX = (projectile.x - 20).toFixed(1);
    let realY = (canvas.height - projectile.y).toFixed(1);
    let realV = Math.sqrt(
      projectile.vx * projectile.vx + projectile.vy * projectile.vy
    ).toFixed(1);

    // Tampilkan di pojok kiri atas agar mudah dibaca
    ctx.fillText(`Posisi X : ${realX} m`, 10, 20);
    ctx.fillText(`Posisi Y : ${realY} m`, 10, 40);
    ctx.fillText(`Kecepatan: ${realV} m/s`, 10, 60);
  }
}

// Init
resetTarget();
updateLabels();
draw();
