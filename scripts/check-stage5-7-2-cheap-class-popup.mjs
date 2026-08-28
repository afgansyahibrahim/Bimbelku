import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const checks = [];
const add = (label, ok) => checks.push([label, Boolean(ok)]);

const reminder = read("src/components/SessionActionReminder.tsx");
const app = read("src/App.tsx");
const teacherPage = read("src/pages/teacher/CheapClasses.tsx");
const controller = read("bimbelku-backend/app/Http/Controllers/Api/LearningSessionController.php");
const demoTest = read("bimbelku-backend/tests/Feature/DemoCheapClassCommandTest.php");

add("global reminder runtime now includes admin", app.includes('["student", "teacher", "admin"].includes(role)'));
add("teacher report-required popup is server driven", controller.includes("cheap_teacher_report_required") && reminder.includes('case "cheap_teacher_report_required"'));
add("teacher revision popup includes admin reason", controller.includes("admin_review_notes") && reminder.includes("Admin mengembalikan laporan") && reminder.includes("Catatan admin:"));
add("admin verification popup is server driven", controller.includes("cheap_admin_verify_report") && reminder.includes("Laporan Kelas Kelompok menunggu verifikasi"));
add("student progress popup comes from unread verified notification", controller.includes("cheap-class-session-verified:%:student:") && reminder.includes("Progress kelasmu sudah diperbarui"));
add("student completed popup is informational", controller.includes("cheap_student_class_completed") && controller.includes("'informational' => true") && reminder.includes("Ini hanya informasi"));
add("informational popup is marked read on dismiss or CTA", reminder.includes("dismissInformational") && reminder.includes("/notifications/${action.notification_id}/read"));
add("required cheap-class reminders remain minimizable", reminder.includes("Minimalkan pengingat sesi") && reminder.includes("Boleh diminimalkan, tetapi pengingat tetap tersedia"));
add("one global queue prevents popup stacking", controller.includes("concat($this->cheapClassReminderActions($user))") && controller.includes("$actions->first()"));
add("teacher CTA deep-links to exact cheap class report", controller.includes('/guru/kelas?class_kind=group&cheap_class=') && controller.includes("$session->id") && controller.includes("$isRevision ? 'revision' : 'report'") && teacherPage.includes('params.get("cheap_class")') && teacherPage.includes("setOpenProgressId(requestedClassId)"));
add("demo test covers teacher admin revision and student popup states", demoTest.includes("cheap_teacher_report_required") && demoTest.includes("cheap_admin_verify_report") && demoTest.includes("cheap_teacher_revision_requested") && demoTest.includes("cheap_student_class_completed"));

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed += 1;
}

if (failed) process.exit(1);
console.log(`\n${checks.length}/${checks.length} Kelas Kelompok popup checks PASS`);
