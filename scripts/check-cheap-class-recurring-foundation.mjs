import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const migration = read('bimbelku-backend/database/migrations/2026_08_13_000160_build_recurring_cheap_class_foundation.php');
const service = read('bimbelku-backend/app/Services/CheapClassService.php');
const schema = read('bimbelku-backend/app/Support/CheapClassSchema.php');
const templateModel = read('bimbelku-backend/app/Models/CheapClassTemplate.php');
const packageModel = read('bimbelku-backend/app/Models/CheapClass.php');
const orderModel = read('bimbelku-backend/app/Models/Order.php');
const refundModel = read('bimbelku-backend/app/Models/Refund.php');
const test = read('bimbelku-backend/tests/Feature/CheapClassRecurringFoundationTest.php');

const checks = [
  [migration.includes("$table->string('template_code'") && migration.includes("$table->unique('template_code')"), 'template code has a database unique key'],
  [migration.includes("$table->string('package_code'") && migration.includes("$table->unique('package_code')"), 'package code has a database unique key'],
  [migration.includes('cheap_class_template_period_unique'), 'template and occurrence week have a composite unique key'],
  [migration.includes("$table->string('refund_code'") && migration.includes("$table->unique('refund_code')"), 'refund code has a database unique key'],
  [migration.includes("$table->unique('order_id')"), 'invoice code has a database unique key'],
  [templateModel.includes("return 'KMT-'") && packageModel.includes("return 'KMP-'"), 'template and package codes are generated automatically'],
  [orderModel.includes("return 'INV-KM-'") && refundModel.includes("'RFD-KM-'"), 'invoice and refund codes are generated automatically'],
  [service.includes("'template_snapshot' => $this->templateSnapshot($template)"), 'package stores a template snapshot'],
  [service.includes("'generation_source' => $generationSource") && service.includes("'manual'") && service.includes("'occurrence_week_start'"), 'manual package records source and occurrence period'],
  [schema.includes("'recurrence_enabled'") && schema.includes("'template_snapshot'"), 'runtime schema guard requires the new foundation'],
  [test.includes('test_stage_one_creates_automatic_codes_period_key_and_template_snapshot'), 'feature test covers identity and snapshot'],
  [test.includes('test_stage_one_creates_unique_invoice_and_refund_codes_automatically'), 'feature test covers financial codes'],
];

let failed = false;
for (const [ok, label] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failed = true;
}

if (failed) process.exit(1);
console.log('Pemeriksaan fondasi Kelas Kelompok berulang Tahap 1 lulus.');
