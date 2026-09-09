import fs from "node:fs";

const command = fs.readFileSync("bimbelku-backend/app/Console/Commands/DemoTeacherReplacement.php", "utf8");
const test = fs.readFileSync("bimbelku-backend/tests/Feature/DemoTeacherReplacementCommandTest.php", "utf8");
const service = fs.readFileSync("bimbelku-backend/app/Services/TeacherReplacementService.php", "utf8");
const refund = fs.readFileSync("bimbelku-backend/app/Services/PartialPackageRefundService.php", "utf8");
const exampleEnv = fs.readFileSync("bimbelku-backend/.env.example", "utf8");

const checks = [];
const add = (label, ok) => checks.push([label, Boolean(ok)]);

add("command demo ganti guru tersedia", command.includes("demo:teacher-replacement"));
add("command terkunci untuk local/testing", command.includes("environment(['local', 'testing'])"));
add("fixture memakai paket dan booking produksi", command.includes("LearningPackage::create") && command.includes("Booking::create") && command.includes("PackageSession::create"));
add("data demo memiliki prefix reset aman", command.includes("DEMO-GGR-") && command.includes("archivePreviousFixtures"));
add("demo memiliki guru lama dan guru pengganti terpisah", command.includes("OLD_TEACHER_EMAIL") && command.includes("NEW_TEACHER_EMAIL"));
add("kandidat dapat dimatikan dan diaktifkan", command.includes("candidate-off") && command.includes("candidate-on"));
add("no-teacher memakai matching production", command.includes("dispatchNextOffer") && command.includes("search_expires_at"));
add("refund demo memakai service parsial production", command.includes("queueTeacherReplacement") && command.includes("completeTeacherReplacementRefund"));
add("reset mempertahankan riwayat finansial", command.includes("Riwayat sesi dan finansial sengaja dipertahankan"));
add("test cabang guru ditemukan melewati endpoint role", test.includes("/teacher-replacements") && test.includes("/api/teacher/offers/") && test.includes("/accept"));
add("test cabang pencarian berulang", test.includes("/retry") && test.match(/demo:teacher-replacement no-teacher/g)?.length >= 2);
add("test mencapai refund parsial selesai", test.includes("/request-refund") && test.includes("complete-refund") && test.includes("'refunded'"));
add("service menjaga booking historis", service.includes("replacement_of_booking_id") && service.includes("teacher_replaced"));
add("service refund menjaga order parsial", refund.includes("queueTeacherReplacement") && refund.includes("REFUNDED"));
add("fitur penggantian guru aktif pada instalasi baru", exampleEnv.includes("FEATURE_TEACHER_REPLACEMENT=true"));

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed += 1;
}
if (failed) process.exit(1);
console.log(`\n${checks.length}/${checks.length} Demo Teacher Replacement checks PASS`);
