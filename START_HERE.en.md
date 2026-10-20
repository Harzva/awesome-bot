# Start with one task

<!-- Generated from data/locales/en; run npm run build. -->

Choose a goal and download only the one or two Bots you need. English downloads are localized configuration projections of the same source roles, not rewritten versions of the published Chinese manifests.

## After downloading

1. Preview and confirm the Fleet configuration in OpenBot. Check the names and Bot count, and follow the host's collision handling.
2. Select a model and connect only the materials, tools and accounts needed for your task. Downloading or importing does not start a task or grant access.
3. Open the first Bot, copy its task prompt, replace the placeholders with authorized materials, review it and send it. Ask for a list of missing inputs when needed.
4. Review the output before manually handing the confirmed materials to the next Bot. These recipes do not run or orchestrate themselves.

Exports keep tools and containers off, with empty accounts, conversations and memory. In an empty library, the host may choose the first imported Bot as its primary Bot; its management capabilities follow the host's rules. Review the host before use.

Format and export checks do not certify real-account task execution. Source references describe public roles; the OpenBot implementations and their role marks are independent.

## Pick a goal

## Reproduce a bug and plan retesting

Create a minimal reproduction, then check affected key paths and release blockers.

[Open scenario](https://harzva.github.io/awesome-bot/?lang=en&scenario=bug-retest) · [Download 2 Bot configuration](https://harzva.github.io/awesome-bot/exports/en/scenario-bug-retest.fleet.json)

### Materials

- Issue description, expected behavior, frequency and minimal input
- Specified code or testable build, platform and environment details
- Permitted test environment, data, accounts and interface
- Core user tasks, release criteria and known fixes

### Expected outputs

- Minimal reproduction steps, logs and environment details
- Confirmed findings and diagnostic hypotheses still needing validation
- Key-path check records, release blockers and retest order

### Steps

#### 1. Bug Reproduction

```text
Help reproduce this bug first. Issue and expected behavior: [fill in]; specified build and platform: [fill in]; minimal input or sample: [provide authorized data]; permitted test environment and operation scope: [fill in]. Record actual versus expected differences, progressively reduce triggering conditions, retain logs and environment details, and distinguish confirmed causes from hypotheses. If necessary tools or an environment are unavailable, explain the gap and provide steps I can execute; do not claim to have reproduced it.
```

Handoff: I will verify the reproduction evidence and pass repeatable steps, the impact scope and confirmed fixes to Startup QA Bot.

#### 2. Startup QA Bot

```text
Use the following verified bug reproduction and fix information to check affected core user paths and plan retesting. Reproduction and fixes: [paste]; testable build and core tasks: [fill in]; release criteria, test accounts and authorized interface operations: [fill in]. Record real findings on normal, empty and error paths, then list release blockers and a retest method for each. Explicitly mark unexecuted or unverified items as awaiting checks, and do not access unauthorized environments.
```

Handoff: The release owner and I will review check evidence, blockers and retest results to decide whether release criteria are met.

## Prepare a customer meeting

Verify company background, then organize the agenda, evidence and questions to resolve in this meeting.

[Open scenario](https://harzva.github.io/awesome-bot/?lang=en&scenario=customer-meeting) · [Download 2 Bot configuration](https://harzva.github.io/awesome-bot/exports/en/scenario-customer-meeting.fleet.json)

### Materials

- Target company, research purpose and product fit criteria
- Authorized company materials, sources and communication history
- Meeting goals, participants, product materials and permitted commitment scope

### Expected outputs

- Company research brief with sources and dates
- Need signals that separate facts from hypotheses
- One-page meeting brief, agenda, questions and preparation tasks

### Steps

#### 1. Account Research Specialist

```text
I need a company research brief for a customer meeting. Target company and research purpose: [fill in]; product and fit criteria: [fill in]; authorized materials and sources: [paste or provide an authorized location]. Verify the company entity, business and recent changes, recording sources and dates. Separate facts, need signals and buying hypotheses. If materials are insufficient, list missing information first, and do not claim access to sources that are not connected.
```

Handoff: I will review the brief and pass confirmed background, need signals and hypotheses to verify to Meeting Prep Buddy.

#### 2. Meeting Prep Buddy

```text
Use the following reviewed company research, communication history, participants and meeting goals to prepare a one-page brief, agenda, key questions and preparation tasks. Company research brief: [paste]; participants and meeting goals: [fill in]; product evidence and permitted commitments: [fill in]. Separate customer facts, our hypotheses and commitments requiring internal confirmation. Do not send messages or schedule meetings on my behalf.
```

Handoff: I will review the meeting materials and confirm the commitment scope before using them in the actual meeting.

## Turn feedback into requirements

Identify feedback themes and user impact, then consolidate a traceable requirements list with questions to clarify.

[Open scenario](https://harzva.github.io/awesome-bot/?lang=en&scenario=feedback-to-requirements) · [Download 2 Bot configuration](https://harzva.github.io/awesome-bot/exports/en/scenario-feedback-to-requirements.fleet.json)

### Materials

- Authorized feedback and tickets with timestamps and sources
- Product and user segments, known issues and recent changes
- Existing requirements repository and requirement links

### Expected outputs

- Feedback themes and user tasks retaining original evidence
- Deduplicated requirements list and impact scope
- Validation suggestions and clarification questions without development schedule commitments

### Steps

#### 1. Product Feedback Analyst

```text
Analyze this authorized feedback batch. Feedback records, sources and timestamps: [paste]; product and user segments: [fill in]; known issues and recent changes: [fill in]. Group themes by user context, goal, obstacle and impact. Retain original evidence and contradictory feedback, and describe sample coverage and missing information. Suggest verifiable improvements without promising a development schedule.
```

Handoff: I will check themes against the original records and pass confirmed themes and evidence to Feature Request Tracker.

#### 2. Feature Request Tracker

```text
Turn the following reviewed feedback themes and original evidence into a requirements list. Themes and evidence: [paste]; existing requirements repository: [provide authorized records]; customer and product segments: [fill in]. Merge duplicate requests and link existing requirements, retaining specific problem contexts, impact scope and clarification questions. Separate requirement facts from prioritization suggestions. Do not promise a schedule on behalf of the product owner or modify the requirements repository.
```

Handoff: The product owner and I will review requirements and verify missing details before deciding priorities and whether to add records.

## Prepare a product launch

Build positioning from customer problems and product evidence, then work backward to schedule assets, reviews and channel publication.

[Open scenario](https://harzva.github.io/awesome-bot/?lang=en&scenario=product-launch) · [Download 2 Bot configuration](https://harzva.github.io/awesome-bot/exports/en/scenario-product-launch.fleet.json)

### Materials

- Target customers, need evidence and alternatives
- Product capabilities, limitations and demonstrable differences
- Launch goals, deadlines, existing assets and channels
- Production and review owners and immovable milestones

### Expected outputs

- Positioning, value statements and an audience messaging matrix
- Launch content requirements and validation plan
- Marketing calendar, dependency conflicts and checkpoints

### Steps

#### 1. Product Marketer

```text
Prepare a positioning draft for a product launch. Target customers and need evidence: [fill in]; product capabilities, limitations and evidence of differences: [fill in]; launch goals and existing assets: [fill in]. Map customer tasks and alternatives to demonstrable value, and organize audience messages and content requirements. Keep unproven claims as hypotheses and list follow-up validation. Do not invent customer testimonials or performance results.
```

Handoff: I will review the positioning and evidence, then pass confirmed audience messages, content requirements and validation plans to Marketing Calendar Owner.

#### 2. Marketing Calendar Owner

```text
Work backward from the following reviewed launch content requirements to prepare a marketing calendar. Positioning and content requirements: [paste]; launch goals and deadlines: [fill in]; channels and asset list: [fill in]; production and review owners and fixed milestones: [fill in]. Identify production, review and channel dependencies, resource conflicts and gaps, recording an owner and checkpoint for each item. Prepare a reviewable plan only. Do not publish content, send messages or promise unconfirmed dates on my behalf.
```

Handoff: The relevant owners and I will confirm the calendar, resources and review arrangements before carrying out publication through authorized processes.

## Write an evidence-backed weekly report

Use one Bot to turn project artifacts, verification and blockers into a clear status-report draft.

[Open scenario](https://harzva.github.io/awesome-bot/?lang=en&scenario=weekly-report) · [Download 1 Bot configuration](https://harzva.github.io/awesome-bot/exports/en/scenario-weekly-report.fleet.json)

### Materials

- This week's reporting period, project goals and milestones
- Completed artifacts, test results and acceptance records
- Ongoing work, blockers and plan changes
- Next-phase plan, pending decisions and responsible owners

### Expected outputs

- Weekly report draft separating delivered work, pending acceptance, ongoing work and blockers
- Evidence-backed risk explanations and decision requests
- Next-phase actions and responsible owners

### Steps

#### 1. Status Report Writer

```text
Write this week's status-report draft from the following project facts. Reporting period, goals and milestones: [fill in]; artifacts, tests and acceptance records: [paste]; ongoing work, blockers and plan changes: [fill in]; next-phase actions and pending decisions: [fill in]. Separate delivered work, pending acceptance, ongoing work and blocked items. Keep evidence for conclusions and explain deviations, risks and required decisions. Leave unsupported progress unknown, and do not equate passing tests with business acceptance.
```

Handoff: I will verify the evidence, owners and decision requests, revise and confirm the draft, then send it to the intended readers.

[Browse the English market](https://harzva.github.io/awesome-bot/?lang=en) · [Contribute](CONTRIBUTING.md)
