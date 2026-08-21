import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const service = read("bimbelku-backend/app/Services/CheapClassService.php");
const studentController = read("bimbelku-backend/app/Http/Controllers/Api/StudentController.php");
const orderController = read("bimbelku-backend/app/Http/Controllers/Api/OrderController.php");
const cheapClassController = read("bimbelku-backend/app/Http/Controllers/Api/CheapClassController.php");
const finance = read("bimbelku-backend/app/Http/Controllers/Api/AdminFinanceOperationsController.php");
const cheapStudent = read("src/pages/students/CheapClasses.tsx");
const payment = read("src/pages/pembayaran/PaymentPage.tsx");
const popup = read("src/components/PendingPaymentPopup.tsx");
const adminPayment = read("src/pages/admin/PaymentVerification.tsx");
const adminSchedule = read("src/pages/admin/CheapClassSchedule.tsx");
const tests = read("bimbelku-backend/tests/Feature/CheapClassWorkflowTest.php");
const lifecycleTests = read("bimbelku-backend/tests/Feature/CheapClassPaymentLifecycleTest.php");

const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

expect(
  service.includes("'occupied_seat_count' => $activeCount")
    && service.includes("'confirmed_participant_count' => $confirmedCount")
    && service.includes("'pending_payment_count' => $pendingPaymentCount"),
  "payload murid harus membedakan kursi, peserta terverifikasi, dan pembayaran pending",
);
expect(
  cheapStudent.includes('label="Kursi terisi"')
    && cheapStudent.includes('label="Pembayaran terverifikasi"')
    && !cheapStudent.includes('label="Peserta" value={`${item.participant_count}'),
  "UI murid tidak boleh menyebut occupied seat sebagai peserta terverifikasi",
);
expect(
  studentController.includes("'order_kind' => $isCheapClass ? 'cheap_class'")
    && studentController.includes("'will_refund_if_accepted'")
    && studentController.includes("'can_cancel'"),
  "status order murid harus membawa konteks Kelas Kelompok eksplisit",
);
expect(
  orderController.includes("'order_kind' => $isCheapClass ? 'cheap_class'")
    && orderController.includes("'can_cancel' => (bool) $canCancel"),
  "active-order harus membawa jenis order dan hak pembatalan",
);
expect(
  cheapClassController.includes("'order_kind' => 'cheap_class'")
    && cheapClassController.includes("'enrollment_status' => $enrollment->status")
    && cheapClassController.includes("'cheap_class_status'")
    && cheapStudent.includes('orderKind: response.data.order_kind || "cheap_class"')
    && cheapStudent.includes('canCancel: Boolean(response.data.can_cancel)'),
  "respons join dan navigasi PaymentPage harus membawa konteks Kelas Kelompok yang sama",
);
expect(
  orderController.includes("'Batas pembayaran sudah berakhir. Tagihan tidak lagi menerima bukti transfer.'")
    && orderController.includes("'payment_expired'")
    && orderController.includes("return $this->paymentError($message, 422, 'invoice_not_payable')")
    && payment.includes('details.code === "payment_expired"')
    && payment.includes('details.code === "invoice_not_payable"'),
  "penolakan pembayaran race-condition harus memakai error_code yang dipahami PaymentPage",
);
expect(
  payment.includes('const response = await http.get("/active-order")')
    && payment.indexOf('const response = await http.get("/active-order")') < payment.indexOf('sessionStorage.getItem("bimbelku_payment_order")')
    && payment.includes('sessionStorage.removeItem("bimbelku_payment_order")'),
  "PaymentPage harus memprioritaskan active-order backend dan membersihkan state stale",
);
expect(
  payment.includes('order.willRefundIfAccepted')
    && payment.includes('Kelas dibatalkan · bukti tetap diperiksa')
    && payment.includes('(!isCheapClass || order.canCancel)'),
  "PaymentPage harus mengikuti outcome refund dan can_cancel backend",
);
expect(
  popup.includes('orderKind === "cheap_class"')
    && popup.includes('order.can_cancel')
    && popup.includes('Kamu masih dapat bergabung kembali'),
  "popup tagihan harus memakai kontrak pembatalan Kelas Kelompok terbaru",
);
expect(
  finance.includes("'will_refund_if_accepted'")
    && finance.includes("'can_resubmit_if_rejected'")
    && finance.includes("'refund_reason_if_accepted'")
    && adminPayment.includes('payment.will_refund_if_accepted')
    && adminPayment.includes('rejecting.can_resubmit_if_rejected'),
  "admin harus menerima dan menampilkan outcome verifikasi yang sama dengan backend",
);
expect(
  adminSchedule.includes('occupied_seat_count')
    && adminSchedule.includes('confirmed_participant_count')
    && adminSchedule.includes('kursi'),
  "jadwal admin harus membedakan kursi terisi dari pembayaran terverifikasi",
);
expect(
  tests.includes("->assertJsonPath('0.occupied_seat_count', 1)")
    && tests.includes("->assertJsonPath('will_refund_if_accepted', true)")
    && tests.includes("->assertJsonPath('pending.0.can_resubmit_if_rejected', false)")
    && tests.includes("->assertJsonPath('pending.0.refund_reason_if_accepted', 'capacity_full')"),
  "regression test kontrak UI-backend Kelas Kelompok harus tersedia",
);
expect(
  lifecycleTests.includes('test_payment_endpoint_returns_frontend_error_code_at_exact_seat_deadline')
    && lifecycleTests.includes("->assertJsonPath('error_code', 'payment_expired')")
    && lifecycleTests.includes("Storage::disk('local')->assertDirectoryEmpty('payment_proofs')"),
  "regression endpoint pembayaran harus memeriksa error_code, status expired, dan pembersihan file",
);

if (failures.length) {
  console.error("Pemeriksaan sinkronisasi UI-backend Kelas Kelompok gagal:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Pemeriksaan sinkronisasi UI-backend Kelas Kelompok lulus.");
