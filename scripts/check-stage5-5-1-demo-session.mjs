import fs from "node:fs";

const checks = [
  ["demo command exists", "bimbelku-backend/app/Console/Commands/DemoSessionReminder.php", "demo:session-reminder"],
  ["demo command local guard", "bimbelku-backend/app/Console/Commands/DemoSessionReminder.php", "environment(['local', 'testing'])"],
  ["demo tutor profile verified", "bimbelku-backend/app/Console/Commands/DemoSessionReminder.php", "'verified_at' => now()"],
  ["demo tutor has positive points", "bimbelku-backend/app/Console/Commands/DemoSessionReminder.php", "'points' => 100"],
  ["demo test verifies real tutor login", "bimbelku-backend/tests/Feature/StageOneSessionActionReminderTest.php", "demo.tutor@bimbelku.local"],
  ["demo test verifies reminder endpoint", "bimbelku-backend/tests/Feature/StageOneSessionActionReminderTest.php", "->assertJsonPath('data.kind', 'student_generate_pin')"],
  ["checkout-ready stage", "bimbelku-backend/app/Console/Commands/DemoSessionReminder.php", "checkout-ready"],
  ["72h production rule untouched by demo", "bimbelku-backend/app/Console/Commands/DemoSessionReminder.php", "Rule pemesanan 72 jam production tidak diubah"],
  ["student plan reminder", "bimbelku-backend/app/Http/Controllers/Api/LearningSessionController.php", "student_acknowledge_learning_plan"],
  ["teacher plan reminder", "bimbelku-backend/app/Http/Controllers/Api/LearningSessionController.php", "teacher_prepare_learning_plan"],
  ["teacher plan deep link", "src/pages/teacher/ManageClasses.tsx", 'deepAction === "plan" ? "plan"'],
  ["student plan deep link", "src/pages/students/MyClasses.tsx", 'action === "pin" || action === "plan"'],
  ["reminder copy plan", "src/components/SessionActionReminder.tsx", "Periksa tujuan belajar"],
];
let failed = 0;
for (const [label, file, needle] of checks) {
  const text = fs.readFileSync(file, "utf8");
  if (text.includes(needle)) console.log(`PASS ${label}`);
  else { console.error(`FAIL ${label}`); failed++; }
}
if (failed) process.exit(1);
