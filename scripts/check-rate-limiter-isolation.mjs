import fs from "node:fs";

const routes = fs.readFileSync("bimbelku-backend/routes/api.php", "utf8");
const provider = fs.readFileSync("bimbelku-backend/app/Providers/AppServiceProvider.php", "utf8");

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

expect(
  !/throttle:\d+\s*,\s*\d+/.test(routes),
  "Masih ada numeric/generic throttle yang dapat berbagi counter antar-route.",
);

const required = [
  "auth-register",
  "auth-login",
  "auth-forgot-password",
  "auth-reset-password",
  "account-password-change",
  "support-ticket-create",
  "support-ticket-reply",
  "session-action-poll",
  "booking-message-send",
  "booking-schedule-options",
  "booking-schedule-change-create",
  "booking-schedule-change-respond",
  "student-cheap-class-join",
  "student-cheap-class-cancel",
  "student-tutor-availability",
  "student-session-presence-confirm",
  "student-refund-destination",
  "student-package-retry",
  "student-package-reschedule",
  "student-promotion-preview",
  "student-promotion-claim",
  "student-package-quote",
  "student-package-create",
  "student-payment-submit",
  "teacher-cheap-class-meeting-link",
  "teacher-cheap-class-progress",
  "teacher-offer-action",
  "teacher-bank-change",
  "teacher-payout-request",
  "teacher-point-appeal",
  "teacher-session-ready",
  "teacher-session-checkout",
  "admin-cheap-class-template-create",
  "admin-cheap-class-template-recurrence",
  "admin-cheap-class-retry-teacher",
  "admin-cheap-class-session-review",
  "admin-matching-synchronize",
  "admin-matching-expand-radius",
  "admin-matching-assign-teacher",
];

for (const name of required) {
  expect(routes.includes(`throttle:${name}`), `Route belum memakai limiter ${name}.`);
  expect(
    provider.includes(`'${name}'`) || provider.includes(`\"${name}\"`),
    `Limiter ${name} belum didaftarkan di AppServiceProvider.`,
  );
}

expect(
  provider.includes("$keyParts = [$name, $actorKey($request)]"),
  "Named limiter wajib memasukkan namespace action + actor ke key.",
);
expect(
  routes.includes("throttle:session-action-poll") && routes.includes("throttle:teacher-bank-change"),
  "Polling sesi dan perubahan rekening harus memakai bucket yang berbeda.",
);
expect(
  routes.includes("['throttle:teacher-bank-change', 'idempotency', 'finance.audit:teacher_bank_change']"),
  "Perubahan rekening tetap wajib memakai idempotency + audit finansial.",
);
expect(
  routes.includes("['throttle:teacher-payout-request', 'idempotency', 'finance.audit:teacher_payout_request']"),
  "Pencairan Tutor tetap wajib memakai idempotency + audit finansial.",
);

if (failures.length) {
  console.error(`Rate Limiter Isolation FAILED (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Rate Limiter Isolation PASS (${required.length}/${required.length})`);
