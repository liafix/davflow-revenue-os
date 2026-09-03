# GitHub + Vercel Deployment — DavFlow Revenue OS

Recommended repository name: `davflow-revenue-os`

Recommended public repository target:

```text
https://github.com/liafix/davflow-revenue-os
```

## 1. Validate locally first

PowerShell:

```powershell
cd "C:\path\to\davflow-revenue-os"
npm install
npm run validate
```

Stop if any command fails.

## 2. Create and push the GitHub repository

After creating an empty repository named `davflow-revenue-os` on GitHub:

```powershell
git init
git add .
git commit -m "feat: release DavFlow Revenue OS candidate demo"
git branch -M main
git remote add origin https://github.com/liafix/davflow-revenue-os.git
git push -u origin main
```

If a remote already exists:

```powershell
git remote set-url origin https://github.com/liafix/davflow-revenue-os.git
git push -u origin main
```

## 3. Deploy on Vercel

Preferred path: import the GitHub repository into Vercel.

- Framework preset: Next.js
- Production branch: `main`
- Install command: default (`npm install`)
- Build command: default (`next build`)
- Output directory: default
- Environment variables: none required for the current deterministic demo

Deploy only after the local `npm run validate` gate passes.

Alternative CLI path:

```powershell
npx vercel
npx vercel --prod
```

## 4. Production verification

After Vercel deploys:

```text
Reset → Requirements → Scope approval → Quote → Project
→ optional Margin Guard overrun → Booking request
→ OUT OF SCOPE → CR +EUR 720 → EUR 3,120
```

Then replace the placeholders in the application text with:

- `DAVFLOW_DEMO_URL`
- `DAVFLOW_GITHUB_URL`

The site intentionally ships with `noindex, nofollow`; it remains accessible by direct link while avoiding search indexing by default.
