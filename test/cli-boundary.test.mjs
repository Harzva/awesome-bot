import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { root } from '../scripts/engine.mjs';

const run = (args) => spawnSync(process.execPath, [resolve(root, 'scripts/market.mjs'), ...args], { cwd: root, encoding: 'utf8' });

test('configuration export requires an explicit nonempty output path', () => {
  for (const args of [
    ['install', 'awesome/chief-of-staff', '--allow-community'],
    ['install', 'awesome/chief-of-staff', '--out'],
    ['install', 'awesome/chief-of-staff', '--out='],
    ['install', 'awesome/chief-of-staff', '--out', '--allow-community']
  ]) {
    const result = run(args);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /out.*(?:file|path)/i);
  }
});

test('standalone exports cannot use unreconciled records to upgrade or roll back a host Bot', () => {
  for (const cmd of ['upgrade', 'rollback']) {
    const result = run([cmd, '--apply', '--installed=/tmp/not-a-real-record.json', '--out=/tmp/not-a-real-patch.json']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /host-side installation-record reconciliation/);
  }
});
