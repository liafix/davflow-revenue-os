# DavFlow Revenue OS

Synthetic candidate demonstration inspired by public responsibilities of a web/project-delivery role. DavFlow models an explainable quote-to-delivery workflow for a small digital team, keeping scope, pricing, delivery evidence, margin protection and approved revenue expansion traceable to one commercial source of truth.

## Release candidate — PASS 7 UX + Demo Readiness

This release keeps the hardened PASS 6 business domain frozen and adds a recruiter-facing release layer:

- guided interview controller that reuses existing reducer actions and approval gates
- lifecycle-aware executive revenue readout
- two-step reset protection for safe live demos
- sticky guided action bar with stage-aware next action
- section-targeted guided navigation
- keyboard skip link, focus states and reduced-motion support
- responsive interview-first layout and touch-friendly controls
- explicit synthetic-data and deterministic Demo AI labeling
- no-index/no-follow metadata by default
- offline release smoke gate with frozen-domain SHA-256 verification
- recruiter-facing UI free of internal PASS labels and hard-coded golden money values

The hardened business domain remains unchanged from PASS 6.

## Synthetic golden path

```text
Base scope               38h
Risk buffer              +2h
Priced scope              40h
Billable rate             €60/h
Original quote            €2,400
Expected margin           40%

Delivery baseline:
Actual effort             12h
Weighted completion       35%
Projected effort          34.29h
Projected margin          48.57% · HEALTHY

Overrun demonstration:
Actual effort             18h
Weighted completion       35%
Projected effort          51.43h
Projected margin          22.86% · AT_RISK
Gross profit at risk      €411.43

Booking change            12h priced effort
Change request            €720
Final contract value      €3,120
Revenue expansion         +30%
Final planned delivery    52h
Revised delivery target   3 Oct 2026
```

Commercial figures are derived from domain inputs and pricing policies; golden business values are not hard-coded into the recruiter-facing UI.

## Guided interview route

Use the sticky **Guided next step** control for the default path:

```text
Start Guided Demo
→ Approve Reviewed Scope
→ Generate Quote
→ Send Quote
→ Approve Quote
→ Create Delivery Project
→ Add Client Request
→ Compare Approved Scope
→ Create Change Request
→ Propose Change
→ Approve Change
→ Demo Complete
```

The guided controller invokes the same reducer actions as the corresponding manual workflow buttons. It cannot skip domain approval gates.

For the strongest 3–5 minute interview story, optionally use **Simulate Effort Overrun** after project creation before introducing the booking request.

## Executive architecture

```text
Client Request
→ Demo AI Structuring
→ Human Review
→ Deterministic Economics
→ Approved Quote Snapshot
→ Delivery Evidence
→ Margin Guard
→ Scope Control
→ Revenue Expansion
```

## Offline release smoke gate

This does not require installed npm dependencies:

```bash
npm run release:smoke
```

It verifies:

- frozen PASS 6 domain/data SHA-256 hashes
- expected release version and Next.js security baseline
- no hard-coded golden money values in `DemoApp.tsx`
- no internal PASS labels in recruiter-facing UI
- guided demo + reset protection wiring
- no-index/no-follow metadata

## Run locally

```bash
npm install
npm run dev
```

## Full quality gate

Before public Vercel deployment, run in a networked environment:

```bash
npm run validate
```

This executes:

```text
release smoke
→ domain typecheck
→ ESLint
→ full TypeScript typecheck
→ Vitest
→ Next.js production build
```

## Demo AI note

The current build uses a deterministic fallback for structured requirements assistance. It is explicitly labeled in the UI and never approves scope or generates financial values. A live LLM provider is not a runtime dependency.

## Credibility note

All clients, figures, workflows and project data are synthetic demonstration data. The project does not claim knowledge of DavSol internal systems, proprietary data, clients, processes or actual economics.
