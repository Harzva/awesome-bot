# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML, CSS and browser JavaScript backed by the existing Node.js catalogue generator. GitHub is the requested repository destination; GitHub Pages is the working hosting choice. No backend or user account is required to browse or download.

## Users

OpenBot users discovering useful roles and task workflows, and contributors maintaining a source-backed catalogue. The homepage prioritizes searching, inspecting and downloading a configuration; contribution is the secondary workflow.

## Product Purpose

Build an independently maintained Awesome Bot project comparable in maintainability and usefulness to awesome-dsh-plugin: clear entries, useful discovery, honest source attribution, reproducible downloads and a contribution path.

## Operating Context

Users browse by category or search, inspect a role's responsibilities, inputs, outputs, skills, permissions and prerequisites, then download a configuration for review and import through OpenBot. Contributors submit a single declarative entry through a pull request. The repository owns its own build and validation code.

## Capabilities and Constraints

The initial collection contains 90 original role adaptations corresponding to public Grok Marketplace entries and 56 original task workflows. These collections stay separate. They do not contain upstream prompts, credentials, conversations or learned memory. A configuration passing format and import checks is not evidence that its real-account tasks have been certified. The website downloads files; it does not grant account access or modify an installed App.

The repository must build after a clean clone without a sibling workspace. PR CI must work without secrets. Public artifacts must exclude private workspace paths and internal installation receipts. Roles and workflows must remain distinguishable during search and export. Community entries need a supported schema and review process.

## Brand Commitments

The name is Awesome Bot. The user explicitly chose the successful Awesome DSH Plugin project as the reference for quality and project organization. The new project has its own identity and preserves source attribution. Its public voice is direct, useful and precise. The user chose the Grok Bot marketplace as the visual reference: neutral light surfaces, category navigation, clear role identity and concise card actions. Awesome Bot retains its own mark and original role artwork.

## Evidence on Hand

146 authored entries, generated OpenBot manifests, the public source inventory, and validated Fleet configuration exports. The reference marketplace has a searchable list, category filters, source links, contribution navigation and a machine-readable index. No community ratings, download metrics or testimonials are available for this new project.

## Product Principles

- Search and the first useful role are visible immediately.
- One contribution entry generates documentation, the website and installation data.
- Show prerequisites and permission needs before download.
- Keep source roles distinct from original implementations and actual task verification.
- Let maintainers reproduce validation and release artifacts after a clean clone.

## Accessibility & Inclusion

Keyboard-operable search, filters, details and download actions; visible focus, readable contrast and responsive layouts for desktop and mobile web. Chinese and English modes cover the full role, scenario and configuration content for all 146 initial entries. Localized projections keep their language and content revision explicit while the original source manifests retain their published versions. Every role has an independently authored vector mark. Agents can discover and read the public catalogue through llms.txt, small indexes and individual Markdown/JSON files; this reading path does not install or execute a Bot.
