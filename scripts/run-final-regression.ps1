$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $projectRoot "bimbelku-backend"

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory = $true)][string]$Label,
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [Parameter(Mandatory = $true)][string]$WorkingDirectory
    )

    Write-Host ""
    Write-Host "============================================================" -ForegroundColor DarkGray
    Write-Host $Label -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor DarkGray

    Push-Location $WorkingDirectory
    try {
        & $Command @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "$Label gagal dengan exit code $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }
}

if (-not (Test-Path (Join-Path $projectRoot "package.json"))) {
    throw "package.json tidak ditemukan di $projectRoot"
}
if (-not (Test-Path (Join-Path $backendRoot "artisan"))) {
    throw "artisan tidak ditemukan di $backendRoot"
}

Invoke-CheckedCommand `
    -Label "Bersihkan cache Laravel" `
    -Command "php" `
    -Arguments @("artisan", "optimize:clear") `
    -WorkingDirectory $backendRoot

$backendTests = @(
    "CheckpointOneFoundationAuditTest",
    "CheckpointTwoOperationsAuditTest",
    "CheckpointThreeCommunicationAuditTest",
    "CheckpointFourQualityAuditTest",
    "CheckpointFiveFinalRegressionTest",
    "StageFourLearningSessionTest",
    "StageSixBTeacherOperationsTest",
    "StageThreeFinanceSecurityTest",
    "StageSixCAdminOperationsTest",
    "StageSixCFinanceOperationsTest",
    "StageSixCFinalRegressionTest"
)

foreach ($test in $backendTests) {
    Invoke-CheckedCommand `
        -Label "Laravel test: $test" `
        -Command "php" `
        -Arguments @("artisan", "test", "--filter=$test") `
        -WorkingDirectory $backendRoot
}

Invoke-CheckedCommand `
    -Label "Seluruh pemeriksaan frontend, kontrak, lint, build, dan performance budget" `
    -Command "npm" `
    -Arguments @("run", "check:final") `
    -WorkingDirectory $projectRoot

Write-Host ""
Write-Host "REGRESI FINAL LULUS" -ForegroundColor Green
Write-Host "Simpan output ini sebagai bukti Checkpoint 5. Lanjutkan uji manual tiga role sebelum deploy." -ForegroundColor Green
