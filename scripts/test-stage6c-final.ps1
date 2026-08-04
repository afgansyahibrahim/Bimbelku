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
    throw "package.json tidak ditemukan. Ekstrak patch dari folder utama Website_Bimbelku."
}
if (-not (Test-Path (Join-Path $backendRoot "artisan"))) {
    throw "Backend Laravel tidak ditemukan."
}

Push-Location $projectRoot
try {
    if (-not $SkipInstall) {
        Invoke-Checked "Memasang dependensi frontend" { npm ci }
    }
    Invoke-Checked "Menjalankan pemeriksaan frontend dan kontrak seluruh tahap" { npm run check }
}
finally {
    Pop-Location
}

Push-Location $backendRoot
try {
    if (-not $SkipInstall) {
        Invoke-Checked "Memasang dependensi backend" { composer install --no-interaction --prefer-dist }
    }
    Invoke-Checked "Membersihkan cache Laravel" { php artisan optimize:clear }
    Invoke-Checked "Menjalankan migration bertahap" { php artisan migrate --force }
    Invoke-Checked "Memeriksa daftar rute API" { php artisan route:list --path=api }
    Invoke-Checked "Menguji fondasi Audit Checkpoint 1" { php artisan test --filter=CheckpointOneFoundationAuditTest }
    Invoke-Checked "Menguji regresi akhir Tahap 6C" { php artisan test --filter=StageSixCFinalRegressionTest }
    Invoke-Checked "Menguji seluruh Tahap 6A sampai 6C" {
        php artisan test --filter="StageSixA|StageSixB|StageSixC"
    }
    Invoke-Checked "Menjalankan seluruh tes Laravel" { php artisan test }
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "Audit fondasi dan Tahap 6C lulus. Runtime memakai satu admin utama tanpa halaman autentikator atau admin kedua." -ForegroundColor Green
