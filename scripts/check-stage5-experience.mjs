import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const checks = [];

const expect = (condition, message) => {
  checks.push({ condition, message });
  if (!condition) {
    throw new Error(`Kontrak pengalaman Tahap 5 gagal: ${message}`);
  }
};

const routes = read("bimbelku-backend/routes/api.php");
const migration = read("bimbelku-backend/database/migrations/2026_07_30_000500_build_stage_five_packages_promotions_content.php");
const studentController = read("bimbelku-backend/app/Http/Controllers/Api/StudentPackageController.php");
const checkout = read("bimbelku-backend/app/Services/PackageCheckoutService.php");
const adminController = read("bimbelku-backend/app/Http/Controllers/Api/AdminStageFiveController.php");
const publicContentController = read("bimbelku-backend/app/Http/Controllers/Api/StageFiveContentController.php");
const teacherController = read("bimbelku-backend/app/Http/Controllers/Api/TeacherOfferController.php");
const orderController = read("bimbelku-backend/app/Http/Controllers/Api/OrderController.php");
const adminPayment = read("bimbelku-backend/app/Http/Controllers/Api/AdminController.php");
const expiryCommand = read("bimbelku-backend/app/Console/Commands/ExpireBookingWorkflow.php");
const seeder = read("bimbelku-backend/database/seeders/StageFiveExperienceSeeder.php");
const app = read("src/App.tsx");
const dashboard = read("src/pages/students/Dashboard.tsx");
const builder = read("src/pages/students/PackageBuilder.tsx");
const packages = read("src/pages/students/MyPackages.tsx");
const vouchers = read("src/pages/students/Vouchers.tsx");
const promotionDetail = read("src/pages/students/PromotionDetail.tsx");
const payment = read("src/pages/pembayaran/PaymentPage.tsx");
const banner = read("src/components/DynamicBannerCarousel.tsx");
const guide = read("src/components/RoleQuickGuide.tsx");
const navigation = read("src/components/MobileBottomNav.tsx");
const landing = read("src/pages/Index.tsx");
const packagePreview = read("src/components/PackagePreviewSection.tsx");
const adminPage = read("src/pages/admin/StageFiveManagement.tsx");

for (const table of [
  "package_plans",
  "promotions",
  "learning_time_slots",
  "learning_packages",
  "package_subjects",
  "package_sessions",
  "promotion_claims",
  "dynamic_banners",
  "tutorials",
  "tutorial_steps",
  "package_renewals",
]) {
  expect(migration.includes(`Schema::create('${table}'`), `tabel ${table} harus tersedia`);
}

for (const route of [
  "/package-plans",
  "/learning-time-slots",
  "/content/banners",
  "/content/tutorials",
  "/content/promotions",
  "/student/dashboard-v2",
  "/student/packages",
  "/student/vouchers",
  "/student/packages/quote",
  "/student/packages/{learningPackage}/retry",
  "/student/packages/{learningPackage}/cancel",
  "/student/promotions/{promotion}/claim",
  "/stage-five/plans",
  "/stage-five/time-slots",
  "/stage-five/promotions",
  "/stage-five/banners",
  "/stage-five/tutorials",
]) {
  expect(routes.includes(route), `rute ${route} harus tersedia`);
}

expect(
  routes.indexOf("/student/promotions/preview") < routes.indexOf("/student/promotions/{promotion}/claim"),
  "rute pratinjau promo harus ditempatkan sebelum route model promo",
);
expect(routes.includes("['throttle:student-package-create', 'idempotency']"), "pembuatan paket wajib memakai limiter terpisah dan idempotency");
expect(studentController.includes("Jumlah jadwal harus tepat"), "jumlah sesi paket wajib sama dengan paket");
expect(studentController.includes("slot jam penuh yang aktif"), "slot paket wajib berasal dari daftar jam penuh aktif admin");
expect(studentController.includes("Gunakan satu voucher atau satu kode promo"), "satu transaksi hanya boleh memakai satu promo");
expect(studentController.includes("Rule::in([1, 2])") && studentController.includes("addHours($durationHours)"), "setiap sesi paket memakai durasi satu atau dua jam yang tervalidasi");
expect(studentController.includes("subDays(7)"), "perpanjangan wajib dibuka tujuh hari sebelum paket berakhir");
expect(checkout.includes("createInvoiceBeforeMatching"), "tagihan paket wajib dibuat sebelum pencarian tutor");
expect(studentController.includes("Selesaikan pembayaran agar pencarian tutor dapat dimulai"), "pembuatan paket wajib mengarahkan murid ke pembayaran");
expect(checkout.includes("now()->addHours(48)"), "slot pembayaran paket wajib ditahan selama 48 jam");
expect(checkout.includes("lockForUpdate"), "klaim, penerimaan tutor, dan pembayaran paket wajib dikunci saat ditulis");
expect(checkout.includes("calculateDiscount"), "diskon wajib dihitung backend");
expect(teacherController.includes("acceptPackageOffer"), "penerimaan tutor wajib terhubung ke alur paket");
expect(orderController.includes("payPackage"), "unggah bukti paket wajib memiliki alur pembayaran sendiri");
expect(adminPayment.includes("activatePaidPackage"), "verifikasi admin wajib memulai pencarian tutor paket");
expect(checkout.includes("refund_pending"), "verifikasi paket yang terlambat wajib masuk antrean refund");
expect(expiryCommand.includes("expirePackagePayments"), "scheduler wajib menutup tagihan paket kedaluwarsa");
expect(
  expiryCommand.includes("whereNotNull('learning_package_id')")
    && expiryCommand.includes("subjects.bookingRequest.offers")
    && expiryCommand.includes("'status' => 'payment_expired'"),
  "scheduler paket wajib memproses relasi paket secara eksplisit dan tidak menghidupkan matching sebelum pembayaran",
);
expect(adminController.includes("INTERNAL_DESTINATIONS"), "tujuan banner internal wajib memakai daftar aman");
expect(adminController.includes("Tautan luar wajib memakai HTTPS"), "tautan banner luar wajib memakai HTTPS");
expect(adminController.includes("normalizeDateWindow") && adminController.includes("setTimezone($timezone)"), "waktu promo wajib dinormalisasi memakai zona waktu aplikasi");
expect(adminPage.includes("toApiDateTime") && adminPage.includes("toISOString()"), "waktu promo dari browser wajib dikirim bersama zona waktu");
expect(publicContentController.includes("no-store, max-age=0, must-revalidate"), "daftar promo publik tidak boleh memakai status cache lama");
expect(promotionDetail.includes("maxAgeMs: 0") && promotionDetail.includes("force: true"), "detail promo wajib memuat status terbaru");

for (const plan of ["Coba Belajar", "Bulanan Dasar", "Bulanan Reguler", "Bulanan Intensif"]) {
  expect(seeder.includes(plan), `seeder wajib menyediakan ${plan}`);
}

for (const route of [
  "/admin/stage-five",
  "/student/packages",
  "/student/packages/new",
  "/student/vouchers",
  "/student/offers/:id",
]) {
  expect(app.includes(route), `frontend wajib menyediakan ${route}`);
}

expect(banner.includes("4000"), "banner dashboard wajib berganti setiap empat detik");
expect(banner.includes("onTouchStart"), "banner wajib mendukung geser pada layar sentuh");
expect(guide.includes("/content/tutorials"), "tutorial wajib dimuat dari CRUD backend");
expect(dashboard.includes("DynamicBannerCarousel"), "dashboard murid wajib memakai banner dinamis");
expect(builder.includes("/student/packages/quote"), "builder paket wajib meminta hitungan harga dari server");
expect(builder.includes("promotion_claim_id"), "builder wajib mendukung Voucher Saya");
expect(builder.includes("promotion_code"), "builder wajib mendukung kode promo");
expect(packages.includes("Perpanjang dengan Tutor Ini"), "Kelas Saya wajib menyediakan perpanjangan tutor lama");
expect(packages.includes("Cari Lagi"), "Kelas Saya wajib menyediakan pencarian ulang tutor");
expect(packages.includes("Hentikan & ajukan refund"), "Kelas Saya wajib menyediakan penghentian pencarian dan refund");
expect(vouchers.includes("Klaim Penawaran"), "halaman voucher wajib menyediakan klaim penawaran");
expect(payment.includes("line-through"), "harga normal promo wajib tampil dicoret");
expect(payment.includes("discountAmount"), "pembayaran wajib menampilkan potongan");
expect(navigation.includes("Kelas Saya"), "navigasi bawah wajib memuat Kelas Saya");
expect(navigation.includes("Cari Les") && navigation.includes("Pesan") && navigation.includes("Saya"), "navigasi bawah wajib memuat lima menu murid final");
expect(adminPage.includes("Paket") && adminPage.includes("Promo") && adminPage.includes("Banner") && adminPage.includes("Tutorial"), "halaman admin wajib mengelola empat modul Tahap 5");
expect(landing.includes("PackagePreviewSection"), "landing page wajib menampilkan pratinjau paket");
expect(packagePreview.includes('getCached<PackagePlan[]>("/package-plans"'), "paket landing wajib memakai sumber paket aktif yang sama dengan pemesanan");
expect(packagePreview.includes("Bulanan Intensif") && packagePreview.includes("session_count: 12"), "fallback landing wajib memuat empat paket pembelajaran");
expect(packagePreview.includes("xl:grid-cols-4") && !packagePreview.includes("md:grid-cols-3"), "landing wajib menyediakan tata letak empat paket");
expect(landing.includes("DashboardPreviewSection"), "landing page wajib menampilkan pratinjau dashboard");
expect(!landing.includes("Kelas Grup"), "landing page tidak boleh mempromosikan kelas grup yang ditunda");

console.log(`Kontrak pengalaman Tahap 5 lulus (${checks.length} pemeriksaan).`);
