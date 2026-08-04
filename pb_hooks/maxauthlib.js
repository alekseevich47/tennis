// HMAC-SHA256 по байтам для валидации MAX initData.
// Файл без .pb.js — подключается через require() внутри хендлера.
// В PB JSVM верхнеуровневые var из .pb.js хендлерам недоступны (см. botlib.js).
// $security.hs256 возвращает hex и не принимает raw-ключ для вложенного HMAC.
// См. https://dev.max.ru/docs/webapps/validation

var K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

function rotr(n, x) { return (x >>> n) | (x << (32 - n)); }

function sha256Bytes(bytes) {
  var h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  var h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  var l = bytes.length;
  var bitLenHi = Math.floor(l / 0x20000000);
  var bitLenLo = (l << 3) >>> 0;
  var withPad = l + 1;
  while (withPad % 64 !== 56) withPad++;
  var total = withPad + 8;
  var buf = new Array(total);
  var i;
  for (i = 0; i < l; i++) buf[i] = bytes[i] & 0xff;
  buf[l] = 0x80;
  for (i = l + 1; i < withPad; i++) buf[i] = 0;
  buf[withPad] = (bitLenHi >>> 24) & 0xff;
  buf[withPad + 1] = (bitLenHi >>> 16) & 0xff;
  buf[withPad + 2] = (bitLenHi >>> 8) & 0xff;
  buf[withPad + 3] = bitLenHi & 0xff;
  buf[withPad + 4] = (bitLenLo >>> 24) & 0xff;
  buf[withPad + 5] = (bitLenLo >>> 16) & 0xff;
  buf[withPad + 6] = (bitLenLo >>> 8) & 0xff;
  buf[withPad + 7] = bitLenLo & 0xff;

  var w = new Array(64);
  for (var off = 0; off < total; off += 64) {
    for (i = 0; i < 16; i++) {
      var j = off + i * 4;
      w[i] = ((buf[j] << 24) | (buf[j + 1] << 16) | (buf[j + 2] << 8) | buf[j + 3]) >>> 0;
    }
    for (i = 16; i < 64; i++) {
      var s0 = rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3);
      var s1 = rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    var a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (i = 0; i < 64; i++) {
      var S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      var ch = (e & f) ^ (~e & g);
      var t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      var S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      var maj = (a & b) ^ (a & c) ^ (b & c);
      var t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7];
}

function wordsToBytes(words) {
  var out = [];
  for (var i = 0; i < words.length; i++) {
    var x = words[i];
    out.push((x >>> 24) & 0xff, (x >>> 16) & 0xff, (x >>> 8) & 0xff, x & 0xff);
  }
  return out;
}

function utf8Bytes(str) {
  var out = [];
  for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if (c < 0x80) {
      out.push(c);
    } else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
      var c2 = str.charCodeAt(++i);
      var cp = 0x10000 + ((c & 0x3ff) << 10) + (c2 & 0x3ff);
      out.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f)
      );
    } else {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return out;
}

function hexToBytes(hex) {
  var out = [];
  var s = String(hex);
  for (var i = 0; i < s.length; i += 2) {
    out.push(parseInt(s.substring(i, i + 2), 16));
  }
  return out;
}

function bytesToHex(bytes) {
  var hex = '';
  for (var i = 0; i < bytes.length; i++) {
    var h = (bytes[i] & 0xff).toString(16);
    hex += h.length === 1 ? '0' + h : h;
  }
  return hex;
}

function hmacSha256Hex(keyBytes, message) {
  var block = 64;
  var key = keyBytes.slice();
  if (key.length > block) key = wordsToBytes(sha256Bytes(key));
  while (key.length < block) key.push(0);

  var oKey = new Array(block);
  var iKey = new Array(block);
  for (var i = 0; i < block; i++) {
    oKey[i] = key[i] ^ 0x5c;
    iKey[i] = key[i] ^ 0x36;
  }

  var inner = iKey.concat(utf8Bytes(message));
  var outer = oKey.concat(wordsToBytes(sha256Bytes(inner)));
  return bytesToHex(wordsToBytes(sha256Bytes(outer)));
}

module.exports = {
  hexToBytes: hexToBytes,
  hmacSha256Hex: hmacSha256Hex
};
