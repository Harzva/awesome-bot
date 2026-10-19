import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { root, engineModule, readCatalogue } from './engine.mjs';

const args = process.argv.slice(2);
if (args.some((arg) => arg !== '--allow-community' && !arg.startsWith('--out=') && !arg.startsWith('--collection='))) throw new Error('Usage: node scripts/export-all.mjs --allow-community --out=<fleet.json> [--collection=all|roles|workflows]');
const destination = args.find((arg) => arg.startsWith('--out='))?.slice(6);
if (!destination?.trim()) throw new Error('Provide --out=<fleet.json>');
if (!args.includes('--allow-community')) throw new Error('This unsigned development directory requires explicit --allow-community');
// Do not export an older registry/templates snapshot after authored data changes.
execFileSync(process.execPath, [resolve(root, 'scripts/build.mjs'), '--check'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const { loadCatalogue } = await engineModule('catalogue');
const { createLoader } = await engineModule('sources');
const { buildPlan } = await engineModule('plan');
const { materialize } = await engineModule('install');
const { gateEntry } = await engineModule('trust');
const registry = await loadCatalogue([resolve(root, 'registry/index.json')]);
const loader = createLoader(registry);
const metadata = await readCatalogue();
const collection = args.find((arg) => arg.startsWith('--collection='))?.slice(13) || 'all';
if (!['all', 'roles', 'workflows'].includes(collection)) throw new Error('Collection must be all, roles, or workflows');
const selected = new Set(metadata.bots.filter(b => collection === 'all' || b.collection === (collection === 'roles' ? 'bot-role' : 'task-workflow')).map(b => b.id));
if (selected.size > 200) throw new Error('A Fleet configuration file supports at most 200 Bots. Export a smaller collection or individual templates.');
const entries = registry.entries.filter(e => selected.has(e.id));
if (!selected.size || entries.length !== selected.size) throw new Error('The registry does not cover the complete selected collection; rebuild before exporting');
const plans = [];
for (const entry of entries) {
  const gate = gateEntry(entry, { allowCommunity: true });
  if (!gate.ok) throw new Error(gate.message);
  const plan = await buildPlan({ id: entry.id, entries: registry.entries, loadManifest: loader, openbotVersion: metadata.targetOpenBotVersion || '0.9.9' });
  if (!plan.ok) throw new Error(plan.errors.join('\n'));
  if (plan.bots.length !== 1) throw new Error(`Expected one Bot for ${entry.id}`);
  plans.push(plan);
}
// A bulk configuration export, not a published bundle (the bundle schema has a
// smaller member limit). Each member is independently resolved and checked above.
const result = materialize({
  ok: true, id: 'awesome/curated-bots', kind: 'bulk-export', rootVersion: '1.0.0',
  bots: plans.flatMap((p) => p.bots), sharedSkills: [], workflow: [],
  permissions: { tools: plans.some((p) => p.permissions.tools), container: false, screen: plans.some((p) => p.permissions.screen) },
  warnings: []
}, { now: Date.parse(metadata.updatedAt) });
if (!result.ok) throw new Error(result.message);
if (result.bundle.bots.length !== selected.size) throw new Error('Incomplete bulk export; no file was written');
const target = resolve(destination);
await mkdir(dirname(target), { recursive: true });
await writeFile(target, `${JSON.stringify(result.bundle, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, file: target, collection, bots: result.bundle.bots.length, schema: result.bundle.schema, installed: false }));
