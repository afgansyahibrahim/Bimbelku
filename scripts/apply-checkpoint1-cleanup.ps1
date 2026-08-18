$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$obsoleteFiles = @(
    "src\pages\admin\AdminAccessControl.tsx",
    "src\pages\admin\FinanceSecurity.tsx",
    "bimbelku-backend\app\Http\Controllers\Api\FinanceApprovalController.php",
    "bimbelku-backend\app\Http\Controllers\Api\FinanceSecurityController.php",
    "bimbelku-backend\app\Http\Middleware\RequireFinanceAuthorization.php",
    "bimbelku-backend\app\Models\FinanceAuthorization.php",
    "bimbelku-backend\app\Services\FinanceAuthorizationService.php",
    "bimbelku-backend\app\Services\FinanceTotpService.php",
    "scripts\apply-single-admin-cleanup.ps1"
)

foreach ($relativePath in $obsoleteFiles) {
    $fullPath = Join-Path $projectRoot $relativePath
    if (Test-Path $fullPath) {
        Remove-Item -Force $fullPath
        Write-Host "Dihapus: $relativePath" -ForegroundColor Green
    } else {
        Write-Host "Sudah tidak ada: $relativePath" -ForegroundColor DarkGray
    }
}

$generatedDirectories = @(
    "dist",
    "bimbelku-backend\bootstrap\cache"
)

foreach ($relativePath in $generatedDirectories) {
    $fullPath = Join-Path $projectRoot $relativePath
    if (Test-Path $fullPath) {
        if ($relativePath -eq "bimbelku-backend\bootstrap\cache") {
            Get-ChildItem $fullPath -Force |
                Where-Object { $_.Name -ne ".gitignore" } |
                Remove-Item -Recurse -Force
            Write-Host "Cache dibersihkan: $relativePath" -ForegroundColor Green
        } else {
            Remove-Item -Recurse -Force $fullPath
            Write-Host "Hasil build lama dihapus: $relativePath" -ForegroundColor Green
        }
    }
}

Write-Host "Pembersihan Checkpoint 1 selesai. Source, migration, upload pengguna, dan database tidak dihapus." -ForegroundColor Cyan
