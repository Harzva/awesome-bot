# 插件市场 / Plugin marketplace

Awesome Bot 同时收录 Bot 模板和可执行插件。Bot 模板是角色配置；插件为已存在的 Bot 提供工具。两类资产共用网站导航，但保留各自的安装格式和权限边界。

Awesome Bot lists both Bot templates and executable plugins. A template describes a role; a plugin adds tools to an existing Bot. They share discovery, not installation or permission semantics.

## 使用 / Use

1. 打开 [插件市场](https://harzva.github.io/awesome-bot/plugins.html)，检查系统要求、版本、权限和限制。
2. DSH 插件选择“安装说明”，复制固定提交的 Git 安装地址，按该版本 README 在自己的 DSH 环境安装。支持自定义市场的客户端可以添加 `https://harzva.github.io/awesome-bot/dsh/index.json`。
3. OpenBot 桌面插件使用桌面插件管理器和对应发布目录，不能仅因含有 DSH 清单就当成独立 DSH 工具运行。
4. 配置宿主提供的连接、允许操作的对象和权限后再启用。网站不会接入账号、操作聊天或静默安装本机 Helper。

Open the plugin page, inspect requirements and expand the installation details. DSH bundles use a commit-pinned Git source; compatible clients can add the format-1 index above. Desktop plugins use the OpenBot desktop manager. Downloading a file does not enable tools or connect an account.

## DSH 格式 / DSH format

`dsh/index.json` 是官方 format 1 索引，使用 `@deepseek-ai/dsh-plugin-market-index` 0.2.1-rc.2 校验并生成安装参数。每条 DSH 记录包含包名、精确版本、GitHub HTTPS 仓库、40 位提交 SHA 和 DSH 引擎要求。它不把 Bot 的 `fleet.json` 冒充插件，也不要求插件发布到 npm。

The DSH index is validated with the official format-1 parser. Each version points to a public GitHub repository and a complete immutable commit ID. Plugin publication does not require npm; dependencies declared by a plugin may still be downloaded by the DSH package manager from their registries.

`plugins/catalogue.json` 是网站展示索引，另外包含平台、许可、下载包 SHA-256、权限说明和宿主兼容性。它不是 DSH 官方格式，也不是安装授权。Git SHA 和下载摘要用于追溯版本与核对字节，不代表发布者签名或真实任务验收。

The website catalogue includes desktop-host-only packages that are deliberately omitted from the DSH index. Hashes provide version and byte provenance, not publisher authentication or a real-account success claim.

## 微信插件 / WeChat plugin

独立仓库：[Harzva/dsh-wechat-usechat](https://github.com/Harzva/dsh-wechat-usechat)。适配器复用 UseChat，提供环境诊断、指定对话可见内容读取和受控文字发送。宿主必须提供配置与允许对话；发送默认关闭。原生 Helper 单独安装，屏幕和辅助功能权限由系统授权。使用远程视觉模型时，可见截图与 OCR 可能发送给所配置的模型。

The adapter reuses UseChat for setup diagnostics, visible-chat reading and controlled text submission. The host selects configuration and allowed chats. Writes start disabled. The native Helper and OS permissions require explicit setup. A remote vision provider may receive screenshots and OCR. This release does not claim full-history access, video-channel control or real WeChat message acceptance.

OpenBot 1.0.3 的 Agent 插件安装器原先仅支持 npm 源；Git 源需要对应的宿主适配更新。市场显示“需要 Git 安装适配”时，不应把网站下载当作已在当前 App 安装。普通 DSH 客户端可以按固定 Git 地址安装，仍需配置 Helper 与权限。

OpenBot's previously delivered Agent plugin installer accepted npm sources only. Git sources need the corresponding host adapter. A listing marked as requiring that adapter is not a claim that the currently installed App can complete that path. Standalone DSH supports the pinned Git installation route.

## 发布者 / Publishers

在 `data/plugins.json` 维护双语条目，保留上游作者与许可。先发布不可变 Git 提交及实际下载包，计算摘要，再更新索引。运行 `npm ci --ignore-scripts`、`npm run check`、`npm test`、`npm run build:site` 和 `npm run audit:public`。不要上传用户配置、聊天、模型凭据、运行锁或安装回执；已发布版本的包字节不能改写。

Maintain bilingual entries, retain upstream notices, publish immutable artifacts first, then update the catalogue. Run the repository checks before publication. Keep credentials, conversations and local installation state out of public artifacts. Never rewrite an existing released version.
