# App avatars in the marketplace

Cards and details use each Bot's existing `avatar` value, such as `pal-moon`. The same value is already present in its Fleet configuration download. The 146 entries share 14 App characters; repeated artwork is intentional and names distinguish the roles. Language changes retain the same character.

## Source and rendering

The original MIT-licensed generators are pinned from [OpenBot commit ce016ba](https://github.com/Harzva/openbot/tree/ce016ba37f608e4f0863b4a5572d575e9a012a79). [PROVENANCE.json](../scripts/vendor/openbot-characters/PROVENANCE.json) records the upstream files and SHA-256 digests; the original [license](../scripts/vendor/openbot-characters/LICENSE) is preserved beside them.

`scripts/avatars.mjs` is a build-time adapter. It validates the saved character ID and calls the App's SVG generator with `state: idle`, `motion: off`, `phase: 0`, `size: 128` and embedded styles. No App runtime, login, browser library, remote image, user profile or extra dependency is required. A clean clone builds the same transparent static artwork.

The stable URL remains `avatars/<bot-slug>.svg`. The browser adds the website content revision to the request so a previous geometric avatar is not retained from cache after an update. This presentation change does not alter Bot IDs, names, personas, template versions, permissions or configuration downloads.

The static website also includes `avatars/LICENSE.txt` and `avatars/PROVENANCE.json` so attribution remains with the distributed images, including when the site is hosted separately from the source repository.

## Updating the artwork

1. Review a fixed upstream commit and its license. Copy the two pure character modules together, without changing their bytes.
2. Update the source commit and file digests in `PROVENANCE.json`. Retain the original license and the CommonJS package declaration.
3. Check that every declared `pal-*` ID remains supported. Do not assign by catalogue order or invent a new avatar per role.
4. Run the normal build, tests and public-artifact audit. The site test verifies source digests, SVG safety, configuration/avatar agreement and repeatable output for shared characters.
5. Inspect cards and details in both languages at desktop and phone sizes. Publish the checked website revision through the existing Pages workflow.

An unknown character fails the build rather than silently substituting a different identity. To recover from an incompatible upstream update, restore the previous generator snapshot and its provenance together.
