// Reuse the existing CLI; keep its consent, source trust, integrity and upgrade rules.
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { engineRoot, root } from './engine.mjs';

if (process.argv.length < 3) process.argv.push('list');
const command = process.argv[2];
const supported = new Set(['help', 'list', 'info', 'plan', 'install']);
if (!supported.has(command)) throw new Error('Supported commands: help, list, info, plan, install. Fleet imports can rename IDs, so upgrades need host-side installation-record reconciliation first. Validate with npm run check && npm test.');
const has = (name) => process.argv.slice(3).some((arg) => arg === `--${name}` || arg.startsWith(`--${name}=`));
for (const name of ['out', 'record']) {
  for (let i = 3; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === `--${name}` && (!process.argv[i + 1] || process.argv[i + 1].startsWith('--'))) throw new Error(`--${name} requires a file path`);
    if (arg.startsWith(`--${name}=`) && !arg.slice(name.length + 3).trim()) throw new Error(`--${name} requires a file path`);
  }
}
if (has('file') || has('registry')) throw new Error('This wrapper selects the Awesome Bot directory. Use the original CLI directly to select another directory.');
if (command === 'install' && !has('out')) {
  throw new Error('Provide --out=<file>; this command generates a configuration file and does not install into your App.');
}
if (['plan', 'install'].includes(command) && !has('openbot')) throw new Error('Provide --openbot=<target-version>, for example --openbot=0.9.9. The reused CLI has an older default version.');
const cacheIndex = process.argv.indexOf('--cache');
if (cacheIndex >= 0 && (!process.argv[cacheIndex + 1] || process.argv[cacheIndex + 1].startsWith('--'))) {
  process.argv[cacheIndex] = `--cache=${resolve(root, '.cache')}`;
}
if (has('offline') && !has('cache')) process.argv.push(`--cache=${resolve(root, '.cache')}`);
if (command === 'help') {
  console.log('Awesome Bot: list | info <id> | plan <id> | install <id> --out=<file>\nExample: plan awesome/chief-of-staff --openbot=0.9.9 --allow-community --allow-unpinned\nThis unsigned standalone source has no bundled publisher trust anchor. Plan/install require your explicit acceptance of community content and an unpinned source; neither flag is added automatically.\nUse --query=<text> to search. Configuration exports do not grant tool permissions or modify your App.\nUpgrades require host-side ID reconciliation and are not exposed here.');
} else {
  process.argv.push(`--file=${resolve(root, 'registry/index.json')}`);
  await import(pathToFileURL(resolve(engineRoot, 'scripts/market.mjs')).href);
}
