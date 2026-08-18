import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const expect = (condition, message) => {
  if (!condition) throw new Error(`Kontrak Tahap 6C-B gagal: ${message}`);
};

const page = read("src/pages/admin/TutorSearchMonitoring.tsx");
const routes = read("bimbelku-backend/routes/api.php");
const controller = read("bimbelku-backend/app/Http/Controllers/Api/AdminMatchingController.php");
const matchingService = read("bimbelku-backend/app/Services/TeacherMatchingService.php");
const assignmentService = read("bimbelku-backend/app/Services/TeacherAssignmentService.php");
const model = read("bimbelku-backend/app/Models/MatchingOperationLog.php");
const migration = read("bimbelku-backend/database/migrations/2026_08_01_000400_build_stage_six_c_matching_controls.php");
const packageController = read("bimbelku-backend/app/Http/Controllers/Api/StudentPackageController.php");
const test = read("bimbelku-backend/tests/Feature/StageSixCAdminOperationsTest.php");

for (const text of [
  "Perluas radius pencarian",
  "Perluas dan cari ulang",
  "Tetapkan tutor secara manual",
  "confirmed_teacher_consent",
  "Riwayat kontrol admin",
]) {
  expect(page.includes(text), `UI memuat ${text}`);
}
expect(page.includes("3, 5, 8, lalu 12 km"), "urutan radius dijelaskan kepada admin");
expect(page.includes("admin/tutor-searches/${id}/candidates"), "UI memuat kandidat manual dari backend");
expect(page.includes("manual_candidate_count") && page.includes("operation_history"), "detail memakai data kandidat dan audit nyata");

for (const endpoint of [
  "Route::get('/tutor-searches/{bookingRequest}/candidates'",
  "Route::post('/tutor-searches/{bookingRequest}/expand-radius'",
  "Route::post('/tutor-searches/{bookingRequest}/assign-teacher'",
]) {
  expect(routes.includes(endpoint), `API ${endpoint} tersedia`);
}

expect(controller.includes("min:10") && controller.includes("confirmed_teacher_consent"), "aksi admin mewajibkan alasan dan konfirmasi kesediaan tutor");
expect(controller.includes("operation_history") && controller.includes("can_expand_radius"), "detail backend mengirim histori dan izin aksi");
expect(matchingService.includes("[3, 5, 8, 12]") && matchingService.includes("radius_expanded"), "radius bertahap dan pencatatannya tersedia");
expect(assignmentService.includes("eligibilityError") && assignmentService.includes("teacherHasConflict"), "penetapan manual memeriksa kelayakan dan bentrok");
expect(assignmentService.includes("where('status', 'pending')") && assignmentService.includes("'status' => 'cancelled'"), "penawaran lain dibatalkan saat tutor ditetapkan");
expect(assignmentService.includes("DB::transaction") && assignmentService.includes("teacher_assigned_manually"), "penetapan manual transaksional dan diaudit");
expect(model.includes("before_state") && model.includes("after_state"), "model log menyimpan kondisi sebelum dan sesudah");
expect(migration.includes("matching_operation_logs") && migration.includes("booking_request_id"), "migrasi log pencarian tersedia");
expect(packageController.includes("student_package") && packageController.includes("MatchingOperationLog::create"), "perluasan radius paket oleh murid juga tercatat");

for (const scenario of [
  "test_admin_can_expand_offline_radius_in_sequence_and_audit_the_reason",
  "test_admin_can_assign_an_eligible_teacher_manually",
  "test_manual_assignment_rejects_teacher_with_schedule_conflict",
]) {
  expect(test.includes(scenario), `tes backend memuat ${scenario}`);
}

console.log("Kontrak Tahap 6C-B lulus (perluasan radius dan penetapan tutor manual). ");
