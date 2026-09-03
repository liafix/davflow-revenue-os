param(
  [Parameter(Mandatory=$false)]
  [string]$GitHubRepoUrl = "https://github.com/liafix/davflow-revenue-os.git"
)

$ErrorActionPreference = "Stop"

Write-Host "[1/5] Installing dependencies..."
npm install

Write-Host "[2/5] Running full release validation..."
npm run validate

Write-Host "[3/5] Preparing Git repository..."
if (-not (Test-Path ".git")) {
  git init
}

git add .
$changes = git status --porcelain
if ($changes) {
  git commit -m "feat: release DavFlow Revenue OS candidate demo"
} else {
  Write-Host "No uncommitted changes to commit."
}

git branch -M main
$hasOrigin = git remote | Select-String -Pattern "^origin$"
if ($hasOrigin) {
  git remote set-url origin $GitHubRepoUrl
} else {
  git remote add origin $GitHubRepoUrl
}

Write-Host "[4/5] Local release gate PASS."
Write-Host "Repository is ready for: git push -u origin main"
Write-Host ""
Write-Host "For safety this script does NOT push or deploy automatically."
Write-Host "Run the push only after reviewing the final diff."
Write-Host ""
Write-Host "[5/5] Next commands:"
Write-Host "  git status"
Write-Host "  git push -u origin main"
Write-Host "Then import the repository into Vercel, or run: npx vercel --prod"
