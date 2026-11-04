/* © 2026 Maxime KOSMALA, MKDE. Tous droits réservés.
   Question pour un kiné – version pédiatrique · Multijoueur v1.11.0
   Reproduction, diffusion ou modification interdites sans accord écrit de l'auteur. Voir LICENCE.txt. */
/* Générateur de QR code autonome (mode octet, correction M, versions 1 à 10).
   Écrit pour ce jeu afin de ne dépendre d'aucun service extérieur.
   Usage : QPK_QR.svg("https://...", taillePixels) renvoie une balise <svg>. */
(function () {
"use strict";
var TOTAL = [0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346];
// [codes correcteurs par bloc, nb blocs groupe 1, données par bloc g1, nb blocs groupe 2, données par bloc g2]
var ECM = [null, [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0], [24, 2, 43, 0, 0],
  [16, 4, 27, 0, 0], [18, 4, 31, 0, 0], [22, 2, 38, 2, 39], [22, 3, 36, 2, 37], [26, 4, 43, 1, 44]];
var ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

function gmul(x, y) {
  var z = 0;
  for (var i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; }
  return z & 0xFF;
}
function rsDivisor(deg) {
  var r = []; for (var i = 0; i < deg - 1; i++) r.push(0); r.push(1);
  var root = 1;
  for (i = 0; i < deg; i++) {
    for (var j = 0; j < r.length; j++) { r[j] = gmul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; }
    root = gmul(root, 2);
  }
  return r;
}
function rsRemainder(data, div) {
  var r = div.map(function () { return 0; });
  data.forEach(function (b) {
    var f = b ^ r.shift(); r.push(0);
    for (var i = 0; i < r.length; i++) r[i] ^= gmul(div[i], f);
  });
  return r;
}
function utf8(s) {
  var out = [], e = unescape(encodeURIComponent(s));
  for (var i = 0; i < e.length; i++) out.push(e.charCodeAt(i));
  return out;
}

function encode(text) {
  var bytes = utf8(text), ver = 0;
  for (var v = 1; v <= 10; v++) {
    var e = ECM[v], cap = e[1] * e[2] + e[3] * e[4];
    var need = 4 + (v < 10 ? 8 : 16) + bytes.length * 8;
    if (need <= cap * 8) { ver = v; break; }
  }
  if (!ver) throw new Error("Texte trop long pour le QR code");
  var ec = ECM[ver], dataCap = ec[1] * ec[2] + ec[3] * ec[4];
  // flux de bits
  var bits = [];
  function put(val, n) { for (var i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
  put(4, 4); put(bytes.length, ver < 10 ? 8 : 16);
  bytes.forEach(function (b) { put(b, 8); });
  put(0, Math.min(4, dataCap * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  var data = [];
  for (var i = 0; i < bits.length; i += 8) { var b = 0; for (var k = 0; k < 8; k++) b = (b << 1) | bits[i + k]; data.push(b); }
  for (var pad = 0xEC; data.length < dataCap; pad ^= 0xEC ^ 0x11) data.push(pad);
  // blocs et correction d'erreurs
  var blocks = [], div = rsDivisor(ec[0]), pos = 0;
  for (i = 0; i < ec[1] + ec[3]; i++) {
    var len = i < ec[1] ? ec[2] : ec[4];
    var d = data.slice(pos, pos + len); pos += len;
    blocks.push({ d: d, e: rsRemainder(d, div) });
  }
  var all = [], maxD = Math.max(ec[2], ec[4]);
  for (i = 0; i < maxD; i++) blocks.forEach(function (bl) { if (i < bl.d.length) all.push(bl.d[i]); });
  for (i = 0; i < ec[0]; i++) blocks.forEach(function (bl) { all.push(bl.e[i]); });
  if (all.length !== TOTAL[ver]) throw new Error("QR : longueur incohérente");
  return matrix(ver, all);
}

function matrix(ver, cw) {
  var size = ver * 4 + 17, M = [], F = [];
  for (var y = 0; y < size; y++) { M.push([]); F.push([]); for (var x = 0; x < size; x++) { M[y].push(false); F[y].push(false); } }
  function setF(x, y, d) { M[y][x] = d; F[y][x] = true; }
  for (var i = 0; i < size; i++) { setF(6, i, i % 2 === 0); setF(i, 6, i % 2 === 0); }
  function finder(cx, cy) {
    for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
      var xx = cx + dx, yy = cy + dy;
      if (xx < 0 || yy < 0 || xx >= size || yy >= size) continue;
      var dist = Math.max(Math.abs(dx), Math.abs(dy));
      setF(xx, yy, dist !== 2 && dist !== 4);
    }
  }
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  var al = ALIGN[ver], n = al.length;
  for (i = 0; i < n; i++) for (var j = 0; j < n; j++) {
    if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
    for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) setF(al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  formatBits(M, F, size, 0, true);
  if (ver >= 7) {
    var rem = ver;
    for (i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
    var vb = (ver << 12) | rem;
    for (i = 0; i < 18; i++) {
      var bit = ((vb >>> i) & 1) === 1, a = size - 11 + (i % 3), b = Math.floor(i / 3);
      setF(a, b, bit); setF(b, a, bit);
    }
  }
  // placement en zigzag
  var k = 0;
  for (var right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (var vert = 0; vert < size; vert++) for (j = 0; j < 2; j++) {
      var x = right - j, up = ((right + 1) & 2) === 0, yy = up ? size - 1 - vert : vert;
      if (!F[yy][x] && k < cw.length * 8) { M[yy][x] = ((cw[k >>> 3] >>> (7 - (k & 7))) & 1) === 1; k++; }
    }
  }
  // choix du masque
  var best = null, bestScore = Infinity;
  for (var m = 0; m < 8; m++) {
    var T = M.map(function (r) { return r.slice(); });
    applyMask(T, F, size, m);
    formatBits(T, F, size, m, false);
    var s = penalty(T, size);
    if (s < bestScore) { bestScore = s; best = T; }
  }
  return best;
}
function applyMask(M, F, size, m) {
  for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
    if (F[y][x]) continue;
    var inv;
    switch (m) {
      case 0: inv = (x + y) % 2 === 0; break;
      case 1: inv = y % 2 === 0; break;
      case 2: inv = x % 3 === 0; break;
      case 3: inv = (x + y) % 3 === 0; break;
      case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
      case 5: inv = (x * y) % 2 + (x * y) % 3 === 0; break;
      case 6: inv = ((x * y) % 2 + (x * y) % 3) % 2 === 0; break;
      default: inv = ((x + y) % 2 + (x * y) % 3) % 2 === 0;
    }
    if (inv) M[y][x] = !M[y][x];
  }
}
function formatBits(M, F, size, mask, mark) {
  var data = (0 << 3) | mask, rem = data; // niveau M = 00
  for (var i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  var bits = ((data << 10) | rem) ^ 0x5412;
  function g(i) { return ((bits >>> i) & 1) === 1; }
  function s(x, y, d) { M[y][x] = d; if (mark) F[y][x] = true; }
  for (i = 0; i <= 5; i++) s(8, i, g(i));
  s(8, 7, g(6)); s(8, 8, g(7)); s(7, 8, g(8));
  for (i = 9; i < 15; i++) s(14 - i, 8, g(i));
  for (i = 0; i < 8; i++) s(size - 1 - i, 8, g(i));
  for (i = 8; i < 15; i++) s(8, size - 15 + i, g(i));
  s(8, size - 8, true);
}
function penalty(M, size) {
  var p = 0, x, y, run, dark = 0;
  for (y = 0; y < size; y++) {
    run = 1;
    for (x = 1; x < size; x++) { if (M[y][x] === M[y][x - 1]) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; }
  }
  for (x = 0; x < size; x++) {
    run = 1;
    for (y = 1; y < size; y++) { if (M[y][x] === M[y - 1][x]) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; }
  }
  for (y = 0; y < size - 1; y++) for (x = 0; x < size - 1; x++) {
    var c = M[y][x];
    if (c === M[y][x + 1] && c === M[y + 1][x] && c === M[y + 1][x + 1]) p += 3;
  }
  var pat = [true, false, true, true, true, false, true];
  for (y = 0; y < size; y++) for (x = 0; x + 7 <= size; x++) {
    var okR = true, okC = true;
    for (var k = 0; k < 7; k++) { if (M[y][x + k] !== pat[k]) okR = false; if (M[x + k][y] !== pat[k]) okC = false; }
    if (okR) p += 40; if (okC) p += 40;
  }
  for (y = 0; y < size; y++) for (x = 0; x < size; x++) if (M[y][x]) dark++;
  p += Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
  return p;
}

function svg(text, px) {
  var M = encode(text), n = M.length, q = 4, tot = n + q * 2, d = "";
  for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (M[y][x]) d += "M" + (x + q) + " " + (y + q) + "h1v1h-1z";
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + tot + " " + tot + '" width="' + (px || 220) + '" height="' + (px || 220) + '" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect width="100%" height="100%" fill="#fff"/><path d="' + d + '" fill="#1F2440"/></svg>';
}
var api = { encode: encode, svg: svg };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else window.QPK_QR = api;
})();
