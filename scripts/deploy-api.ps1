<#
.SYNOPSIS
  Builds the API locally and deploys it to the VPS as a new release.
.EXAMPLE
  ./scripts/deploy-api.ps1          # deploy
  ./scripts/deploy-api.ps1 -Seed    # deploy and (re)apply sample content
#>
param(
  [switch]$Seed,
  [string]$HostName = "54.38.196.106",
  [string]$User = "ubuntu",
  [string]$KeyPath = "$env:USERPROFILE\.ssh\baltic_vps"
)

# Native tools write progress to stderr; failures are detected through $LASTEXITCODE instead.
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
$api = Join-Path $root "apps\api"
$releaseId = Get-Date -Format "yyyyMMdd-HHmmss"
$stage = Join-Path ([IO.Path]::GetTempPath()) "baltic-api-$releaseId"
$archive = "$stage.tgz"
$sshArgs = @("-i", $KeyPath, "-o", "BatchMode=yes")

Push-Location $api
try {
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "build failed" }
} finally { Pop-Location }

$admin = Join-Path $root "apps\admin"
Push-Location $admin
try {
  if (-not (Test-Path (Join-Path $admin "node_modules"))) { npm ci --no-audit --no-fund }
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "admin build failed" }
} finally { Pop-Location }

$mobile = Join-Path $root "apps\mobile"
Push-Location $mobile
try {
  npx expo export --platform web --output-dir dist
  if ($LASTEXITCODE -ne 0) { throw "mobile web export failed" }
} finally { Pop-Location }

New-Item -ItemType Directory -Path $stage | Out-Null
try {
  Copy-Item -Recurse (Join-Path $api "dist"), (Join-Path $api "db") $stage
  Copy-Item (Join-Path $api "package.json"), (Join-Path $api "package-lock.json") $stage
  Copy-Item -Recurse (Join-Path $root "deploy") $stage
  Copy-Item -Recurse (Join-Path $admin "dist") (Join-Path $stage "admin")
  Copy-Item -Recurse (Join-Path $mobile "dist") (Join-Path $stage "web")

  tar -czf $archive -C $stage .
  if ($LASTEXITCODE -ne 0) { throw "packaging failed" }

  scp @sshArgs $archive "${User}@${HostName}:/opt/baltic-challenges/releases/$releaseId.tgz"
  if ($LASTEXITCODE -ne 0) { throw "upload failed" }

  $seedFlag = if ($Seed) { "1" } else { "0" }
  (Get-Content (Join-Path $root "deploy\remote-release.sh") -Raw) -replace "`r", "" |
    ssh @sshArgs "${User}@${HostName}" "bash -s -- $releaseId $seedFlag"
  if ($LASTEXITCODE -ne 0) { throw "remote release failed" }

  Write-Host "Deployed $releaseId -> https://vps-1a18ee51.vps.ovh.net" -ForegroundColor Green
} finally {
  Remove-Item -Recurse -Force $stage -ErrorAction SilentlyContinue
  Remove-Item -Force $archive -ErrorAction SilentlyContinue
}
