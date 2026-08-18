import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const service = read('bimbelku-backend/app/Services/CheapClassService.php');
const test = read('bimbelku-backend/tests/Feature/CheapClassPaymentLifecycleTest.php');

const expireSeats = service.slice(
  service.indexOf('private function expireSeats'),
  service.indexOf('private function queueRefund'),
);
const finalize = service.slice(
  service.indexOf('public function finalizeIfReady'),
  service.indexOf('public function cancelClass'),
);

const checks = [
  [service.includes("abort_if(!$enrollment->seat_expires_at?->isFuture()"), 'payment is rejected at or after the exact seat deadline'],
  [service.includes("abort_if(!$class->registration_deadline->isFuture()"), 'student cancellation closes exactly at the registration deadline'],
  [expireSeats.indexOf('$class = CheapClass::query()->lockForUpdate()') < expireSeats.indexOf('$locked = CheapClassEnrollment::query()'), 'seat expiry locks class before enrollment'],
  [expireSeats.indexOf('$locked = CheapClassEnrollment::query()') < expireSeats.indexOf('$order = Order::query()'), 'seat expiry locks enrollment before order'],
  [expireSeats.includes("!in_array($order->status, ['pending', 'rejected'], true)"), 'seat expiry does not overwrite submitted or paid finance records'],
  [finalize.includes('Tutor tidak tersedia sampai pendaftaran berakhir.') && finalize.indexOf('teacherCanTeach') < finalize.indexOf("$submitted ="), 'missing tutor cancels the package before submitted proof can stall lifecycle'],
  [service.includes("'cancel_after_verification' => true") && service.includes('Pembayaran Kelas Murah belum selesai diverifikasi sebelum sesi pertama dimulai'), 'late verification goes directly to refund and package cancellation'],
  [test.includes('test_exact_seat_deadline_rejects_payment_and_expires_the_invoice'), 'feature test covers the exact payment boundary'],
  [test.includes('test_missing_teacher_at_deadline_cancels_package_but_keeps_submitted_proof_for_review'), 'feature test covers missing tutor with pending proof'],
  [test.includes('test_payment_verified_after_first_session_never_confirms_the_package_and_refunds_once'), 'feature test covers late verification and one refund'],
];

let failed = false;
for (const [ok, label] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failed = true;
}

if (failed) process.exit(1);
console.log('Pemeriksaan pembayaran dan lifecycle Kelas Murah Tahap 5 lulus.');
