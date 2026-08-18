import fs from "node:fs";
const read = (p) => fs.readFileSync(p, "utf8");
const route = read("bimbelku-backend/routes/api.php");
const controller = read("bimbelku-backend/app/Http/Controllers/Api/AdminCheapClassController.php");
const service = read("bimbelku-backend/app/Services/CheapClassService.php");
const ui = read("src/pages/admin/CheapClassSchedule.tsx");
const http = read("src/lib/http.ts");
const test = read("bimbelku-backend/tests/Feature/CheapClassWorkflowTest.php");
const checks = [
  [route.includes("/cheap-classes/{cheapClass}/cancel") && route.includes("'idempotency', 'finance.audit:cheap_class_cancel'"), "route cancel admin + idempotency + finance audit"],
  [controller.includes("public function cancel(") && controller.includes("cancellationEligibility"), "controller cancel uses eligibility"],
  [service.includes("public function cancellationEligibility") && service.includes("cancelClass"), "service cancellation eligibility exists"],
  [ui.includes("Batalkan paket") && ui.includes("item.can_cancel") && ui.includes("/cancel`"), "UI exposes cancel action from backend state"],
  [ui.includes("item.can_delete") && ui.includes(": item.can_cancel") && !ui.includes("{item.can_cancel && <Button"), "UI shows delete or cancel as one contextual action"],
  [http.includes('/\\/admin\\/cheap-classes\\/\\d+\\/cancel$/.test(url)'), "HTTP client attaches Idempotency-Key to admin cancel"],
  [test.includes("cheap-class-admin-cancel-0001") && test.includes("cheap-class-admin-cancel-paid-0001") && test.includes("cheap-class-admin-cancel-started-0001"), "cancel endpoint tests send Idempotency-Key"],
  [test.includes("test_admin_can_cancel_a_future_package") && test.includes("test_admin_cancel_of_paid_future_package_queues_refund") && test.includes("test_admin_cannot_cancel_a_package_after_the_first_session_started"), "regression tests cover cancel flow"],
];
let failed = 0;
for (const [ok, label] of checks) { console.log(`${ok ? "PASS" : "FAIL"} ${label}`); if (!ok) failed++; }
if (failed) process.exit(1);
