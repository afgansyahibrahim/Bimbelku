import fs from "node:fs";

const checks = [
  ["src/components/ui/alert-dialog.tsx", /z-\[var\(--layer-alert\)\]/, "confirm dialog must use the global critical-alert layer"],
  ["src/pages/admin/PaymentVerification.tsx", /getApiErrorDetails/, "admin verification must inspect stale-state errors"],
  ["src/pages/admin/PaymentVerification.tsx", /details\.status === 409 \|\| details\.status === 422/, "admin verification must refresh stale payment rows"],
  ["src/pages/admin/PaymentVerification.tsx", /value: "cancelled", label: "Dibatalkan"/, "cancelled payment history filter must exist"],
  ["bimbelku-backend/app/Http/Controllers/Api/AdminController.php", /'cancelled' => 'Tagihan ini sudah dibatalkan murid/, "backend must explain already-cancelled orders"],
  ["bimbelku-backend/app/Http/Controllers/Api/AdminController.php", /rejectPackagePayment\(\$order, \$reason, \$request->user\(\)\)/, "package rejection must record the acting admin"],
  ["bimbelku-backend/app/Services/PackageCheckoutService.php", /'verified_by' => \$admin\?->id/, "package rejection must persist verifier"],
];

let failed = false;
for (const [file, pattern, message] of checks) {
  const text = fs.readFileSync(file, "utf8");
  if (!pattern.test(text)) {
    console.error(`FAIL ${file}: ${message}`);
    failed = true;
  } else {
    console.log(`PASS ${file}: ${message}`);
  }
}
if (failed) process.exit(1);
