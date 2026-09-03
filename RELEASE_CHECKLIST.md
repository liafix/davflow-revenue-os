# DavFlow Revenue OS — Release Checklist

## Offline checks

- [x] Hardened PASS 6 domain/data hash freeze preserved
- [x] Domain TypeScript check passes
- [x] Guided default path runtime probe passes
- [x] Guided controller TypeScript check passes
- [x] Recruiter-facing UI has no hard-coded golden money values
- [x] Recruiter-facing UI has no internal PASS labels
- [x] Two-step reset protection exists
- [x] Synthetic-data / deterministic Demo AI disclosure remains visible
- [x] `noindex, nofollow` metadata enabled
- [x] `npm run release:smoke` passes

## Networked pre-deploy checks

Run:

```bash
npm install
npm run validate
```

Then confirm:

- [ ] `package-lock.json` generated/updated and committed
- [ ] ESLint PASS
- [ ] Full TypeScript PASS
- [ ] Vitest PASS
- [ ] Next.js production build PASS
- [ ] Desktop smoke test PASS
- [ ] Mobile smoke test PASS
- [ ] Vercel production deployment PASS
- [ ] Production golden path PASS

## Interview smoke route

- [ ] Reset demo
- [ ] Guided requirements analysis
- [ ] Human scope approval
- [ ] Quote generation / send / approval
- [ ] Project creation
- [ ] Optional Margin Guard overrun demonstration
- [ ] Booking request added
- [ ] OUT OF SCOPE evidence shown
- [ ] Change request proposed
- [ ] Change request approved
- [ ] Executive readout shows revenue expansion
