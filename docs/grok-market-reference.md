# Grok Bot market reference

Awesome Bot studies the public Grok Bot market's discovery and handoff patterns, while keeping its own role content, marks and OpenBot configuration format. This review covers public pages checked on 2026-10-20. It does not certify Grok Bot's runtime or reproduce its private configuration.

## What the public reference establishes

| Surface | Observed mechanism | Consequence for Awesome Bot |
| --- | --- | --- |
| [Marketplace](https://x.ai/bot/marketplace) | English creator/name search, categories, featured entries and separate detail/Add links | Keep identity, authorship, discovery and the next step close together |
| [Task directory](https://x.ai/bot/use-cases) | English job summaries with Add links | Describe an outcome a visitor can recognize |
| [Role guidance](https://docs.x.ai/grok-bot/use-cases) | English ownership, connected-source requirements and starter tasks | Translate complete role and first-task content, beyond interface labels |
| [Bot management](https://docs.x.ai/grok-bot/bots) | Editable avatar; shared-template preview, then Add/Import to create a copy, completed with the app | Distinguish role identity from creator attribution and preview from execution |
| [Documentation overview](https://docs.x.ai/grok-bot/overview) | Copy for LLM and Markdown entry points | Offer readable context beside human-facing details |
| [Documentation index](https://docs.x.ai/llms.txt) and [Docs MCP](https://docs.x.ai/developers/docs-mcp) | Text discovery and documented Agent access to documentation | Supply small discovery files and load detail only when needed |

An avatar setting does not establish that every market entry has a unique role logo. In three sampled detail pages—[dr eggbot](https://x.ai/bot/marketplace/bots/dr-eggbot-v2), [Outbound Prospecting](https://x.ai/bot/marketplace/bots/pg), and [Imogen](https://x.ai/bot/marketplace/bots/imogen)—the image links point into an asset directory named `img/creators`. That URL evidence cannot establish the depicted subject or prove uniqueness across all Bots. A visual review is a separate evidence step.

Awesome Bot's role marks are independently generated for its stable IDs. They identify these implementations, not an official upstream avatar or a source creator's portrait. Creator names and source links remain attribution fields. No upstream avatar, private memory, conversation, account connection or original persona is copied into these templates.

## Loading context and importing a template are separate

The official sharing documentation says a recipient previews a shared template on x.ai and uses the Grok Bot app to finish adding a copy. That does not establish a public marketplace API for arbitrary Agents to install or run Bots. The documented Docs MCP is for documentation access; its presence is not evidence of a Bot-template installation API. No such market API was verified in this review. [Official sharing and market instructions](https://docs.x.ai/grok-bot/bots), [Docs MCP scope](https://docs.x.ai/developers/docs-mcp).

Awesome Bot therefore offers **Copy for Agent** as a loading prompt. An Agent with link-reading capability can discover a language index, retrieve one Bot's Markdown or JSON, and inspect a Fleet download with its digest. Reading those files does not install or start a Bot, authorize external actions, connect accounts or grant tools. See [Agent integration](agent-integration.md) for the exact local file contract and verification example.

The [llms.txt v2 proposal](https://llmstxt.org/) supports path-scoped indexes and discovery links using `rel="describedby"` and `rel="alternate"` with a Markdown type. Awesome Bot follows those discovery conventions beneath its GitHub Pages project path. This remains a proposal and a useful reading convention, not universal Agent support or automatic execution.

## Independent content and evidence limits

English content is a localized projection of the same source role: translated names, responsibilities, materials, steps, persona, skills and first-task prompts, with separate localized configuration downloads. It does not rewrite previously published Chinese manifests. `templateVersion` identifies the canonical template; `locale`, `contentRevision` and a configuration digest identify the selected presentation and download.

Public source references explain why a role exists. They do not certify that OpenBot, a chosen Agent or its host can perform every upstream task. Keep declared requirements and requested permissions distinct from granted access, and distinguish format/export checks from a real-account task result. The generated files, UI checks and deployed downloads require their own acceptance evidence; this comparison is not that evidence.

The earlier 90-role inventory is a dated source snapshot. This review sampled the market and documentation for specific mechanisms; it did not repeat a complete census or test official imports, sign-in flows, copied templates or background execution. No upstream runtime or redistribution license is inferred from a public listing.

## Version 0.5 visual direction

The user selected the Grok Bot marketplace as the visual reference for this iteration. The marketplace and dr eggbot detail were revisited on 2026-10-20; workspace-local screenshots record the rendered reference separately from the authored site.

Awesome Bot adopts its neutral light surfaces, desktop category navigation, role-led card browsing and concise action hierarchy. The search, role identity, creator attribution and download are kept close together. Its own circular mark and original per-role SVGs remain. On phones the categories become a horizontal strip and cards use one column.

The reference has a Featured section; Awesome Bot does not have editorial selection or popularity evidence for such a section, so this iteration keeps the complete, filterable collection. Its primary action is labelled Download config because the website produces a file. In details, download, Agent-reading copy and first-task copy form the main action group; documentation, source, edit and sharing remain available as quieter resource links.
