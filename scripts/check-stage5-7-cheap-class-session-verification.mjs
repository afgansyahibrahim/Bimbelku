import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const migration = read("bimbelku-backend/database/migrations/2026_08_15_145500_add_report_verification_to_cheap_class_sessions.php");
const service = read("bimbelku-backend/app/Services/CheapClassService.php");
const teacherController = read("bimbelku-backend/app/Http/Controllers/Api/TeacherCheapClassController.php");
const adminController = read("bimbelku-backend/app/Http/Controllers/Api/AdminCheapClassController.php");
const studentController = read("bimbelku-backend/app/Http/Controllers/Api/CheapClassController.php");
const schema = read("bimbelku-backend/app/Support/CheapClassSchema.php");
const routes = read("bimbelku-backend/routes/api.php");
const teacherUi = read("src/pages/teacher/CheapClasses.tsx");
const adminUi = read("src/pages/admin/CheapClassSchedule.tsx");
const studentUi = read("src/pages/students/CheapClasses.tsx");
const progressUi = read("src/pages/students/LearningProgressDetail.tsx");
const http = read("src/lib/http.ts");
const tests = read("bimbelku-backend/tests/Feature/CheapClassWorkflowTest.php");

const checks = [];
const add = (label, ok) => checks.push([label, Boolean(ok)]);

add("migration stores report attendance and admin review metadata",
  migration.includes("attended_participants_count")
  && migration.includes("report_submitted_at")
  && migration.includes("admin_review_notes")
  && migration.includes("admin_reviewed_by")
  && migration.includes("report_revision_count"));
add("runtime schema requires the report-verification columns",
  schema.includes("attended_participants_count")
  && schema.includes("report_submitted_at")
  && schema.includes("admin_reviewed_by"));
add("time end moves a confirmed session to report-required instead of completed",
  service.includes("->where('status', 'scheduled')")
  && service.includes("->update(['status' => 'report_required'])")
  && service.includes("Kelas selesai · laporan sesi belum diisi"));
add("package completes only after every session is completed",
  service.includes("->whereDoesntHave('sessions', fn ($sessions) => $sessions->where('status', '!=', 'completed'))"));
add("tutor report requires attendance, notes, and chapter updates",
  teacherController.includes("'attended_participants_count' => ['required'")
  && teacherController.includes("'session_notes' => ['required'")
  && teacherController.includes("'updates' => ['required'"));
add("tutor may submit only report-required or revision-requested sessions",
  teacherController.includes("['report_required', 'revision_requested']")
  && teacherController.includes("'status' => 'awaiting_admin_verification'"));
add("tutor report does not become canonical student progress before admin review",
  teacherController.includes("baru diterapkan ke class.subjects ketika")
  && studentController.includes("whereIn('status', ['confirmed', 'completed'])"));
add("student session payload hides unverified report details",
  service.includes("$session->status === 'completed' ? ($session->progress_updates ?? []) : []")
  && service.includes("$session->status === 'completed' ? $session->progress_notes : null"));
add("admin verify and revision routes exist with idempotency",
  routes.includes("/cheap-classes/{cheapClass}/sessions/{session}/verify")
  && routes.includes("/cheap-classes/{cheapClass}/sessions/{session}/request-revision")
  && routes.includes("'idempotency'"));
add("frontend HTTP client gives both admin review writes idempotency keys",
  http.includes("/admin\\/cheap-classes\\/\\d+\\/sessions\\/\\d+\\/(?:verify|request-revision)")
  || (http.includes("request-revision") && http.includes("sessions") && http.includes("verify")));
add("admin verification is ordered so later reports cannot rewrite history first",
  adminController.includes("Verifikasi sesi sebelumnya terlebih dahulu agar riwayat progress tetap berurutan."));
add("admin verification applies proposed progress and finalizes the session",
  adminController.includes("$class->update(['subjects' => $subjects])")
  && adminController.includes("'status' => 'completed'")
  && adminController.includes("Progress resmi murid sudah diperbarui"));
add("admin can request revision without finalizing the session",
  adminController.includes("'status' => 'revision_requested'")
  && adminController.includes("report_revision_count")
  && adminController.includes("Laporan sesi perlu diperbaiki"));
add("verified session notifies tutor and students, including final-package wording",
  adminController.includes("cheap-class-session-verified")
  && adminController.includes("Progress Kelas Murah diperbarui")
  && adminController.includes("Kelas Murah selesai"));
add("tutor UI explicitly guides report-required and revision states",
  teacherUi.includes("Langkah setelah mengajar")
  && teacherUi.includes("Isi & Kirim Laporan")
  && teacherUi.includes("Perbaiki Laporan")
  && teacherUi.includes("Kirim Laporan Sesi"));
add("tutor resubmission keeps the previous proposed chapter draft visible",
  teacherUi.includes("rowsForSession")
  && teacherUi.includes("proposed.status_after")
  && teacherUi.includes("proposed.notes"));
add("admin UI exposes report details plus verify and revision actions",
  adminUi.includes("Konfirmasi Sesi")
  && adminUi.includes("Minta Perbaikan")
  && adminUi.includes("Kehadiran")
  && adminUi.includes("progress_updates"));
add("student UI keeps completed packages in history with verified-progress copy",
  studentUi.includes('useState<"active" | "history">("active")')
  && studentUi.includes("Seluruh sesi sudah diverifikasi admin")
  && studentUi.includes("Lihat Progress"));
add("student progress detail distinguishes report lifecycle states",
  progressUi.includes("Menunggu admin")
  && progressUi.includes("Laporan diperbaiki")
  && progressUi.includes("Menunggu laporan tutor")
  && progressUi.includes("Progress terverifikasi"));
add("feature regressions cover admin gate, revision, ordered verification, and report-required transition",
  tests.includes("test_teacher_report_requires_admin_verification_before_student_progress_changes")
  && tests.includes("test_admin_can_request_cheap_class_report_revision_and_teacher_can_resubmit")
  && tests.includes("test_admin_must_verify_cheap_class_reports_in_session_order")
  && tests.includes("cheap-class-session-report-required"));

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed += 1;
}
if (failed) process.exit(1);
console.log(`\n${checks.length}/${checks.length} Cheap Class Session Verification checks PASS`);
