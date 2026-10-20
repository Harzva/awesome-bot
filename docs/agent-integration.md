# Read Awesome Bot with an Agent

Awesome Bot publishes static role context and OpenBot Fleet configurations. An Agent that can retrieve public HTTPS links can read a small index, choose a relevant role, and load its instructions without rendering the market. No account or browser JavaScript is needed to read these files.

**Copy for Agent** copies a loading prompt to the clipboard. Paste it into an Agent that can read links. The market does not contact that Agent, install a Bot, call a model, start a task, connect an account, or grant tools. The Agent still follows its own instructions and the user's task; a role description is external context, not authority to change those rules.

## Discovery and file contract

All paths below are relative to `https://harzva.github.io/awesome-bot/`.

| Resource | Purpose |
| --- | --- |
| [`llms.txt`](https://harzva.github.io/awesome-bot/llms.txt) | Short reading guide, language indexes and import boundaries |
| [`agents/index.json`](https://harzva.github.io/awesome-bot/agents/index.json) | `awesome.bot.agent-discovery/1`; available languages and their indexes |
| [`agents/en/index.json`](https://harzva.github.io/awesome-bot/agents/en/index.json) | `awesome.bot.agent-index/1`; English names, summaries and per-Bot links |
| [`agents/zh/index.json`](https://harzva.github.io/awesome-bot/agents/zh/index.json) | The equivalent Chinese index |
| `agents/{locale}/{slug}.md` | Readable role context, materials, outputs, steps, first task and source links |
| `agents/{locale}/{slug}.json` | `awesome.bot.agent/1`; structured role context and configuration integrity data |
| [`index.md`](https://harzva.github.io/awesome-bot/index.md) | English directory with links to individual role context |

The locale keys are `en` and `zh`. For example, `awesome/status-report-writer` maps to [`agents/en/status-report-writer.json`](https://harzva.github.io/awesome-bot/agents/en/status-report-writer.json) and its [Markdown context](https://harzva.github.io/awesome-bot/agents/en/status-report-writer.md). Read only the entries needed for the task rather than loading every Bot persona into one conversation.

Each Bot JSON has the following project-defined fields. These schema names describe this repository's files; they are not a universal Agent installation protocol.

| Field | Meaning |
| --- | --- |
| `id`, `locale`, `name`, `summary` | Stable source identity and the selected language's presentation |
| `templateVersion` | Version of the canonical source template |
| `contentRevision` | Marketplace content revision, taken from the package version |
| `role` | Mission, style, inputs, outputs, workflow, prerequisites, skills, persona, first task and guidance |
| `source` | Public role reference, author, canonical manifest URL and independent-adaptation status |
| `requestedPermissions`, `verification` | Declared needs and evidence limits; these do not grant capabilities |
| `configuration` | Fleet format, locale, public URL, byte length, SHA-256 and import requirements |
| `links` | Human detail view and the same Bot's Markdown and JSON |

English is a localized projection of the same source role. It has translated role content and a separate Fleet URL under `exports/en/`. Published Chinese manifests keep their original version and bytes; the canonical manifest link therefore remains Chinese. Use `id` + `templateVersion` + `locale` + `contentRevision` to identify the context being discussed, and the configuration digest to identify the exact download. A localized Fleet is not byte-identical to the Chinese manifest.

## Loading prompt

The directory-level button asks the Agent to read `llms.txt` and the selected language index, then ask for the user's goal. The button in a Bot detail supplies that Bot's exact ID, source template version and language-specific JSON URL. Neither includes the visitor's search, favorites, account context or conversation.

An equivalent English request is:

```text
Read https://harzva.github.io/awesome-bot/llms.txt, then
https://harzva.github.io/awesome-bot/agents/en/status-report-writer.json.
Explain this role's inputs, outputs, prerequisites and requested permissions.
Help with my next task under your existing instructions. Reading is not
installation or permission to use tools. Verify the configuration SHA-256
before proposing an import into a compatible host.
```

If the Agent cannot retrieve links, provide the relevant Markdown as context through that Agent's normal attachment or paste flow. Do not claim it loaded a file it could not read. Selecting a role also does not prove that the Agent has the model, tools, sign-ins or execution environment that role requires.

## Verify before proposing an import

Read the current card and its `configuration` together. Download the Fleet bytes, check their length and SHA-256, and inspect the configuration before using the host's preview and confirmation flow. The following Node.js 22+ example only reads and verifies; it does not import or execute the configuration.

```js
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const base = 'https://harzva.github.io/awesome-bot/';
async function getJSON(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  assert.equal(response.status, 200);
  return response.json();
}

const discovery = await getJSON(`${base}agents/index.json`);
assert.equal(discovery.schema, 'awesome.bot.agent-discovery/1');
const language = discovery.languages.find(item => item.locale === 'en');
assert.ok(language);
const index = await getJSON(language.url);
const item = index.entries.find(entry => entry.id === 'awesome/status-report-writer');
assert.ok(item);
const card = await getJSON(item.json);
assert.equal(card.schema, 'awesome.bot.agent/1');
assert.equal(card.id, item.id);
assert.equal(card.locale, 'en');
assert.equal(card.contentRevision, index.contentRevision);

const response = await fetch(card.configuration.url, {
  signal: AbortSignal.timeout(10_000)
});
assert.equal(response.status, 200);
const bytes = Buffer.from(await response.arrayBuffer());
assert.equal(bytes.length, card.configuration.bytes);
assert.equal(createHash('sha256').update(bytes).digest('hex'),
  card.configuration.sha256);
console.log(card.id, card.templateVersion, card.locale, card.contentRevision);
```

Pages URLs describe the current publication and can change between releases. If a card and download disagree, stop and retrieve a consistent current set; do not waive a failed digest. For an archived snapshot, use the [versioned release](https://github.com/Harzva/awesome-bot/releases) and its checksums. A SHA-256 match establishes agreement with the published metadata, not independent authorship or a cryptographic signature. The catalogue remains unsigned.

Exports keep tools and containers off and do not transfer account connections, conversations or learned memory. Import requires host confirmation. In an empty OpenBot library, the host may select the first imported Bot as its primary Bot; primary-Bot management behavior follows the host's own rules. See [INTEGRATION.md](../INTEGRATION.md) before importing. Format and export checks do not certify real-account task execution.

## Discovery conventions and maintenance

The [llms.txt v2 proposal](https://llmstxt.org/) permits a file beneath a site subpath and recommends `describedby` and Markdown `alternate` links. This is a proposal, not a guarantee that every Agent discovers or follows it automatically. Awesome Bot uses `/awesome-bot/llms.txt`, with HTML links to that guide and `index.md`, because this GitHub Pages project controls that subpath.

The files are generated by [agent-surface.mjs](../scripts/agent-surface.mjs) during [build-site.mjs](../scripts/build-site.mjs), from the same localized catalogue used by the UI. Run `npm run check`, `npm test` and `npm run build:site`; inspect the generated indexes, card links and download digests. Before claiming a deployment works, repeat discovery and byte verification against the published URLs. Source code and an example command alone are not deployment evidence.
