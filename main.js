import { Mat3 } from "./matrix3.js";

// ==========================================
// 1. INISIALISASI WEBGL2 CANVAS
// ==========================================
const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
  throw new Error("WebGL2 tidak didukung pada browser ini.");
}

gl.viewport(0, 0, canvas.width, canvas.height);

// ==========================================
// 2. SHADER PROGRAM
// ==========================================
const vertexShaderSource = `#version 300 es
in vec2 a_position;
uniform mat3 u_matrix;

void main() {
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
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

const program = gl.createProgram();
gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vertexShaderSource));
gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource));
gl.linkProgram(program);
gl.useProgram(program);

const positionLoc = gl.getAttribLocation(program, "a_position");
const matrixLoc = gl.getUniformLocation(program, "u_matrix");
const colorLoc = gl.getUniformLocation(program, "u_color");

// ==========================================
// 3. GENERATOR PRIMITIF (VERTEX)
// ==========================================
const unitRectVertices = new Float32Array([
  -0.5, -0.5,   0.5, -0.5,  -0.5,  0.5,
  -0.5,  0.5,   0.5, -0.5,   0.5,  0.5
]);

function createCircleVertices(segments = 36) {
  const positions = [];
  for (let i = 0; i < segments; i++) {
    const a1 = (i / segments) * Math.PI * 2;
    const a2 = ((i + 1) / segments) * Math.PI * 2;
    positions.push(0, 0); 
    positions.push(Math.cos(a1) * 0.5, Math.sin(a1) * 0.5);
    positions.push(Math.cos(a2) * 0.5, Math.sin(a2) * 0.5);
  }
  return new Float32Array(positions);
}
const unitCircleVertices = createCircleVertices();

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
// 4. FUNGSI TRANSFORMASI & GAMBAR
// ==========================================
function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}

// Koreksi Aspect Ratio agar lingkaran tidak lonjong
const aspectRatioX = canvas.height / canvas.width; 
const rootMatrix = Mat3.scaling(aspectRatioX, 1.0);

function createTRSMatrix(tx, ty, rotDeg, sx, sy, parentMatrix = rootMatrix) {
  let m = Mat3.translation(tx, ty);
  if (rotDeg !== 0) m = Mat3.multiply(m, Mat3.rotation(degToRad(rotDeg)));
  m = Mat3.multiply(m, Mat3.scaling(sx, sy));
  return Mat3.multiply(parentMatrix, m);
}

function drawShape(shape, matrix, color) {
  gl.uniformMatrix3fv(matrixLoc, false, matrix);
  gl.uniform4fv(colorLoc, color);
  gl.bindVertexArray(shape.vao);
  gl.drawArrays(gl.TRIANGLES, 0, shape.count);
}

// ==========================================
// 5. PENYUSUNAN ELEMEN BERDASARKAN REFERENSI
// ==========================================

// Palet Warna
const cGrass = [0.8, 0.95, 0.6, 1.0];
const cBush = [0.6, 0.85, 0.5, 1.0];
const cTreeLeaf = [0.55, 0.8, 0.45, 1.0];
const cWood = [0.6, 0.4, 0.25, 1.0];
const cSun = [1.0, 0.9, 0.3, 1.0];
const cSkin = [1.0, 0.85, 0.75, 1.0];
const cShirt = [0.95, 0.6, 0.3, 1.0];
const cOveralls = [0.3, 0.55, 0.8, 1.0];
const cShoe = [0.2, 0.4, 0.7, 1.0];
const cWhite = [1.0, 1.0, 1.0, 1.0];
const cDogSpot = [0.65, 0.45, 0.3, 1.0];
const cRed = [0.9, 0.3, 0.3, 1.0];
const cBlack = [0.1, 0.1, 0.1, 1.0];

// Menggunakan desain pohon gugusan dari kode Anda sebelumnya
function drawTree(x, y, scale = 1.0) {
  const parent = createTRSMatrix(x, y, 0, 1, 1); // Menggunakan base aspect ratio

  // Batang Cokelat
  const trunkM = createTRSMatrix(0, 0, 0, 0.1 * scale, 0.7 * scale, parent);
  drawShape(rectShape, trunkM, cWood);

  // GABUNGAN BULAT-BULATAN DAUN
  const leafClusters = [
    [ 0.00,  0.40,  0.45, 0.45], 
    [-0.18,  0.32,  0.35, 0.35], 
    [ 0.18,  0.32,  0.35, 0.35], 
    [-0.12,  0.50,  0.32, 0.32], 
    [ 0.12,  0.50,  0.32, 0.32], 
    [ 0.00,  0.58,  0.30, 0.30]  
  ];

  leafClusters.forEach(([ox, oy, sx, sy]) => {
    const leafM = createTRSMatrix(ox * scale, oy * scale, 0, sx * scale, sy * scale, parent);
    drawShape(circleShape, leafM, cTreeLeaf);
  });
  
  // Mata Pohon senyum 
  if (scale > 0.8) {
    drawShape(circleShape, createTRSMatrix(-0.06, 0.38 * scale, 0, 0.02, 0.02, parent), cBlack);
    drawShape(circleShape, createTRSMatrix(0.06, 0.38 * scale, 0, 0.02, 0.02, parent), cBlack);
  }
}

function drawEnvironment(seconds) {
  // Padang Rumput
  const groundM = createTRSMatrix(0, -0.6, 0, 4.0, 0.8);
  drawShape(rectShape, groundM, cGrass);

  // Semak-semak Belakang
  drawShape(circleShape, createTRSMatrix(-1.0, -0.2, 0, 0.6, 0.4), cBush);
  drawShape(circleShape, createTRSMatrix(-0.7, -0.2, 0, 0.4, 0.3), cBush);
  drawShape(circleShape, createTRSMatrix(0.8, -0.2, 0, 0.7, 0.5), cBush);
  drawShape(circleShape, createTRSMatrix(1.2, -0.25, 0, 0.5, 0.3), cBush);
  drawShape(circleShape, createTRSMatrix(1.2, -0.25, 0, 0.5, 0.3), cBush);

  // Matahari (Bergerak Kiri-Kanan)
  const sunX = 0.25 + Math.sin(seconds * 1.5) * 0.4;
  const sunY = 0.75;

  const sunM = createTRSMatrix(sunX, sunY, 0, 0.3, 0.3);
  drawShape(circleShape, sunM, cSun);
}



function drawBoy(x, y, seconds) {
  const p = Mat3.translation(x, y);
  
  // Animasi tendang kaki kanan
  const kickAngle = Math.sin(seconds * 4.0) * 15 + 25; 

  // Kaki Kiri (Diam) 
  const legLeft = createTRSMatrix(-0.05, -0.25, 0, 0.05, 0.15, p);
  drawShape(rectShape, legLeft, cSkin);
  const sockLeft = createTRSMatrix(-0.05, -0.32, 0, 0.06, 0.04, p); // Kaos kaki
  drawShape(rectShape, sockLeft, cWhite);
  const shoeLeft = createTRSMatrix(-0.08, -0.36, 0, 0.12, 0.06, p); // Sepatu 
  drawShape(rectShape, shoeLeft, cShoe);

  // Kaki Kanan (Menendang) 
  const legPivot = Mat3.multiply(p, Mat3.translation(0.05, -0.15));
  const legRight = createTRSMatrix(0.06, -0.08, kickAngle, 0.05, 0.15, legPivot);
  drawShape(rectShape, legRight, cSkin);
  const sockRight = createTRSMatrix(0.09, -0.15, kickAngle, 0.06, 0.04, legPivot); // Kaos kaki
  drawShape(rectShape, sockRight, cWhite);
  const shoeRight = createTRSMatrix(0.14, -0.18, kickAngle, 0.12, 0.06, legPivot); // Sepatu
  drawShape(rectShape, shoeRight, cShoe);

  // Badan (Baju)
  const shirt = createTRSMatrix(0, 0.0, 0, 0.28, 0.22, p);
  drawShape(rectShape, shirt, cShirt);
  
  // Celana Kodok (Diperbaiki)
  const pants = createTRSMatrix(0, -0.10, 0, 0.28, 0.18, p); // Bagian bawah celana
  drawShape(rectShape, pants, cOveralls);
  const bib = createTRSMatrix(0, 0.0, 0, 0.18, 0.15, p); // Bagian dada (bib) celana kodok
  drawShape(rectShape, bib, cOveralls);
  
  // Tali Celana Kodok
  const strapL = createTRSMatrix(-0.07, 0.08, 0, 0.03, 0.1, p);
  drawShape(rectShape, strapL, cOveralls);
  const strapR = createTRSMatrix(0.07, 0.08, 0, 0.03, 0.1, p);
  drawShape(rectShape, strapR, cOveralls);

  // Kancing
  drawShape(circleShape, createTRSMatrix(-0.07, 0.04, 0, 0.02, 0.02, p), cBlack);
  drawShape(circleShape, createTRSMatrix(0.07, 0.04, 0, 0.02, 0.02, p), cBlack);

  // Lengan Kiri
  const arm = createTRSMatrix(-0.16, -0.02, -20, 0.05, 0.18, p);
  drawShape(rectShape, arm, cShirt);
  drawShape(circleShape, createTRSMatrix(-0.2, -0.1, 0, 0.06, 0.06, p), cSkin);

  // Lengan Kanan
  const armR = createTRSMatrix(0.16, 0.0, 30, 0.05, 0.16, p);
  drawShape(rectShape, armR, cShirt);
  drawShape(circleShape, createTRSMatrix(0.21, -0.08, 0, 0.06, 0.06, p), cSkin);

  // Kepala & Rambut
  const head = createTRSMatrix(0, 0.22, 0, 0.35, 0.35, p);
  drawShape(circleShape, head, cSkin);
  const hair = createTRSMatrix(0, 0.35, 0, 0.36, 0.15, p);
  drawShape(circleShape, hair, cWood);
  
  // Mata & Senyum
  drawShape(circleShape, createTRSMatrix(-0.06, 0.22, 0, 0.02, 0.02, p), cBlack);
  drawShape(circleShape, createTRSMatrix(0.06, 0.22, 0, 0.02, 0.02, p), cBlack);
  drawShape(rectShape, createTRSMatrix(0.0, 0.15, 0, 0.05, 0.01, p), cBlack); // Mulut senyum
}

function drawDog(x, y, seconds) {
  const p = Mat3.translation(x, y);
  const tailAngle = Math.sin(seconds * 10.0) * 15 - 30;

  // Ekor
  const tail = createTRSMatrix(0.17, 0.06, 90, 0.12, 0.03, p);
  drawShape(rectShape, tail, cSkin);

  // Badan & Kaki
  const body = createTRSMatrix(0, -0.05, 0, 0.35, 0.18, p);
  drawShape(rectShape, body, cSkin);
  drawShape(circleShape, createTRSMatrix(0.08, -0.02, 0, 0.15, 0.1, p), cDogSpot);

  for (let i of [-0.12, -0.04, 0.06, 0.14]) {
    drawShape(rectShape, createTRSMatrix(i, -0.15, 0, 0.04, 0.12, p), cSkin);
  }

  // Kepala
  const head = createTRSMatrix(-0.18, 0.05, 0, 0.2, 0.2, p);
  drawShape(circleShape, head, cSkin);

  //const earScaleY = Math.sin(seconds * 5.0) * 0.15;

  // Membuat telinga yang mengalami flip/skala pada sumbu Y
  const ear = createTRSMatrix(-0.12, 0.08, -20, 0.06, 0.12, p);
  drawShape(rectShape, ear, cDogSpot);

  // Mata & Hidung
  drawShape(circleShape, createTRSMatrix(-0.2, 0.06, 0, 0.02, 0.02, p), cBlack);
  drawShape(circleShape, createTRSMatrix(-0.26, 0.03, 0, 0.03, 0.03, p), cBlack);
}

function drawBall(x, y) {
  const p = Mat3.translation(x, y);
  drawShape(circleShape, createTRSMatrix(0, 0, 0, 0.18, 0.18, p), cWhite);
  drawShape(circleShape, createTRSMatrix(0, 0, 0, 0.08, 0.08, p), cRed);
  drawShape(circleShape, createTRSMatrix(-0.06, 0.05, 0, 0.05, 0.05, p), cRed);
  drawShape(circleShape, createTRSMatrix(0.06, -0.04, 0, 0.05, 0.05, p), cRed);
  drawShape(circleShape, createTRSMatrix(-0.05, -0.06, 0, 0.04, 0.04, p), cRed);
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

  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Gambar lingkungan
  drawEnvironment(seconds);
  drawFlower(-0.8, -0.35);
  drawFlower(0.4, -0.35);
  drawFlower(-1, -0.55);
  drawFlower(0.84, -0.75);
  drawFlower(0.4, -0.95);
  
  // Render pohon dengan fungsi kluster daun
  drawTree(-1.35, -0.30, 1.8);
  drawTree(0.7, 0.0, 0.7);
  drawTree(1.1, 0.1, 1.0);

  drawShape(circleShape, createTRSMatrix(-1.25, -0.88, 0, 0.8, 0.35), cBush);
  drawShape(circleShape, createTRSMatrix(-1.45, -0.88, 0, 0.45, 0.53), cBush);
  
  // Render Karakter
  drawBoy(-0.4, -0.1, seconds);
  drawBall(0.1, -0.3);
  drawDog(0.8, -0.3, seconds);

  

  requestAnimationFrame(render);
}

requestAnimationFrame(render);