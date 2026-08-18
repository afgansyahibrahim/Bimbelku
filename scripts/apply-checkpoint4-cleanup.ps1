$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$targets = @(
    "src\components\PackageBuilderGuide.tsx",
    "src\components\PackageCheckoutReview.tsx",
    "src\lib\navigation.ts",
    "scripts\check-revision3-navigation.mjs",
    "scripts\check-revision8-package-sessions.mjs",
    "dist"
)

foreach ($target in $targets) {
    if (Test-Path $target) {
        Remove-Item $target -Recurse -Force
        Write-Host "Dihapus: $target"
    } else {
        Write-Host "Sudah tidak ada: $target"
    }
}

$laravelLog = "bimbelku-backend\storage\logs\laravel.log"
if (Test-Path $laravelLog) {
    Clear-Content $laravelLog
    Write-Host "Dikosongkan: $laravelLog"
}

Write-Host "Pembersihan Checkpoint 4 selesai. File upload pengguna, migration, vendor, node_modules, dan .git tidak disentuh."
