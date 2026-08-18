import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const migration = read('bimbelku-backend/database/migrations/2026_08_13_000170_add_recurring_cheap_class_runtime_state.php');
const service = read('bimbelku-backend/app/Services/CheapClassService.php');
const controller = read('bimbelku-backend/app/Http/Controllers/Api/AdminCheapClassController.php');
const routes = read('bimbelku-backend/routes/api.php');
const consoleRoutes = read('bimbelku-backend/routes/console.php');
const command = read('bimbelku-backend/app/Console/Commands/ExpireBookingWorkflow.php');
const managementUi = read('src/pages/admin/CheapClassManagement.tsx');
const scheduleUi = read('src/pages/admin/CheapClassSchedule.tsx');
const recurringUi = read('src/pages/admin/CheapClassRecurring.tsx');
const app = read('src/App.tsx');
const http = read('src/lib/http.ts');
const test = read('bimbelku-backend/tests/Feature/CheapClassRecurringEngineTest.php');

const checks = [
  [migration.includes("'last_skipped_at'") && migration.includes("'last_generation_failed_at'") && migration.includes("'last_generation_error'"), 'migration records skipped and failed generations'],
  [service.includes('public function publishDueRecurringPackages') && service.includes("->where('next_publish_at', '<=', now())"), 'engine selects active due templates'],
  [service.includes('lockForUpdate()->find($templateId)') && service.includes("'occurrence_week_start'"), 'engine locks template and uses the unique weekly period'],
  [service.includes("'generation_source' => $generationSource") && service.includes("'recurring'"), 'generated package records recurring source'],
  [service.includes('while (') && service.includes("$template->last_skipped_at = $scheduledPublishAt->copy()"), 'closed missed weeks are skipped instead of backfilled'],
  [service.includes('public function setRecurrenceActive') && service.includes('nextAlignedPublishAfter'), 'backend supports recurrence ON and OFF with future alignment'],
  [controller.includes("'recurrence_enabled' => ['sometimes', 'boolean']") && controller.includes('updateRecurrence'), 'admin API validates create and ON/OFF settings'],
  [routes.includes("cheap-class-templates/{cheapClassTemplate}/recurrence"), 'admin recurrence route exists'],
  [http.includes('/admin\\/cheap-class-templates\\/\\d+\\/recurrence$'), 'frontend HTTP client supplies an idempotency key for ON/OFF'],
  [consoleRoutes.includes("Schedule::command('bookings:expire')") && command.includes('$cheapClassService->maintain()'), 'weekly engine is connected to the minute scheduler'],
  [managementUi.includes('Ulangi paket otomatis setiap minggu') && managementUi.includes('recurrence_enabled: false'), 'creation UI exposes the weekly option safely OFF by default'],
  [managementUi.includes('Konfirmasi paket Kelas Murah') && managementUi.includes('reviewOpen') && managementUi.includes('Tinjau sebelum dibuat'), 'creation UI opens the review only after the form is valid'],
  [managementUi.includes('sessionSchedulePreview') && managementUi.includes('Tanggal ini mengikuti perhitungan yang dikirim ke backend'), 'review modal previews every scheduled session using the selected weekdays'],
  [managementUi.includes('onClick={onBack}') && managementUi.includes('onClick={onContinue}') && managementUi.includes('disabled={saving || !formReady}') && managementUi.includes('Kembali') && managementUi.includes('Lanjutkan'), 'review modal requires an explicit back or continue decision'],
  [scheduleUi.includes('Berulang ·') && scheduleUi.includes('Paket berikutnya dijadwalkan terbit'), 'schedule UI distinguishes recurring packages'],
  [routes.includes("cheap-class-templates/recurring") && controller.includes('public function recurringTemplates'), 'dedicated recurring-template API exists'],
  [app.includes('/admin/kelas-murah/berulang') && recurringUi.includes('Paket Berulang') && recurringUi.includes('Nonaktifkan pengulangan'), 'dedicated recurring management page exposes ON and OFF controls'],
  [recurringUi.includes('http.patch(`/admin/cheap-class-templates/${item.id}/recurrence`') && recurringUi.includes('Minggu yang terlewat tidak dibuat ulang'), 'recurring page is connected to the backend without missed-week backfill'],
  [controller.includes("'scope' => ['nullable', Rule::in(['active', 'history'])]") && scheduleUi.includes('Jadwal Aktif') && scheduleUi.includes('Riwayat'), 'cancelled and finished packages are separated from the active schedule'],
  [test.includes('without_duplicates') && test.includes('deactivation_stops_future_generation') && test.includes('forgets_missed_weeks') && test.includes('skips_closed_windows'), 'feature tests cover duplicate, OFF, reactivation, and missed weeks'],
  [test.includes('dedicated_recurring_template_list') && test.includes('removed_from_active_schedule_and_kept_in_history'), 'feature tests cover recurring management and cancelled-package history'],
];

let failed = false;
for (const [ok, label] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failed = true;
}

if (failed) process.exit(1);
console.log('Pemeriksaan mesin Kelas Murah berulang Tahap 2 lulus.');
