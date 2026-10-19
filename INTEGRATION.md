# OpenBot integration contract

This project generates declarative configurations. An App integration should reuse the existing host entry and permission model rather than introducing an alternate runtime.

## Formats

- `openbot.market.registry/1`: discovery, versions, manifest URLs and content integrity.
- `openbot.market/1`: a role's persona, skill descriptions, guidance and declared needs.
- `openbot.fleet/1`: generated configuration for review and import.
- `awesome.bot.site/1`: rich metadata for browser discovery; it is not an install protocol.

The pinned market core in `engine/` provides schema checks, canonical hashes, version resolution, plans, materialization, source trust and three-way upgrade logic. The default runtime works without another checkout; `OPENBOT_MARKET_ROOT` is an explicit development override.

## Import behavior

Downloaded configurations contain no learned memory, messages, account connections or model keys. Ordinary Bots have tool and container flags disabled. Needed capabilities remain declarations; users separately connect models, tools and accounts.

OpenBot's configuration import entry supports Fleet files with an import summary and merge behavior. Use the host's current controlled import flow. Do not bypass user confirmation through an older direct IPC entry.

Existing primary identity and user state must survive an import. An empty library may select its first imported Bot as primary; that role carries management, container and screen capabilities under the host's existing rules. Import alone does not allocate an environment or execute a task.

## Native market installation

1. Read a catalogue, filter and inspect metadata without executing any entry.
2. Validate source trust and content integrity, then resolve a plan against the actual host version.
3. Show new Bot names, collision renames, prerequisites and declared permissions.
4. Apply the host's import confirmation. Save the **actual returned Bot IDs** with template/version provenance.
5. Only after ID reconciliation can upgrades use the existing three-way merge. Preserve user edits and learned data.

Standalone Fleet import can rename IDs without updating a separately exported market record. Therefore this project's CLI intentionally exposes browse/plan/configuration-export, not direct upgrade/rollback patches to an installed App.

## Source trust

The public catalogue is currently unsigned and is not marked official or publisher-verified. A hash detects content drift relative to an index; it cannot establish the index publisher's identity. Single-entry CLI planning/export requires explicit community and unpinned-source flags. Future signed distribution must pin the publisher's public key outside the downloaded index, preserve old versions, and support revocation.

## Verification scope

Automated tests check format, mappings, integrity, collisions, independent operation, history retention, complete exports and publication boundaries. Real account tasks, long-running behavior and a native App market interface require their own evidence. Hosting a configuration does not certify the capabilities of the model or connected tools that will use it.
