// Build-time reuse of OpenBot's canonical, MIT-licensed App characters.
// Snapshot and file digests: vendor/openbot-characters/PROVENANCE.json.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const characters = require('./vendor/openbot-characters/openbot-characters.js');
const ids = new Set(characters.characters.map(character => character.id));

export function avatarPath(id) {
  return `avatars/${String(id).split('/')[1]}.svg`;
}

export function avatarSVG(bot = {}) {
  const saved = bot.avatar || 'pal-peek';
  const id = typeof saved === 'string' && saved.startsWith('pal-') ? saved.slice(4) : '';
  if (!ids.has(id)) throw new Error('Unsupported OpenBot App avatar: ' + saved);
  // Keep the exact declared character used on import. Names can differ while
  // sharing artwork; no unique geometry or index-dependent reassignment.
  return characters.svg(id, { state: 'idle', motion: 'off', phase: 0, size: 128,
    label: 'OpenBot companion: ' + id, withStyle: true }) + '\n';
}
