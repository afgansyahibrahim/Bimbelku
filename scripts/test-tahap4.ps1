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
    throw "package.json tidak ditemukan. Jalankan skrip dari paket BimbelKu Tahap 4."
}
if (-not (Test-Path (Join-Path $backendRoot "artisan"))) {
    throw "Backend Laravel tidak ditemukan."
}

$phpVersion = & php -r "echo PHP_VERSION;"
if ($LASTEXITCODE -ne 0) {
    throw "PHP tidak dapat dijalankan dari terminal."
}
if ([version]$phpVersion -lt [version]"8.2.0") {
    throw "PHP 8.2 atau lebih baru dibutuhkan. Versi aktif: $phpVersion"
}

$nodeVersion = (& node --version).TrimStart("v")
if ($LASTEXITCODE -ne 0) {
    throw "Node.js tidak dapat dijalankan dari terminal."
}
if ([version]$nodeVersion -lt [version]"20.0.0") {
    throw "Node.js 20 atau lebih baru dibutuhkan. Versi aktif: $nodeVersion"
}

$phpModules = & php -r "echo implode(PHP_EOL, get_loaded_extensions());"
$requiredExtensions = @("pdo_sqlite", "mbstring", "openssl", "fileinfo", "gd")
$missingExtensions = $requiredExtensions | Where-Object {
    $phpModules -notcontains $_
}
if ($missingExtensions.Count -gt 0) {
    throw "Ekstensi PHP belum aktif: $($missingExtensions -join ', ')."
}

Push-Location $projectRoot
try {
    if (-not $SkipInstall) {
        Invoke-Checked "Memasang dependensi frontend" { npm ci }
    }
    Invoke-Checked "Menguji lint, TypeScript, dan build frontend" { npm run check }
}
finally {
    Pop-Location
}

Push-Location $backendRoot
try {
    if (-not $SkipInstall) {
        Invoke-Checked "Memasang dependensi backend" { composer install --no-interaction --prefer-dist }
    }
    Invoke-Checked "Membersihkan cache konfigurasi Laravel" { php artisan optimize:clear }
    Invoke-Checked "Memeriksa seluruh rute API" { php artisan route:list --path=api }
    Invoke-Checked "Menjalankan tes Laravel dengan SQLite sementara" { php artisan test }
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "Tahap 4 lulus. Tes tidak memakai atau menghapus database MySQL utama." -ForegroundColor Green
