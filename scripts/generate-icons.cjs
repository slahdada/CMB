const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(12 + len);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crc = crc32(buf.subarray(4, 8 + len));
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function generatePng(width, height, isMaskable = false) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = createChunk('IHDR', ihdrData);

  const rawData = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;

  const cx = width / 2;
  const cy = height / 2;

  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // filter byte = 0
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;

      const t = y / height;
      let r = Math.round(15 * (1 - t) + 17 * t);
      let g = Math.round(118 * (1 - t) + 94 * t);
      let b = Math.round(110 * (1 - t) + 89 * t);
      let a = 255;

      if (!isMaskable) {
        const cornerR = width * 0.22;
        const qx = Math.max(0, Math.abs(dx) - (cx - cornerR));
        const qy = Math.max(0, Math.abs(dy) - (cy - cornerR));
        const cDist = Math.sqrt(qx * qx + qy * qy);
        if (cDist > cornerR) {
          a = 0;
        }
      }

      if (a > 0) {
        const scale = width / 192;
        const bCy = cy - 6 * scale;
        const bRx = 48 * scale;
        const bRy = 40 * scale;
        const inBubble = ((dx) * (dx)) / (bRx * bRx) + ((y - bCy) * (y - bCy)) / (bRy * bRy) <= 1;
        const inTail = (dx >= -22 * scale && dx <= -6 * scale && dy >= 20 * scale && dy <= 42 * scale && (dx + 22 * scale) > (dy - 20 * scale));

        if (inBubble || inTail) {
          r = 255;
          g = 255;
          b = 255;

          const sx = dx / scale;
          const sy = (y - bCy) / scale;

          const inBar1 = (sx >= -24 && sx <= -16 && sy >= -12 && sy <= 12);
          const inBar2 = (sx >= -5 && sx <= 5 && sy >= -22 && sy <= 22);
          const inBar3 = (sx >= 16 && sx <= 24 && sy >= -12 && sy <= 12);

          if (inBar1 || inBar2 || inBar3) {
            r = 15;
            g = 118;
            b = 110;
          }
        }
      }

      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const idatData = zlib.deflateSync(rawData);
  const idat = createChunk('IDAT', idatData);
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generatePng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generatePng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generatePng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generatePng(180, 180, false));

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f766e"/>
      <stop offset="100%" stop-color="#115e59"/>
    </linearGradient>
    <linearGradient id="wave" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#2dd4bf"/>
      <stop offset="100%" stop-color="#0f766e"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <path d="M120 220C120 148.2 180.9 90 256 90C331.1 90 392 148.2 392 220C392 291.8 331.1 350 256 350C236.4 350 217.7 346.1 200.7 339L140 370L154.5 318.5C133.3 292.5 120 258 120 220Z" fill="white"/>
  <rect x="180" y="180" width="22" height="80" rx="11" fill="url(#wave)"/>
  <rect x="220" y="150" width="22" height="140" rx="11" fill="#0f766e"/>
  <rect x="260" y="130" width="22" height="180" rx="11" fill="url(#wave)"/>
  <rect x="300" y="160" width="22" height="120" rx="11" fill="#0f766e"/>
  <circle cx="390" cy="130" r="42" fill="#2dd4bf" stroke="white" stroke-width="6"/>
  <rect x="382" y="106" width="16" height="48" rx="4" fill="white"/>
  <rect x="366" y="122" width="48" height="16" rx="4" fill="white"/>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgIcon, 'utf-8');
console.log('Icons generated successfully in public/');
