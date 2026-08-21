import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const service = read("bimbelku-backend/app/Services/CheapClassService.php");
const student = read("src/pages/students/CheapClasses.tsx");
const admin = read("src/pages/admin/PaymentVerification.tsx");
const finance = read("bimbelku-backend/app/Http/Controllers/Api/AdminFinanceOperationsController.php");
const payment = read("src/pages/pembayaran/PaymentPage.tsx");
const tests = read("bimbelku-backend/tests/Feature/CheapClassWorkflowTest.php");

const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

expect(
  service.includes("in_array($lockedEnrollment->status, ['seat_held', 'payment_rejected'], true)")
    && service.includes("Keikutsertaan tidak dapat dibatalkan setelah bukti pembayaran dikirim atau pembayaran diterima"),
  "pembatalan mandiri wajib dibatasi ke seat_held/payment_rejected",
);
expect(
  service.includes("$canReuseEnrollment")
    && service.includes("['cancelled', 'payment_expired']")
    && student.includes("Gabung Lagi"),
  "peserta yang batal sebelum pembayaran wajib dapat bergabung lagi",
);
expect(
  service.includes("$confirmedCount >= (int) $class->maximum_participants")
    && service.includes("Pembayaran Kelas Kelompok melebihi kapasitas maksimum kelas"),
  "verifikasi admin wajib memiliki pengaman kuota maksimum lapis kedua",
);
expect(
  service.includes("Urutan lock seluruh mutasi Kelas Kelompok: class -> enrollment -> order")
    && service.includes("Samakan urutan lock dengan join/cancel agar verifikasi paralel aman")
    && service.includes("Urutan lock konsisten: class -> enrollment -> order"),
  "submit, verifikasi, dan pembatalan wajib memakai urutan lock yang konsisten",
);
expect(
  service.includes("$enrollment->status === 'payment_submitted' && $order?->status === 'submitted'")
    && service.includes("'status' => 'cancellation_pending'")
    && service.includes("Kelas Kelompok dibatalkan sistem sebelum bukti pembayaran selesai diperiksa"),
  "bukti submitted pada kelas yang dibatalkan sistem wajib tetap diperiksa dan direfund hanya bila valid",
);
expect(
  admin.includes("setInterval(() => void load(true), 30_000)")
    && admin.includes("Antrean diperbarui otomatis setiap 30 detik")
    && admin.includes("waitingDuration")
    && admin.includes("Prioritas · kelas segera dimulai"),
  "antrean admin wajib auto-refresh dan menunjukkan lama menunggu/prioritas",
);
expect(
  finance.includes("->sortBy(fn (Order $order) => $order->payment_submitted_at")
    && finance.includes("'class_start_at' => $details['start_at'] ?? null")
    && finance.includes("'is_cheap_class' => $isCheapClass")
    && finance.includes("'will_refund_if_accepted'")
    && finance.includes("'can_resubmit_if_rejected'"),
  "pending payment wajib diurutkan dari yang paling lama dan membawa konteks kelas",
);
expect(
  payment.includes('const returnPath = orderKind === "cheap_class"')
    && payment.includes('? "/student/kelas-murah"')
    && payment.includes('navigate(returnPath)'),
  "tombol kembali pembayaran Kelas Kelompok wajib mengikuti returnPath order_kind ke halaman Kelas Kelompok",
);
expect(
  tests.includes("test_student_cannot_cancel_after_payment_proof_submission")
    && tests.includes("test_student_cannot_cancel_after_payment_is_verified")
    && tests.includes("test_system_cancellation_keeps_submitted_proof_for_review_and_refunds_only_when_valid")
    && tests.includes("test_second_verification_guard_refunds_anomalous_payment_above_maximum_capacity"),
  "regression test hardening pembayaran Kelas Kelompok wajib tersedia",
);

if (failures.length) {
  console.error("Pemeriksaan hardening pembayaran Kelas Kelompok gagal:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Pemeriksaan hardening pembayaran Kelas Kelompok lulus.");
