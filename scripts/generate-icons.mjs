import fs from "fs";
import path from "path";
import zlib from "zlib";

// Minimal valid PNG generator
function createPng(width, height, r, g, b, a = 255) {
  // Simple uncompressed valid PNG generator
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, "ascii");
    const crc = crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8 bit depth
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10); // deflate
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // no interlace

  // Raw image data with filter byte 0 at start of each scanline
  const scanlineLen = 1 + width * 4;
  const rawData = Buffer.alloc(scanlineLen * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLen;
    rawData.writeUInt8(0, rowOffset); // filter 0
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      // Draw blue shield with gradient
      const isBorder = x === 0 || x === width - 1 || y === 0 || y === height - 1;
      rawData.writeUInt8(isBorder ? 37 : r, pxOffset);
      rawData.writeUInt8(isBorder ? 99 : g, pxOffset + 1);
      rawData.writeUInt8(isBorder ? 235 : b, pxOffset + 2);
      rawData.writeUInt8(a, pxOffset + 3);
    }
  }

  const idatData = zlib.deflateSync(rawData);

  const png = Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idatData),
    chunk("IEND", Buffer.alloc(0)),
  ]);

  return png;
}

// Table-based CRC32 for PNG chunks
function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

const iconsDir = path.resolve("extension/icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const p16 = await createPng(16, 16, 59, 130, 246);
const p48 = await createPng(48, 48, 59, 130, 246);
const p128 = await createPng(128, 128, 59, 130, 246);

fs.writeFileSync(path.join(iconsDir, "icon16.png"), p16);
fs.writeFileSync(path.join(iconsDir, "icon48.png"), p48);
fs.writeFileSync(path.join(iconsDir, "icon128.png"), p128);

console.log("[OK] Generated Chrome Extension icons in extension/icons/");
