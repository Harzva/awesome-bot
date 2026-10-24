# gitopsbot 操作手册

[English](gitopsbot-playbook.en.md) · 角色：`awesome/gitopsbot` · 版本：`1.0.0` · MIT / OpenBot contributors

这是将真实 GitHub → OpenBot/Grok → 飞书工作经验整理成的独立 OpenBot 角色。它负责事件通知接入、路由治理和证据交接。安装模板只创建角色配置，不附带监听器、安装脚本、账号、记忆或群发授权，也不会自动部署服务。执行新项目的外部写入仍需该项目授权和宿主审批；已经明确授权的准备与核验不必每步再次确认。

## 1. 首次引导先收哪些信息

先记录以下事实；没有连接时交付可审阅方案和缺口，不声称已上线：

- 仓库名单、事件范围、现有 relay/notifier，是否要求覆盖外部 fork。
- 飞书目标群与管理者、是否外部群、独立 Bot 类型；只问凭据是否已私下配置，不在聊天收真实 webhook URL、密钥、token 或私有日志。群 ID 是可用于目标定位的信息，不是凭据；公开包不包含实际群 ID。
- GitHub 权限：Webhook 管理权，还是仅 Actions/Secrets 写入权。读仓库不等于能安装 Webhook。
- 持续运行宿主、HTTPS 入口、真实 Node 版本/绝对路径、服务账户和停服负责人。云端服务可独立于 Mac 运行；分别验证服务实际在线与开机自启，不从 App 状态推断云端状态。
- 当前默认 provider、哪些 Bot 已在线、单投或明确选择的双投、可回滚的旧配置。
- 本次只准备，还是已授权配置、部署及代表测试消息；群内实际检查由谁完成。

输出一份匿名或私有的「仓库 → 事件 → provider → 群」映射。公开交付只保留占位符，不暴露真实仓库、群、宿主私有路径或配置值。

## 2. 按权限选事件入口，禁止轮询

| 条件 | 入口 | 认证和覆盖边界 |
| --- | --- | --- |
| 有仓库 Webhook 管理权 | 原生 GitHub Webhook | 先对收到的原始字节验证 `X-Hub-Signature-256` 的 HMAC-SHA256，再解析 JSON；严格仓库/事件名单；已认证 ping 只回执，不群发 |
| 有 Actions/Secrets 权限，没有 Webhook 管理权 | Actions 真实事件转发 | 受信任脚本读事件文件，POST 有界元数据到指定 HTTPS 路由，以独立 Bearer 认证；明确默认分支、fork Secrets、workflow 审批限制 |
| 两者都没有 | 配置草稿与权限缺口 | 不改成轮询，不借其他账号绕过；由有权管理员完成所需配置 |

事件清单至少评估：push（提交、分支与标签）、PR opened/edited/synchronize/reopened/ready/draft/closed、review submitted/edited/dismissed、PR issue comments、inline review comments、CI `workflow_run completed`、release published。只转发 PR 的 issue comments，排除自身 relay 和已有 notifier 的完成事件，防止通知触发通知。

`pull_request_target` 可用于可信默认分支中的只读转发，但不会让不可信 PR 变安全：**不 checkout、不运行 PR 代码、不下载其 artifacts**。不把标题、ref、正文插进 shell；最小化 `permissions`，纯 HTTP relay 通常可用 `permissions: {}`。fork review/comment 的 Secrets 与审批限制要实际核对；没有覆盖就明确记录，不能宣称全事件已接通。见 [GitHub 事件规则](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)、[Actions 安全](https://docs.github.com/en/actions/reference/security/secure-use)。

## 3. 固定消息契约，不让 LLM 改写

确定性格式示意（全部为虚构值）：

```text
gitops
ORG/PROJECT_A
pull_request · synchronize
fix: preserve original title
actor: contributor
ref: feature/example
sha: <commit-sha>
https://github.com/ORG/PROJECT_A/pull/123
```

固定 `gitops` 前缀位于每条消息开头，也可用作飞书关键词。标题保留原始字段，mention 和控制字符做中和、长度有界；状态另列，不编造结论。链接必须是 HTTPS GitHub URL，绑定当前允许仓库和正确的 PR/commit/workflow/release 路径；不信任 payload 的任意地址、群 ID 或凭据。省略完整正文、评论与 raw event。相同规范化输入应产生相同文本和冲突判断，通知路径不调用 LLM。

## 4. 飞书独立 Bot 与凭据

使用目标群中的独立 Bot，显示身份与其他提供方区分。外部群先核实独立自定义 Bot 是否受群管理策略支持；应用 Bot 的权限、群成员身份与自定义 Bot 的支持范围不同，不能从一种推断另一种。

如果启用关键词规则，每条实际消息包含固定 `gitops` 前缀；不要依赖某个测试标题碰巧命中。如果启用签名，按官方协议：秒级 timestamp；以 `timestamp + "\n" + signing secret` 为 HMAC-SHA256 密钥，对空串求签名，再 Base64；请求携带 timestamp/sign。GitHub raw-body 签名、relay Bearer 与飞书签名是三个独立认证层。见 [GitHub 签名](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)、[飞书自定义 Bot 协议](https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot)。

接收端凭据放私有配置，配置目录 `0700`、文件 `0600`；Actions 凭据放仓库 Secrets，不放普通变量。非敏感 provider selector 可放变量。服务账户只读必要源码与配置，写私有回执。不要通过聊天传递真实 webhook URL；它本身就是凭据。日志仅输出固定错误码、状态和非敏感计数，不输出请求体、凭据、提供方响应全文或配置内容。

## 5. 两个 Bot 在线与单一默认路由

OpenBot 和 Grok 可以同时在线。**默认每事件只选一个发送者**；在线状态不是发送路由。切回 Grok 或切到 OpenBot，只改变路由，不意味着另一 Bot 下线。

当前已验证 selector **只支持 `grok` / `openbot`**，没有 `both` 值，也没有自动故障切换。两 Bot 同时在线不需要修改路由。若明确需要双发，须另行实现并验证 fan-out 与每一路回执，不能仅设一个未经支持的 selector 值。

维护显式 selector、独立命名的两套 Secrets/接收地址及变更记录。切换前核对目标 provider 的凭据与路由；未知值或目标凭据缺失应报错，不能悄悄用旧 provider。避免 `condition && newSecret || oldSecret` 这类空值导致静默 fallback 的表达式，使用明确分支。只有用户明确选择双投递才启用，分别留回执和验收结果；不要因测试时两个 Bot 在线就自动双发。

## 6. 常驻宿主、持久投递与停止

需要独立后台可用性时选常驻云端。监听回环，通过同机 HTTPS 反代仅暴露必要 Webhook/relay 路由；认证不能只靠隐藏 URL。部署前核对服务器上实际 Node 版本与绝对路径，让 systemd 的 `ExecStart` 使用验证过的路径，不能假定交互 shell、Mac 与服务用户的 `node` 相同。模板不安装运行时或服务；下面只是配置契约：

```text
ExecStart=<verified-absolute-node> <reviewed-listener-entry> --config <private-config>
User=<dedicated-service-account>
```

接收端限制原始 body、读取时间、队列与并发；关闭时拒绝新发送、取消或有界等待进行中请求，保留未知回执。健康检查只查存活，不创建消息或模型调用。

以仓库和 delivery ID 生成稳定请求 ID。Actions 重跑保留相同 run ID，不用 run attempt 生成新 ID。持久 journal 和单写锁跨重启去重；相同 ID/相同内容返回原回执，内容冲突失败。进程在 `sending` 中断后转 `unknown`，不要盲重发；先核对提供方回执与群内消息。自定义 Bot 未提供 message ID 时，只保存明确的本地 receipt ID 与 provider acknowledgment，不能发明提供方 ID。

### 恢复锁需要停服维修

残留 `channel.lock.recovering` 应使预检和启动明确报恢复错误，而不是假称 listening。不要自动删锁：

1. 停止对应 systemd 单元，确认 inactive、主 PID 为零，没有手动启动的副本。
2. 由专用服务账户在私有终端检查 recovery guard 与正常 lock 的 host/PID、文件类型和私有权限。只有本机 host 匹配且探测返回 `ESRCH` 才证明 PID 不存在；活 PID、`EPERM`、远程 host、损坏记录或符号链接均先调查。
3. 私有完整备份 sender 状态目录；保留 journal、备份和两锁，核对权限。
4. 再确认无进程和记录未变，**仅条件删除已证实陈旧的 recovery guard**。不无条件 `rm`、不删 journal/正常 lock；让既有 dead-PID 恢复机制处理其余事项。
5. 重新预检、启动、查健康；不换 delivery ID 强行重发未知事件。

## 7. 操作验收矩阵

每行记录「已配置 / 本地通过 / 提供方受理 / 群内实际通过 / 未验」中的真实状态，保留日期和匿名 ID，勿用一个绿色总开关覆盖全部范围。

| 场景 | 接收/本地预期 | 提供方与群内预期 |
| --- | --- | --- |
| 正确签名与错误签名 | 正确 HMAC 才进入名单；反例拒绝且不调用 sender | 反例无消息 |
| 错仓库、错链接、超大 body | 拒绝，不发送；日志不含凭据/正文 | 群无消息 |
| push 与原始标题 | 固定前缀与字段、正确 commit 链接 | 业务受理后检查原文和独立 Bot 身份 |
| PR/commit/review/PR 评论/CI/release | 分别检查动作、路径、fork 限制和状态 | 每类逐项确认，未测明确标记 |
| 非 PR 评论与自身 notifier | 过滤，不调用 sender | 无通知环 |
| 同 ID 同内容 / 内容变化 | 原回执去重 / 明确冲突 | 同事件最多一条默认通知 |
| 发送后超时、进程重启 | unknown 不自动重发，持久状态保留 | 先核对群，不能从超时断言未送达 |
| 恢复锁残留 | 预检/启动明确失败，不监听、不发送 | 停服维修后再恢复 |
| provider 切换、缺所选 Secrets | 只走选定路由；缺失报错无 fallback | 单投；双投仅在明确选择时验 |
| API 2xx / 业务成功码 | 前者不替代后者；成功语义注明 accepted | 群内可见检查为第二层证据 |
| 正常停服与路由回滚 | 新发送停止、未知回执保留、旧配置可用 | 默认路由唯一，另一 Bot 可继续在线 |

## 8. 具体排障与回滚

- **HTTPS 主机/路径校验失败，尚未出网**：只看固定 scheme/host/path/port/token 格式错误码。对照私有配置确认粘贴目的地和 provider；不要将完整 URL 或 key 贴进聊天。修正所选项后再测，不能放宽名单或切到未选择 provider 掩盖错误。
- **HTTP 2xx 但群无消息**：先看业务成功码；检查独立 Bot 是否仍在正确群、关键词是否由固定 `gitops` 前缀命中、签名时间/密钥和群策略。2xx、业务受理与群内可见分别记录，不连续重发以“试出来”。
- **同 ID 返回 duplicate/unknown**：duplicate 核对原回执，unknown 查群和持久 journal。原请求可能已被接受，换 ID 重试会造成双发。
- **CI 通知不断触发通知**：检查 self/notifier 的 workflow_run 排除，不能靠每分钟限流掩盖环路。
- **交互 shell 可运行、systemd 启动失败**：核对真实 Node 路径/版本、服务用户权限、私有配置/状态和工作目录；不要复制本机路径到云端。

回滚先记录当前 selector 和回执检查点，确认旧 provider 配置仍有效，切回一个默认发送者，再用一个明确授权的代表事件验证单投。保持两 Bot 在线，不删除旧 Secrets、journal 或未知回执；不要让失败自动转发到另一 provider。若停止整个功能，停止监听服务/授权入口并保留恢复资料，这与单纯切换路由分开操作。

## 9. 经验范围与公开来源

2026-10-24 的匿名案例覆盖两个仓库的真实 push 链路、稳定 ID 重复投递去重与签名反例；本地检查还覆盖认证、链接/仓库名单、超时、重启、关闭和恢复锁诊断。公开记录不含真实仓库、群 ID、URL/密钥、私有配置位置或聊天。它不证明全部 PR、review、评论、CI、release 或 fork 场景已获真人验收；每个新项目仍按上表补证据。

同日复查 [Grok Marketplace](https://x.ai/bot/marketplace)、[Bot 管理](https://docs.x.ai/grok-bot/bots)与[用例](https://docs.x.ai/grok-bot/use-cases)：公开页面将角色职责、工具/来源和授权边界分开，市场提供发现与添加入口。这只是文本层参考，不证明运行时兼容、市场自动安装 API、账户迁移或后台可用性。没有复制官方 prompt、头像或私有配置。

协议以 [GitHub raw-body 验签](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)、[GitHub Actions 安全](https://docs.github.com/en/actions/reference/security/secure-use)、[事件规则](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)和[飞书自定义 Bot](https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot)为准；核对日期 2026-10-24。角色声明能力不等于实际授权或任务认证。
