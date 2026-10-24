# gitopsbot playbook

[中文](gitopsbot-playbook.md) · Role: `awesome/gitopsbot` · Version: `1.0.0` · MIT / OpenBot contributors

This independent OpenBot role captures practical GitHub → OpenBot/Grok → Feishu experience. It owns notification ingress, routing governance and evidence handoff. Installing the template creates role configuration only: no listener, install script, accounts, memory or group-send permission, and no automatic deployment. External writes in a new project still need that project's authorization and the host approval flow. Continue preparation and checks already authorized without asking again at every routine step.

## 1. First-use intake

Establish these facts first. Without a connection, prepare a reviewable plan and gaps rather than claiming deployment:

- Repository allowlist, events, current relays/notifiers and required external-fork coverage.
- Target Feishu group and administrator, external-group status and independent Bot type. Ask only whether credentials are privately configured; never collect real webhook URLs, keys, tokens or private logs in chat. A group ID identifies a destination and is not a credential; public packages contain no actual group IDs.
- GitHub rights: webhook administration or only Actions/Secrets access. Reading a repository does not imply permission to install a webhook.
- Always-on host, HTTPS ingress, actual Node version/absolute executable, service account and shutdown owner. Cloud services can run independently of a Mac; verify actual uptime and startup-on-boot separately, never inferring cloud state from the App.
- Current default provider, online Bots, single delivery or explicitly selected dual delivery, and retained rollback configuration.
- Whether the request authorizes preparation only or configuration, deployment and representative messages, and who will inspect the group.

Produce an anonymous or private repository → event → provider → group mapping. Public artifacts use placeholders rather than real repositories, groups, private host paths or configuration values.

## 2. Choose event ingress by permission; never poll

| Condition | Ingress | Authentication and coverage |
| --- | --- | --- |
| Repository webhook administration | Native GitHub webhook | Verify HMAC-SHA256 in `X-Hub-Signature-256` against raw received bytes before JSON parsing; allowlist repositories/events; authenticated ping only acknowledges, without a group message |
| Actions/Secrets access without webhook administration | Real Actions event relay | Trusted script reads the event file, POSTs bounded metadata to an approved HTTPS route with separate Bearer authentication; state default-branch, fork-secret and approval limits |
| Neither permission | Reviewable setup and permission gap | Do not substitute polling or borrow another account; an authorized administrator must configure the required access |

Evaluate push events (commits, branches and tags), PR opened/edited/synchronize/reopened/ready/draft/closed, review submitted/edited/dismissed, PR issue comments, inline review comments, CI `workflow_run completed` and release published. Forward only PR issue comments. Exclude the relay itself and existing notifier workflow completions so notifications cannot trigger more notifications.

`pull_request_target` can support read-only forwarding from a trusted default branch; it does not make an untrusted PR safe. **Never checkout/run PR code or download its artifacts.** Never interpolate titles, refs or bodies into shell commands. Minimize `permissions`; a pure HTTP relay can often use `permissions: {}`. Verify actual fork review/comment secret and approval restrictions, recording gaps rather than claiming full event coverage. See [GitHub event rules](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows) and [Actions security](https://docs.github.com/en/actions/reference/security/secure-use).

## 3. Fix the message contract; no LLM rewriting

Deterministic format example, using fictional values only:

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

Every message starts with the fixed `gitops` prefix, which can also satisfy a Feishu keyword rule. Preserve the original title field, neutralizing mentions/control characters and bounding length. Put status separately and invent no conclusions. Links must use HTTPS GitHub URLs bound to the approved repository and correct PR/commit/workflow/release path. Never trust arbitrary payload URLs, group targets or credentials. Omit full bodies, comments and raw events. Identical normalized input should produce identical text and conflict decisions; the notification path never calls an LLM.

## 4. Independent Feishu Bot and credentials

Use an independent Bot in the destination group, with an identity distinct from other providers. For an external group, verify custom-Bot support under its actual management policy. Application-Bot permissions/membership and custom-Bot availability are different; one does not establish the other.

If keyword protection is enabled, every real message must contain the fixed `gitops` prefix; do not depend on a test title accidentally matching. If signature protection is enabled, follow the official protocol: timestamp in seconds; HMAC-SHA256 the empty string using `timestamp + "\n" + signing secret` as the key, then Base64; include timestamp/sign in the request. GitHub raw-body signatures, relay Bearer authentication and Feishu signing are three separate layers. See [GitHub signatures](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries) and [Feishu custom-Bot protocol](https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot).

Receiver credentials belong in private configuration: directory `0700`, file `0600`. Actions credentials belong in repository Secrets, not ordinary variables. A non-sensitive provider selector can be a variable. The service account reads only required source/configuration and writes private receipts. Never transmit real webhook URLs through chat: the URL itself is a credential. Logs contain fixed error codes, states and non-sensitive counts, not payloads, credentials, complete provider responses or configuration contents.

## 5. Online Bots and one default route

OpenBot and Grok may both remain online. **Default to one sender per event.** Being online is not a delivery route. Routing back to Grok or over to OpenBot does not take the other Bot offline.

The verified selector **supports only `grok` / `openbot`**. There is no `both` value or automatic failover. Both Bots staying online requires no routing change. Explicit dual delivery needs separately implemented and verified fan-out and per-route receipts; setting an unsupported selector value cannot enable it.

Maintain an explicit selector, separately named credential/endpoint sets and a change record. Verify the selected provider before switching. Unknown values or missing selected secrets must fail, not silently use the previous provider. Avoid expressions such as `condition && newSecret || oldSecret`, which fall back when the new value is empty; use explicit branches. Enable dual delivery only when the user explicitly chooses it, with separate receipts and acceptance results. Two online Bots during testing do not authorize duplicate notifications.

## 6. Always-on host, durable delivery and stopping

Use an always-on cloud host when independent background availability is required. Bind the listener to loopback and expose required webhook/relay routes through a same-host HTTPS proxy. A hidden URL alone is not authentication. Verify the server's actual Node version and absolute executable, and use that path in systemd `ExecStart`; do not assume an interactive shell, a Mac and the service user resolve the same `node`. The template installs neither runtime nor service; this is only a configuration contract:

```text
ExecStart=<verified-absolute-node> <reviewed-listener-entry> --config <private-config>
User=<dedicated-service-account>
```

Bound raw body size, read duration, queue and concurrency. Shutdown rejects new sends, aborts or bounds in-flight waits and preserves uncertain receipts. Health checks establish liveness without creating messages or model calls.

Derive stable request IDs from repository plus delivery ID. Actions reruns retain the run ID; do not use the run attempt to create a new identity. Durable journals and single-writer locks deduplicate across restarts: the same ID/content returns the original receipt; conflicting content fails. An interrupted `sending` attempt becomes `unknown` and is not blindly resent. Inspect provider receipts and group messages first. If a custom Bot provides no message ID, record an explicit local receipt ID and provider acknowledgment; never invent a provider ID.

### Recovery guards require stopped-service maintenance

A leftover `channel.lock.recovering` must fail preflight/startup clearly rather than claiming listening. Do not automatically delete it:

1. Stop the relevant systemd unit. Confirm it is inactive, its main PID is zero, and no manually launched copy remains.
2. As the dedicated service account, inspect the recovery guard and normal lock host/PID, file types and private permissions in a private terminal. Only a matching local host and `ESRCH` prove a PID is absent. Investigate live PIDs, `EPERM`, another host, damaged records or symlinks first.
3. Privately back up the entire sender state directory, retaining the journal, backups and both locks; verify permissions.
4. Recheck no process is active and records have not changed. **Conditionally remove only the proven stale recovery guard.** Never use unconditional `rm` or delete the journal/normal lock. Let the existing dead-PID recovery mechanism handle the remainder.
5. Repeat preflight, start and check health. Do not force an unknown event to resend by changing its delivery ID.

## 7. Operational acceptance matrix

For each row record the actual state: configured, locally checked, provider accepted, visible in group, or untested. Keep the date and anonymous ID; one green switch cannot represent every scope.

| Scenario | Receiver/local expectation | Provider and group expectation |
| --- | --- | --- |
| Valid and invalid signatures | Only correct HMAC reaches allowlist processing; negative case never calls sender | No message for the negative case |
| Wrong repository/link or oversized body | Reject without sending; logs exclude credentials/bodies | No group message |
| Push and original title | Fixed prefix/fields and correct commit link | Check literal text and independent Bot identity after business acceptance |
| PR/commit/review/PR comments/CI/release | Check each action, path, fork restriction and status | Verify each class separately; label untested cases |
| Non-PR comment and own notifier | Filter without sender call | No notification loop |
| Same ID/content and changed content | Original deduplicated receipt or explicit conflict | At most one default notification for an event |
| Post-send timeout and process restart | Preserve durable unknown state without automatic resend | Check the group first; timeout does not prove non-delivery |
| Leftover recovery guard | Clear preflight/startup failure; no listener or send | Resume only after stopped-service maintenance |
| Provider switch and missing selected Secrets | Selected route only; missing values fail without fallback | Single delivery; test dual delivery only when explicitly chosen |
| HTTP 2xx and business success | HTTP success does not replace business success; label accepted semantics | Actual group visibility supplies the second layer |
| Normal shutdown and routing rollback | Stop new sends, preserve unknown receipts and usable old configuration | One default route; the other Bot may stay online |

## 8. Concrete diagnosis and rollback

- **HTTPS host/path validation fails before networking:** use fixed scheme/host/path/port/token-format codes. Privately compare the destination and selected provider; do not paste a complete URL/key into chat. Correct the selected setting and retest rather than weakening the allowlist or hiding failure through another provider.
- **HTTP 2xx but no group message:** inspect the business result first. Check whether the independent Bot remains in the correct group, the fixed `gitops` prefix satisfies keywords, the signature time/key is valid and group policy permits it. Record HTTP success, business acceptance and visibility separately. Do not repeatedly resend to discover the problem.
- **Duplicate or unknown for the same ID:** compare the original receipt for duplicate; inspect group and durable journal for unknown. The original request may already have been accepted; a new ID can duplicate it.
- **CI notifications trigger more notifications:** inspect self/notifier `workflow_run` exclusions. Rate limiting does not repair a loop.
- **Interactive shell works but systemd fails:** check actual Node path/version, service-user permissions, private config/state and working directory. Do not copy a local-machine path to the cloud.

For rollback, record the selector and receipt checkpoint, verify the retained provider configuration, select one default sender and use one authorized representative event to check single delivery. Keep both Bots online and retain old Secrets, journals and unknown receipts. Never silently forward failures to the other provider. Stopping the whole feature requires stopping the listener/authorized ingress while preserving recovery materials; that is separate from changing a route.

## 9. Experience scope and public references

The anonymous 2026-10-24 case covers real push paths from two repositories, duplicate suppression with stable IDs and a bad-signature case. Local checks also cover authentication, repository/link allowlists, timeouts, restart, shutdown and recovery-lock diagnostics. Public records contain no real repositories, group IDs, webhook URLs/keys, private configuration locations or chats. This does not certify live human acceptance of every PR, review, comment, CI, release or fork path. Each new project completes the matrix above.

On the same date, [Grok Marketplace](https://x.ai/bot/marketplace), [Bot management](https://docs.x.ai/grok-bot/bots) and [use cases](https://docs.x.ai/grok-bot/use-cases) were rechecked. Public pages separate role ownership, tools/sources and authorization boundaries; the market provides discovery and Add entry points. This text-level reference establishes no runtime compatibility, automatic marketplace-install API, account migration or background availability. No official prompts, portraits or private configuration were copied.

Protocol references checked 2026-10-24: [GitHub raw-body verification](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries), [Actions security](https://docs.github.com/en/actions/reference/security/secure-use), [event rules](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows) and [Feishu custom Bots](https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot). A role's declared capabilities are neither granted access nor task certification.
