# 从一个任务开始

<!-- Generated from data/scenarios/*.json; run npm run build. -->

先选一个与你当前目标相符的场景，只下载需要的少量 Bot。场景包沿用目录中的同一份模板，不创建另一套人设。提示词和操作说明目前为中文。

## 下载后怎么开始

1. 下载场景配置包，在 OpenBot 的配置导入入口预览并确认。先检查 Bot 名称及数量；有同名项时按宿主提示处理。
2. 选择要使用的模型；按实际任务连接需要的资料、工具和账号。下载或导入不会启动任务，也不会授予工具、容器或账号权限。
3. 打开该场景的第一个 Bot，复制首个任务，把方括号占位内容替换为你已获准提供的资料，并附上准备材料，确认后发送。材料不完整时，先让 Bot 列出需要补充的内容。
4. 审阅第一步的产物，再由你把已确认材料交给下一步 Bot。场景是人手交接的使用建议，不会自动编排或执行。

普通 Bot 的导出配置默认关闭工具与容器。空库导入时，宿主可能把第一个 Bot 选为主 Bot；主 Bot 的管理能力遵循宿主现有规则，确认后再使用。详见 [导入与权限说明](INTEGRATION.md)。

这些模板通过格式和导出检查，尚未逐项完成真实账号任务认证。外部操作仍取决于宿主、模型、连接的工具和用户授权；发送、发布或变更资源前审阅实际内容。

## 选择场景

| 目标 | Bot 数量 | 直接开始 |
| --- | --- | --- |
| [复现缺陷并安排复验](#bug-retest) | 2 | [在市场中查看](https://harzva.github.io/awesome-bot/?scenario=bug-retest) · [下载配置](https://harzva.github.io/awesome-bot/exports/scenario-bug-retest.fleet.json) |
| [准备客户会谈](#customer-meeting) | 2 | [在市场中查看](https://harzva.github.io/awesome-bot/?scenario=customer-meeting) · [下载配置](https://harzva.github.io/awesome-bot/exports/scenario-customer-meeting.fleet.json) |
| [把反馈整理成需求](#feedback-to-requirements) | 2 | [在市场中查看](https://harzva.github.io/awesome-bot/?scenario=feedback-to-requirements) · [下载配置](https://harzva.github.io/awesome-bot/exports/scenario-feedback-to-requirements.fleet.json) |
| [准备产品上市材料](#product-launch) | 2 | [在市场中查看](https://harzva.github.io/awesome-bot/?scenario=product-launch) · [下载配置](https://harzva.github.io/awesome-bot/exports/scenario-product-launch.fleet.json) |
| [写一份有证据的周报](#weekly-report) | 1 | [在市场中查看](https://harzva.github.io/awesome-bot/?scenario=weekly-report) · [下载配置](https://harzva.github.io/awesome-bot/exports/scenario-weekly-report.fleet.json) |

<a id="bug-retest"></a>
## 复现缺陷并安排复验

把问题反馈转成最小复现，再核对受影响的关键路径和上线阻塞。

### 准备材料

- 问题描述、预期行为、发生频率和最小输入
- 指定代码或可测试版本、平台及环境信息
- 允许使用的测试环境、数据、账号与界面
- 核心用户任务、上线条件和已知修复

### 预期交付

- 最小复现步骤、日志及环境信息
- 已证实情况与待验证的定位假设
- 关键路径检查记录、上线阻塞和复验顺序

### 按顺序使用

#### 1. [缺陷复现工程师](https://harzva.github.io/awesome-bot/?scenario=bug-retest&bot=awesome%2Fbug-reproduction)

```text
请先帮助复现这个缺陷。问题与预期行为：[填写]；指定版本和平台：[填写]；最小输入或样本：[提供获准数据]；允许的测试环境与操作范围：[填写]。记录实际与预期差异，逐步缩减触发条件，保留日志和环境信息，区分已证实原因与假设。没有必要工具或环境时说明缺口，提供可由我执行的步骤，不声称已完成复现。
```

交接：由我核对复现证据，把可重复步骤、影响范围和已确认修复交给创业产品质量检查员。

#### 2. [创业产品质量检查员](https://harzva.github.io/awesome-bot/?scenario=bug-retest&bot=awesome%2Fgrok-startup-qa-bot)

```text
基于以下已核对的缺陷复现和修复信息，检查受影响的核心用户路径并安排复验。复现与修复：[粘贴]；可测试版本和核心任务：[填写]；上线条件、测试账号与获准界面操作范围：[填写]。记录正常、空白和错误路径中的真实发现，列上线阻塞及逐项复验方法；未实际操作或未验证的项目明确标为待检查，不访问未授权环境。
```

交接：由我和发布负责人审阅检查证据、阻塞与复验结果，决定是否满足上线条件。


<a id="customer-meeting"></a>
## 准备客户会谈

先核对公司背景，再整理这次会谈的议程、证据和待确认问题。

### 准备材料

- 目标公司、研究目的及产品适配条件
- 获准使用的公司资料、来源和历史沟通记录
- 会谈目标、参会人、产品资料和可承诺范围

### 预期交付

- 注明来源与日期的公司研究简报
- 区分事实和假设的需求信号
- 一页会前简报、议程、问题清单和材料待办

### 按顺序使用

#### 1. [客户研究专员](https://harzva.github.io/awesome-bot/?scenario=customer-meeting&bot=awesome%2Faccount-research-specialist)

```text
我要为客户会谈准备公司研究简报。目标公司与研究目的：[填写]；产品及适配条件：[填写]；获准资料与来源：[粘贴或提供已授权位置]。核对公司主体、业务和近期变化，注明来源与日期；把事实、需求信号和购买假设分开。资料不足时先列待补信息，不声称访问了未连接的来源。
```

交接：由我核对简报，将已确认的背景、需求信号和待核实假设交给销售会前准备员。

#### 2. [销售会前准备员](https://harzva.github.io/awesome-bot/?scenario=customer-meeting&bot=awesome%2Fmeeting-prep-buddy)

```text
请结合以下已审阅的公司研究简报、历史沟通、参会人和会议目标，准备一页会前简报、议程、关键问题和材料待办。公司研究简报：[粘贴]；参会人及会议目标：[填写]；产品证据和可承诺范围：[填写]。区分客户事实、我们的假设和需要内部确认的承诺，不替我发送消息或安排会议。
```

交接：由我审阅会前材料并确认承诺范围，再用于实际会谈。


<a id="feedback-to-requirements"></a>
## 把反馈整理成需求

先识别反馈主题和用户影响，再归并成可追踪、待澄清的需求清单。

### 准备材料

- 获准使用的反馈、工单及其时间和来源
- 产品与用户分组、已知问题和近期变更
- 已有需求库及需求关联信息

### 预期交付

- 保留原始证据的反馈主题与用户任务
- 归并去重的需求清单和影响范围
- 验证建议与待澄清问题，不承诺开发排期

### 按顺序使用

#### 1. [产品反馈分析员](https://harzva.github.io/awesome-bot/?scenario=feedback-to-requirements&bot=awesome%2Fproduct-feedback-analyst)

```text
请分析这批获准反馈。反馈记录及来源时间：[粘贴]；产品与用户分组：[填写]；已知问题和近期变更：[填写]。按用户情境、目标、阻碍和影响归并主题，保留原始证据与矛盾反馈，说明样本覆盖和缺失信息。给出可验证改进建议，不直接承诺开发排期。
```

交接：由我检查主题与原始记录的对应关系，将已确认主题和证据交给功能请求跟踪员。

#### 2. [功能请求跟踪员](https://harzva.github.io/awesome-bot/?scenario=feedback-to-requirements&bot=awesome%2Ffeature-request-tracker)

```text
把以下已审阅的反馈主题与原始证据整理为需求清单。反馈主题与证据：[粘贴]；已有需求库：[提供获准记录]；客户和产品分组：[填写]。合并重复诉求并关联已有需求，保留具体问题场景、影响范围和待澄清问题。区分需求事实与优先级建议，不代替产品负责人承诺排期或更改需求库。
```

交接：由我和产品负责人审阅需求、补充核实信息，再决定优先级与是否落库。


<a id="product-launch"></a>
## 准备产品上市材料

从客户问题和产品证据组织定位，再倒排素材、审核和渠道发布日历。

### 准备材料

- 目标客群、需求证据与替代方案
- 产品能力、限制和可以证明的差异
- 上市目标、截止时间、已有素材和渠道
- 制作、审核负责人及不可移动的节点

### 预期交付

- 定位和价值表述、受众信息矩阵
- 上市内容需求及验证计划
- 营销日历、依赖冲突和检查点

### 按顺序使用

#### 1. [产品定位与上市策划员](https://harzva.github.io/awesome-bot/?scenario=product-launch&bot=awesome%2Fgrok-product-marketer)

```text
请为产品上市准备定位草案。目标客群与需求证据：[填写]；产品能力、限制和差异证据：[填写]；上市目标与已有素材：[填写]。把客户任务、替代方案与可证明的价值对应，组织受众信息和内容需求；未证明的主张保留为假设，列出后续验证计划，不编造客户证言或效果数据。
```

交接：由我审阅定位与证据，将已确认的受众信息、内容需求和验证计划交给营销排期管理员。

#### 2. [营销排期管理员](https://harzva.github.io/awesome-bot/?scenario=product-launch&bot=awesome%2Fmarketing-calendar-owner)

```text
请按以下已审阅的上市内容需求倒排营销日历。定位与内容需求：[粘贴]；上市目标及截止时间：[填写]；渠道与素材清单：[填写]；制作和审核负责人、固定节点：[填写]。标出制作、审核和渠道依赖、资源冲突与缺口，为每项记录负责人和检查点。仅准备可审阅计划，不替我发布内容、发送消息或承诺未确认日期。
```

交接：由我和相关负责人确认日历、资源与审核安排，再按已授权流程执行发布。


<a id="weekly-report"></a>
## 写一份有证据的周报

用一个 Bot 把项目产物、验证和阻塞整理成清楚的状态报告草稿。

### 准备材料

- 本周报告周期、项目目标和里程碑
- 已完成产物、测试结果与验收记录
- 正在进行的事项、阻塞和计划变更
- 下阶段计划、待决策问题和负责人

### 预期交付

- 区分已交付、待验收、进行中和受阻的周报草稿
- 有证据的风险说明与决策请求
- 下一阶段行动与负责人

### 按顺序使用

#### 1. [进度报告编辑](https://harzva.github.io/awesome-bot/?scenario=weekly-report&bot=awesome%2Fstatus-report-writer)

```text
请根据以下项目事实写本周状态报告草稿。报告周期、目标与里程碑：[填写]；产物、测试和验收记录：[粘贴]；进行中事项、阻塞和计划变更：[填写]；下阶段行动与待决策问题：[填写]。分清已交付、待验收、进行中和受阻，给结论保留证据，明确偏差、风险和所需决策；没有证据的进展保留未知，不把测试通过写成业务已验收。
```

交接：由我核对证据、负责人和决策请求，修改确认后再向相应读者发送。

## 继续探索或反馈

[浏览全部 Bot](https://harzva.github.io/awesome-bot/) · [完整目录](CATALOGUE.md) · [贡献指南](CONTRIBUTING.md)
