// The pinned, vendored market engine makes this repository independently usable.
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFile, readdir } from 'node:fs/promises';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const engineRoot = process.env.OPENBOT_MARKET_ROOT
  ? resolve(process.env.OPENBOT_MARKET_ROOT)
  : resolve(root, 'engine');

export async function readCatalogue() {
  const catalogue = JSON.parse(await readFile(resolve(root, 'catalogue.json'), 'utf8'));
  if (catalogue.entriesDir !== 'data/entries') throw new Error('catalogue.entriesDir must be data/entries');
  const files = await readdir(resolve(root, catalogue.entriesDir), { withFileTypes: true });
  const bots = [];
  for (const file of files.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    if (!file.isFile() || !/^[a-z0-9][a-z0-9-]*\.json$/.test(file.name)) throw new Error(`Unexpected entry path: ${file.name}`);
    const sourceFile = `${catalogue.entriesDir}/${file.name}`;
    const bot = JSON.parse(await readFile(resolve(root, sourceFile), 'utf8'));
    if (!bot || typeof bot !== 'object' || Array.isArray(bot)) throw new Error(`Entry must be one object: ${sourceFile}`);
    if (typeof bot.id !== 'string' || bot.id.split('/')[1] !== file.name.slice(0, -5)) throw new Error(`Entry filename must match its ID: ${sourceFile}`);
    if (!['bot-role', 'task-workflow'].includes(bot.collection)) throw new Error(`Entry collection must be bot-role or task-workflow: ${sourceFile}`);
    if (bot.upstreamMarketplaceId && (bot.upstreamUseCaseName || bot.collection !== 'bot-role')) throw new Error(`Invalid upstream role mapping: ${sourceFile}`);
    if (bot.upstreamUseCaseName && bot.collection !== 'task-workflow') throw new Error(`Invalid upstream workflow mapping: ${sourceFile}`);
    if (!bot.author || typeof bot.author.name !== 'string' || !bot.author.name.trim()) throw new Error(`Entry author is required: ${sourceFile}`);
    if (typeof bot.license !== 'string' || !bot.license.trim()) throw new Error(`Entry license is required: ${sourceFile}`);
    if (typeof bot.version !== 'string' || !bot.version.trim()) throw new Error(`Entry version is required: ${sourceFile}`);
    bots.push({ ...bot, sourceFile });
  }
  if (!bots.length) throw new Error('No catalogue entries found');
  return { ...catalogue, bots };
}

export async function engineModule(name) {
  if (!/^[a-z-]+$/.test(name)) throw new Error('Invalid market module');
  try {
    return await import(pathToFileURL(resolve(engineRoot, 'src', `${name}.mjs`)).href);
  } catch (error) {
    throw new Error(`Cannot load the OpenBot market engine at ${engineRoot}. Restore engine/ or set OPENBOT_MARKET_ROOT explicitly.`, { cause: error });
  }
}
