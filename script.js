const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- State Variables ---
let projectile = { x: 0, y: 0, vx: 0, vy: 0, radius: 5, active: false };
let target = { x: 600, y: 350, width: 40, height: 40 };
let animationId;
let path = []; // Untuk menggambar jejak lintasan (Kinematika)

// --- Physics Constants ---
const DT = 0.1; // Delta time (semakin kecil semakin akurat)
const GRAVITY = 9.8; // m/s^2

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
    document.getElementById('powerVal').innerText = powerInput.value;
    document.getElementById('massVal').innerText = massInput.value + " kg";
    // Tampilkan nilai asli koefisien drag (dibagi 1000 agar masuk akal)
    document.getElementById('dragVal').innerText = (dragInput.value / 1000).toFixed(3);
}

// --- Core Logic ---

function resetTarget() {
    target.x = Math.random() * (750 - 200) + 200;
    target.y = canvas.height - target.height; 
    path = []; // Hapus jejak lama
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

    // KINEMATIKA: Menguraikan Vektor Kecepatan Awal
    projectile.vx = velocity * Math.cos(angleRad); 
    projectile.vy = -velocity * Math.sin(angleRad); // Negatif karena Y naik ke atas di Canvas
    
    projectile.active = true;
    path = []; // Reset jejak
    statusMsg.innerText = "Simulasi berjalan dengan Gaya Hambat...";
    loop();
}

function loop() {
    if (!projectile.active) return;

    updatePhysicsRigorous(); // Menggunakan fungsi fisika yang lebih canggih
    draw();
    checkCollision();

    if (projectile.active) {
        animationId = requestAnimationFrame(loop);
    }
}

// --- NEW PHYSICS ENGINE (Hukum Newton II) ---
function updatePhysicsRigorous() {
    // Ambil variabel fisika
    const mass = parseFloat(massInput.value);
    const dragCoeff = parseFloat(dragInput.value) / 1000; // Skala kecil

    // 1. Hitung Kecepatan Sesaat (Resultan Vektor V)
    // Rumus: v = akar(vx^2 + vy^2)
    const speed = Math.sqrt(projectile.vx * projectile.vx + projectile.vy * projectile.vy);

    // 2. Hitung Gaya Hambatan Udara (Drag Force)
    // Rumus Fisika: Fd = -0.5 * p * v^2 * Cd * A
    // Penyederhanaan Kode: F_drag = -k * v * v
    const dragForce = dragCoeff * speed * speed;

    // 3. Uraikan Gaya Hambat ke Sumbu X dan Y
    // Fx = -Fd * cos(theta) -> cos(theta) adalah vx/speed
    // Fy = -Fd * sin(theta) -> sin(theta) adalah vy/speed
    const F_drag_x = dragForce * (projectile.vx / speed);
    const F_drag_y = dragForce * (projectile.vy / speed);

    // 4. Hitung Percepatan Total (Hukum Newton II: a = F / m)
    // Sumbu X: Hanya ada gaya hambat (berlawanan arah gerak)
    const ax = -(F_drag_x) / mass;
    
    // Sumbu Y: Gaya gravitasi (ke bawah/positif) + Gaya hambat (berlawanan arah gerak)
    const ay = GRAVITY + (-(F_drag_y) / mass);

    // 5. Integrasi Euler (Update Kecepatan & Posisi)
    projectile.vx += ax * DT;
    projectile.vy += ay * DT;

    projectile.x += projectile.vx * DT;
    projectile.y += projectile.vy * DT;

    // Simpan jejak lintasan setiap beberapa frame
    if (path.length === 0 || Math.abs(projectile.x - path[path.length-1].x) > 5) {
        path.push({x: projectile.x, y: projectile.y});
    }

    // Batas Tanah
    if (projectile.y > canvas.height - projectile.radius) {
        projectile.y = canvas.height - projectile.radius;
        projectile.active = false; 
        statusMsg.innerText = "Berhenti. Gesekan tanah menghentikan objek.";
    }
    
    // Batas Kanan
    if (projectile.x > canvas.width) {
        projectile.active = false;
        statusMsg.innerText = "Objek keluar area.";
    }
}

function checkCollision() {
    if (projectile.x > target.x && 
        projectile.x < target.x + target.width &&
        projectile.y > target.y &&
        projectile.y < target.y + target.height) {
        
        projectile.active = false;
        statusMsg.innerText = "TARGET HANCUR! Kalkulasi tepat.";
        statusMsg.style.color = "#4caf50";
        draw(); 
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Gambar Tanah
    ctx.fillStyle = "#333";
    ctx.fillRect(0, canvas.height - 2, canvas.width, 2);

    // Gambar Target
    ctx.fillStyle = "#e91e63"; 
    ctx.fillRect(target.x, target.y, target.width, target.height);

    // Gambar Lintasan (Jejak Kinematika)
    ctx.beginPath();
    ctx.strokeStyle = "rgba(0, 188, 212, 0.5)"; // Cyan transparan
    ctx.lineWidth = 2;
    if (path.length > 0) {
        ctx.moveTo(path[0].x, path[0].y);
        for (let p of path) {
            ctx.lineTo(p.x, p.y);
        }
    }
    ctx.stroke();

    // Gambar Meriam
    ctx.save();
    ctx.translate(20, canvas.height - 20);
    const angleRad = (angleInput.value * Math.PI) / 180;
    ctx.rotate(-angleRad);
    ctx.fillStyle = "#bbb";
    ctx.fillRect(0, -5, 40, 10); 
    ctx.restore();

    // Gambar Proyektil
    if (projectile.active || (projectile.x > 0)) {
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#00bcd4"; 
        ctx.fill();
        ctx.closePath();
    }
}

// Init
resetTarget();
updateLabels();
draw();