// Generates the abstract SVG placeholder art in /public/images.
//
// There's no real event photography yet, so these hand-generated pieces
// (glow orbs, sound-wave rings, an equalizer skyline) stand in for cover
// photos and gallery shots and keep the brand's dark/neon-purple look
// consistent. Swap the files in /public/images for real photos/video
// stills whenever they're available — nothing else needs to change.
//
// Run with: node scripts/generate-placeholder-art.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "images");
const galleryDir = path.join(outDir, "gallery");
mkdirSync(galleryDir, { recursive: true });

const PALETTE = {
  violet: "#b13bff",
  violetBright: "#d287ff",
  magenta: "#ff3fb0",
  mint: "#4dffc3",
  ink: "#08060d",
  inkRaised: "#120b1c",
};

// Small deterministic PRNG so re-running the script gives stable output.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function equalizerBars(rng, { width, y, height, accent, count = 28 }) {
  const barWidth = width / count / 1.8;
  const gap = width / count;
  let bars = "";
  for (let i = 0; i < count; i++) {
    const h = height * (0.15 + rng() * 0.85);
    const x = i * gap + gap / 2 - barWidth / 2;
    const opacity = (0.25 + rng() * 0.55).toFixed(2);
    bars += `<rect x="${x.toFixed(1)}" y="${(y - h).toFixed(1)}" width="${barWidth.toFixed(1)}" height="${h.toFixed(1)}" rx="${(barWidth / 2).toFixed(1)}" fill="${accent}" opacity="${opacity}" />`;
  }
  return bars;
}

function soundRings(rng, { cx, cy, accent, maxRadius = 260 }) {
  let rings = "";
  const count = 5;
  for (let i = 0; i < count; i++) {
    const r = (maxRadius / count) * (i + 1);
    const opacity = (0.5 - i * 0.08).toFixed(2);
    rings += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${accent}" stroke-width="1.5" opacity="${opacity}" />`;
  }
  return rings;
}

function glowDefs(id) {
  return `<filter id="${id}" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="70" /></filter>`;
}

function grid(width, height, opacity = 0.12) {
  let lines = "";
  const step = 60;
  for (let x = 0; x <= width; x += step) {
    lines += `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="${PALETTE.violetBright}" stroke-width="1" opacity="${opacity}" />`;
  }
  for (let y = 0; y <= height; y += step) {
    lines += `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="${PALETTE.violetBright}" stroke-width="1" opacity="${opacity}" />`;
  }
  return lines;
}

function noiseDefs(id) {
  return `<filter id="${id}"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" result="n" /><feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.04 0" /></filter>`;
}

function scene({
  seed,
  width,
  height,
  accentA = PALETTE.violet,
  accentB = PALETTE.magenta,
  ringAccent = PALETTE.violetBright,
  label,
}) {
  const rng = mulberry32(seed);
  const glowAId = `glowA${seed}`;
  const glowBId = `glowB${seed}`;
  const noiseId = `noise${seed}`;
  const gradId = `bg${seed}`;

  const orbAx = width * (0.15 + rng() * 0.2);
  const orbAy = height * (0.15 + rng() * 0.2);
  const orbBx = width * (0.7 + rng() * 0.2);
  const orbBy = height * (0.55 + rng() * 0.3);

  const ringCx = width * (0.72 + rng() * 0.15);
  const ringCy = height * (0.22 + rng() * 0.12);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${PALETTE.inkRaised}" />
      <stop offset="100%" stop-color="${PALETTE.ink}" />
    </linearGradient>
    ${glowDefs(glowAId)}
    ${glowDefs(glowBId)}
    ${noiseDefs(noiseId)}
  </defs>

  <rect width="${width}" height="${height}" fill="url(#${gradId})" />
  ${grid(width, height)}

  <circle cx="${orbAx}" cy="${orbAy}" r="${width * 0.22}" fill="${accentA}" opacity="0.55" filter="url(#${glowAId})" />
  <circle cx="${orbBx}" cy="${orbBy}" r="${width * 0.18}" fill="${accentB}" opacity="0.4" filter="url(#${glowBId})" />

  ${soundRings(rng, { cx: ringCx, cy: ringCy, accent: ringAccent, maxRadius: width * 0.16 })}

  ${equalizerBars(rng, { width, y: height * 0.98, height: height * 0.32, accent: accentA, count: Math.round(width / 34) })}

  <rect width="${width}" height="${height}" fill="url(#${gradId})" opacity="0.001" />
  <rect width="${width}" height="${height}" filter="url(#${noiseId})" />

  ${
    label
      ? `<text x="${width / 2}" y="${height * 0.5}" text-anchor="middle" font-family="Arial Narrow, Arial, sans-serif" font-size="${width * 0.09}" fill="#ffffff" opacity="0.05" letter-spacing="${width * 0.01}" transform="rotate(-8 ${width / 2} ${height / 2})">${label}</text>`
      : ""
  }
</svg>`;
}

const files = [
  {
    file: "event-cover-boiler.svg",
    opts: { seed: 101, width: 1000, height: 1250, label: "ETFE EL BOILER" },
  },
  {
    file: "past-warehouse-cover.svg",
    opts: {
      seed: 202,
      width: 1200,
      height: 800,
      accentA: PALETTE.magenta,
      accentB: PALETTE.violet,
      label: "BOILER VOL. 1",
    },
  },
  {
    file: "past-rooftop-cover.svg",
    opts: {
      seed: 303,
      width: 1200,
      height: 800,
      accentA: PALETTE.violet,
      accentB: PALETTE.mint,
      ringAccent: PALETTE.mint,
      label: "ROOFTOP SESSIONS",
    },
  },
  { file: "gallery/warehouse-1.svg", opts: { seed: 11, width: 1200, height: 900 } },
  {
    file: "gallery/warehouse-2.svg",
    opts: { seed: 12, width: 1200, height: 900, accentA: PALETTE.magenta, accentB: PALETTE.violet },
  },
  {
    file: "gallery/warehouse-3.svg",
    opts: { seed: 13, width: 900, height: 1200, accentA: PALETTE.violet, accentB: PALETTE.mint },
  },
  {
    file: "gallery/rooftop-1.svg",
    opts: { seed: 21, width: 1200, height: 900, accentA: PALETTE.violet, accentB: PALETTE.mint, ringAccent: PALETTE.mint },
  },
  {
    file: "gallery/rooftop-2.svg",
    opts: { seed: 22, width: 900, height: 1200, accentA: PALETTE.magenta, accentB: PALETTE.mint },
  },
  {
    file: "about-portrait.svg",
    opts: {
      seed: 404,
      width: 900,
      height: 1100,
      accentA: PALETTE.violet,
      accentB: PALETTE.magenta,
      ringAccent: PALETTE.mint,
      label: "DJ LWES",
    },
  },
];

for (const { file, opts } of files) {
  const svg = scene(opts);
  const outPath = path.join(outDir, file);
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, svg, "utf8");
  console.log("wrote", path.relative(process.cwd(), outPath));
}
