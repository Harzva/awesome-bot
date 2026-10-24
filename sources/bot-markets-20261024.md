# Bot市场来源与覆盖清单

固定检查日：**2026-10-24**。范围仅为本轮发现的21个非fork仓库；这是有界核查，不代表GitHub全部Bot市场。

共享目录共 **17,044** 个规范化URL入口：x.ai分享链接 **5,812**、TemplatesGrokBot 原站入口 **10,464**、未适配来源文件 **768**；共 **12** 个实际被条目引用的数据来源。来源文件入口不代表已适配或可安装。

按URL去重得到入口数量，不是全球唯一Bot数。同名不同URL保留；相同分享ID合并来源。不同仓库可能复用同一角色。没有逐条联网验证链接，也没有安装或运行这些Bot。共享目录shared-bots.json的条目仅含名称、作者、分类、URL及溯源，不复制原文简介、提示词、技能或例行任务；另行适配的223个角色模板按各自来源许可处理。

## 21源核查与处理

| 仓库 | 固定SHA | 许可范围 | 实际计数单位 | 处理与跳过理由 |
|---|---|---|---|---|
| [majiayu000/awesome-grok-bot](https://github.com/majiayu000/awesome-grok-bot/tree/c9e5c6c2f2ff9c9fb1a0c55bcbb10a8523c19f7c) | `c9e5c6c2f2ff9c9fb1a0c55bcbb10a8523c19f7c` | CC0-1.0 catalog/recipes; MIT scripts | 5700；catalog entries; separately 6 PROFILE.md recipes | Covered by five-source 16788-entry collection, including fixed-SHA source-file fallbacks. |
| [RongleCat/awesome-grok-bot](https://github.com/RongleCat/awesome-grok-bot/tree/e50ac2f8dd2f5fe83827bf2a2b9f70e50d893be1) | `e50ac2f8dd2f5fe83827bf2a2b9f70e50d893be1` | CC0-1.0 (direct LICENSE; API NOASSERTION) | 2183资源条目+272活动；另10个独立命名角色配方 | shared来源 ronglecat：19条源记录，关联19个入口；resource discovery; filter exact Bot share URLs；Extracted10 distinct named Bot role sections from prompts/playbook-prompts.md plus exact x.ai Bot links from catalog. Remaining catalog items/events are general resources. |
| [Anil-matcha/awesome-grok-bot](https://github.com/Anil-matcha/awesome-grok-bot/tree/a426143ab24476affa5d0c5a4efb4274f57a91ff) | `a426143ab24476affa5d0c5a4efb4274f57a91ff` | README says MIT; no standalone LICENSE | 182；### role headings | shared来源 anil-matcha：182条源记录，关联182个入口；hold_full_prompt_import_pending_license_scope_review |
| [mergisi/awesome-grokbot](https://github.com/mergisi/awesome-grokbot/tree/6210f2034c5737d1be100e227c8d308d9757ecf4) | `6210f2034c5737d1be100e227c8d308d9757ecf4` | CC0-1.0 | 56；bots.json entries; 56 matching PROFILE.md files | Covered by existing three-source 223-role integration; no duplicate collection. |
| [cobusgreyling/grok-bot-templates](https://github.com/cobusgreyling/grok-bot-templates/tree/4f3f28b4e6578cd227ff7f4b78ec91d15fd091b5) | `4f3f28b4e6578cd227ff7f4b78ec91d15fd091b5` | MIT | 49；templates; separately 10 teams, 47 skills, 8 routines, 12 patterns | Covered by existing three-source 223-role integration; no duplicate collection. |
| [cs68614-hash/awesome-grokbot-templates](https://github.com/cs68614-hash/awesome-grokbot-templates/tree/aca17fa5f076ea447e0929b72ea7fb79d34889ff) | `aca17fa5f076ea447e0929b72ea7fb79d34889ff` | CC0-1.0 | 4825；templates[] rows and 4825 unique README share links | Covered by five-source 16788-entry collection, including fixed-SHA source-file fallbacks. |
| [lroolle/awesome-grokbot-templates](https://github.com/lroolle/awesome-grokbot-templates/tree/a12c2684a994b17647841b882d89d27550323805) | `a12c2684a994b17647841b882d89d27550323805` | CC0-1.0 (direct LICENSE; API NOASSERTION) | 158；unique x.ai/bot IDs in README | shared来源 lroolle：158条源记录，关联158个入口；sync_share_metadata_only |
| [sit-in/awesome-grokbot-playbooks](https://github.com/sit-in/awesome-grokbot-playbooks/tree/7fee143a20277b71e2946d7f19b1c83634a4f48b) | `7fee143a20277b71e2946d7f19b1c83634a4f48b` | MIT | 10；examples/*.md excluding _template.md; not 10 isolated Bot profiles | shared来源 sit-in：7条源记录，关联7个入口；adapt_selected_playbooks_as_team_recipes；Workflow/roster recipes, not isolated Bot personas; only exact Bot links considered. |
| [templatesgrokbot/templatesgrokbot.com](https://github.com/templatesgrokbot/templatesgrokbot.com/tree/6e28d3e3425549a8f831a37f3011b22f68de09a7) | `6e28d3e3425549a8f831a37f3011b22f68de09a7` | MIT own work; per-file source_license for adapted content | 10464；catalog templates[] rows | Covered by five-source 16788-entry collection, including fixed-SHA source-file fallbacks. |
| [elie222/botdirectory.ai](https://github.com/elie222/botdirectory.ai/tree/d62dd5850d64b0cead1acf461b35e5e0b28f4439) | `d62dd5850d64b0cead1acf461b35e5e0b28f4439` | MIT | 761；761 bots/*.md listings: 593 with prompt body, 168 description-only/empty body | Covered by five-source 16788-entry collection, including fixed-SHA source-file fallbacks. |
| [PramodDutta/botskills](https://github.com/PramodDutta/botskills/tree/ed17ebcead177b91dfca57d5df3d7c9872cb77fd) | `ed17ebcead177b91dfca57d5df3d7c9872cb77fd` | MIT | 118；seed-bots/*/BOT.md files | Covered by existing three-source 223-role integration; no duplicate collection. |
| [botskills/catalog](https://github.com/botskills/catalog/tree/34cab2db5596e69ba975f1c55494463898a4336f) | `34cab2db5596e69ba975f1c55494463898a4336f` | MIT | 4；skills/*/SKILL.md, not Bot personas | 4 skills, not individual Bot personas. |
| [codejunkie99/rosterroom](https://github.com/codejunkie99/rosterroom/tree/367a03cd5857adc2211c517c8d0d38e2505fd16f) | `367a03cd5857adc2211c517c8d0d38e2505fd16f` | MIT (direct LICENSE; API NOASSERTION) | 82；50 prompts/new/*.md + 32 prompts/rebuilt/*.md | 82 whole-team setup prompts, not 82 individual Bot profiles; no automatic roster splitting. |
| [ellelion/botteams](https://github.com/ellelion/botteams/tree/e478f8de0d6ee32b985dcb8c08d1d0fd5232bf9d) | `e478f8de0d6ee32b985dcb8c08d1d0fd5232bf9d` | MIT | 75；60 bots/*.md + 15 teams/*.md; team membership is not extra unique Bot count | shared来源 botteams：60条源记录，关联60个入口；priority_2_structured_team_import；Whole-team manifests excluded; 60 individual bots files inspected. |
| [x0ba/grok-bot-marketplace](https://github.com/x0ba/grok-bot-marketplace/tree/942073bec41b9bff4b692d9530e2a9bbc692d374) | `942073bec41b9bff4b692d9530e2a9bbc692d374` | 未检测到明确仓库许可；只保留事实元数据 | 0；no real catalog in inspected tree; home is TanStack welcome | No concrete Bot data corpus; scaffold/README only. |
| [wasabihu/grokbot-marketplace](https://github.com/wasabihu/grokbot-marketplace/tree/3d7f7f11bab9d45e9b971b7a5adfba6d2c4512c8) | `3d7f7f11bab9d45e9b971b7a5adfba6d2c4512c8` | 未检测到明确仓库许可；只保留事实元数据 | 90；catalog bots[] rows; English + Chinese | All90 exact marketplace IDs map individually to inventory localTemplateId among the original148. No new Bot counted. |
| [kydlikebtc/awesome-grokbot](https://github.com/kydlikebtc/awesome-grokbot/tree/724e2a9c0d7d27d7cb05b46b69e0fe4559adcc9a) | `724e2a9c0d7d27d7cb05b46b69e0fe4559adcc9a` | Per-row CC0-1.0 or CC-BY-4.0; scripts MIT | 4933；catalog entries[] | Covered by five-source 16788-entry collection, including fixed-SHA source-file fallbacks. |
| [smfworks/grok-bot-templates](https://github.com/smfworks/grok-bot-templates/tree/1cbf2c2858f0bcbd23f8c4ed9793914d99fa2d7a) | `1cbf2c2858f0bcbd23f8c4ed9793914d99fa2d7a` | MIT | 19；unique x.ai/bot IDs in README; 21 URL occurrences | shared来源 smfworks：21条源记录，关联19个入口；sync_share_metadata_only |
| [brokep/grok-bots-for-deepseek-harness](https://github.com/brokep/grok-bots-for-deepseek-harness/tree/f80c380d2f5f5fe5f1451fe275f4b1578bd7b998) | `f80c380d2f5f5fe5f1451fe275f4b1578bd7b998` | SEE README; no root LICENSE | 90；docs/index.json plugins[] | All90 exact marketplace IDs map individually to inventory localTemplateId among the original148. No new Bot counted. |
| [Ritesh-Root/grok-template](https://github.com/Ritesh-Root/grok-template/tree/c9fea8d818712844e4f2da9e66836d4169c8aef0) | `c9fea8d818712844e4f2da9e66836d4169c8aef0` | 未检测到明确仓库许可；只保留事实元数据 | 24；data/seed.json array rows | shared来源 ritesh-root：16条源记录，关联16个入口；12 exact share URLs already collected; 8 explicitly attributed mergisi seeds map by original repository and exact Bot ID to the 223-role source index; 4 HAEGONG source references remain. |
| [dadoedo/grok-bot-marketplace-plugin](https://github.com/dadoedo/grok-bot-marketplace-plugin/tree/4464ee89e4b9f8ce78b30ed5086b3de4849c4135) | `4464ee89e4b9f8ce78b30ed5086b3de4849c4135` | 未检测到明确仓库许可；只保留事实元数据 | 0；README only; scaffold in progress | No concrete Bot data corpus; scaffold/README only. |

Anil的MIT仅在README声明，未发现独立LICENSE；此处只引用元数据与来源，不据此复制第三方提示词。templatesgrokbot的自有工作为MIT，改编条目保留上游许可；kydlikebtc的描述许可逐行区分CC0与CC-BY。本目录未复制这些描述。API的NOASSERTION不代替实际LICENSE文本核查。

## shared来源摘要与复核算法

| sourceId | 仓库与数据路径 | 固定SHA | SHA256 | 算法 |
|---|---|---|---|---|
| majiayu000 | [majiayu000/awesome-grok-bot](https://raw.githubusercontent.com/majiayu000/awesome-grok-bot/c9e5c6c2f2ff9c9fb1a0c55bcbb10a8523c19f7c/catalog.json) · catalog.json | `c9e5c6c2f2ff9c9fb1a0c55bcbb10a8523c19f7c` | `9b00c2fba5957747587795df7e2b432dc5c79b2781ba70d08b2ba765c9259946` | SHA256 of exact file bytes |
| cs68614 | [cs68614-hash/awesome-grokbot-templates](https://raw.githubusercontent.com/cs68614-hash/awesome-grokbot-templates/aca17fa5f076ea447e0929b72ea7fb79d34889ff/data/templates.json) · data/templates.json | `aca17fa5f076ea447e0929b72ea7fb79d34889ff` | `86288ca416f93292e74521712039547e61f076262bfb29bd63e68cabfa37f087` | SHA256 of exact file bytes |
| kydlikebtc | [kydlikebtc/awesome-grokbot](https://raw.githubusercontent.com/kydlikebtc/awesome-grokbot/724e2a9c0d7d27d7cb05b46b69e0fe4559adcc9a/catalog.json) · catalog.json | `724e2a9c0d7d27d7cb05b46b69e0fe4559adcc9a` | `f6c4e82f4f45ee9ec8637bdbeee945a22e280149fdccee4e4cd6d66667ce60cf` | SHA256 of exact file bytes |
| templatesgrokbot | [templatesgrokbot/templatesgrokbot.com](https://raw.githubusercontent.com/templatesgrokbot/templatesgrokbot.com/6e28d3e3425549a8f831a37f3011b22f68de09a7/catalog.json) · catalog.json | `6e28d3e3425549a8f831a37f3011b22f68de09a7` | `dc95a17fde976a87c0a1b3a0481c88b32d2f670820eba90d2bcc9511bb36cc74` | SHA256 of exact file bytes |
| botdirectory | [elie222/botdirectory.ai](https://github.com/elie222/botdirectory.ai/tree/d62dd5850d64b0cead1acf461b35e5e0b28f4439/bots) · bots/*.md | `d62dd5850d64b0cead1acf461b35e5e0b28f4439` | `146868098640ad1b5e0e774ccbfc62b5cf1409aa45d4d51893757d1e90e58131` | SHA256 of sorted relative path + NUL + binary SHA256(file), concatenated |
| anil-matcha | [Anil-matcha/awesome-grok-bot](https://raw.githubusercontent.com/Anil-matcha/awesome-grok-bot/a426143ab24476affa5d0c5a4efb4274f57a91ff/README.md) · README.md | `a426143ab24476affa5d0c5a4efb4274f57a91ff` | `4b984c801317b329030c3ac38a7baf0d58d969105da3f60b98fc94ca79027743` | SHA256 of exact file bytes |
| ritesh-root | [Ritesh-Root/grok-template](https://raw.githubusercontent.com/Ritesh-Root/grok-template/c9fea8d818712844e4f2da9e66836d4169c8aef0/data/seed.json) · data/seed.json | `c9fea8d818712844e4f2da9e66836d4169c8aef0` | `0ddd64cda0c9301f36f83d46aa572fa4d57743e379ccc3b717f1928b226fe6ec` | SHA256 of exact file bytes |
| ronglecat | [RongleCat/awesome-grok-bot](https://github.com/RongleCat/awesome-grok-bot/tree/e50ac2f8dd2f5fe83827bf2a2b9f70e50d893be1) · data/catalog.json, prompts/playbook-prompts.md | `e50ac2f8dd2f5fe83827bf2a2b9f70e50d893be1` | `4cc0ae8dbd1275849c3e840e4c89749ac3fc92229419e41bb16b0b62ea075ae5` | SHA256 of concatenated sorted UTF-8 relative path + NUL + binary SHA256(file bytes) |
| botteams | [ellelion/botteams](https://github.com/ellelion/botteams/tree/e478f8de0d6ee32b985dcb8c08d1d0fd5232bf9d/bots) · bots/*.md | `e478f8de0d6ee32b985dcb8c08d1d0fd5232bf9d` | `3db33352e736d63e3b7bb06cc71e9ec3245a90302e0a839f09785b8115443af5` | SHA256 of concatenated sorted UTF-8 relative path + NUL + binary SHA256(file bytes) |
| lroolle | [lroolle/awesome-grokbot-templates](https://raw.githubusercontent.com/lroolle/awesome-grokbot-templates/a12c2684a994b17647841b882d89d27550323805/README.md) · README.md | `a12c2684a994b17647841b882d89d27550323805` | `f51868df06e7e00c6df2ded7424c39524bad4ac852080486c285790fff87da9b` | SHA256 of exact file bytes |
| sit-in | [sit-in/awesome-grokbot-playbooks](https://raw.githubusercontent.com/sit-in/awesome-grokbot-playbooks/7fee143a20277b71e2946d7f19b1c83634a4f48b/README.md) · README.md | `7fee143a20277b71e2946d7f19b1c83634a4f48b` | `d6506ec7512d24114e1a0154c9fda76c76a763db45dbf9d5ca28848973c8a0b3` | SHA256 of exact file bytes |
| smfworks | [smfworks/grok-bot-templates](https://raw.githubusercontent.com/smfworks/grok-bot-templates/1cbf2c2858f0bcbd23f8c4ed9793914d99fa2d7a/README.md) · README.md | `1cbf2c2858f0bcbd23f8c4ed9793914d99fa2d7a` | `7818b8ea2c6a7a5463161e75921199ad5c2d102edc98b4475b3cc98975baa11e` | SHA256 of exact file bytes |

单文件摘要使用原始文件字节。集合按相对路径排序，逐项串联UTF-8路径、NUL字节、该文件SHA256的32字节二进制摘要，再对串联结果取SHA256。botdirectory覆盖761个bots/*.md；botteams覆盖60个bots/*.md；RongleCat集合仅含data/catalog.json与prompts/playbook-prompts.md。新增来源文件均与固定Git树blob SHA核对。

## 395条已有覆盖证据

**207条**URL已在shared，均已合入entry.sources与entry.sourceRecords，保留原记录ID：

| 来源 | 合并源记录 |
|---|---:|
| Ritesh-Root/grok-template | 12 |
| RongleCat/awesome-grok-bot | 9 |
| lroolle/awesome-grokbot-templates | 158 |
| sit-in/awesome-grokbot-playbooks | 7 |
| smfworks/grok-bot-templates | 21 |

另 **188条**不重复建shared入口：wasabihu与brokep各90条按marketplace ID映射原148库存；Ritesh8条明确来自已适配mergisi角色。原148和新增223的独立角色适配不表示导入原Bot配置。

### 90个官方marketplace ID的双来源映射

| marketplace ID | 原有localTemplateId | wasabihu recordId | brokep recordId |
|---|---|---|---|
| account-book | awesome/grok-account-book | account-book | dsh-plugin-grok-account-book |
| account-research | awesome/grok-account-research | account-research | dsh-plugin-grok-account-research |
| ai-search-visibility | awesome/grok-ai-search-visibility | ai-search-visibility | dsh-plugin-grok-ai-search-visibility |
| alfred | awesome/grok-alfred | alfred | dsh-plugin-grok-alfred |
| apple-search-ads-review | awesome/grok-apple-search-ads-review | apple-search-ads-review | dsh-plugin-grok-apple-search-ads-review |
| best-video-editor | awesome/grok-best-video-editor | best-video-editor | dsh-plugin-grok-best-video-editor |
| call-follow-ups | awesome/grok-call-follow-ups | call-follow-ups | dsh-plugin-grok-call-follow-ups |
| chief-health | awesome/grok-chief-health | chief-health | dsh-plugin-grok-chief-health |
| clip-bot | awesome/grok-clip-bot | clip-bot | dsh-plugin-grok-clip-bot |
| company-docs-q-a | awesome/grok-company-docs-q-a | company-docs-q-a | dsh-plugin-grok-company-docs-q-a |
| competitor-watching | awesome/grok-competitor-watching | competitor-watching | dsh-plugin-grok-competitor-watching |
| cooper | awesome/grok-cooper | cooper | dsh-plugin-grok-cooper |
| credit-card-max | awesome/grok-credit-card-max | credit-card-max | dsh-plugin-grok-credit-card-max |
| critiquito | awesome/grok-critiquito | critiquito | dsh-plugin-grok-critiquito |
| customer-call-coach | awesome/grok-customer-call-coach | customer-call-coach | dsh-plugin-grok-customer-call-coach |
| customer-question-drafter | awesome/grok-customer-question-drafter | customer-question-drafter | dsh-plugin-grok-customer-question-drafter |
| customer-stories | awesome/grok-customer-stories | customer-stories | dsh-plugin-grok-customer-stories |
| dan-lanning | awesome/grok-dan-lanning | dan-lanning | dsh-plugin-grok-dan-lanning |
| deal-hunting | awesome/grok-deal-hunting | deal-hunting | dsh-plugin-grok-deal-hunting |
| deal-qualification | awesome/grok-deal-qualification | deal-qualification | dsh-plugin-grok-deal-qualification |
| dial-bot | awesome/grok-dial-bot | dial-bot | dsh-plugin-grok-dial-bot |
| distro-bot | awesome/grok-distro-bot | distro-bot | dsh-plugin-grok-distro-bot |
| dr-eggbot-v2 | awesome/grok-dr-eggbot-v2 | dr-eggbot-v2 | dsh-plugin-grok-dr-eggbot-v2 |
| ebr-value-deck-builder | awesome/grok-ebr-value-deck-builder | ebr-value-deck-builder | dsh-plugin-grok-ebr-value-deck-builder |
| echo | awesome/grok-echo | echo | dsh-plugin-grok-echo |
| engineer-bot | awesome/grok-engineer-bot | engineer-bot | dsh-plugin-grok-engineer-bot |
| engineering-lead | awesome/grok-engineering-lead | engineering-lead | dsh-plugin-grok-engineering-lead |
| event-producer | awesome/grok-event-producer | event-producer | dsh-plugin-grok-event-producer |
| event-request-desk | awesome/grok-event-request-desk | event-request-desk | dsh-plugin-grok-event-request-desk |
| figma-bro | awesome/grok-figma-bro | figma-bro | dsh-plugin-grok-figma-bro |
| flora | awesome/grok-flora | flora | dsh-plugin-grok-flora |
| follow-through-agent | awesome/grok-follow-through-agent | follow-through-agent | dsh-plugin-grok-follow-through-agent |
| frank | awesome/grok-frank | frank | dsh-plugin-grok-frank |
| fuse | awesome/grok-fuse | fuse | dsh-plugin-grok-fuse |
| haggle-bot | awesome/grok-haggle-bot | haggle-bot | dsh-plugin-grok-haggle-bot |
| hiring-activity-monitor | awesome/grok-hiring-activity-monitor | hiring-activity-monitor | dsh-plugin-grok-hiring-activity-monitor |
| home-robots | awesome/grok-home-robots | home-robots | dsh-plugin-grok-home-robots |
| human-copywriter | awesome/grok-human-copywriter | human-copywriter | dsh-plugin-grok-human-copywriter |
| image-gen-bot | awesome/grok-image-gen-bot | image-gen-bot | dsh-plugin-grok-image-gen-bot |
| imogen | awesome/grok-imogen | imogen | dsh-plugin-grok-imogen |
| import-bot | awesome/grok-import-bot | import-bot | dsh-plugin-grok-import-bot |
| last30days | awesome/grok-last30days | last30days | dsh-plugin-grok-last30days |
| leadsworth | awesome/grok-leadsworth | leadsworth | dsh-plugin-grok-leadsworth |
| love | awesome/grok-love | love | dsh-plugin-grok-love |
| luma-pages | awesome/grok-luma-pages | luma-pages | dsh-plugin-grok-luma-pages |
| market-researcher | awesome/grok-market-researcher | market-researcher | dsh-plugin-grok-market-researcher |
| marketing-analyst | awesome/grok-marketing-analyst | marketing-analyst | dsh-plugin-grok-marketing-analyst |
| marketing-project-manager | awesome/grok-marketing-project-manager | marketing-project-manager | dsh-plugin-grok-marketing-project-manager |
| mr-toms | awesome/grok-mr-toms | mr-toms | dsh-plugin-grok-mr-toms |
| nightly-audit-engineer | awesome/grok-nightly-audit-engineer | nightly-audit-engineer | dsh-plugin-grok-nightly-audit-engineer |
| nyc-parent | awesome/grok-nyc-parent | nyc-parent | dsh-plugin-grok-nyc-parent |
| office-ops-desk | awesome/grok-office-ops-desk | office-ops-desk | dsh-plugin-grok-office-ops-desk |
| overheard | awesome/grok-overheard | overheard | dsh-plugin-grok-overheard |
| performance-marketer | awesome/grok-performance-marketer | performance-marketer | dsh-plugin-grok-performance-marketer |
| pfp-bot | awesome/grok-pfp-bot | pfp-bot | dsh-plugin-grok-pfp-bot |
| pg | awesome/grok-pg | pg | dsh-plugin-grok-pg |
| pipeline-health-and-forecast | awesome/grok-pipeline-health-and-forecast | pipeline-health-and-forecast | dsh-plugin-grok-pipeline-health-and-forecast |
| pitch-deck-coach | awesome/grok-pitch-deck-coach | pitch-deck-coach | dsh-plugin-grok-pitch-deck-coach |
| pm-bot | awesome/grok-pm-bot | pm-bot | dsh-plugin-grok-pm-bot |
| product-idea-stress-test | awesome/grok-product-idea-stress-test | product-idea-stress-test | dsh-plugin-grok-product-idea-stress-test |
| product-marketer | awesome/grok-product-marketer | product-marketer | dsh-plugin-grok-product-marketer |
| projects-manager | awesome/grok-projects-manager | projects-manager | dsh-plugin-grok-projects-manager |
| prospector | awesome/grok-prospector | prospector | dsh-plugin-grok-prospector |
| proto-bot | awesome/grok-proto-bot | proto-bot | dsh-plugin-grok-proto-bot |
| qa-bot | awesome/grok-qa-bot | qa-bot | dsh-plugin-grok-qa-bot |
| researchy | awesome/grok-researchy | researchy | dsh-plugin-grok-researchy |
| sable-game-art | awesome/grok-sable-game-art | sable-game-art | dsh-plugin-grok-sable-game-art |
| sales-call-coach | awesome/grok-sales-call-coach | sales-call-coach | dsh-plugin-grok-sales-call-coach |
| seed-a91e4c | awesome/grok-seed-a91e4c | seed-a91e4c | dsh-plugin-grok-seed-a91e4c |
| sell-bot | awesome/grok-sell-bot | sell-bot | dsh-plugin-grok-sell-bot |
| seo-aeo-desk | awesome/grok-seo-aeo-desk | seo-aeo-desk | dsh-plugin-grok-seo-aeo-desk |
| sequencer | awesome/grok-sequencer | sequencer | dsh-plugin-grok-sequencer |
| sherlock | awesome/grok-sherlock | sherlock | dsh-plugin-grok-sherlock |
| signal-prospector | awesome/grok-signal-prospector | signal-prospector | dsh-plugin-grok-signal-prospector |
| site-audit | awesome/grok-site-audit | site-audit | dsh-plugin-grok-site-audit |
| skippy | awesome/grok-skippy | skippy | dsh-plugin-grok-skippy |
| stalk-bot | awesome/grok-stalk-bot | stalk-bot | dsh-plugin-grok-stalk-bot |
| startup-qa-bot | awesome/grok-startup-qa-bot | startup-qa-bot | dsh-plugin-grok-startup-qa-bot |
| tally | awesome/grok-tally | tally | dsh-plugin-grok-tally |
| tech-demos | awesome/grok-tech-demos | tech-demos | dsh-plugin-grok-tech-demos |
| the-morning-newspaper | awesome/grok-the-morning-newspaper | the-morning-newspaper | dsh-plugin-grok-the-morning-newspaper |
| tinkabot | awesome/grok-tinkabot | tinkabot | dsh-plugin-grok-tinkabot |
| tradbot-2 | awesome/grok-tradbot-2 | tradbot-2 | dsh-plugin-grok-tradbot-2 |
| video-editor | awesome/grok-video-editor | video-editor | dsh-plugin-grok-video-editor |
| warm-intro-finder | awesome/grok-warm-intro-finder | warm-intro-finder | dsh-plugin-grok-warm-intro-finder |
| webby | awesome/grok-webby | webby | dsh-plugin-grok-webby |
| website-ops | awesome/grok-website-ops | website-ops | dsh-plugin-grok-website-ops |
| writing-bot | awesome/grok-writing-bot | writing-bot | dsh-plugin-grok-writing-bot |
| wtd | awesome/grok-wtd | wtd | dsh-plugin-grok-wtd |
| x-brief | awesome/grok-x-brief | x-brief | dsh-plugin-grok-x-brief |

### Ritesh8条已有223角色映射

| Ritesh recordId | 已核对上游仓库 | 固定SHA与路径 |
|---|---|---|
| account-health | mergisi/awesome-grokbot | [bots/ops/account-health/PROFILE.md](https://github.com/mergisi/awesome-grokbot/blob/6210f2034c5737d1be100e227c8d308d9757ecf4/bots/ops/account-health/PROFILE.md) · `6210f2034c5737d1be100e227c8d308d9757ecf4` |
| chief-of-staff | mergisi/awesome-grokbot | [bots/ops/chief-of-staff/PROFILE.md](https://github.com/mergisi/awesome-grokbot/blob/6210f2034c5737d1be100e227c8d308d9757ecf4/bots/ops/chief-of-staff/PROFILE.md) · `6210f2034c5737d1be100e227c8d308d9757ecf4` |
| daily-brief | mergisi/awesome-grokbot | [bots/productivity/daily-brief/PROFILE.md](https://github.com/mergisi/awesome-grokbot/blob/6210f2034c5737d1be100e227c8d308d9757ecf4/bots/productivity/daily-brief/PROFILE.md) · `6210f2034c5737d1be100e227c8d308d9757ecf4` |
| expense-manager | mergisi/awesome-grokbot | [bots/ops/expense-manager/PROFILE.md](https://github.com/mergisi/awesome-grokbot/blob/6210f2034c5737d1be100e227c8d308d9757ecf4/bots/ops/expense-manager/PROFILE.md) · `6210f2034c5737d1be100e227c8d308d9757ecf4` |
| inbox-triage | mergisi/awesome-grokbot | [bots/productivity/inbox-triage/PROFILE.md](https://github.com/mergisi/awesome-grokbot/blob/6210f2034c5737d1be100e227c8d308d9757ecf4/bots/productivity/inbox-triage/PROFILE.md) · `6210f2034c5737d1be100e227c8d308d9757ecf4` |
| meeting-prep | mergisi/awesome-grokbot | [bots/sales/meeting-prep/PROFILE.md](https://github.com/mergisi/awesome-grokbot/blob/6210f2034c5737d1be100e227c8d308d9757ecf4/bots/sales/meeting-prep/PROFILE.md) · `6210f2034c5737d1be100e227c8d308d9757ecf4` |
| subscription-pruner | mergisi/awesome-grokbot | [bots/personal/subscription-pruner/PROFILE.md](https://github.com/mergisi/awesome-grokbot/blob/6210f2034c5737d1be100e227c8d308d9757ecf4/bots/personal/subscription-pruner/PROFILE.md) · `6210f2034c5737d1be100e227c8d308d9757ecf4` |
| talent-scout | mergisi/awesome-grokbot | [bots/sales/talent-scout/PROFILE.md](https://github.com/mergisi/awesome-grokbot/blob/6210f2034c5737d1be100e227c8d308d9757ecf4/bots/sales/talent-scout/PROFILE.md) · `6210f2034c5737d1be100e227c8d308d9757ecf4` |

映射以sources/grok-inventory.json内90个marketplaceBots的明确ID、URL与localTemplateId为证据，不凭原库存总数148推断。Ritesh8条依据其明确上游mergisi仓库及精确Bot ID，匹配该固定SHA的bots.json路径。剩余4条HAEGONG种子使用Ritesh固定JSON真实行号入口。

## 数量解释与边界

shared来源原始记录27,186；表示在shared的源记录27,146；URL去重入口17,044；合并重复记录10,102；过滤非具体Bot链接32；另有已在223角色覆盖的Ritesh记录8。wasabihu/brokep的180条原库存映射仅保留在本清单，不进入shared.sources。

82个rosterroom团队包、botteams15个团队清单及sit-in10个工作流配方不自动拆为独立Bot；botskills/catalog的4个技能不算Bot；x0ba与dadoedo为脚手架。只采集已公开目录；未使用付费服务或非公开数据。
