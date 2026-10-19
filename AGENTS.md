# Working on Awesome Bot

- A clean clone must work with Node.js 22+ and no sibling checkout. The default market engine is the pinned snapshot in `engine/`.
- Add or edit one declarative entry in `data/entries/`. Keep scripts, credentials, live memory and conversations out. Distinguish `bot-role` from `task-workflow`.
- Preserve attribution and license declarations. Never mark a template upstream official or task-certified without evidence.
- Run relevant checks: `npm run build`, `npm run check`, `npm test`, `npm run build:site`, `npm run audit:public`. Generated files must match authored entries.
- Website downloads do not execute or import into the App. Market templates never grant permissions.
- Record provenance when updating vendor code; verify compatibility. Do not rewrite published template version bytes.
- Release from a checked commit and retain checksums. Keep private workspace paths and installation receipts out of public artifacts.
