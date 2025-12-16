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
const DT = 0.05; // Time Step diperkecil (0.05) agar hasil lebih presisi mendekati manual

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

  // Reset Hasil
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

  // Debugging di Console (Cek Validitas Data)
  console.log("--- MULAI TEMBAKAN BARU ---");
  console.log("Sudut:", angleInput.value);
  console.log("Kecepatan:", velocity);
  console.log("Drag Slider:", dragInput.value);
  console.log("Gravitasi:", gravityInput.value);

  // Posisi Awal
  projectile.x = 20;
  projectile.y = canvas.height - 20;

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
  statusMsg.innerText = "Menghitung lintasan...";
  loop();
}

function loop() {
  if (!projectile.active) return;

  // Panggil logika fisika berulang kali dalam satu frame agar lebih cepat & akurat
  // (Sub-stepping)
  updatePhysicsRigorous();

  draw();

  if (projectile.active) {
    animationId = requestAnimationFrame(loop);
  }
}

function updatePhysicsRigorous() {
  const mass = parseFloat(massInput.value);
  const dragSlider = parseFloat(dragInput.value);
  const g = parseFloat(gravityInput.value);

  // 1. Hitung Speed
  const speed = Math.sqrt(
    projectile.vx * projectile.vx + projectile.vy * projectile.vy
  );

  // 2. Hitung Gaya Hambat
  // Jika slider 0, paksa dragForce jadi 0 murni
  let dragForce = 0;
  if (dragSlider > 0) {
    const dragCoeff = dragSlider / 1000;
    dragForce = dragCoeff * speed * speed;
  }

  // 3. Uraikan Gaya Hambat
  let F_drag_x = 0;
  let F_drag_y = 0;

  if (speed > 0 && dragForce > 0) {
    F_drag_x = dragForce * (projectile.vx / speed);
    F_drag_y = dragForce * (projectile.vy / speed);
  }

  // 4. Hitung Percepatan (Newton II)
  const ax = -F_drag_x / mass;
  const ay = g + -F_drag_y / mass;

  // 5. Update Posisi & Kecepatan
  projectile.vx += ax * DT;
  projectile.vy += ay * DT;

  projectile.x += projectile.vx * DT;
  projectile.y += projectile.vy * DT;

  // --- Pencatatan Data ---
  flightData.timer += DT;

  // Cek Titik Tertinggi
  let currentRealHeight = canvas.height - projectile.y;
  if (currentRealHeight > flightData.maxHeight) {
    flightData.maxHeight = currentRealHeight;
  }

  // Jejak Visual
  if (
    path.length === 0 ||
    Math.abs(projectile.x - path[path.length - 1].x) > 5
  ) {
    path.push({ x: projectile.x, y: projectile.y });
  }

  // Cek Keluar Layar (Visual Warning saja, JANGAN stop simulasi)
  if (projectile.x > canvas.width) {
    warningBox.style.display = "block";
  }

  // BATAS TANAH (STOP SIMULASI DI SINI)
  // Tanah ada di y = canvas.height
  if (projectile.y >= canvas.height - projectile.radius) {
    // Koreksi posisi agar pas di tanah
    projectile.y = canvas.height - projectile.radius;
    projectile.active = false;
    flightData.landed = true;

    // Catat jarak akhir (Posisi X saat ini - Posisi Awal 20)
    flightData.finalRange = projectile.x - 20;

    displayResults();
    statusMsg.innerText = "Pendaratan Selesai. Data tercatat.";
    warningBox.style.display = "none";
  }
}

function displayResults() {
  document.getElementById("resTime").innerText = flightData.timer.toFixed(2);
  document.getElementById("resRange").innerText =
    flightData.finalRange.toFixed(2);
  document.getElementById("resHeight").innerText =
    flightData.maxHeight.toFixed(2);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Tanah
  ctx.fillStyle = "#333";
  ctx.fillRect(0, canvas.height - 2, canvas.width, 2);

  // Target (Hanya gambar jika target ada dalam layar)
  if (target.x < canvas.width) {
    ctx.fillStyle = "#e91e63";
    ctx.fillRect(target.x, target.y, target.width, target.height);
  }

  // Jejak Lintasan
  ctx.beginPath();
  ctx.strokeStyle = "rgba(0, 188, 212, 0.5)";
  ctx.lineWidth = 2;
  if (path.length > 0) {
    // Kita geser visualnya jika bola sudah jauh sekali (opsional, tapi biarkan statis dulu)
    ctx.moveTo(path[0].x, path[0].y);
    for (let p of path) {
      // Hanya gambar jejak yang masuk akal di layar
      if (p.x < canvas.width + 50) {
        ctx.lineTo(p.x, p.y);
      }
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

  // Proyektil (Hanya gambar jika masih di dalam layar)
  if (
    (projectile.active || flightData.landed) &&
    projectile.x < canvas.width + 10
  ) {
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#00bcd4";
    ctx.fill();
    ctx.closePath();
  }

  // HUD Real-Time
  ctx.fillStyle = "white";
  ctx.font = "14px monospace";
  let realX = (projectile.x - 20).toFixed(1);
  let realY = (canvas.height - projectile.y).toFixed(1);
  ctx.fillText(`X: ${realX}m | Y: ${realY}m`, 10, 20);
}

// Init
resetTarget();
updateLabels();
draw();
