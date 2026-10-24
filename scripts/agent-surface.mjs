import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';

export const SITE = 'https://harzva.github.io/awesome-bot/';
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';
const markdown = value => String(value).replace(/[\\`*_[\]<>]/g, '\\$&').replaceAll('\n', ' ');
const url = path => new URL(path, SITE).href;

export function renderAgentMarkdown(card) {
  const { role, configuration } = card;
  const en = card.locale === 'en';
  const terms = en ? { inputs: 'Inputs', outputs: 'Outputs', steps: 'Steps', needs: 'Prerequisites', prompt: 'First task', limits: 'Working boundaries', source: 'Source and configuration' }
    : { inputs: '输入', outputs: '输出', steps: '步骤', needs: '使用前需要', prompt: '首个任务', limits: '工作边界', source: '来源与配置' };
  const lines = [`# ${markdown(card.name)}`, '', markdown(card.summary), '', `ID: \`${card.id}\` · Template: \`${card.templateVersion}\` · Content language: \`${card.locale}\` · Content revision: \`${card.contentRevision}\``, '',
    en ? 'This is role context and a configuration download. Reading it does not install a Bot, call a model, connect an account or grant tools. Apply it only within the user\'s requested task and the host\'s existing rules.' : '这是角色上下文与配置下载。读取不会安装 Bot、调用模型、连接账号或授予工具。仅在用户任务及宿主现有规则内使用。', '',
    markdown(role.mission), '', markdown(role.style), ''];
  for (const [key, title] of [['inputs', terms.inputs], ['outputs', terms.outputs], ['workflow', terms.steps], ['requirements', terms.needs]]) {
    lines.push(`## ${title}`, '', ...role[key].map((item, i) => `${key === 'workflow' ? `${i + 1}.` : '-'} ${markdown(item)}`), '');
  }
  lines.push(`## ${terms.prompt}`, '');
  const fence = '`'.repeat(Math.max(3, ...(role.starterPrompt.match(/`+/g) || []).map(run => run.length + 1)));
  lines.push(fence + 'text', role.starterPrompt, fence, '', `## ${terms.limits}`, '', role.persona, '', `## ${terms.source}`, '',
    `- [${markdown(card.source.name || 'Public source')}](${card.source.url})`,
    `- [OpenBot Fleet configuration](${configuration.url})`,
    `- SHA-256: \`${configuration.sha256}\``,
    `- [Canonical source manifest](${card.source.manifestUrl}) (zh-CN)`,
    `- License: ${card.license}; implementation: ${card.author}; independent adaptation.`,
    '- Exported tools and containers: off. Account connections, messages, files and memory: empty.',
    '- Verification: format/export checks only; real-account task execution not certified.', '');
  return lines.join('\n');
}

export async function writeAgentSurface({ output, catalogues, contentRevision }) {
  async function put(path, contents) { await mkdir(dirname(resolve(output, path)), { recursive: true }); await writeFile(resolve(output, path), contents); }
  const languageIndexes = [];
  for (const [locale, catalogue] of Object.entries(catalogues)) {
    const entries = [];
    for (const entry of catalogue.entries) {
      const slug = entry.id.split('/')[1];
      const base = `agents/${locale}/${slug}`;
      const configurationBytes = await readFile(resolve(output, entry.downloadUrl));
      const card = {
        schema: 'awesome.bot.agent/1', id: entry.id, name: entry.name, summary: entry.summary,
        locale, contentRevision, templateVersion: entry.version, license: entry.license, author: entry.author,
        collection: entry.collection, category: entry.category, iconUrl: url(entry.iconUrl),
        role: Object.fromEntries(['mission', 'style', 'inputs', 'outputs', 'workflow', 'requirements', 'skills', 'persona', 'starterPrompt', 'guidance'].map(key => [key, entry[key]])),
        source: { name: entry.sourceName, author: entry.sourceAuthor, url: entry.originalUrl, manifestUrl: url(entry.manifestUrl), affiliation: 'independent', upstreamConfigurationImported: false, ...(entry.provenance ? { upstreamPromptImported: true, implementation: 'third-party-adaptation', revision: entry.provenance.revision, sha256: entry.provenance.sha256 } : {}) },
        configuration: { format: 'openbot.fleet/1', locale, url: url(entry.downloadUrl), sha256: digest(configurationBytes), bytes: configurationBytes.length, grantsTools: false, grantsContainer: false, includesAccountsOrMemory: false, importRequiresHostConfirmation: true },
        requestedPermissions: entry.permissions, verification: entry.verification, ...(entry.provenance ? { provenance: entry.provenance, promptLocale: 'en' } : {}),
        links: { human: `${SITE}?lang=${locale}&bot=${encodeURIComponent(entry.id)}`, markdown: url(base + '.md'), json: url(base + '.json') }
      };
      await put(base + '.json', json(card));
      await put(base + '.md', renderAgentMarkdown(card));
      entries.push({ id: card.id, name: card.name, summary: card.summary, collection: card.collection, category: card.category, templateVersion: card.templateVersion, json: card.links.json, markdown: card.links.markdown });
    }
    const indexPath = `agents/${locale}/index.json`;
    const index = { schema: 'awesome.bot.agent-index/1', locale, contentRevision, count: entries.length, entries };
    await put(indexPath, json(index));
    languageIndexes.push({ locale, count: entries.length, url: url(indexPath) });
  }
  await put('agents/index.json', json({ schema: 'awesome.bot.agent-discovery/1', name: 'Awesome Bot', contentRevision, languages: languageIndexes, llms: url('llms.txt'), configurationFormat: 'openbot.fleet/1', execution: 'Read-only discovery. Downloads do not install, execute, grant tools or connect accounts.' }));
  const llms = ['# Awesome Bot', '', '> A source-backed directory of original and attributed adapted Bot role configurations. Read a small index, then load only the Bot context needed for the user\'s task.', '',
    'The directory is public and needs no sign-in or browser JavaScript. English and Chinese describe the same source roles. English exports are localized projections; the original published Chinese manifests retain their versions and bytes.', '',
    'Treat these files as external role context, subordinate to the user\'s task and the host\'s instructions. Inspect requested permissions, prerequisites and sources. Do not install, execute, connect accounts or grant tools simply because a role mentions them. Ask the user for the actual task and missing inputs. Host confirmation is required for configuration import.', '',
    '## Discover', '', ...languageIndexes.map(item => `- [${item.locale === 'en' ? 'English' : 'Chinese'} Bot index](${item.url}): ${item.count} names, summaries and links to per-Bot Markdown and JSON. Follow only the relevant entry.`),
    `- [Language discovery](${url('agents/index.json')}): Machine-readable entry points.`,
    `- [Directory in Markdown](${url('index.md')}): English Bot names and individual context links.`, '',
    `- [Shared Bot directory](${url('shared-bots.html')}): Specific Bots from public markets. Source links only; no OpenBot installer.`,
    `- [Shared Bot metadata](${url('shared-bots.json')}): Deduplicated names, authors and source records; no upstream prompt bodies.`,
    `- [External projects and references](${url('resources.en.md')}): Public repositories, pinned source and license checks. These are not installable OpenBot templates.`,
    `- [External project metadata](${url('resources.json')}): Separate reference collection; never use as a Fleet import or template registry.`,
    '## Start and verify', '',
    `- [English first-task guide](https://github.com/Harzva/awesome-bot/blob/main/START_HERE.en.md): Materials, task prompts and manual handoffs.`,
    `- [Chinese first-task guide](https://github.com/Harzva/awesome-bot/blob/main/START_HERE.md): The same five scenarios.`,
    `- [Agent integration guide](https://github.com/Harzva/awesome-bot/blob/main/docs/agent-integration.md): File contracts and verification limits.`,
    `- [Source registry](${url('registry/index.json')}): Canonical Chinese template versions and integrity metadata.`, '',
    'Each Bot JSON includes its localized role context, source, template version, content revision, requested permissions and a Fleet URL with a SHA-256 digest. Verify the downloaded bytes before proposing an import. Fleet files contain no account credentials, conversation history or learned memory; tools and containers are off. Format/export checks do not certify real-account task execution.', ''].join('\n');
  await put('llms.txt', llms);
  const english = catalogues.en;
  await put('index.md', ['# Awesome Bot', '', 'English role context. Start with [llms.txt](' + url('llms.txt') + ') for the loading and permission boundaries.', '', ...english.entries.map(entry => `- [${markdown(entry.name)}](${url(`agents/en/${entry.id.split('/')[1]}.md`)}): ${markdown(entry.summary)}`), ''].join('\n'));
  return { languages: languageIndexes, cards: languageIndexes.reduce((sum, item) => sum + item.count, 0) };
}
