import { Mat3 } from "./matrix3.js";

// ==========================================
// 1. INISIALISASI WEBGL2 CANVAS
// ==========================================
const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
  throw new Error("WebGL2 tidak didukung pada browser ini.");
}

// Set Viewport WebGL
gl.viewport(0, 0, canvas.width, canvas.height);

// ==========================================
// 2. SHADER PROGRAM (VERTEX & FRAGMENT SHADER)
// ==========================================
const vertexShaderSource = `#version 300 es
in vec2 a_position;
uniform mat3 u_matrix;

void main() {
  // Transformasi posisi 2D dengan Matriks 3x3
  vec3 position = u_matrix * vec3(a_position, 1.0);
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float;
uniform vec4 u_color;
out vec4 outColor;

void main() {
  outColor = u_color;
}
`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error("Gagal kompilasi shader:\n" + info);
  }
  return shader;
}

function createProgram(gl, vs, fs) {
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error("Gagal link program shader:\n" + info);
  }
  return program;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
const program = createProgram(gl, vertexShader, fragmentShader);

gl.useProgram(program);

const positionLoc = gl.getAttribLocation(program, "a_position");
const matrixLoc = gl.getUniformLocation(program, "u_matrix");
const colorLoc = gl.getUniformLocation(program, "u_color");

// ==========================================
// 3. GENERATOR PRIMITIF GRAFIS 2D
// ==========================================

// A. Unit Quad (Persegi Panjang Pusat 0,0)
const unitRectVertices = new Float32Array([
  -0.5, -0.5,
   0.5, -0.5,
  -0.5,  0.5,
  -0.5,  0.5,
   0.5, -0.5,
   0.5,  0.5
]);

// B. Unit Circle (Lingkaran Pusat 0,0)
function createCircleVertices(segments = 32) {
  const positions = [];
  for (let i = 0; i < segments; i++) {
    const a1 = (i / segments) * Math.PI * 2;
    const a2 = ((i + 1) / segments) * Math.PI * 2;
    positions.push(0, 0); // Titik Pusat
    positions.push(Math.cos(a1) * 0.5, Math.sin(a1) * 0.5);
    positions.push(Math.cos(a2) * 0.5, Math.sin(a2) * 0.5);
  }
  return new Float32Array(positions);
}

const unitCircleVertices = createCircleVertices(36);

// Helper Fungsi Membuat Buffer VBO & VAO
function createBufferAndVAO(vertices) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  gl.bindVertexArray(null);
  return { vao, count: vertices.length / 2 };
}

const rectShape = createBufferAndVAO(unitRectVertices);
const circleShape = createBufferAndVAO(unitCircleVertices);

// ==========================================
// 4. FUNGSI TRANSFORMASI TRS & FUNGSI GAMBAR
// ==========================================
function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}

// Fungsi Komposisi Matriks Transformasi (Translation -> Rotation -> Scale)
function createTRSMatrix(tx, ty, rotDeg, sx, sy, parentMatrix = Mat3.identity()) {
  let m = Mat3.translation(tx, ty);
  if (rotDeg !== 0) {
    m = Mat3.multiply(m, Mat3.rotation(degToRad(rotDeg)));
  }
  m = Mat3.multiply(m, Mat3.scaling(sx, sy));
  return Mat3.multiply(parentMatrix, m);
}

// Fungsi Penggambar Objek
function drawShape(shape, matrix, color) {
  gl.uniformMatrix3fv(matrixLoc, false, matrix);
  gl.uniform4fv(colorLoc, color);

  gl.bindVertexArray(shape.vao);
  gl.drawArrays(gl.TRIANGLES, 0, shape.count);
}

// ==========================================
// 5. PENYUSUNAN ELEMEN SCENE 2D (REKONSTRUKSI)
// ==========================================

// Tanah / Lapangan Rumput
function drawGround() {
  const matrix = createTRSMatrix(0, -0.5, 0, 2.0, 1.0);
  drawShape(rectShape, matrix, [0.55, 0.8, 0.45, 1.0]); // Hijau Muda
}

// Matahari
function drawSun() {
  const matrix = createTRSMatrix(0.1, 0.72, 0, 0.35, 0.35);
  drawShape(circleShape, matrix, [1.0, 0.95, 0.3, 1.0]); // Kuning
}

// Pohon (Batang & Dedaunan)
function drawTree(x, y, scale = 1.0) {
  const parent = Mat3.translation(x, y);

  // Batang Cokelat
  const trunkM = createTRSMatrix(0, 0, 0, 0.08 * scale, 0.6 * scale, parent);
  drawShape(rectShape, trunkM, [0.4, 0.25, 0.15, 1.0]);

  // Warna Daun (Hijau)
  const leafColor = [0.2, 0.6, 0.2, 1.0];

  // GABUNGAN BULAT-BULATAN DAUN (Kluster Lingkaran)
  // [offsetX, offsetY, scaleX, scaleY]
  const leafClusters = [
    [ 0.00,  0.40,  0.42, 0.42], // Lingkaran Tengah Utama
    [-0.15,  0.32,  0.32, 0.32], // Lingkaran Kiri
    [ 0.15,  0.32,  0.32, 0.32], // Lingkaran Kanan
    [-0.10,  0.48,  0.30, 0.30], // Lingkaran Kiri Atas
    [ 0.10,  0.48,  0.30, 0.30], // Lingkaran Kanan Atas
    [ 0.00,  0.55,  0.28, 0.28]  // Lingkaran Puncak Atas
  ];

  // Loop untuk menggambar tiap bulatan daun
  leafClusters.forEach(([ox, oy, sx, sy]) => {
    const leafM = createTRSMatrix(
      ox * scale, 
      oy * scale, 
      0, 
      sx * scale, 
      sy * scale, 
      parent
    );
    drawShape(circleShape, leafM, leafColor);
  });
}

// Semak-Semak
function drawBush(x, y, rx, ry) {
  const matrix = createTRSMatrix(x, y, 0, rx, ry);
  drawShape(circleShape, matrix, [0.25, 0.65, 0.25, 1.0]);
}

// Kursi Taman
function drawBench(x, y) {
  const parent = Mat3.translation(x, y);

  // Papan Dudukan & Sandaran
  const board1 = createTRSMatrix(0, 0, 0, 0.4, 0.04, parent);
  const board2 = createTRSMatrix(0, 0.06, 0, 0.4, 0.04, parent);
  const back1 = createTRSMatrix(0, 0.16, -10, 0.4, 0.04, parent);
  const back2 = createTRSMatrix(0, 0.22, -10, 0.4, 0.04, parent);

  drawShape(rectShape, board1, [0.7, 0.4, 0.2, 1.0]);
  drawShape(rectShape, board2, [0.7, 0.4, 0.2, 1.0]);
  drawShape(rectShape, back1, [0.7, 0.4, 0.2, 1.0]);
  drawShape(rectShape, back2, [0.7, 0.4, 0.2, 1.0]);

  // Kaki Kursi
  const leg1 = createTRSMatrix(-0.16, -0.08, 0, 0.03, 0.16, parent);
  const leg2 = createTRSMatrix(0.16, -0.08, 0, 0.03, 0.16, parent);
  drawShape(rectShape, leg1, [0.2, 0.2, 0.2, 1.0]);
  drawShape(rectShape, leg2, [0.2, 0.2, 0.2, 1.0]);
}

// Karakter Manusia
function drawHuman(x, y) {
  const parent = Mat3.translation(x, y);

  // Kaki
  const leg1 = createTRSMatrix(-0.06, -0.22, 0, 0.04, 0.2, parent);
  const leg2 = createTRSMatrix(0.06, -0.22, 0, 0.04, 0.2, parent);
  drawShape(rectShape, leg1, [0.85, 0.75, 0.6, 1.0]);
  drawShape(rectShape, leg2, [0.85, 0.75, 0.6, 1.0]);

  // Celana Biru
  const shorts = createTRSMatrix(0, -0.08, 0, 0.16, 0.12, parent);
  drawShape(rectShape, shorts, [0.15, 0.4, 0.85, 1.0]);

  // Baju Oranye
  const torso = createTRSMatrix(0, 0.08, 0, 0.18, 0.2, parent);
  drawShape(rectShape, torso, [0.95, 0.5, 0.1, 1.0]);

  // Tangan
  const arm = createTRSMatrix(-0.12, 0.08, 20, 0.04, 0.16, parent);
  drawShape(rectShape, arm, [0.85, 0.75, 0.6, 1.0]);

  // Kepala Lingkaran
  const head = createTRSMatrix(0, 0.26, 0, 0.18, 0.18, parent);
  drawShape(circleShape, head, [0.85, 0.75, 0.6, 1.0]);

  // Topi
  const cap = createTRSMatrix(0, 0.35, 0, 0.2, 0.04, parent);
  drawShape(rectShape, cap, [0.75, 0.6, 0.4, 1.0]);
}

// Karakter Anjing (Dengan Animasi Kepala)
function drawDog(x, y, seconds) {
  const parent = Mat3.translation(x, y);

  // Badan
  const body = createTRSMatrix(0, 0, 0, 0.24, 0.16, parent);
  drawShape(rectShape, body, [0.76, 0.58, 0.38, 1.0]);

  // Kaki
  const leg1 = createTRSMatrix(-0.08, -0.12, 0, 0.04, 0.1, parent);
  const leg2 = createTRSMatrix(0.08, -0.12, 0, 0.04, 0.1, parent);
  drawShape(rectShape, leg1, [0.76, 0.58, 0.38, 1.0]);
  drawShape(rectShape, leg2, [0.76, 0.58, 0.38, 1.0]);

  // ANIMASI: Kepala Anjing Berputar/Mengangguk Berulang (Looping)
  const headRotation = Math.sin(seconds * 3.0) * 20.0; // Rotasi bolak-balik -20 hingga +20 derajat

  // Matriks Hirarki Kepala yang Terhubung ke Badan
  const headParent = Mat3.multiply(parent, Mat3.translation(-0.12, 0.1));
  const headMatrix = createTRSMatrix(0, 0, headRotation, 0.14, 0.14, headParent);
  drawShape(circleShape, headMatrix, [0.88, 0.88, 0.88, 1.0]);

  // Moncong Cokelat pada Kepala
  const snoutMatrix = createTRSMatrix(-0.05, -0.02, headRotation, 0.08, 0.06, headParent);
  drawShape(rectShape, snoutMatrix, [0.5, 0.32, 0.18, 1.0]);
}

// Bola / Telur Polkadot
function drawBall(x, y) {
  const parent = Mat3.translation(x, y);
  const ballM = createTRSMatrix(0, 0, 0, 0.16, 0.16, parent);
  drawShape(circleShape, ballM, [0.92, 0.9, 0.88, 1.0]);

  // Titik Bintik
  const dot1 = createTRSMatrix(-0.03, 0.02, 0, 0.04, 0.04, parent);
  const dot2 = createTRSMatrix(0.02, -0.02, 0, 0.03, 0.03, parent);
  drawShape(circleShape, dot1, [0.6, 0.1, 0.1, 1.0]);
  drawShape(circleShape, dot2, [0.6, 0.1, 0.1, 1.0]);
}

// Burung Kecil
function drawBird(x, y) {
  const parent = Mat3.translation(x, y);
  const body = createTRSMatrix(0, 0, 0, 0.08, 0.06, parent);
  drawShape(rectShape, body, [0.5, 0.45, 0.42, 1.0]);

  const beak = createTRSMatrix(-0.05, 0.01, 0, 0.03, 0.02, parent);
  drawShape(rectShape, beak, [0.8, 0.6, 0.2, 1.0]);
}

// Bunga
function drawFlower(x, y) {
  const parent = Mat3.translation(x, y);

  // Tangkai
  const stem = createTRSMatrix(0, -0.04, 0, 0.01, 0.08, parent);
  drawShape(rectShape, stem, [0.2, 0.6, 0.2, 1.0]);

  // Kelopak
  const center = createTRSMatrix(0, 0, 0, 0.03, 0.03, parent);
  drawShape(circleShape, center, [0.95, 0.8, 0.1, 1.0]);

  for (let i = 0; i < 4; i++) {
    const angle = i * 90;
    const rad = degToRad(angle);
    const px = Math.cos(rad) * 0.025;
    const py = Math.sin(rad) * 0.025;
    const petal = createTRSMatrix(px, py, 0, 0.025, 0.025, parent);
    drawShape(circleShape, petal, [0.9, 0.4, 0.5, 1.0]);
  }
}

// ==========================================
// 6. RENDER LOOP 
// ==========================================

function render(time) {
    const seconds = time * 0.001;

  // Clear Canvas dengan warna dasar
  gl.clearColor(0.65, 0.85, 0.95, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // --- MENGGAMBAR SCENE UTAMA (BELAKANG KE DEPAN) ---
  drawGround();
  drawSun();

  // Pohon & Semak Belakang
  drawTree(0.7, 0.2, 1.2);
  drawTree(-0.8, 0.25, 1.1);
  drawBush(-0.4, -0.05, 0.3, 0.25);
  drawBush(0.4, -0.08, 0.35, 0.22);

  // Kursi Taman
  drawBench(0.3, -0.15);

  // Karakter Utamanya
  drawHuman(-0.3, -0.1);
  drawDog(0.45, -0.32, seconds); // Anjing Bergerak kontinu

  // Objek Tambahan
  drawBall(0.0, -0.28);
  drawBird(0.12, -0.35);

  // Bunga-Bunga Rumput
  drawFlower(-0.55, -0.32);
  drawFlower(-0.45, -0.38);
  drawFlower(0.65, -0.38);

  // Minta frame berikutnya
  requestAnimationFrame(render);
}

// Jalankan Loop Animasi
requestAnimationFrame(render);