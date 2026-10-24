import test from 'node:test';
import assert from 'node:assert/strict';
import { readProjects, validateProjects, renderProjects, projectMarkdown } from '../scripts/external-projects.mjs';

test('external project provenance cannot become an installable template or unsupported license claim', async () => {
  const data = await readProjects();
  assert.equal(data.projects.length, 7);
  assert.equal(data.projects.filter(p => p.openSource).length, 6);
  assert.equal(data.projects.filter(p => p.submittedStatus === 404).length, 5);
  for (const mutate of [
    p => { p.openbot.installable = true; },
    p => { p.downloadUrl = 'exports/unsafe.fleet.json'; },
    p => { p.url = 'javascript:alert(1)'; },
    p => { p.readmeUrl = p.url + '/blob/main/README.md'; },
    p => { p.openbot.note.en = ''; },
    p => { p.matchStatus = 'redirect-confirmed'; },
    p => { p.licenseUrl = 'https://example.com/LICENSE'; }
  ]) {
    const invalid = structuredClone(data); mutate(invalid.projects[0]);
    assert.throws(() => validateProjects(invalid), /Invalid external project/);
  }
  const missing = structuredClone(data);
  missing.projects.find(p => p.license === null).openSource = true;
  assert.throws(() => validateProjects(missing));
  const duplicate = structuredClone(data); duplicate.projects.push(duplicate.projects[0]);
  assert.throws(() => validateProjects(duplicate));
});

test('static references have bilingual source evidence and escape untrusted labels', async () => {
  const data = await readProjects();
  for (const locale of ['zh', 'en']) {
    const html = renderProjects(data, locale, 'test');
    const md = projectMarkdown(data, locale);
    assert.equal((html.match(/data-project /g) || []).length, 7);
    assert.doesNotMatch(html, /\bdownload(?:=|\s|>)/);
    for (const item of data.projects) {
      assert.ok(html.includes(item.readmeUrl));
      assert.ok(md.includes(item.revision));
    }
    if (locale === 'en') assert.doesNotMatch(md, /\p{Script=Han}/u);
  }
  const untrusted = structuredClone(data);
  untrusted.projects[0].name = '<script>alert("x")</script>';
  const html = renderProjects(untrusted, 'en', 'test');
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>alert'));
});
