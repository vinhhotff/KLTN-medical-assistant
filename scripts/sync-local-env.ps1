<#
.SYNOPSIS
    Synchronize MediAssist-AI local git-ignored secret files with the user vault (%USERPROFILE%\.mediassist).
.DESCRIPTION
    Supports Sync (default), Backup, and Restore actions without printing any raw secret values.
    Also keeps backend\target\classes\application-local.properties synced and configures git core.hooksPath = .githooks.
#>
[CmdletBinding()]
param(
    [ValidateSet('Sync', 'Backup', 'Restore')]
    [string]$Action = 'Sync',

    [string]$VaultDir = $(Join-Path $env:USERPROFILE '.mediassist')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Test-NonEmptyFile {
    param([Parameter(Mandatory = $true)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        return $false
    }
    return ((Get-Item -LiteralPath $Path).Length -gt 0)
}

function Invoke-RestorePair {
    param(
        [Parameter(Mandatory = $true)][string]$VaultPath,
        [Parameter(Mandatory = $true)][string]$LocalPath,
        [Parameter(Mandatory = $true)][string]$LocalRel,
        [Parameter(Mandatory = $true)][string]$VaultName
    )

    if ((Test-NonEmptyFile -Path $VaultPath) -and (-not (Test-NonEmptyFile -Path $LocalPath))) {
        $parentDir = Split-Path -Parent $LocalPath
        if (-not (Test-Path -LiteralPath $parentDir -PathType Container)) {
            New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
        }
        Copy-Item -LiteralPath $VaultPath -Destination $LocalPath -Force
        Write-Host "[RESTORE] $LocalRel <- $VaultName"
    }
}

function Invoke-BackupPair {
    param(
        [Parameter(Mandatory = $true)][string]$LocalPath,
        [Parameter(Mandatory = $true)][string]$VaultPath,
        [Parameter(Mandatory = $true)][string]$LocalRel,
        [Parameter(Mandatory = $true)][string]$VaultName
    )

    if (Test-NonEmptyFile -Path $LocalPath) {
        Copy-Item -LiteralPath $LocalPath -Destination $VaultPath -Force
        Write-Host "[BACKUP]  $LocalRel -> $VaultName"
    }
}

function Sync-CompiledLocalProperties {
    param([Parameter(Mandatory = $true)][string]$RepoRoot)

    $targetClassesDir = Join-Path $RepoRoot 'backend\target\classes'
    $srcProps = Join-Path $RepoRoot 'backend\src\main\resources\application-local.properties'
    $dstProps = Join-Path $targetClassesDir 'application-local.properties'

    if ((Test-Path -LiteralPath $targetClassesDir -PathType Container) -and (Test-NonEmptyFile -Path $srcProps)) {
        Copy-Item -LiteralPath $srcProps -Destination $dstProps -Force
        Write-Host "[SYNC]    backend\target\classes\application-local.properties updated"
    }
}

function Ensure-GitHooksPath {
    param([Parameter(Mandatory = $true)][string]$RepoRoot)

    $prevPref = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $current = (& git -C $RepoRoot config --get core.hooksPath 2>$null)
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $prevPref
    }

    $currentValue = if ($null -ne $current) { ($current | Out-String).Trim() } else { '' }
    if ($exitCode -ne 0 -or $currentValue -ne '.githooks') {
        & git -C $RepoRoot config core.hooksPath .githooks
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to set git config core.hooksPath .githooks"
        }
        Write-Host "[GIT]     Configured core.hooksPath = .githooks"
    } else {
        Write-Host "[GIT]     core.hooksPath = .githooks (already configured)"
    }
}

$repoRoot = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path

if (-not (Test-Path -LiteralPath $VaultDir -PathType Container)) {
    New-Item -ItemType Directory -Path $VaultDir -Force | Out-Null
    Write-Host "[VAULT]   Created directory $VaultDir"
}

$secretMappings = @(
    @{ LocalRel = '.env'; VaultName = '.env' },
    @{ LocalRel = 'backend\.env'; VaultName = 'backend.env' },
    @{ LocalRel = 'frontend\.env'; VaultName = 'frontend.env' },
    @{ LocalRel = 'backend\src\main\resources\application-local.properties'; VaultName = 'application-local.properties' }
)

if ($Action -in @('Sync', 'Restore')) {
    foreach ($pair in $secretMappings) {
        $vaultPath = Join-Path $VaultDir $pair.VaultName
        $localPath = Join-Path $repoRoot $pair.LocalRel
        Invoke-RestorePair -VaultPath $vaultPath -LocalPath $localPath -LocalRel $pair.LocalRel -VaultName $pair.VaultName
    }
}

if ($Action -in @('Sync', 'Backup')) {
    foreach ($pair in $secretMappings) {
        $localPath = Join-Path $repoRoot $pair.LocalRel
        $vaultPath = Join-Path $VaultDir $pair.VaultName
        Invoke-BackupPair -LocalPath $localPath -VaultPath $vaultPath -LocalRel $pair.LocalRel -VaultName $pair.VaultName
    }
}

if ($Action -in @('Sync', 'Restore')) {
    Sync-CompiledLocalProperties -RepoRoot $repoRoot
}

Ensure-GitHooksPath -RepoRoot $repoRoot
