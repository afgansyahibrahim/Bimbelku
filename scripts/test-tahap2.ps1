param(
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $projectRoot "bimbelku-backend"

function Invoke-Checked {
    param(
        [string]$Label,
        [scriptblock]$Command
    )

    Write-Host ""
    Write-Host "==> $Label" -ForegroundColor Cyan
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Label gagal dengan exit code $LASTEXITCODE."
    }
}

if (-not (Test-Path (Join-Path $projectRoot "package.json"))) {
    throw "package.json tidak ditemukan."
}
if (-not (Test-Path (Join-Path $backendRoot "artisan"))) {
    throw "Backend Laravel tidak ditemukan."
}

$phpVersion = & php -r "echo PHP_VERSION;"
if ($LASTEXITCODE -ne 0 -or [version]$phpVersion -lt [version]"8.2.0") {
    throw "PHP 8.2 atau lebih baru dibutuhkan."
}

$nodeVersion = (& node --version).TrimStart("v")
if ($LASTEXITCODE -ne 0 -or [version]$nodeVersion -lt [version]"20.0.0") {
    throw "Node.js 20 atau lebih baru dibutuhkan."
}

Push-Location $projectRoot
try {
    if (-not $SkipInstall) {
        Invoke-Checked "Memasang dependensi frontend" { npm ci }
    }
    Invoke-Checked "Menguji frontend dan kontrak Tahap 2" { npm run check }
}
finally {
    Pop-Location
}

Push-Location $backendRoot
try {
    if (-not $SkipInstall) {
        Invoke-Checked "Memasang dependensi backend" {
            composer install --no-interaction --prefer-dist
        }
    }
    Invoke-Checked "Membersihkan cache Laravel" { php artisan optimize:clear }
    Invoke-Checked "Menjalankan tes akun Tahap 1" {
        php artisan test --filter=StageFourAccountFlowTest
    }
    Invoke-Checked "Menjalankan tes pemesanan mobile Tahap 2" {
        php artisan test --filter=StageTwoMobileBookingTest
    }
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "Tahap 2 lulus. Database MySQL utama tidak dihapus oleh skrip ini." -ForegroundColor Green
