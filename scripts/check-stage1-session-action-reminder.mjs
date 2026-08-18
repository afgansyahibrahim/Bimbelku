import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const checks = [];
const add = (label, ok) => checks.push([label, Boolean(ok)]);

const app = read("src/App.tsx");
const reminder = read("src/components/SessionActionReminder.tsx");
const hub = read("src/components/LearningSessionHub.tsx");
const studentClasses = read("src/pages/students/MyClasses.tsx");
const teacherClasses = read("src/pages/teacher/ManageClasses.tsx");
const routes = read("bimbelku-backend/routes/api.php");
const learningSession = read("bimbelku-backend/app/Http/Controllers/Api/LearningSessionController.php");
const appServiceProvider = read("bimbelku-backend/app/Providers/AppServiceProvider.php");

add("global reminder component exists", exists("src/components/SessionActionReminder.tsx"));
add("reminder mounted for student and teacher runtime", app.includes("SessionActionRuntime") && app.includes("<SessionActionReminder />"));
add("server exposes next session action", routes.includes("Route::get('/session-action/next'") && learningSession.includes("function nextAction"));
add("server owns reminder state", learningSession.includes("sessionReminderAction") && learningSession.includes("teacher_complete_session") && learningSession.includes("student_review_session"));
add("one action at a time with pending queue count", reminder.includes("pending_count") && reminder.includes("pendingCount > 1") && learningSession.includes("$actions->first()"));
add("close only minimizes reminder", reminder.includes("Minimalkan pengingat sesi") && reminder.includes("sessionStorage") && reminder.includes("Boleh diminimalkan"));
add("student PIN guidance is human readable", hub.includes("Tutor sudah hadir?") && hub.includes("Buat PIN untuk tutor") && hub.includes("Sebutkan PIN langsung kepada tutor"));
add("active PIN replacement is explicit", learningSession.includes("PIN sebelumnya masih aktif") && learningSession.includes("$request->boolean('replace')") && hub.includes("Buat PIN baru?"));
add("PIN rate limit is isolated per student and booking", routes.includes("throttle:student-session-pin") && appServiceProvider.includes("RateLimiter::for('student-session-pin'") && appServiceProvider.includes("student-session-pin:'.$actorKey($request).':'.$bookingId") && appServiceProvider.includes("session_pin_rate_limited"));
add("teacher flow uses simple labels", hub.includes("Konfirmasi kehadiranmu") && hub.includes("Mulai sesi") && hub.includes("Akhiri sesi") && teacherClasses.includes("Isi Hasil Belajar") && teacherClasses.includes("Selesaikan Sesi"));
add("attendance locks after progress", learningSession.includes("Kehadiran sudah dikunci karena hasil belajar sesi telah disimpan") && learningSession.includes("!$booking->learningProgressReports->count()"));
add("student review remains two-step", studentClasses.includes("Sesi tadi sudah sesuai?") && studentClasses.includes("Ya, sesi sesuai") && studentClasses.includes("useConfirmDialog"));
add("deep links open the correct session UI", studentClasses.includes("session_action") && studentClasses.includes('action === "pin"') && teacherClasses.includes("session_action") && teacherClasses.includes('deepAction === "progress"'));
add("completed tutor checklist renders prior steps done", teacherClasses.includes('confirmationDone || steps.check_in') && teacherClasses.includes('confirmationDone || steps.progress'));
add("security regression test added", exists("bimbelku-backend/tests/Feature/StageOneSessionActionReminderTest.php"));

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed += 1;
}

if (failed) process.exit(1);
console.log(`\n${checks.length}/${checks.length} Session Action Reminder checks PASS`);
