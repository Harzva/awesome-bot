import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { root, readCatalogue } from '../scripts/engine.mjs';

test('the static market offers complete, deterministic and unprivileged downloads', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'awesome-site-'));
  const output = join(directory, 'site');
  const published = JSON.parse(await readFile(resolve(root, 'registry/index.json'), 'utf8'));
  const protectedPaths = ['registry/index.json', ...published.entries.flatMap(entry => entry.versions.map(version => resolve(root, 'registry', version.url)))];
  const protectedBefore = await Promise.all(protectedPaths.map(file => readFile(resolve(root, file))));
  const build = () => spawnSync(process.execPath, [resolve(root, 'scripts/build-site.mjs'), `--out=${output}`], { cwd: root, encoding: 'utf8' });
  try {
    const first = build();
    assert.equal(first.status, 0, first.stderr);
    const bytes = await readFile(join(output, 'catalogue.json'), 'utf8');
    const site = JSON.parse(bytes);
    const catalogue = await readCatalogue();
    const counts = { roles: catalogue.bots.filter(b => b.collection === 'bot-role').length, workflows: catalogue.bots.filter(b => b.collection === 'task-workflow').length, total: catalogue.bots.length };
    assert.deepEqual(site.counts, counts);
    assert.equal(site.entries.length, counts.total);
    const en = site.locales.en;
    assert.equal(en.entries.length, counts.total);
    assert.deepEqual(en.counts, counts);
    assert.deepEqual(en.coverage, { translated: counts.total, total: counts.total });
    const iconDigests = new Set();
    for (const entry of site.entries) {
      assert.match(entry.downloadUrl, /^exports\/[a-z0-9-]+\.fleet\.json$/);
      assert.match(entry.manifestUrl, /^templates\/[a-z0-9-]+\/\d+\.\d+\.\d+\.json$/);
      assert.match(entry.editUrl, /^https:\/\/github\.com\/Harzva\/awesome-bot\/edit\/main\/data\/entries\//);
      assert.equal(entry.verification.realTask, 'not-tested');
      assert.equal(entry.starterPrompt, catalogue.bots.find(bot => bot.id === entry.id).example.prompt);
      const manifest = JSON.parse(await readFile(join(output, entry.manifestUrl), 'utf8'));
      assert.equal(manifest.id, entry.id);
      const fleet = JSON.parse(await readFile(join(output, entry.downloadUrl), 'utf8'));
      assert.equal(fleet.schema, 'openbot.fleet/1');
      assert.equal(fleet.bots.length, 1);
      assert.equal(fleet.bots[0].toolsEnabled, false);
      assert.equal(fleet.bots[0].containerEnabled, false);
      assert.deepEqual(fleet.bots[0].channels, {});
      assert.deepEqual(fleet.bots[0].messages, []);
      assert.deepEqual(fleet.bots[0].memory, { profile: '', journal: [] });
      const svg = await readFile(join(output, entry.iconUrl), 'utf8');
      assert.match(svg, /<svg\s/);
      assert.doesNotMatch(svg, /<script|foreignObject|\bon\w+=|(?:href|src)\s*=/i);
      iconDigests.add(createHash('sha256').update(svg.replace(/<title>.*?<\/title>/s, '')).digest('hex'));
      const translated = en.entries.find(item => item.id === entry.id);
      const englishFleetBytes = await readFile(join(output, translated.downloadUrl));
      const englishFleet = JSON.parse(englishFleetBytes);
      assert.equal(englishFleet.bots[0].name, translated.name);
      assert.equal(englishFleet.bots[0].persona, translated.persona);
      assert.doesNotMatch(JSON.stringify(englishFleet), /\p{Script=Han}/u, entry.id);
      assert.equal(englishFleet.bots[0].toolsEnabled, false);
      assert.equal(englishFleet.bots[0].containerEnabled, false);
      assert.deepEqual(englishFleet.bots[0].memory, { profile: '', journal: [] });
      for (const [locale, item] of [['zh', entry], ['en', translated]]) {
        const card = JSON.parse(await readFile(join(output, `agents/${locale}/${entry.id.split('/')[1]}.json`), 'utf8'));
        const bytes = await readFile(join(output, item.downloadUrl));
        assert.equal(card.id, entry.id);
        assert.equal(card.locale, locale);
        assert.equal(card.configuration.sha256, createHash('sha256').update(bytes).digest('hex'));
        assert.equal(card.configuration.url, `https://harzva.github.io/awesome-bot/${item.downloadUrl}`);
        assert.equal(card.configuration.grantsTools, false);
        assert.equal(card.configuration.includesAccountsOrMemory, false);
        assert.equal(card.role.persona, item.persona);
        assert.equal(card.source.upstreamConfigurationImported, false);
        if (locale === 'en') assert.doesNotMatch(JSON.stringify(card.role), /\p{Script=Han}/u);
        const markdown = await readFile(join(output, `agents/${locale}/${entry.id.split('/')[1]}.md`), 'utf8');
        assert.ok(markdown.includes(card.configuration.sha256));
        assert.ok(markdown.includes(item.starterPrompt));
      }
    }
    assert.equal(iconDigests.size, counts.total, 'each role has a distinct vector identity');
    const discovery = JSON.parse(await readFile(join(output, 'agents/index.json'), 'utf8'));
    assert.deepEqual(discovery.languages.map(item => [item.locale, item.count]), [['zh', counts.total], ['en', counts.total]]);
    const llms = await readFile(join(output, 'llms.txt'), 'utf8');
    assert.ok(llms.startsWith('# Awesome Bot\n'));
    assert.ok(llms.includes('/agents/en/index.json'));
    assert.ok(llms.length < 6000, 'the discovery entry remains small');
    for (const [collection, expected] of [['roles', counts.roles], ['workflows', counts.workflows], ['all', counts.total]]) {
      if (expected > 200) { assert.equal(site.downloads[collection], null); continue; }
      const fleet = JSON.parse(await readFile(join(output, site.downloads[collection]), 'utf8'));
      assert.equal(fleet.bots.length, expected);
      assert.equal(new Set(fleet.bots.map(bot => bot.id)).size, expected);
    }
    assert.equal(site.scenarios.length, 5);
    assert.equal(en.scenarios.length, 5);
    for (const scenario of en.scenarios) {
      assert.doesNotMatch(JSON.stringify(scenario), /\p{Script=Han}/u);
      const fleet = JSON.parse(await readFile(join(output, scenario.downloadUrl), 'utf8'));
      assert.deepEqual(fleet.bots.map(bot => bot.name), scenario.steps.map(step => step.botName));
      assert.doesNotMatch(JSON.stringify(fleet), /\p{Script=Han}/u);
    }
    const scenarioBytes = new Map();
    for (const scenario of site.scenarios) {
      assert.deepEqual(scenario.botIds, scenario.steps.map(step => step.botId));
      assert.ok(scenario.botIds.length >= 1 && scenario.botIds.length <= 3);
      assert.equal(new Set(scenario.botIds).size, scenario.botIds.length);
      assert.match(scenario.downloadUrl, /^exports\/scenario-[a-z0-9-]+\.fleet\.json$/);
      const bytes = await readFile(join(output, scenario.downloadUrl), 'utf8');
      scenarioBytes.set(scenario.downloadUrl, bytes);
      const fleet = JSON.parse(bytes);
      assert.deepEqual(fleet.bots.map(bot => bot.id), scenario.botIds.map(id => id.split('/')[1]));
      assert.deepEqual(fleet.bots.map(bot => bot.name), scenario.steps.map(step => step.botName));
      for (const bot of fleet.bots) {
        assert.equal(bot.toolsEnabled, false);
        assert.equal(bot.containerEnabled, false);
        assert.equal(bot.model, '');
        assert.deepEqual(bot.channels, {});
        assert.deepEqual(bot.messages, []);
        assert.deepEqual(bot.files, []);
        assert.deepEqual(bot.memory, { profile: '', journal: [] });
      }
      assert.deepEqual(fleet.shared, { skills: [], files: [] });
    }
    const second = build();
    assert.equal(second.status, 0, second.stderr);
    assert.equal(await readFile(join(output, 'catalogue.json'), 'utf8'), bytes);
    for (const [file, before] of scenarioBytes) assert.equal(await readFile(join(output, file), 'utf8'), before);
    for (const [index, file] of protectedPaths.entries()) assert.deepEqual(await readFile(resolve(root, file)), protectedBefore[index]);
    assert.ok(!bytes.includes('/Users/'));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('community growth beyond one Fleet package keeps the market and individual downloads usable', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'awesome-site-growth-'));
  const fixture = join(directory, 'repository');
  try {
    await cp(root, fixture, { recursive: true, filter: file => !['.git', 'dist', 'out', '.cache', 'node_modules'].some(name => file === resolve(root, name)) });
    const catalogue = await readCatalogue();
    const needed = Math.max(1, 201 - catalogue.bots.length);
    const source = JSON.parse(await readFile(join(fixture, 'data/entries/chief-of-staff.json'), 'utf8'));
    for (let index = 0; index < needed; index++) {
      const entry = { ...structuredClone(source), id: `awesome/community-scale-${index}`, name: `社区增长示例 ${index}`, collection: 'bot-role', author: { name: 'Community fixture' }, references: [{ label: 'Original community role', url: 'https://github.com/Harzva/awesome-bot' }] };
      delete entry.upstreamUseCaseName;
      delete entry.upstreamMarketplaceId;
      await writeFile(join(fixture, `data/entries/community-scale-${index}.json`), JSON.stringify(entry));
    }
    for (const args of [['scripts/build.mjs'], ['scripts/build-site.mjs']]) {
      const result = spawnSync(process.execPath, args, { cwd: fixture, env: { PATH: process.env.PATH }, encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
    }
    const site = JSON.parse(await readFile(join(fixture, 'dist/site/catalogue.json'), 'utf8'));
    assert.equal(site.counts.total, catalogue.bots.length + needed);
    assert.equal(site.downloads.all, null);
    assert.equal(site.bulkLimit, 200);
    const entry = site.entries.find(item => item.id === 'awesome/community-scale-0');
    const single = JSON.parse(await readFile(join(fixture, 'dist/site', entry.downloadUrl), 'utf8'));
    assert.equal(single.bots.length, 1);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
