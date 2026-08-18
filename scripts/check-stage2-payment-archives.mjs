import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const expect = (condition, message) => {
  if (!condition) throw new Error(`Tahap 2 gagal: ${message}`);
};

const app = read("src/App.tsx");
const popup = read("src/components/PendingPaymentPopup.tsx");
const payment = read("src/pages/pembayaran/PaymentPage.tsx");
const history = read("src/pages/students/TransactionHistory.tsx");
const packages = read("src/pages/students/MyPackages.tsx");
const legacy = read("src/pages/students/LegacyRequests.tsx");
const packageController = read("bimbelku-backend/app/Http/Controllers/Api/StudentPackageController.php");
const orderController = read("bimbelku-backend/app/Http/Controllers/Api/OrderController.php");
const apiRoutes = read("bimbelku-backend/routes/api.php");
const bookingController = read("bimbelku-backend/app/Http/Controllers/Api/BookingRequestController.php");
const teacherController = read("bimbelku-backend/app/Http/Controllers/Api/TeacherOfferController.php");
const teacherPage = read("src/pages/teacher/BookingGuru.tsx");
const adminController = read("bimbelku-backend/app/Http/Controllers/Api/AdminMatchingController.php");
const adminPage = read("src/pages/admin/TutorSearchMonitoring.tsx");
const assignmentService = read("bimbelku-backend/app/Services/TeacherAssignmentService.php");
const matchingService = read("bimbelku-backend/app/Services/TeacherMatchingService.php");
const cheapClassAdmin = read("bimbelku-backend/app/Http/Controllers/Api/AdminCheapClassController.php");

expect(!popup.includes('"/search"') && !payment.includes('"/search"'), "pembayaran masih kembali ke halaman pencarian lama");
expect(popup.includes('orderKind === "cheap_class"') && !popup.includes('includes("kelas murah")'), "popup masih menebak jenis pesanan dari teks");
expect(payment.includes('orderKind === "cheap_class"') && !payment.includes('includes("kelas murah")'), "PaymentPage masih menebak jenis pesanan dari teks");
expect(payment.includes('action={returnAction} onClick={() => navigate(returnPath)}'), "state hasil PaymentPage belum memakai tujuan returnPath berdasarkan order_kind");
expect(!payment.includes('navigate(isCheapClass ? "/student/kelas-murah" : "/student/packages")') && !payment.includes('navigate(isCheapClass ? "/student/kelas-murah" : "/student/packages/new")'), "PaymentPage masih memiliki redirect hasil pembayaran hardcoded");
expect(packageController.includes("'order_kind' => 'package'"), "respons pembuatan dan daftar paket belum membawa order_kind");
expect(orderController.includes("'order_kind' => $orderKind"), "riwayat transaksi backend belum membawa order_kind");
expect(history.includes("order_kind") && history.includes("orderKind: order.order_kind"), "riwayat transaksi belum meneruskan jenis pesanan ke pembayaran");
expect(packages.includes("orderKind: item.latest_order!.order_kind"), "tagihan pada Kelas Saya belum mengunci pesanan paket yang dipilih");

expect(app.includes('path="/student/requests/legacy"') && app.includes("LegacyRequests"), "halaman permintaan lama belum terhubung");
expect(legacy.includes("legacy_only: 1") && legacy.includes('orderKind: "booking"'), "permintaan lama belum dipisahkan atau belum membawa jenis pembayaran");
expect(bookingController.includes("LEGACY_ACTIVE_STATUSES") && bookingController.includes("LEGACY_HISTORY_STATUSES") && bookingController.includes("whereNull('package_subject_id')"), "backend belum memisahkan lifecycle permintaan lama");
expect(apiRoutes.includes("[BookingRequestController::class, 'legacyStoreDisabled']"), "POST booking request lama masih menunjuk ke store legacy");
expect(bookingController.includes("legacy_booking_creation_retired") && bookingController.includes("'/student/packages/new'"), "endpoint legacy belum mengembalikan kontrak retired yang jelas");

expect(teacherController.includes("Rule::in(['active', 'history'])") && teacherController.includes("'active_count'"), "API tutor belum memisahkan permintaan aktif dan riwayat");
expect(teacherPage.includes('setScope("history")') && teacherPage.includes("Riwayat"), "halaman tutor belum menyediakan riwayat terpisah");
expect(adminController.includes("ACTIVE_STATUSES") && adminController.includes("HISTORY_STATUSES") && adminController.includes("'scope'"), "API admin belum memisahkan pencarian aktif dan riwayat");
expect(adminController.includes("'label' => $bookingRequest->package_subject_id ? 'Paket Belajar' : 'Arsip sistem lama'") && adminController.includes("'is_legacy' => $bookingRequest->package_subject_id === null"), "API admin belum memberi label Paket Belajar/Arsip sistem lama");
expect(adminPage.includes('item.source.label') && adminPage.includes("Arsip sistem lama"), "halaman admin belum menampilkan label arsip secara eksplisit");
expect(!assignmentService.includes("['matching', 'teacher_pending', 'no_teacher', 'expired']"), "penetapan manual masih dapat menghidupkan request expired");
expect(!matchingService.includes("if (!in_array($bookingRequest->status, ['matching', 'teacher_pending', 'no_teacher', 'expired'], true))"), "daftar kandidat manual masih membuka request expired");
expect(teacherController.includes("'source_label'") && teacherController.includes("'is_legacy'"), "API tutor belum menandai sumber legacy");
expect(teacherPage.includes("request.source_label") && teacherPage.includes("Arsip sistem lama"), "halaman tutor belum menandai data legacy sebagai arsip");
expect(adminPage.includes('updateScope("history")') && adminPage.includes("Riwayat pencarian"), "halaman admin belum menyediakan riwayat pencarian");
expect(cheapClassAdmin.includes("in_array($status, ['cancelled', 'completed'], true) ? 'history' : 'active'"), "filter status cancelled/completed Kelas Murah masih dapat terjebak scope active default");

console.log("Tahap 2 lulus: pembuatan legacy ditutup, payment mengikuti order_kind, arsip admin/tutor jelas, dan filter riwayat Kelas Murah aman.");
