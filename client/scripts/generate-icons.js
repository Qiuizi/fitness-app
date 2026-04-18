// Pure-Node PNG generator (no deps) — produces PWA icons.
// Design: Morandi sage rounded square with centered white dumbbell glyph.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const tb = Buffer.from(type, 'ascii');
  const body = Buffer.concat([tb, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
};

function makePng(size, pixel) {
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    row[0] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y);
      row[1 + x * 3] = r; row[2 + x * 3] = g; row[3 + x * 3] = b;
    }
    rows.push(row);
  }
  const compressed = zlib.deflateSync(Buffer.concat(rows));
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

function insideRounded(x, y, size, r) {
  if (x < r && y < r) return (x - r) ** 2 + (y - r) ** 2 <= r * r;
  if (x >= size - r && y < r) return (x - (size - r - 1)) ** 2 + (y - r) ** 2 <= r * r;
  if (x < r && y >= size - r) return (x - r) ** 2 + (y - (size - r - 1)) ** 2 <= r * r;
  if (x >= size - r && y >= size - r) return (x - (size - r - 1)) ** 2 + (y - (size - r - 1)) ** 2 <= r * r;
  return true;
}

function draw(size, { maskable = false } = {}) {
  // iOS masks to rounded square itself; maskable=true = full-bleed bg, no rounding
  const bgOutside = [251, 251, 253];
  const bgInside = [106, 139, 133];
  const fg = [255, 255, 255];
  const r = maskable ? 0 : Math.floor(size * 0.22);
  const cx = size / 2, cy = size / 2;
  // Dumbbell: two bells + central bar
  const barW = size * 0.36;
  const barH = size * 0.07;
  const bellW = size * 0.09;
  const bellH = size * 0.24;
  const gap = size * 0.02;

  return (x, y) => {
    if (!maskable && !insideRounded(x, y, size, r)) return bgOutside;
    // central bar
    if (Math.abs(x - cx) < barW / 2 && Math.abs(y - cy) < barH / 2) return fg;
    // left bell
    const lbx = cx - barW / 2 - gap - bellW / 2;
    if (Math.abs(x - lbx) < bellW / 2 && Math.abs(y - cy) < bellH / 2) return fg;
    // right bell
    const rbx = cx + barW / 2 + gap + bellW / 2;
    if (Math.abs(x - rbx) < bellW / 2 && Math.abs(y - cy) < bellH / 2) return fg;
    return bgInside;
  };
}

const outDir = path.join(__dirname, '..', 'public');
const targets = [
  { size: 180, name: 'apple-touch-icon.png', maskable: false },
  { size: 192, name: 'icon-192.png', maskable: false },
  { size: 512, name: 'icon-512.png', maskable: false },
  { size: 512, name: 'icon-512-maskable.png', maskable: true },
];
for (const t of targets) {
  const buf = makePng(t.size, draw(t.size, { maskable: t.maskable }));
  fs.writeFileSync(path.join(outDir, t.name), buf);
  console.log('wrote', t.name, buf.length, 'bytes');
}
