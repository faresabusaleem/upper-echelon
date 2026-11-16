// Traces the original raster logo (brand/source) into clean SVG paths.
// Run: node scripts/trace-logo.mjs  → writes brand/mark-engraving.svg
import sharp from "sharp";
import potrace from "potrace";
import { writeFileSync } from "node:fs";
import { promisify } from "node:util";

const trace = promisify(potrace.trace);
const src = "brand/source/upper-echelon-logo-original.jpg";

const upscaled = await sharp(src)
  .resize({ width: 749 * 3, kernel: "lanczos3" })
  .greyscale()
  .normalise()
  .median(3)
  .png()
  .toBuffer();

const svg = await trace(upscaled, {
  threshold: 150,
  turdSize: 18, // drop the smallest stipple specks
  optTolerance: 0.4,
  alphaMax: 1,
  color: "currentColor",
  background: "transparent",
});
// Round coordinates to whole units: invisible at any display size, halves the file.
const rounded = svg
  .replace(/\s*version="1.1"/, "")
  .replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n))))
  .replace(/width="\d+" height="\d+" /, "")
  .replace(/<rect[^>]*\/>/, "");
writeFileSync("brand/mark-engraving.svg", rounded);
console.log("traced", rounded.length, "bytes");
