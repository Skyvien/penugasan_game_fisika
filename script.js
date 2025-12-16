const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const warningBox = document.getElementById("offScreenWarning");

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
  landed: false,
};

// --- Physics Constants ---
// KUNCI PRESISI: Time Step sangat kecil (0.01 detik)
const DT = 0.01;

// --- DOM Elements ---
const angleInput = document.getElementById("angle");
const powerInput = document.getElementById("power");
const massInput = document.getElementById("mass");
const dragInput = document.getElementById("drag");
const gravityInput = document.getElementById("gravity");
const statusMsg = document.getElementById("statusMessage");
const btnFire = document.getElementById("btn-fire");
const btnReset = document.getElementById("btn-reset");

// --- Event Listeners ---
btnFire.addEventListener("click", fireProjectile);
btnReset.addEventListener("click", resetTarget);

[angleInput, powerInput, massInput, dragInput, gravityInput].forEach((el) => {
  el.addEventListener("input", updateLabels);
});

function updateLabels() {
  document.getElementById("angleVal").innerText = angleInput.value + "°";
  document.getElementById("powerVal").innerText = powerInput.value + " m/s";
  document.getElementById("massVal").innerText = massInput.value + " kg";

  let dVal = parseFloat(dragInput.value);
  document.getElementById("dragVal").innerText =
    dVal === 0 ? "0.000 (VAKUM)" : (dVal / 1000).toFixed(3);

  document.getElementById("gravityVal").innerText =
    gravityInput.value + " m/s²";
}

// --- Core Logic ---

function resetTarget() {
  target.x = Math.random() * (750 - 200) + 200;
  target.y = canvas.height - target.height;
  path = [];

  document.getElementById("resTime").innerText = "0.00";
  document.getElementById("resRange").innerText = "0.00";
  document.getElementById("resHeight").innerText = "0.00";
  warningBox.style.display = "none";

  draw();
  statusMsg.innerText = "Target dipindahkan.";
}

function fireProjectile() {
  if (projectile.active) return;

  const angleRad = (angleInput.value * Math.PI) / 180;
  const velocity = parseFloat(powerInput.value);

  // LOGIKA START: Mulai dari GARIS TANAH (y = canvas.height)
  // Bukan (canvas.height - 20). Kita anggap meriam ditanam di tanah.
  projectile.x = 20;
  projectile.y = canvas.height;

  projectile.vx = velocity * Math.cos(angleRad);
  projectile.vy = -velocity * Math.sin(angleRad);

  // Reset Data
  flightData.timer = 0;
  flightData.maxHeight = 0;
  flightData.finalRange = 0;
  flightData.landed = false;
  warningBox.style.display = "none";

  projectile.active = true;
  path = [];
  statusMsg.innerText = "Menghitung lintasan teoritis...";
  loop();
}

function loop() {
  if (!projectile.active) return;

  // Sub-stepping: Lakukan perhitungan fisika 5x per frame
  // Ini membuat simulasi sangat halus dan akurat
  for (let i = 0; i < 5; i++) {
    if (projectile.active) updatePhysicsRigorous();
  }

  draw();

  if (projectile.active) {
    animationId = requestAnimationFrame(loop);
  }
}

function updatePhysicsRigorous() {
  const mass = parseFloat(massInput.value);
  const dragSlider = parseFloat(dragInput.value);
  const g = parseFloat(gravityInput.value);

  const speed = Math.sqrt(
    projectile.vx * projectile.vx + projectile.vy * projectile.vy
  );

  // Hitung Gaya Hambat
  let dragForce = 0;
  if (dragSlider > 0) {
    const dragCoeff = dragSlider / 1000;
    dragForce = dragCoeff * speed * speed;
  }

  // Uraikan Gaya Hambat
  let F_drag_x = 0;
  let F_drag_y = 0;
  if (speed > 0 && dragForce > 0) {
    F_drag_x = dragForce * (projectile.vx / speed);
    F_drag_y = dragForce * (projectile.vy / speed);
  }

  // Hitung Percepatan (Newton II)
  const ax = -F_drag_x / mass;
  const ay = g + -F_drag_y / mass;

  // Integrasi Euler
  projectile.vx += ax * DT;
  projectile.vy += ay * DT;

  projectile.x += projectile.vx * DT;
  projectile.y += projectile.vy * DT;

  // --- Pencatatan Data ---
  flightData.timer += DT;

  // Cek Titik Tertinggi (Y=CanvasHeight adalah 0 meter)
  let currentRealHeight = canvas.height - projectile.y;
  if (currentRealHeight > flightData.maxHeight) {
    flightData.maxHeight = currentRealHeight;
  }

  // Jejak Visual
  // Simpan lebih jarang agar tidak berat karena kita pakai sub-stepping
  if (
    path.length === 0 ||
    Math.abs(projectile.x - path[path.length - 1].x) > 2
  ) {
    path.push({ x: projectile.x, y: projectile.y });
  }

  // Cek Visual Luar Layar
  if (projectile.x > canvas.width) {
    warningBox.style.display = "block";
  }

  // --- LOGIKA PENDARATAN TEORITIS ---
  // Berhenti tepat saat y >= canvas.height (Garis Tanah)
  // Kita abaikan radius bola agar hitungan menjadi "Partikel Titik"
  if (projectile.y >= canvas.height) {
    projectile.y = canvas.height; // Snap ke garis
    projectile.active = false;
    flightData.landed = true;

    flightData.finalRange = projectile.x - 20;

    displayResults();
    statusMsg.innerText = "Selesai. Bandingkan dengan rumus.";
    warningBox.style.display = "none";
  }
}

function displayResults() {
  // Tampilkan data presisi
  document.getElementById("resTime").innerText = flightData.timer.toFixed(2);
  document.getElementById("resRange").innerText =
    flightData.finalRange.toFixed(2);
  document.getElementById("resHeight").innerText =
    flightData.maxHeight.toFixed(2);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Gambar Tanah
  ctx.fillStyle = "#333";
  ctx.fillRect(0, canvas.height - 2, canvas.width, 2);

  // 2. Gambar Target (Hanya jika di layar)
  if (target.x < canvas.width) {
    ctx.fillStyle = "#e91e63";
    ctx.fillRect(target.x, target.y, target.width, target.height);
  }

  // 3. Gambar Jejak Lintasan
  ctx.beginPath();
  ctx.strokeStyle = "rgba(0, 188, 212, 0.5)";
  ctx.lineWidth = 2;
  if (path.length > 0) {
    ctx.moveTo(path[0].x, path[0].y);
    for (let p of path) {
      // Hanya gambar garis yang ada di dalam layar agar tidak berat
      if (p.x < canvas.width + 50) ctx.lineTo(p.x, p.y);
    }
  }
  ctx.stroke();

  // 4. Gambar Meriam
  ctx.save();
  ctx.translate(20, canvas.height - 10);
  const angleRad = (angleInput.value * Math.PI) / 180;
  ctx.rotate(-angleRad);
  ctx.fillStyle = "#bbb";
  ctx.fillRect(0, -5, 40, 10);
  ctx.restore();

  // 5. Gambar Bola (HANYA JIKA DI DALAM LAYAR)
  if (
    (projectile.active || flightData.landed) &&
    projectile.x < canvas.width + 20
  ) {
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#00bcd4";
    ctx.fill();
    ctx.closePath();
  }

  // 6. --- PERBAIKAN DI SINI ---
  // Gambar HUD Teks (SELALU MUNCUL, meskipun bola keluar layar)
  if (projectile.active || flightData.landed) {
    ctx.fillStyle = "white";
    ctx.font = "14px monospace";

    // Hitung koordinat
    let realX = (projectile.x - 20).toFixed(1);
    let realY = (canvas.height - projectile.y).toFixed(1);

    // Tampilkan teks di pojok kiri atas
    ctx.fillText(`Posisi X: ${realX} m`, 10, 20);
    ctx.fillText(`Posisi Y: ${realY} m`, 10, 40);
  }
}

// Init
resetTarget();
updateLabels();
draw();
