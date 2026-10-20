# Awesome Bot

有来源、能看清职责、能下载配置的 Bot 市场。

[浏览市场](https://harzva.github.io/awesome-bot/) · [完整目录](CATALOGUE.md) · [English](README.md) · [投稿](CONTRIBUTING.md) · [版本下载](https://github.com/Harzva/awesome-bot/releases)

首批包含 **90 个原创角色模板和 56 个任务工作流**，分别对应公开 Grok Marketplace 角色与用例。全部保留原作者和来源；本地人设、技能、流程与示例由 OpenBot 独立编写。实际执行取决于模型、工具、账号和用户授权。

网站支持中英文名称搜索、分类、角色/工作流切换、职责详情、浏览器收藏、单项或批量下载。可分享当前筛选或单个 Bot 链接，刷新及浏览器返回会恢复筛选和界面语言；收藏只保存在本机，分享链接不携带收藏筛选。加载失败可保留筛选重试，或转到 GitHub 目录。人设正文目前为中文，切换界面语言不会自动翻译人设。内容由同一组条目生成，独立克隆即可构建。

## 从当前任务开始

在[市场](https://harzva.github.io/awesome-bot/)选择场景，即可看到适用的 1–2 个 Bot、材料清单、可复制的首个任务和小份配置包。可以先试[准备客户会谈](https://harzva.github.io/awesome-bot/?scenario=customer-meeting)，完整步骤见自动生成的[首次使用指南](START_HERE.md)。每一步由你审阅产物并交给下一位 Bot；场景下载不会自动执行工作流。

单个 Bot 的详情也能复制已有任务示例、打开预填公开 ID/版本/来源的反馈表单。开始任务时补充自己的材料；公开反馈只填写可分享的复现信息。

## 下载与使用

- [90 个角色配置包](https://harzva.github.io/awesome-bot/exports/awesome-bot-roles.fleet.json)
- [56 个任务工作流](https://harzva.github.io/awesome-bot/exports/awesome-bot-workflows.fleet.json)
- [全部配置](https://harzva.github.io/awesome-bot/exports/awesome-bot-all.fleet.json)
- [市场索引](https://harzva.github.io/awesome-bot/registry/index.json)

在 OpenBot **设置 → 数据与同步 → 导入配置**选择下载文件，检查摘要后确认。导入以新增方式保留已有 Bot；模型、账号、工具另行配置。已有主 Bot 时，新增普通 Bot 未获工具/容器权限；空资料库会由宿主把首个 Bot 设为主 Bot，该角色具有组织管理能力。导入本身不会启动环境或任务。

网站只下载配置，不操作已安装 App，也不连接账号。通过格式和导入检查，不表示已完成逐角色真实任务验收。

## 本地开发

需要 Node.js 22 或更新版本，无运行时 npm 依赖。

```sh
git clone https://github.com/Harzva/awesome-bot.git
cd awesome-bot
npm ci
npm run check
npm run check:versions
npm test
npm run build:site
npm run serve
```

访问 `http://127.0.0.1:8765/awesome-bot/`。修改 `data/entries/` 中对应的一个 JSON 文件，再执行 `npm run build` 更新目录和摘要。

```sh
npm run market -- list --query=调研
npm run market -- info awesome/grok-researchy
npm run market -- plan awesome/grok-researchy --openbot=0.9.9 --allow-community --allow-unpinned
npm run market -- install awesome/grok-researchy --openbot=0.9.9 --allow-community --allow-unpinned --out=/tmp/researchy.fleet.json
```

当前目录未签名，CLI 保留对社区来源与缺少可信公钥的显式确认；摘要用于发现内容变化，不能替代身份验证。独立配置包导入可能再改 Bot ID，在宿主安装记录回写接通前不开放升级/回退，避免补丁误指原有 Bot。

## 贡献和维护

参阅[贡献说明](CONTRIBUTING.md)。每个条目提供职责、风格、材料、步骤、交付、边界、来源与许可；社区原创不要求来自 Grok。

PR 运行独立构建、格式与来源覆盖检查、导出和公开产物审计；Pages 从主分支构建，标签版本生成配置包和摘要。定期链接报告供维护者复核，不自动删除内容、不执行第三方插件。

项目借鉴 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 的目录、贡献与维护机制，保留自己的 Bot 语义和安装格式。见[参考检查表](docs/reference-benchmark.md)。本项目不生成虚假评分、热度或下载数。

原创内容采用 [MIT](LICENSE)。上游名称和引用归原权利人；详见[来源说明](SOURCE.md)与[第三方声明](THIRD_PARTY_NOTICES.md)。本项目独立于 xAI 和 DeepSeek。
