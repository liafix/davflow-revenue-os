# DavFlow Revenue OS — Final Release Gate

Status: **RELEASE CANDIDATE / NETWORKED VALIDATION REQUIRED BEFORE PUBLIC DEPLOY**

## Verified in the current build environment

- `npm run release:smoke` — PASS
- frozen hardened business-domain SHA-256 verification — PASS
- recruiter-facing UI golden-money source-of-truth scan — PASS
- recruiter-facing UI internal-build-label scan — PASS
- no-index / no-follow metadata — PASS
- guided demo + two-step reset wiring — PASS

## Remaining mandatory gate

The current runner could not reach the npm registry within the execution timeout, so dependencies were not installed here. Before the first public deployment, run on a networked machine:

```bash
npm install
npm run validate
```

`npm run validate` must finish successfully. It runs:

```text
release smoke
→ domain TypeScript
→ ESLint
→ full TypeScript
→ Vitest
→ Next.js production build
```

Do not publish a production Vercel URL until the command exits with code 0.

## Production smoke after deploy

1. Open the production URL in a private/incognito window.
2. Confirm the initial discovery state has no approved contract value.
3. Run the guided demo through quote approval and project creation.
4. Optionally run the effort-overrun Margin Guard demonstration.
5. Add the booking request and verify `OUT OF SCOPE` evidence.
6. Propose and approve the change request.
7. Confirm final contract value is EUR 3,120 and target date is 3 Oct 2026.
8. Reset demo and confirm the initial state is restored.
9. Check the page on a mobile viewport and a desktop viewport.

## Release decision

- Offline release gate: **PASS**
- Business-domain freeze: **PASS**
- Networked dependency/build gate: **PENDING**
- Public deploy authorization: **CONDITIONAL — only after `npm run validate` PASS**
