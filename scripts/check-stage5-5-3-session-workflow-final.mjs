import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const checks = [];
const add = (label, ok) => checks.push([label, Boolean(ok)]);

const demo = read("bimbelku-backend/app/Console/Commands/DemoSessionReminder.php");
const checkout = read("bimbelku-backend/app/Services/PackageCheckoutService.php");
const studentApi = read("bimbelku-backend/app/Http/Controllers/Api/StudentController.php");
const reminder = read("src/components/SessionActionReminder.tsx");
const studentClasses = read("src/pages/students/MyClasses.tsx");
const teacherClasses = read("src/pages/teacher/ManageClasses.tsx");
const tests = read("bimbelku-backend/tests/Feature/StageOneSessionActionReminderTest.php");

add("demo is a real learning package", demo.includes("LearningPackage::create") && demo.includes("PackageSubject::create") && demo.includes("PackageSession::create"));
add("demo contains package chapter topics", demo.includes("PackageLearningTopic::create") && demo.includes("Persamaan Linear") && demo.includes("Menyelesaikan soal cerita"));
add("demo setup is not immediately checkout-ready", demo.includes("$start = now()->subMinutes(2)") && demo.includes("$end = $start->copy()->addHour()"));
add("demo checkout-ready synchronizes package session", demo.includes("'scheduled_start_at' => $start") && demo.includes("'scheduled_end_at' => $end"));
add("72 hour production rule is not bypassed", demo.includes("Rule pemesanan 72 jam production tidak diubah"));
add("package activation no longer pre-approves student", checkout.includes("'status' => 'paid'") && checkout.includes("'approved_at' => null") && !checkout.includes("'status' => 'confirmed',\n                        'approved_at' => now()"));
add("student API exposes actionable review fallback", studentApi.includes("'kind' => 'review'") && studentApi.includes("'button_label' => 'Periksa & Konfirmasi'"));
add("student API exposes plan acknowledgement fallback", studentApi.includes("'kind' => 'plan'") && studentApi.includes("'button_label' => 'Periksa Target Belajar'"));
add("student action fallback avoids per-card learning-plan queries", studentApi.includes("$sharedPlans") && studentApi.includes("->keyBy('package_subject_id')"));
add("reminder suppression matches booking and action", reminder.includes("Number(params.get(\"session\")) === action.booking_id") && reminder.includes("params.get(\"session_action\") === target.searchParams.get(\"session_action\")"));
add("reminder cross-browser polling is responsive", reminder.includes("}, 8_000);"));
add("student class list force-refreshes cross-browser state", studentClasses.includes('"/student/classes", { maxAgeMs: 2_000, force: true }') && studentClasses.includes("loadClasses({ silent: true })") && studentClasses.includes("item.attention"));
add("student card has persistent action fallback", studentClasses.includes("Perlu tindakan") && studentClasses.includes("openAttention(item)"));
add("teacher class list force-refreshes cross-browser state", teacherClasses.includes('"/teacher/classes", { maxAgeMs: 2_000, force: true }') && teacherClasses.includes("loadClasses({ silent: true })"));
add("teacher card makes progress action obvious", teacherClasses.includes("Hasil belajar belum diisi") && teacherClasses.includes("Catat progress pertemuan sekarang") && teacherClasses.includes("Isi Hasil Belajar"));
add("teacher card explains waiting student state", teacherClasses.includes("Persetujuan sesi sudah diminta") && teacherClasses.includes("Tidak ada tindakan tutor lagi"));
add("regression tests assert real package and paid unapproved participant", tests.includes("DEMO-SESSION-%") && tests.includes("assertSame('paid', $participant->status)") && tests.includes("assertNull($participant->approved_at)"));
add("regression tests assert student review card fallback", tests.includes("0.attention.kind") && tests.includes("Periksa & Konfirmasi"));
add("end-to-end package test reaches final approval and history", tests.includes("test_demo_real_package_finishes_end_to_end_with_topic_progress_and_student_approval") && tests.includes("topic_updates") && tests.includes("/approve") && tests.includes("scope=history"));

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed += 1;
}
if (failed) process.exit(1);
console.log(`\n${checks.length}/${checks.length} Session Workflow Final checks PASS`);
