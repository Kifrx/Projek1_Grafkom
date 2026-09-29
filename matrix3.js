export const Mat3 = {
  // Matriks Identitas
  identity() {
    return new Float32Array([
      1, 0, 0,
      0, 1, 0,
      0, 0, 1
    ]);
  },

  // Matriks Translasi (Perpindahan X, Y)
  translation(tx, ty) {
    return new Float32Array([
      1,  0,  0,
      0,  1,  0,
      tx, ty, 1
    ]);
  },

  // Matriks Rotasi (Sudut Radian)
  rotation(rad) {
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    return new Float32Array([
       c, s, 0,
      -s, c, 0,
       0, 0, 1
    ]);
  },

  // Matriks Skala (Perbesaran/Pengecilan X, Y)
  scaling(sx, sy) {
    return new Float32Array([
      sx, 0,  0,
      0,  sy, 0,
      0,  0,  1
    ]);
  },

  // Perkalian Matriks 3x3 (A x B)
  multiply(a, b) {
    const a00 = a[0], a01 = a[1], a02 = a[2];
    const a10 = a[3], a11 = a[4], a12 = a[5];
    const a20 = a[6], a21 = a[7], a22 = a[8];

    const b00 = b[0], b01 = b[1], b02 = b[2];
    const b10 = b[3], b11 = b[4], b12 = b[5];
    const b20 = b[6], b21 = b[7], b22 = b[8];

    return new Float32Array([
      b00 * a00 + b01 * a10 + b02 * a20,
      b00 * a01 + b01 * a11 + b02 * a21,
      b00 * a02 + b01 * a12 + b02 * a22,

      b10 * a00 + b11 * a10 + b12 * a20,
      b10 * a01 + b11 * a11 + b12 * a21,
      b10 * a02 + b11 * a12 + b12 * a22,

      b20 * a00 + b21 * a10 + b22 * a20,
      b20 * a01 + b21 * a11 + b22 * a21,
      b20 * a02 + b21 * a12 + b22 * a22
    ]);
  }
};