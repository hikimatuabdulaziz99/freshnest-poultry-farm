import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Ensure public/icons directory exists
const iconsDir = path.resolve('public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1. Create Brand SVG Icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1B4332" />
      <stop offset="100%" stop-color="#081C15" />
    </linearGradient>
    <linearGradient id="eggGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="50%" stop-color="#D8F3DC" />
      <stop offset="100%" stop-color="#B7E4C7" />
    </linearGradient>
    <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#74C69D" />
      <stop offset="100%" stop-color="#40916C" />
    </linearGradient>
    <filter id="dropShadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- Background Canvas with rounded squircle -->
  <rect width="512" height="512" rx="108" fill="url(#bgGrad)" />

  <!-- Outer Ring Accent -->
  <rect x="20" y="20" width="472" height="472" rx="92" fill="none" stroke="#40916C" stroke-width="4" stroke-opacity="0.4" />

  <!-- Central Nest / Egg Emblem -->
  <g filter="url(#dropShadow)">
    <!-- Golden Egg Silhouette -->
    <path d="M 256 110 C 205 110 160 185 160 275 C 160 345 202 395 256 395 C 310 395 352 345 352 275 C 352 185 307 110 256 110 Z" fill="url(#eggGrad)" />
    
    <!-- Stylized Fresh Leaf / Sprout Overlay -->
    <path d="M 256 220 C 275 190 320 180 340 205 C 345 235 320 270 280 275 C 265 277 258 260 256 220 Z" fill="url(#leafGrad)" opacity="0.95" />

    <!-- Stylized Bird Wing Silhouette -->
    <path d="M 230 250 C 200 240 175 265 185 300 C 195 330 245 335 255 295 C 255 275 245 255 230 250 Z" fill="#2D6A4F" opacity="0.9" />

    <!-- Chick / Bird Beak Accent -->
    <polygon points="175,270 155,278 178,285" fill="#E9C46A" />

    <!-- Eye of the bird -->
    <circle cx="195" cy="272" r="5" fill="#1B4332" />
  </g>

  <!-- Brand Typography Arc or Baseline Badge -->
  <rect x="136" y="420" width="240" height="42" rx="21" fill="#40916C" />
  <text x="256" y="447" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="800" fill="#FFFFFF" text-anchor="middle" letter-spacing="3">FRESHNEST</text>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent, 'utf-8');
console.log('Created public/icons/icon.svg');

// 2. Programmatic PNG Generator using Node.js zlib and crc32
function createPng(width, height, isMaskable = false) {
  // CRC32 table
  const crcTable = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ -1) >>> 0;
  }

  function createChunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);

    const crcBuf = Buffer.alloc(4);
    const combined = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(combined), 0);

    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  }

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Deflate
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Generate Scanlines (Filter byte 0x00 + width * 4 bytes RGBA)
  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineLength);

  const cx = width / 2;
  const cy = height / 2;
  const outerR = Math.min(width, height) * (isMaskable ? 0.35 : 0.42);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter none

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background: Dark Forest Green (#1B4332: R 27, G 67, B 50)
      let r = 27;
      let g = 67;
      let b = 50;
      let a = 255;

      // Egg shape calculation: (x/a)^2 + (y/b)^2 <= 1, slightly tapered at top
      const eggScaleY = dy < 0 ? 1.25 : 1.0;
      const eggDist = Math.sqrt(dx * dx + (dy * eggScaleY) * (dy * eggScaleY));

      if (eggDist <= outerR) {
        // Pale / Fresh green egg body (#D8F3DC: 216, 243, 220)
        r = 216;
        g = 243;
        b = 220;

        // Leaf / wing accent on right
        if (dx > -10 && dy > -outerR * 0.4 && dx < outerR * 0.7 && dy < outerR * 0.5) {
          r = 64;  // #40916C: 64, 145, 108
          g = 145;
          b = 108;
        }

        // Inner yolk / heart accent (#E9C46A: 233, 196, 106)
        const innerDist = Math.sqrt((dx + outerR * 0.1) * (dx + outerR * 0.1) + (dy + outerR * 0.1) * (dy + outerR * 0.1));
        if (innerDist <= outerR * 0.3) {
          r = 233;
          g = 196;
          b = 106;
        }
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  // Compress with zlib
  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);

  // IEND Chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate all required PWA icons
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createPng(192, 192, false));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createPng(512, 512, false));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512.png'), createPng(512, 512, true));
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), createPng(180, 180, false));

// Also write favicon in public root if not present
fs.writeFileSync(path.resolve('public/apple-touch-icon.png'), createPng(180, 180, false));
fs.writeFileSync(path.resolve('public/favicon.ico'), createPng(64, 64, false));

console.log('All PWA PNG icons successfully generated in public/icons/');
