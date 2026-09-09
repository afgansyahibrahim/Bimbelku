import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const failures = [];

const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const apiRoutes = read("bimbelku-backend/routes/api.php");
const permissionCatalog = read("bimbelku-backend/app/Support/AdminPermissionCatalog.php");
const frontendPermissions = read("src/lib/adminPermissions.ts");
const contentController = read("bimbelku-backend/app/Http/Controllers/Api/StageFiveContentController.php");
const adminContentController = read("bimbelku-backend/app/Http/Controllers/Api/AdminStageFiveController.php");
const bannerCarousel = read("src/components/DynamicBannerCarousel.tsx");
const studentDashboard = read("src/pages/students/Dashboard.tsx");
const teacherDashboard = read("src/pages/teacher/TeacherDashboard.tsx");
const mediaController = read("bimbelku-backend/app/Http/Controllers/Api/PublicMediaController.php");
const publicMedia = read("bimbelku-backend/app/Support/PublicMedia.php");
const cheapClassController = read("bimbelku-backend/app/Http/Controllers/Api/AdminCheapClassController.php");
const cheapClassPage = read("src/pages/admin/CheapClassManagement.tsx");
const cheapClassSchedulePage = read("src/pages/admin/CheapClassSchedule.tsx");
const cheapClassSchema = read("bimbelku-backend/app/Support/CheapClassSchema.php");
const cheapClassService = read("bimbelku-backend/app/Services/CheapClassService.php");
const teacherScheduleController = read("bimbelku-backend/app/Http/Controllers/Api/TeacherScheduleController.php");
const consoleRoutes = read("bimbelku-backend/routes/console.php");
const cheapClassUpgrade = read("bimbelku-backend/database/migrations/2026_08_10_000130_upgrade_cheap_class_packages.php");
const cheapClassActivationRetirement = read("bimbelku-backend/database/migrations/2026_08_11_000140_retire_cheap_class_template_activation.php");
const studentCheapClassPage = read("src/pages/students/CheapClasses.tsx");
const teacherCheapClassPage = read("src/pages/teacher/CheapClasses.tsx");
const studentCheapClassController = read("bimbelku-backend/app/Http/Controllers/Api/CheapClassController.php");
const teacherCheapClassController = read("bimbelku-backend/app/Http/Controllers/Api/TeacherCheapClassController.php");
const paymentPage = read("src/pages/pembayaran/PaymentPage.tsx");
const pendingPaymentPopup = read("src/components/PendingPaymentPopup.tsx");
const workflowCommand = read("bimbelku-backend/app/Console/Commands/ExpireBookingWorkflow.php");
const httpClient = read("src/lib/http.ts");
const sessionWorkflow = read("bimbelku-backend/app/Http/Controllers/Api/SessionWorkflowController.php");
const financeOperations = read("bimbelku-backend/app/Http/Controllers/Api/AdminFinanceOperationsController.php");

for (const route of [
  "/content/banners",
  "/public-media/{path}",
  "/cheap-class-templates/form",
  "/cheap-class-templates",
  "/cheap-classes/schedule",
  "/cheap-classes/{cheapClass}",
  "/cheap-classes/{cheapClass}/retry-teacher",
  "/cheap-classes/{cheapClass}/finalize",
]) {
  expect(apiRoutes.includes(route), "rute " + route + " harus tersedia");
}

expect(
  permissionCatalog.includes("cheap-class-templates|cheap-classes"),
  "endpoint Kelas Kelompok admin wajib memakai izin content.manage",
);
expect(
  frontendPermissions.includes("stage-five|kelas-murah"),
  "rute halaman Kelas Kelompok admin wajib dipetakan ke content.manage",
);
expect(
  contentController.includes("public, max-age=60, stale-while-revalidate=300"),
  "respons banner publik wajib memakai cache singkat agar dashboard ringan tanpa menahan perubahan terlalu lama",
);
expect(
  !contentController.includes('Cache::remember("content.banners'),
  "banner publik tidak boleh memakai cache server yang menahan perubahan admin",
);
expect(
  !adminContentController.includes('Cache::forget("content.banners'),
  "simpan banner tidak boleh bergantung pada tabel cache Laravel",
);
expect(
  bannerCarousel.includes("maxAgeMs: 60_000")
    && bannerCarousel.includes("readCachedBanners")
    && !bannerCarousel.includes("force: true"),
  "carousel wajib memakai cache singkat/session tanpa memaksa request baru setiap dashboard dimuat",
);
expect(
  bannerCarousel.includes("Array.isArray(response.data)"),
  "carousel wajib aman saat respons banner tidak berbentuk daftar",
);
expect(
  studentDashboard.includes('DynamicBannerCarousel audience="student"'),
  "banner murid wajib dirender pada dashboard murid",
);
expect(
  teacherDashboard.includes('DynamicBannerCarousel audience="teacher"'),
  "banner tutor wajib dirender pada dashboard tutor",
);
expect(
  mediaController.includes("Storage::disk('public')")
    && mediaController.includes("max-age=31536000, immutable")
    && publicMedia.includes("/api/public-media/"),
  "foto publik wajib dapat dibuka melalui API dan memakai cache immutable tanpa bergantung pada storage:link",
);
expect(
  !bannerCarousel.includes("/storage/")
    && !bannerCarousel.includes("publicMediaUrl")
    && bannerCarousel.includes("banner.image_url"),
  "carousel wajib memakai URL tervalidasi backend agar path media yatim tidak memicu 404 LCP",
);
expect(
  cheapClassController.includes("CheapClassSchema::status()")
    && cheapClassPage.includes("php artisan migrate"),
  "halaman admin wajib menjelaskan migration yang belum dipasang tanpa gagal dimuat",
);
expect(
  cheapClassController.includes("CurriculumChapter::query()")
    && cheapClassController.includes("curriculum_chapter_id")
    && !cheapClassPage.includes('label="Tutor"'),
  "bab wajib berasal dari katalog dan pilihan tutor manual harus dihapus",
);
expect(
  cheapClassService.includes("pickRandomEligibleTeacher")
    && cheapClassService.includes("classSlots")
    && cheapClassService.includes("waiting_teacher"),
  "tutor wajib diacak setelah seluruh jadwal sesi dinyatakan tersedia",
);
expect(
  cheapClassUpgrade.includes("cheap_class_sessions")
    && cheapClassPage.includes("session_count")
    && studentCheapClassPage.includes("Jadwal semua sesi")
    && teacherCheapClassPage.includes("item.sessions.map"),
  "paket Kelas Kelompok wajib menyimpan dan menampilkan seluruh sesi",
);
expect(
  cheapClassController.includes("'weekdays' => ['required', 'array', 'min:1', 'max:4']")
    && cheapClassPage.includes("Hari belajar")
    && cheapClassPage.includes("form.weekdays.length >= maximumWeekdays")
    && cheapClassService.includes("normalizeRecurrenceDays")
    && cheapClassService.includes("$cursor->addDay()"),
  "admin wajib memilih 1-4 hari belajar dan sesi wajib disusun pada hari terpilih",
);
expect(
  cheapClassController.includes("custom_price_per_student")
    && cheapClassPage.includes("Gunakan harga custom")
    && studentCheapClassPage.includes("Harga custom admin"),
  "harga custom admin wajib dihitung dan ditampilkan sebagai harga paket",
);
expect(
  cheapClassService.includes("createPackage(array $data)")
    && !cheapClassService.includes("synchronizeOccurrences")
    && cheapClassService.includes("'payment_scope' => 'package'")
    && cheapClassService.includes("'payment_frequency' => 'once'")
    && !cheapClassPage.includes("Ulangi penawaran otomatis")
    && cheapClassPage.includes("Tinjau sebelum dibuat")
    && cheapClassPage.includes("onContinue={() => void createPackage()}")
    && studentCheapClassPage.includes("Tidak ada tagihan baru pada sesi berikutnya"),
  "satu template wajib membuat satu paket dan satu pembayaran untuk seluruh sesi",
);
expect(
  cheapClassPage.includes("Sebagian data belum dapat dimuat")
    && cheapClassPage.includes("Coba muat ulang"),
  "endpoint daftar admin harus tetap read-only dan kegagalan parsial wajib dapat dipulihkan",
);
expect(
  cheapClassController.includes("deleteEmptyPackage($cheapClass)")
    && cheapClassService.includes("Paket tidak dapat dihapus karena sudah memiliki riwayat peserta")
    && cheapClassService.includes("removed_template")
    && cheapClassSchedulePage.includes("Hapus paket")
    && cheapClassSchedulePage.includes("item.can_delete"),
  "admin hanya boleh menghapus paket kosong beserta seluruh sesinya",
);
expect(
  !cheapClassPage.includes("Template aktif dan nonaktif")
    && !cheapClassPage.includes("Nonaktifkan")
    && !apiRoutes.includes("/{cheapClassTemplate}/active")
    && cheapClassActivationRetirement.includes("is_active' => false")
    && cheapClassActivationRetirement.includes("whereNotExists"),
  "aktivasi template lama wajib dihapus dan template yatim wajib dibersihkan",
);
expect(
  cheapClassPage.includes("min={todayValue()}")
    && cheapClassPage.includes("registration_open_time")
    && cheapClassController.includes("Pilih waktu pembukaan pendaftaran yang belum lewat")
    && cheapClassController.includes("Pilih jam mulai paling lambat 22.00")
    && cheapClassPage.includes("Pilih jam paling lambat 22.00"),
  "admin wajib dapat memilih hari ini tanpa menerima waktu lewat atau sesi lintas hari",
);
expect(
  cheapClassSchedulePage.includes("Lihat detail")
    && cheapClassSchedulePage.includes("teacher_status_message")
    && cheapClassSchedulePage.includes("Sistem mencari otomatis")
    && !cheapClassSchedulePage.includes(">Cari tutor</Button>")
    && cheapClassService.includes("retryWaitingTeachers")
    && teacherScheduleController.includes("refreshTeacherAssignmentsForTeacher")
    && consoleRoutes.includes("everyMinute()"),
  "detail paket wajib tersedia dan pencarian tutor harus berjalan otomatis",
);
expect(
  cheapClassPage.includes('/admin/kelas-murah/jadwal')
    && cheapClassPage.includes("SummaryStat")
    && cheapClassSchedulePage.includes("Per Paket")
    && cheapClassSchedulePage.includes("Semua Sesi")
    && cheapClassSchedulePage.includes("Terdekat dahulu")
    && cheapClassSchedulePage.includes("Terjauh dahulu")
    && cheapClassSchedulePage.includes('/admin/cheap-classes/schedule'),
  "jadwal admin wajib ringkas di halaman utama dan lengkap di halaman khusus",
);
expect(
  cheapClassSchema.includes("Schema::getColumnListing")
    && cheapClassSchema.includes("teacher_subjects")
    && cheapClassSchema.includes("orders"),
  "kesiapan Kelas Kelompok wajib memeriksa skema utama dan data pendukung",
);
expect(
  cheapClassService.includes("reopenRegistrationIfSeatAvailable"),
  "kursi yang dilepas sebelum tenggat wajib membuka kembali pendaftaran",
);
expect(
  cheapClassService.includes("Keikutsertaan tidak dapat dibatalkan setelah bukti pembayaran dikirim atau pembayaran diterima")
    && cheapClassService.includes("Kelas boleh dibatalkan, tetapi bukti transfer yang sudah masuk")
    && studentCheapClassPage.includes("Pembatalan tidak tersedia setelah bukti pembayaran dikirim"),
  "murid hanya boleh membatalkan sebelum bukti dikirim; bukti pada kelas yang dibatalkan sistem wajib tetap diperiksa",
);
expect(
  studentCheapClassController.includes("->orWhere(function ($offers)")
    && studentCheapClassController.includes("$offers->where('status', 'open')")
    && studentCheapClassController.includes("$hasEnrollment || $isPublicOffer"),
  "paket yang pendaftarannya ditutup hanya boleh terlihat oleh peserta paket tersebut",
);
expect(
  cheapClassService.includes("'waiting_teacher', 'open', 'registration_closed', 'awaiting_verification'")
    && cheapClassService.includes("synchronizeSessionStatuses")
    && cheapClassService.includes("completeFinishedClasses"),
  "paket tanpa tutor, status sesi, dan penyelesaian paket wajib diproses oleh lifecycle",
);
expect(
  teacherCheapClassController.includes("with(['sessions'")
    && teacherCheapClassController.includes("sessions()->where('ends_at', '>', now())->exists()")
    && teacherCheapClassController.includes("zoom.us")
    && teacherCheapClassPage.includes("Satu tautan dipakai untuk seluruh sesi paket"),
  "paket multi-sesi wajib tetap terlihat oleh tutor dan hanya menerima tautan Zoom resmi",
);
expect(
  studentCheapClassPage.includes('state={{ orderId: enrollment.order_id')
    && studentCheapClassPage.includes('orderKind: "cheap_class"')
    && paymentPage.includes('const returnPath = orderKind === "cheap_class"')
    && paymentPage.includes('? "/student/kelas-murah"')
    && pendingPaymentPopup.includes('orderKind === "cheap_class"'),
  "tombol pembayaran Kelas Kelompok wajib membuka invoice yang tepat dan kembali ke halaman yang tepat",
);
expect(
  cheapClassService.includes("['submitted', 'paid', 'refund_pending', 'refunded']")
    && cheapClassService.includes("Storage::disk('local')->delete($discardedProof)"),
  "riwayat refund tidak boleh dipakai ulang dan bukti lama wajib dibersihkan saat kursi dibuat ulang",
);
expect(
  cheapClassService.includes("$class->starts_at->lte(now())")
    && cheapClassService.includes("kelas dibatalkan. Refund penuh masuk antrean admin"),
  "verifikasi yang selesai setelah sesi pertama dimulai wajib membatalkan kelas dan membuat refund",
);
expect(
  workflowCommand.includes("CheapClassSchema::status()['ready']"),
  "scheduler lama tidak boleh gagal saat migration Kelas Kelompok belum terpasang",
);
expect(
  httpClient.includes("/student\\/cheap-classes\\/\\d+\\/join$"),
  "gabung Kelas Kelompok wajib mengirim kunci idempotensi",
);
expect(
  httpClient.includes('url === "/admin/cheap-class-templates"')
    && apiRoutes.includes("->middleware(['throttle:admin-cheap-class-template-create', 'idempotency'])"),
  "pembuatan paket Kelas Kelompok wajib dilindungi kunci idempotensi",
);
expect(
  sessionWorkflow.includes("order.cheapClassEnrollment")
    && sessionWorkflow.includes("cheapClassEnrollment?->update(['status' => 'refunded'])"),
  "refund selesai wajib menyinkronkan status peserta Kelas Kelompok",
);
expect(
  financeOperations.includes("class_details_snapshot")
    && financeOperations.includes("$snapshot['subject'] ?? null"),
  "daftar refund admin wajib menampilkan mapel Kelas Kelompok dari snapshot pesanan",
);

if (failures.length) {
  console.error("Pemeriksaan banner dan Kelas Kelompok gagal:");
  failures.forEach((failure) => console.error("- " + failure));
  process.exit(1);
}

console.log("Pemeriksaan banner dinamis dan akses Kelas Kelompok admin lulus.");
