import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const fail = (message) => {
  console.error(`RELEASE_SMOKE_FAIL: ${message}`);
  process.exitCode = 1;
};

const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const freeze = JSON.parse(readFileSync("release/domain-freeze.json", "utf8"));

for (const [path, expected] of Object.entries(freeze.sha256)) {
  const actual = sha256(path);
  if (actual !== expected) fail(`Frozen business-domain file changed: ${path}`);
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
if (packageJson.version !== "0.7.0") fail(`Expected release candidate version 0.7.0, got ${packageJson.version}`);
if (packageJson.dependencies?.next !== "15.5.24") fail(`Expected Next.js 15.5.24 security baseline, got ${packageJson.dependencies?.next}`);

const ui = readFileSync("components/DemoApp.tsx", "utf8");
if (/€\s?(?:2,?400|3,?120|720)|\b(?:2400|3120)\b/.test(ui)) fail("Golden business values are hard-coded in DemoApp.tsx");
if (/PASS\s?[0-9]/i.test(ui)) fail("Internal PASS labels leaked into recruiter-facing UI");
if (!ui.includes("Release Candidate")) fail("Release Candidate badge missing from UI");
if (!ui.includes("deriveGuidedDemoControl")) fail("Guided interview controller is not wired into UI");
if (!ui.includes("Confirm Reset")) fail("Two-step reset protection is missing");

const layout = readFileSync("app/layout.tsx", "utf8");
if (!layout.includes("index: false") || !layout.includes("follow: false")) fail("Candidate demo must remain no-index/no-follow by default");

if (!process.exitCode) {
  console.log("RELEASE_SMOKE_PASS");
  console.log(`Frozen files verified: ${Object.keys(freeze.sha256).length}`);
  console.log("UI money source-of-truth scan: PASS");
  console.log("Recruiter-facing release labels: PASS");
  console.log("No-index metadata: PASS");
}
