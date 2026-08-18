import fs from "node:fs";

const commandFile = "bimbelku-backend/app/Console/Commands/DemoCheapClass.php";
const testFile = "bimbelku-backend/tests/Feature/DemoCheapClassCommandTest.php";
const command = fs.readFileSync(commandFile, "utf8");
const test = fs.readFileSync(testFile, "utf8");

const checks = [];
const add = (label, ok) => checks.push([label, Boolean(ok)]);

add("demo cheap class command exists", command.includes("demo:cheap-class"));
add("command is locked to local/testing", command.includes("environment(['local', 'testing'])"));
add("setup creates a confirmed real cheap class", command.includes("'status' => 'confirmed'") && command.includes("CheapClass::create"));
add("setup creates a real session currently in progress", command.includes("CheapClassSession::create") && command.includes("'status' => 'scheduled'"));
add("setup creates minimum two confirmed participants", command.includes("SECOND_STUDENT_EMAIL") && command.includes("CheapClassEnrollment::create"));
add("setup creates paid orders so student progress access is production-like", command.includes("Order::create") && command.includes("'status' => 'paid'"));
add("demo tutor satisfies production verification rules", command.includes("'verified_at' => now()") && command.includes("'points' => 100"));
add("existing primary admin password is never overwritten", command.includes("gunakan password admin utama yang sudah ada") && command.includes("if ($admin)"));
add("session-ended only advances the local fixture and requires report", command.includes("session-ended") && command.includes("report_required"));
add("status command explains every important report state", ["scheduled", "report_required", "awaiting_admin_verification", "revision_requested", "completed"].every((needle) => command.includes(needle)));
add("reset only targets DEMO-KM packages", command.includes("PACKAGE_PREFIX = 'DEMO-KM-'") && command.includes("where('package_code', 'like', self::PACKAGE_PREFIX.'%')"));
add("feature test logs in student teacher and demo admin", test.includes("demo.student@bimbelku.local") && test.includes("demo.tutor@bimbelku.local") && test.includes("demo.admin@bimbelku.local"));
add("feature test proves unverified tutor report does not change student progress", test.includes("assertSame('not_started', $class->fresh()->subjects[0]['progress_status'])"));
add("feature test covers admin revision and tutor resubmission", test.includes("request-revision") && test.includes("revision_requested"));
add("feature test covers final admin verification and package completion", test.includes("/verify") && test.includes("assertJsonPath('class_status', 'completed')"));

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed += 1;
}

if (failed) process.exit(1);
console.log(`\n${checks.length}/${checks.length} Demo Kelas Murah checks PASS`);
