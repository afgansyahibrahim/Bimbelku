$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$targets = @(
    "bimbelku-backend\app\Http\Controllers\Api\ClassroomConversationController.php",
    "bimbelku-backend\app\Models\ClassroomConversationRead.php",
    "scripts\check-revision4-messages.mjs"
)
foreach ($relative in $targets) {
    $path = Join-Path $projectRoot $relative
    if (Test-Path $path) {
        Remove-Item -Force $path
        Write-Host "Dihapus: $relative"
    }
}
Write-Host "Pembersihan Checkpoint 3 selesai. Migration lama tidak dihapus."
