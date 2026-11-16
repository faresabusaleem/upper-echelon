// Builds every icon and brand raster from the two master marks in /brand.
// Usage: node scripts/build-icons.mjs   (run after scripts/build-mark.mjs)
import sharp from "sharp";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const GROUND = "#0b0b0a";
const GOLD = "#c2a15f";
const IVORY = "#e6e1d6";

mkdirSync("public/icons", { recursive: true });
mkdirSync("public/brand", { recursive: true });

const planes = readFileSync("brand/mark-planes.svg", "utf8");
const geo = JSON.parse(readFileSync("brand/mark-geometry.json", "utf8"));

/** A reduced mark for 16 px: the frontal and horizontal planes and the head, no hidden lines. */
function tinySvg({ color, stroke, ground }) {
  const back = geo.back.coronal + geo.back.transverse;
  const front = geo.front.coronal + geo.front.transverse;
  const h = geo.head;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${ground}"/><g transform="translate(3 3) scale(0.94)" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="square"><path d="${back}"/><circle cx="${h.cx}" cy="${h.cy}" r="${h.r}" fill="${ground}"/><path d="${front}"/></g></svg>`;
}
const engraving = readFileSync("brand/mark-engraving.svg", "utf8");

/** The Planes in a given colour and stroke, padded inside a square of `size`. */
function planesSvg({ color, stroke, ground, inset = 0 }) {
  let s = planes.replaceAll("currentColor", color).replace(/stroke-width="[\d.]+"/g, `stroke-width="${stroke}"`);
  if (ground) s = s.replace('fill="#0b0b0a"', `fill="${ground}"`);
  const inner = s.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const scale = (100 - inset * 2) / 100;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${
    ground ? `<rect width="100" height="100" fill="${ground}"/>` : ""
  }<g fill="none" transform="translate(${inset} ${inset}) scale(${scale})">${inner}</g></svg>`;
}

async function png(svg, size, file) {
  await sharp(Buffer.from(svg), { density: 600 }).resize(size, size).png({ compressionLevel: 9 }).toFile(file);
}

// Favicons: heavier strokes at small sizes so the planes survive.
const icon16 = tinySvg({ color: GOLD, stroke: 8, ground: GROUND });
const icon32 = planesSvg({ color: GOLD, stroke: 6, ground: GROUND, inset: 4 });
const iconLarge = planesSvg({ color: GOLD, stroke: 4.2, ground: GROUND, inset: 12 });
const maskable = planesSvg({ color: GOLD, stroke: 3.6, ground: GROUND, inset: 22 }); // 80% safe zone
writeFileSync("public/icons/icon.svg", planesSvg({ color: GOLD, stroke: 5, ground: GROUND, inset: 6 }));

const pngs = {};
for (const [size, svg] of [[16, icon16], [32, icon32], [48, icon32]]) {
  const file = `public/icons/favicon-${size}.png`;
  await png(svg, size, file);
  pngs[size] = readFileSync(file);
}
await png(iconLarge, 180, "public/icons/apple-touch-icon.png");
await png(iconLarge, 192, "public/icons/icon-192.png");
await png(iconLarge, 512, "public/icons/icon-512.png");
await png(maskable, 512, "public/icons/icon-maskable-512.png");

// favicon.ico: an ICO container holding PNG images (supported by every current browser).
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + 16 * images.length;
  for (const [size, data] of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...images.map(([, d]) => d)]);
}
writeFileSync("public/icons/favicon.ico", ico([[16, pngs[16]], [32, pngs[32]], [48, pngs[48]]]));

// The engraving (the full mark) in ivory and gold, as SVG for the web and PNG for Open Graph images.
const engr = (color) => engraving.replace("<svg ", `<svg fill="${color}" `).replaceAll("currentColor", color);
writeFileSync("public/brand/engraving-ivory.svg", engr(IVORY));
writeFileSync("public/brand/engraving-gold.svg", engr(GOLD));
await sharp(Buffer.from(engr(IVORY)), { density: 144 }).resize(1400).png({ compressionLevel: 9 }).toFile("public/brand/engraving-ivory.png");
await sharp(Buffer.from(engr(GOLD)), { density: 144 }).resize(1400).png({ compressionLevel: 9 }).toFile("public/brand/engraving-gold.png");
writeFileSync("public/brand/mark-planes-gold.svg", planesSvg({ color: GOLD, stroke: 3.2 }));
writeFileSync("public/brand/mark-planes-ivory.svg", planesSvg({ color: IVORY, stroke: 3.2 }));

console.log("icons and brand rasters written");
