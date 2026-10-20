/*
 * Original, deterministic role marks for Awesome Bot.
 *
 * The marks deliberately stay geometric so they remain legible at 40px in the
 * directory and at 64px in the detail sheet. They do not load fonts, images,
 * scripts, or remote resources. The generated SVGs are MIT licensed with the
 * rest of this repository.
 */

const INK = '#201d1a';
const PAPER = '#fffdf9';
const DEFAULT_COLOR = '#688e75';

const FAMILY_MARKS = {
  engineering: engineeringMark,
  design: designMark,
  marketing: marketingMark,
  sales: salesMark,
  operations: operationsMark,
  people: peopleMark,
  personal: personalMark,
  product: productMark,
  support: supportMark,
  general: generalMark
};

/** Return the public path used by the site build for one canonical Bot id. */
export function avatarPath(id) {
  return `avatars/${String(id).split('/')[1]}.svg`;
}

/**
 * Render one stable, self-contained SVG mark.
 *
 * Only the canonical id participates in the mark's seed. This keeps a Bot's
 * identity stable when its display name or source metadata is localized, while
 * still producing distinct geometry for every entry.
 */
export function avatarSVG(bot = {}) {
  const id = typeof bot.id === 'string' && bot.id ? bot.id : 'awesome/unknown-bot';
  const seed = hash(id);
  const category = typeof bot.category === 'string' ? bot.category.toLowerCase() : 'general';
  const mark = FAMILY_MARKS[category] || generalMark;
  const color = safeColor(bot.color);
  const tint = mix(color, PAPER, 0.72);
  const shade = mix(color, INK, 0.28);
  const rotation = int(seed, 11, -7, 7);
  const radius = int(seed, 17, 11, 16);
  const variant = int(seed, 23, 0, 5);
  const detail = int(seed, 29, 0, 3);
  const title = escapeXml(id);

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">',
    `  <title>${title}</title>`,
    `  <g transform="rotate(${rotation} 32 32)">`,
    `    <rect x="5" y="5" width="54" height="54" rx="${radius}" fill="${tint}" stroke="${INK}" stroke-width="2"/>`,
    shellAccent(seed, color),
    `    <g fill="none" stroke="${INK}" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5">`,
    mark({ color, shade, detail, seed, variant }),
    '    </g>',
    individualDetail(seed, color, detail, variant),
    '  </g>',
    '</svg>',
    ''
  ].join('\n');
}

function engineeringMark({ color, shade, detail, variant }) {
  const offset = detail * 2;
  const y = 32 + (variant % 2 ? 2 : -2);
  return [
    `      <path d="M18 ${22 + offset}v-5h7M46 ${22 + offset}v-5h-7M18 ${42 - offset}v5h7M46 ${42 - offset}v-5h-7"/>`,
    `      <path d="M23 ${y}h18" stroke="${color}" stroke-width="4"/>`,
    `      <circle cx="${24 + detail * 4}" cy="${y}" r="2.8" fill="${shade}" stroke="none"/>`,
    `      <circle cx="${40 - detail * 3}" cy="${y}" r="2.8" fill="${color}" stroke="none"/>`
  ].join('\n');
}

function designMark({ color, shade, detail, variant }) {
  const nudge = variant % 2 ? 2 : 0;
  return [
    `      <path d="M32 15L47 ${32 + nudge} 32 49 17 ${32 - nudge}Z" fill="${color}"/>`,
    `      <path d="M32 22v20M22 ${32 + nudge}h20"/>`,
    `      <circle cx="32" cy="32" r="${4 + detail}" fill="${PAPER}" stroke="${shade}" stroke-width="2"/>`
  ].join('\n');
}

function marketingMark({ color, shade, detail, variant }) {
  const sweep = variant % 2 ? 1 : 0;
  return [
    `      <path d="M18 ${42 - sweep}a18 18 0 0 1 ${28 - detail * 2} -18" stroke="${color}" stroke-width="5"/>`,
    `      <path d="M21 ${24 + detail}l-4-4M42 ${21 + detail}l2-6M47 ${31 - sweep}l6-1" stroke="${shade}"/>`,
    `      <circle cx="25" cy="39" r="3" fill="${color}" stroke="none"/>`
  ].join('\n');
}

function salesMark({ color, shade, detail, variant }) {
  const rise = variant - 2;
  return [
    `      <path d="M17 ${41 + rise}h25m0 0-8-8m8 8-8 8" stroke="${color}" stroke-width="4"/>`,
    `      <path d="M18 ${25 - detail}h14" stroke="${shade}"/>`,
    `      <circle cx="${20 + detail * 3}" cy="${25 - detail}" r="2.8" fill="${shade}" stroke="none"/>`
  ].join('\n');
}

function operationsMark({ color, shade, detail, variant }) {
  const shift = (variant % 2) * 2;
  return [
    `      <rect x="18" y="18" width="11" height="11" rx="2" fill="${color}"/>`,
    `      <rect x="35" y="18" width="11" height="11" rx="2" fill="${shade}"/>`,
    `      <rect x="18" y="35" width="11" height="11" rx="2" fill="${shade}"/>`,
    `      <path d="M35 ${40 + shift}h11" stroke="${color}" stroke-width="4"/>`,
    `      <circle cx="${32 + shift}" cy="32" r="${2 + detail / 2}" fill="${PAPER}" stroke="${INK}" stroke-width="1.5"/>`
  ].join('\n');
}

function peopleMark({ color, shade, detail, variant }) {
  const spread = detail * 2;
  return [
    `      <circle cx="${26 - spread / 2}" cy="25" r="6" fill="${color}"/>`,
    `      <circle cx="${39 + spread / 2}" cy="25" r="6" fill="${shade}"/>`,
    `      <path d="M17 45c1-7 6-11 12-11s11 4 12 11M31 45c1-7 6-11 12-11 2 0 3 .3 4 .8"/>`,
    `      <path d="M31 19v10" stroke="${PAPER}" stroke-width="2"/>`
  ].join('\n');
}

function personalMark({ color, shade, detail, variant }) {
  const orbit = variant % 2 ? 2 : 0;
  return [
    `      <path d="M16 ${32 + orbit}c5-12 27-17 33-2-5 12-27 17-33 2Z" fill="${color}"/>`,
    `      <circle cx="32" cy="${32 + orbit}" r="${5 + detail}" fill="${PAPER}" stroke="${shade}" stroke-width="2"/>`,
    `      <path d="M21 ${46 - detail}c7 3 15 3 22 0" stroke="${shade}"/>`
  ].join('\n');
}

function productMark({ color, shade, detail, variant }) {
  const lift = detail * 2;
  return [
    `      <path d="M19 ${25 - lift}h26l-6 7H13Z" fill="${shade}"/>`,
    `      <path d="M19 32h26l-6 7H13Z" fill="${color}"/>`,
    `      <path d="M19 ${39 + lift}h26l-6 7H13Z" fill="${PAPER}" stroke="${shade}"/>`,
    `      <circle cx="43" cy="${21 + detail}" r="2.8" fill="${color}" stroke="none"/>`
  ].join('\n');
}

function supportMark({ color, shade, detail, variant }) {
  const arm = variant % 2 ? 5 : 4;
  return [
    `      <path d="M32 17v30M17 32h30" stroke="${color}" stroke-width="5"/>`,
    `      <path d="M24 24l-6 6v5l6 5M40 24l6 6v5l-6 5" stroke="${shade}"/>`,
    `      <circle cx="32" cy="${32 + (detail - 1) * arm}" r="3" fill="${PAPER}" stroke="${INK}" stroke-width="1.5"/>`
  ].join('\n');
}

function generalMark({ color, shade, detail, variant }) {
  const point = 15 + detail * 2;
  return [
    `      <path d="M32 ${point}l${17 - detail} 17-17 17-17-17Z" fill="${color}"/>`,
    `      <path d="M32 ${point + 8}v16M24 ${32}h16" stroke="${shade}"/>`,
    `      <circle cx="32" cy="32" r="${3 + (variant % 2)}" fill="${PAPER}" stroke="${INK}" stroke-width="1.5"/>`
  ].join('\n');
}

function shellAccent(seed, color) {
  const side = int(seed, 37, 0, 1) ? 43 : 5;
  const direction = side === 43 ? -1 : 1;
  const y = 15 + int(seed, 41, 0, 6);
  return `    <path d="M${side} ${y}h${direction * 11}" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`;
}

function individualDetail(seed, color, detail, variant) {
  const x = 15 + int(seed, 47, 0, 34);
  const y = 16 + int(seed, 53, 0, 32);
  const length = 5 + detail * 2;
  const direction = variant % 2 ? -1 : 1;
  return [
    `    <path d="M${x} ${y}h${direction * length}" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`,
    `    <circle cx="${58 - int(seed, 59, 0, 12)}" cy="${50 - int(seed, 61, 0, 12)}" r="2" fill="${INK}"/>`
  ].join('\n');
}

function safeColor(value) {
  const text = String(value || '').trim();
  if (/^#[0-9a-f]{6}$/i.test(text)) return text.toUpperCase();
  if (/^#[0-9a-f]{3}$/i.test(text)) {
    return `#${text.slice(1).split('').map(char => `${char}${char}`).join('')}`.toUpperCase();
  }
  return DEFAULT_COLOR;
}

function mix(source, target, amount) {
  const a = hexRgb(source);
  const b = hexRgb(target);
  const ratio = Math.max(0, Math.min(1, amount));
  return `#${[0, 1, 2].map(index => Math.round(a[index] + (b[index] - a[index]) * ratio).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

function hexRgb(value) {
  return [1, 3, 5].map(index => Number.parseInt(value.slice(index, index + 2), 16));
}

function hash(value) {
  let result = 2166136261;
  for (const char of value) {
    result ^= char.codePointAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function int(seed, salt, min, max) {
  const value = mixSeed(seed, salt) % (max - min + 1);
  return min + value;
}

function mixSeed(seed, salt) {
  let value = (seed ^ Math.imul(salt, 0x9e3779b9)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d) >>> 0;
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[character]));
}
