import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const checks = [];
const expect = (condition, label) => checks.push([Boolean(condition), label]);

const model = read("bimbelku-backend/app/Models/TeacherSubject.php");
const teacherUi = read("src/pages/teacher/TeacherProfile.tsx");
const teacherController = read("bimbelku-backend/app/Http/Controllers/Api/TeacherController.php");
const defaultsMigration = read("bimbelku-backend/database/migrations/2026_08_29_000300_finalize_revision_four_defaults.php");
const packageController = read("bimbelku-backend/app/Http/Controllers/Api/StudentPackageController.php");
const packageUi = read("src/pages/students/PackageBuilder.tsx");
const messages = read("src/components/MarketplaceMessages.tsx");
const adminController = read("bimbelku-backend/app/Http/Controllers/Api/AdminController.php");
const userUi = read("src/pages/admin/UserManagement.tsx");
const refundMigration = read("bimbelku-backend/database/migrations/2026_09_04_000200_enable_partial_order_refunds.php");
const provider = read("bimbelku-backend/app/Providers/AppServiceProvider.php");
const routes = read("bimbelku-backend/routes/api.php");
const replacementController = read("bimbelku-backend/app/Http/Controllers/Api/TeacherReplacementController.php");
const exampleEnv = read("bimbelku-backend/.env.example");
const featureConfig = read("bimbelku-backend/config/features.php");

expect(model.includes("'is_group_active' => false"), "model defaults group service to inactive");
expect(teacherUi.includes("is_group_active: false"), "teacher UI defaults group service to inactive");
expect(teacherController.includes("item['is_group_active'] ?? false"), "teacher API defaults group service to inactive");
expect(defaultsMigration.includes("DEFAULT 0") && !defaultsMigration.includes("update(['is_group_active' => true])"), "migration preserves opt-in group service");
expect(packageController.includes("$selectedWeekdays") && packageController.includes("seluruh paket melebihi batas paket"), "backend limits unique weekdays across the package");
expect(packageUi.includes("packageWeekdays.size <= weekdayLimit") && packageUi.includes("hari unik untuk seluruh paket"), "UI limits unique weekdays across the package");
expect(messages.includes("stickToBottomRef.current = distanceFromBottom <= 80") && messages.includes("if (stickToBottomRef.current)"), "chat does not force-scroll readers of older messages");
expect(adminController.includes("'subject_options'") && adminController.includes("TeacherSubject::query()"), "API returns complete active teacher subject options");
expect(userUi.includes("response.data.subject_options"), "teacher filter uses server-provided options");
expect(refundMigration.includes("$hasDuplicateOrders") && refundMigration.includes("! $hasDuplicateOrders"), "partial-refund rollback handles duplicate order refunds");
expect(provider.includes("admin-teacher-replacement-review") && routes.includes("throttle:admin-teacher-replacement-review"), "admin replacement decisions have an isolated limiter");
expect(replacementController.includes("dispatchMatchingSafely") && replacementController.includes("'deferred' => true"), "matching dispatch failures are deferred safely");
expect(
  exampleEnv.includes("FEATURE_TEACHER_REPLACEMENT=true")
    && featureConfig.includes("env('FEATURE_TEACHER_REPLACEMENT', true)"),
  "teacher replacement is enabled for new installations",
);

for (const file of [
  "AdminClassController.php",
  "ClassMonitoring.tsx",
  "src/components/TrustStrip.tsx",
  "voucher-search.txt",
  "DELETE_THESE_FILES.txt",
  "FILES_CHANGED.txt",
]) {
  expect(!fs.existsSync(file), `obsolete artifact stays removed: ${file}`);
}

const mojibake = /(?:Ã|Â|â€|ï¿½|�)/u;
for (const file of [
  "src/pages/admin/PaymentVerification.tsx",
  "bimbelku-backend/app/Http/Controllers/Api/AuthController.php",
  "bimbelku-backend/app/Http/Controllers/Api/AdminController.php",
  "bimbelku-backend/app/Http/Controllers/Api/StudentPackageController.php",
  "bimbelku-backend/app/Http/Controllers/Api/TeacherController.php",
]) {
  expect(!mojibake.test(read(file)), `no mojibake remains in ${file}`);
}

for (const [ok, label] of checks) console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
const failed = checks.filter(([ok]) => !ok);
console.log(`Revision 4 audit fixes ${checks.length - failed.length}/${checks.length}`);
if (failed.length) process.exit(1);
