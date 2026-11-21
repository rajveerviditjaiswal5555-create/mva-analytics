<#
.SYNOPSIS
Pushes this project to GitHub so Render can find render.yaml on `main`.

USAGE (PowerShell, in this folder):
    .\deploy.ps1 https://github.com/YOUR-USERNAME/mva-analytics.git

IMPORTANT: Create the GitHub repository EMPTY — no README, no .gitignore,
no license. Otherwise the first push is rejected as non-fast-forward.
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$RepoUrl
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCmd) {
    $fallback = 'C:\Program Files\Git\cmd\git.exe'
    if (Test-Path $fallback) {
        $env:PATH = 'C:\Program Files\Git\cmd;' + $env:PATH
        $gitCmd = Get-Command git -ErrorAction SilentlyContinue
    }
}
if (-not $gitCmd) {
    Write-Host 'Git is not installed yet. Install it with:' -ForegroundColor Red
    Write-Host '  winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements'
    exit 1
}

if (-not (Test-Path '.\render.yaml')) {
    Write-Host 'render.yaml is missing from this folder!' -ForegroundColor Red
    exit 1
}

if (-not (Test-Path '.\.git')) {
    git init
}

git add .

$status = git status --porcelain
if ($status) {
    git commit -m "Macro Vision Academy Analytics Platform"
} else {
    Write-Host 'Nothing new to commit; using existing commit.'
}

git branch -M main

$existingRemote = git remote get-url origin 2>$null
if ($existingRemote) {
    git remote set-url origin $RepoUrl
} else {
    git remote add origin $RepoUrl
}

Write-Host 'Pushing to main ...' -ForegroundColor Cyan
git push -u origin main

Write-Host ''
Write-Host 'Done. In Render use:' -ForegroundColor Green
Write-Host '  Blueprint Name : mva-analytics'
Write-Host '  Branch         : main'
Write-Host '  Blueprint Path : render.yaml'
