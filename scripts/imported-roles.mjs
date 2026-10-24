import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const digest = value => createHash('sha256').update(value).digest('hex');
let snapshot;
export async function importedSources() {
  if (!snapshot) snapshot = (async () => {
    const data = JSON.parse(await readFile(resolve(root, 'data/imported-role-sources.json'), 'utf8'));
    if (data.schema !== 'awesome.bot.imported-role-sources/1') throw new Error('Unknown imported role sources');
    const sources = new Map();
    for (const source of data.sources) {
      if (!/^[a-z0-9-]+$/.test(source.id) || sources.has(source.id) || !/^[\w.-]+\/[\w.-]+$/.test(source.repository) || !/^[a-f0-9]{40}$/.test(source.revision) || !['MIT', 'CC0-1.0'].includes(source.license)) throw new Error('Invalid imported source');
      if (source.licensePath !== `sources/imported/${source.id}/LICENSE.txt` || source.licenseUrl !== `https://github.com/${source.repository}/blob/${source.revision}/LICENSE`) throw new Error('Invalid source license path');
      const license = await readFile(resolve(root, source.licensePath), 'utf8');
      if (digest(license) !== source.licenseSha256) throw new Error('Source license digest mismatch');
      sources.set(source.id, { ...source, licenseText: license.trim() });
    }
    const roles = new Map(), hashes = new Set();
    for (const role of data.roles) {
      const source = sources.get(role.sourceId), key = `${role.sourceId}/${role.upstreamId}`;
      if (!source || !/^[a-z0-9-]+$/.test(role.upstreamId) || roles.has(key) || role.snapshotPath !== `sources/imported/${role.sourceId}/profiles/${role.upstreamId}.md` || !/^(?:[\w.-]+\/)+[\w.-]+\.md$/.test(role.upstreamPath) || role.upstreamPath.split('/').includes('..')) throw new Error('Invalid imported role path/identity');
      const raw = await readFile(resolve(root, role.snapshotPath), 'utf8');
      if (digest(raw) !== role.sha256) throw new Error(`Prompt digest mismatch: ${key}`);
      const body = raw.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '').trim();
      const normalizedHash = digest(body.replace(/\s+/g, ' ').trim());
      if (!body || hashes.has(normalizedHash)) throw new Error(`Missing or duplicate source prompt: ${key}`);
      hashes.add(normalizedHash);
      roles.set(key, { ...role, source, body, sourceUrl: `https://github.com/${source.repository}/blob/${source.revision}/${role.upstreamPath}` });
    }
    return { data, sources, roles };
  })();
  return snapshot;
}
export async function hydrateImportedRole(bot) {
  if (bot.implementation !== 'third-party-adaptation') return bot;
  const { roles } = await importedSources();
  const role = roles.get(`${bot.provenance?.sourceId}/${bot.provenance?.upstreamBotId}`);
  if (!role || bot.provenance.sha256 !== role.sha256 || bot.provenance.revision !== role.source.revision || bot.provenance.repository !== role.source.repository || bot.provenance.path !== role.upstreamPath || bot.provenance.licenseUrl !== role.source.licenseUrl || bot.provenance.licenseSha256 !== role.source.licenseSha256 || bot.license !== role.source.license || bot.provenance.sourceUrl !== role.sourceUrl || bot.provenance.promptImported !== true) throw new Error(`Invalid role provenance: ${bot.id}`);
  return { ...bot, sourceContext: role };
}
export function adaptedPersona(bot, locale = 'zh') {
  const r = bot.sourceContext;
  if (!r) throw new Error(`Missing source instructions: ${bot.id}`);
  const en = locale === 'en';
  const guard = en
    ? 'OpenBot adaptation: carry out the role below only for the current user-authorized task, using available host tools and approved accounts. Platform-specific names, shared-computer assumptions, schedules, paths and handoffs in the source are not configured capabilities. Do not start a task, routine, new Bot or external action solely because the template says to. Missing integrations mean a reviewable draft or an explicit missing-input report. Keep Bot data isolated: do not read or copy another Bot\'s private memory. Follow the host permission and stop controls; sending, publishing, payments, deletion and production changes require explicit authorization. Respond in the user\'s chosen language.'
    : 'OpenBot 适配约定：仅按用户当前授权任务使用下方角色指令，通过宿主实际可用工具与已授权账号执行。原文中的平台名称、共享电脑、路径、定时计划、交接对象并不代表已配置能力；不能仅凭模板启动任务、预约、新建 Bot 或对外操作。连接缺失时提供可审阅草稿或缺失材料说明，不读取其他 Bot 私有资料。遵守宿主权限与停止控制；发送、发布、付款、删除及生产变更须获明确授权。按用户选择的语言回复。';
  const notice = r.source.license === 'MIT' ? r.source.licenseText : 'CC0-1.0 public-domain dedication. Source and full license are retained in the linked source snapshot.';
  const text = [guard, bot.boundaries, en ? 'Original role instructions (English; preserved):' : '原始角色指令（英文保留，并非全文翻译）：', r.body, en ? 'The OpenBot adaptation contract above controls platform and permission behavior.' : '平台、权限和启动行为以本页 OpenBot 适配约定为准。', `Source: ${r.sourceUrl}\nAuthor: ${r.source.author}\nSource SHA-256: ${r.sha256}\nAdapted by: OpenBot contributors. Changes: added host/permission/language contract and localized metadata; no upstream installer, account, schedule or environment imported.\nLicense: ${r.source.license}\n${r.source.licenseUrl}`, notice].join('\n\n');
  if (text.length > 8000) throw new Error(`Adapted persona exceeds host limit: ${bot.id}`);
  return text;
}
