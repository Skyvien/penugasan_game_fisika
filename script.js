const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- State Variables ---
let projectile = { x: 0, y: 0, vx: 0, vy: 0, radius: 5, active: false };
let target = { x: 600, y: 350, width: 40, height: 40 };
let animationId;
let path = []; // Jejak lintasan

// --- Data Pencatatan (Measurement Tools) ---
let flightData = {
    timer: 0,
    maxHeight: 0,
    finalRange: 0
};

// --- Physics Constants ---
const DT = 0.1; // Delta time
const GRAVITY = 9.8; // Gravitasi Bumi

// --- DOM Elements ---
const angleInput = document.getElementById('angle');
const powerInput = document.getElementById('power');
const massInput = document.getElementById('mass'); 
const dragInput = document.getElementById('drag');
const statusMsg = document.getElementById('statusMessage');
const btnFire = document.getElementById('btn-fire');
const btnReset = document.getElementById('btn-reset');

// --- Event Listeners ---
btnFire.addEventListener('click', fireProjectile);
btnReset.addEventListener('click', resetTarget);

[angleInput, powerInput, massInput, dragInput].forEach(el => {
    el.addEventListener('input', updateLabels);
});

function updateLabels() {
    document.getElementById('angleVal').innerText = angleInput.value + "°";
    document.getElementById('powerVal').innerText = powerInput.value + " m/s";
    document.getElementById('massVal').innerText = massInput.value + " kg";
    document.getElementById('dragVal').innerText = (dragInput.value / 1000).toFixed(3);
}

// --- Core Logic ---

function resetTarget() {
    target.x = Math.random() * (750 - 200) + 200;
    target.y = canvas.height - target.height; 
    path = []; 
    // Reset Data Tampilan
    document.getElementById('resTime').innerText = "0.00";
    document.getElementById('resRange').innerText = "0.00";
    document.getElementById('resHeight').innerText = "0.00";
    
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
    
    // RESET ALAT UKUR
    flightData.timer = 0;
    flightData.maxHeight = 0;
    flightData.finalRange = 0;
    
    projectile.active = true;
    path = []; 
    statusMsg.innerText = "Sedang mengukur lintasan...";
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

// --- PHYSICS ENGINE (Hukum Newton II) ---
function updatePhysicsRigorous() {
    const mass = parseFloat(massInput.value);
    const dragCoeff = parseFloat(dragInput.value) / 1000; 

    // 1. Hitung Speed (Magnitude Vektor)
    const speed = Math.sqrt(projectile.vx * projectile.vx + projectile.vy * projectile.vy);

    // 2. Hitung Gaya Hambat (F_drag)
    const dragForce = dragCoeff * speed * speed;

    // 3. Uraikan Gaya Hambat (X dan Y)
    // Cegah pembagian dengan nol jika speed sangat kecil
    let F_drag_x = 0;
    let F_drag_y = 0;
    if (speed > 0) {
        F_drag_x = dragForce * (projectile.vx / speed);
        F_drag_y = dragForce * (projectile.vy / speed);
    }

    // 4. Hitung Percepatan (a = F/m)
    // Sumbu X: a = -F_drag / m
    const ax = -(F_drag_x) / mass;
    
    // Sumbu Y: a = g + (-F_drag / m)
    const ay = GRAVITY + (-(F_drag_y) / mass);

    // 5. Integrasi Numerik (Update Kecepatan & Posisi)
    projectile.vx += ax * DT;
    projectile.vy += ay * DT;

    projectile.x += projectile.vx * DT;
    projectile.y += projectile.vy * DT;

    // --- PENCATATAN DATA ---
    flightData.timer += DT; // Tambah waktu

    // Cek Ketinggian Maksimum (Y=0 di atas, jadi dibalik)
    let currentRealHeight = canvas.height - projectile.y;
    if (currentRealHeight > flightData.maxHeight) {
        flightData.maxHeight = currentRealHeight;
    }

    // Jejak visual
    if (path.length === 0 || Math.abs(projectile.x - path[path.length-1].x) > 5) {
        path.push({x: projectile.x, y: projectile.y});
    }

    // Batas Tanah
    if (projectile.y > canvas.height - projectile.radius) {
        projectile.y = canvas.height - projectile.radius;
        projectile.active = false; 
        
        // Catat jarak akhir
        flightData.finalRange = projectile.x - 20; 
        displayResults(); // Tampilkan hasil akhir
        
        statusMsg.innerText = "Objek mendarat. Data tercatat.";
    }
    
    // Batas Kanan
    if (projectile.x > canvas.width) {
        projectile.active = false;
        statusMsg.innerText = "Objek keluar jangkauan.";
    }
}

function displayResults() {
    document.getElementById('resTime').innerText = flightData.timer.toFixed(2);
    document.getElementById('resRange').innerText = flightData.finalRange.toFixed(2);
    document.getElementById('resHeight').innerText = flightData.maxHeight.toFixed(2);
}

function checkCollision() {
    if (projectile.x > target.x && 
        projectile.x < target.x + target.width &&
        projectile.y > target.y &&
        projectile.y < target.y + target.height) {
        
        projectile.active = false;
        
        // Catat data saat kena target juga
        flightData.finalRange = projectile.x - 20;
        displayResults();

        statusMsg.innerText = "TARGET HANCUR! Kalkulasi presisi.";
        statusMsg.style.color = "#4caf50";
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

    // Jejak Lintasan
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
    if (projectile.active || (projectile.x > 0)) {
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#00bcd4"; 
        ctx.fill();
        ctx.closePath();
    }
}

// Init Awal
resetTarget();
updateLabels();
draw(); 
