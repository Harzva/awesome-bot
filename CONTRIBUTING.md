# Contributing / 贡献

Improve a useful Bot role or task workflow in one small, reviewable PR. Source links, precise responsibilities and honest verification matter more than popularity.

## One entry per file

Editable entries live in `data/entries/<slug>.json`. The filename matches the final part of `id`, for example `awesome/my-helper` → `my-helper.json`. Copy an existing entry as a complete example, then update its ID, name, author, purpose, working style, input/output, steps, skills, example, prerequisites and references.

Set `collection` to `bot-role` for a persistent role or `task-workflow` for a specific repeatable task. Provide `author: {name}`, an explicit `license` and a stable semantic `version`.

Community originals do **not** need Grok fields. Remove `upstreamMarketplaceId` and `upstreamUseCaseName` when copying an example for a new original. Only verified source adaptations use those mappings. References have `label` and HTTPS `url`; a known catalogue `source` is optional for a new source. Do not invent an official source or endorsement.

Human-facing content is currently Chinese. English names and source titles can remain searchable. Keep language declarations accurate.

## Content review

- Define a concrete responsibility and a useful output. Steps should describe how this role works, not generic promises.
- Show prerequisites and limitations, including unavailable account/tool connections.
- Use plain-text instructions and declarative skills only. No install hooks, executable scripts, credentials, sessions, private memory or conversations.
- Preserve source attribution. Do not copy prompts, images or code without an appropriate license.
- `permissions` declare needs; downloaded configurations do not grant them.
- Separate format checks from actual task evidence. A valid configuration is not a certified task result.

## Validate the PR

```sh
npm ci --ignore-scripts
npm run build
npm run check
npm test
npm run build:site
npm run audit:public
```

Commit the entry and regenerated `templates/`, `registry/` and `CATALOGUE.md` changes. CI uses Node 22 and 24. Include the concrete task, expected output, source/license and checks performed in your PR. Maintainers review scope, quality, permissions and provenance before merge.

For an update, increase the entry's semantic version. The build keeps existing published version files; never edit their bytes in place. Standalone downloads do not yet support applying an upgrade or rollback to an installed App because imported IDs need reconciliation.

## Suggestions and problems

Use the Bot submission or bug issue form. Keep account data, API keys, personal information and private task output out of public issues. Security concerns follow [SECURITY.md](SECURITY.md).

## 中文快速说明

一个 PR 修改一个或少量相关的 `data/entries/*.json`。角色与工作流分开声明；社区原创无需 Grok 来源映射。写清职责、材料、步骤、交付、边界和示例，保留作者、版本与许可。执行上面的构建和检查命令，连同生成物一并提交。不要提交账号、记忆、聊天、凭据、未授权复制内容或虚构的验收结果。
