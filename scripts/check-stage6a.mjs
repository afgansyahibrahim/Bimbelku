import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const expect = (condition, message) => {
  if (!condition) throw new Error(`Kontrak Tahap 6A gagal: ${message}`);
};

const layout = read("src/components/StudentLayout.tsx");
const mobile = read("src/components/MobileBottomNav.tsx");
const guide = read("src/components/RoleQuickGuide.tsx");
const globalStyles = read("src/index.css");
const builder = read("src/pages/students/PackageBuilder.tsx");
const account = read("src/pages/students/Account.tsx");
const studentProfilePage = read("src/pages/students/Profile.tsx");
const paymentPage = read("src/pages/pembayaran/PaymentPage.tsx");
const app = read("src/App.tsx");
const registration = read("src/pages/Register.tsx");
const birthDateInput = read("src/components/DateOfBirthInput.tsx");
const progressPage = read("src/pages/students/LearningProgress.tsx");
const progressDetail = read("src/pages/students/LearningProgressDetail.tsx");
const learningHub = read("src/components/LearningSessionHub.tsx");
const studentClassesController = read("bimbelku-backend/app/Http/Controllers/Api/StudentController.php");
const progress = read("src/components/OrderProgress.tsx");
const subjectPicker = read("src/components/SubjectCombobox.tsx");
const studentController = read("bimbelku-backend/app/Http/Controllers/Api/StudentPackageController.php");
const checkout = read("bimbelku-backend/app/Services/PackageCheckoutService.php");
const order = read("bimbelku-backend/app/Http/Controllers/Api/OrderController.php");
const profile = read("bimbelku-backend/app/Http/Controllers/Api/UserController.php");
const durationMigration = read("bimbelku-backend/database/migrations/2026_08_01_000200_add_meeting_duration_to_learning_packages.php");
const tutorialSeeder = read("bimbelku-backend/database/seeders/StageFiveExperienceSeeder.php");
const packageTest = read("bimbelku-backend/tests/Feature/StageFivePackageExperienceTest.php");

for (const label of ["Beranda", "Cari Les", "Kelas Saya", "Pesan", "Saya"]) {
  expect(layout.includes(`label=\"${label}\"`), `sidebar murid memuat ${label}`);
  expect(mobile.includes(`label: \"${label}\"`), `navigasi HP memuat ${label}`);
}
expect(!layout.includes('label="Voucher"') && !layout.includes('label="Seluruh Sesi"'), "menu lama dipindahkan dari sidebar");
expect(layout.includes('path === "/student/packages/new"'), "Cari Les memiliki aturan aktif tersendiri");
expect(layout.includes('path === "/student/packages"'), "Kelas Saya memiliki aturan aktif tersendiri");
expect(layout.includes('to="/student/messages"') && mobile.includes('to: "/student/messages"'), "menu Pesan menuju halaman percakapan khusus");
expect(layout.includes("env(safe-area-inset-bottom)") && mobile.includes("env(safe-area-inset-bottom)"), "konten dan navigasi HP menghormati area aman perangkat");
expect(layout.includes("xl:grid") && layout.includes("hidden h-14 w-14"), "tombol pesan mengambang tidak menduplikasi navigasi HP");
expect(progress.includes('className="sm:hidden"'), "progres pesanan memakai tampilan ringkas pada HP");
expect(builder.includes('className="sm:hidden"') && builder.includes("sm:items-center sm:p-4"), "tahapan dan ringkasan pesanan memiliki pola khusus HP");
expect(studentProfilePage.includes("bottom-[calc(4.75rem+env(safe-area-inset-bottom))]") && studentProfilePage.includes("md:hidden"), "tombol simpan profil tetap terjangkau di atas navigasi HP");
expect(paymentPage.includes("sm:flex-row") && paymentPage.includes("lg:grid-cols-[.9fr_1.1fr]"), "halaman pembayaran menumpuk isi dan tombol pada HP");

expect(guide.includes("createPortal") && guide.includes("document.body"), "tutorial dirender langsung ke body agar tidak terpotong layout");
expect(guide.includes("data-spotlight-ring") && guide.includes("9999px"), "seluruh layar digelapkan kecuali target tutorial");
expect(guide.includes("findTargetElement") && guide.includes("scrollIntoView"), "target tetap ditemukan saat berada di luar viewport dan halaman digeser otomatis");
expect(guide.includes("setInterval") && guide.includes("cancelled"), "target tutorial dicari ulang dengan proses yang selalu dibersihkan");
expect(guide.includes("dialogStyle") && guide.includes("targetCenter") && guide.includes("max-h-[calc(100dvh-1.5rem)]"), "kotak tutorial tetap berada di dalam viewport");
expect(guide.includes("max-h-[calc(100dvh-1.5rem)]"), "tinggi kotak tutorial dibatasi oleh dynamic viewport HP");
expect(guide.includes("setOpen(false)") && !guide.includes("setOpen(false);\n    setStep(0)"), "penutupan tutorial tidak mereset langkah saat portal sedang dilepas");
expect(!guide.includes("document.body.style.overflow = \"hidden\""), "scroll otomatis tidak diblokir oleh penguncian body");
expect(!guide.includes("backdrop-blur-sm sm:items-center"), "target tutorial tidak ditutup backdrop blur lama");
expect(guide.includes("student.multi-subject.v1"), "tutorial beberapa mapel memiliki status tampil tersendiri");
expect(guide.includes("packageBuilderTutorial"), "tutorial beberapa mapel memiliki isi cadangan saat API gagal");
expect(tutorialSeeder.includes("Memesan dua atau lebih mata pelajaran"), "tutorial beberapa mapel tersedia dari backend");
for (const target of ["package-duration-picker", "package-add-subject", "package-allocation", "package-review-order"]) {
  expect(tutorialSeeder.includes(target), `tutorial beberapa mapel menyorot ${target}`);
  expect(builder.includes(target), `formulir menyediakan target ${target}`);
}

expect(builder.includes("Pilih Paket Belajar"), "jumlah sesi dipilih melalui paket belajar");
expect(builder.includes("adjustAllocation"), "alokasi sesi memakai tombol tambah dan kurang");
expect(!builder.includes('<Field label="Jumlah sesi">'), "dropdown jumlah sesi berulang sudah dihapus");
expect(builder.includes("weekdays") && builder.includes("WEEKDAYS"), "jadwal dibentuk dari pilihan hari per mapel");
expect(builder.includes("DRAFT_KEY") && builder.includes("localStorage.setItem"), "formulir tersimpan otomatis sebagai draf");
expect(builder.includes("Periksa Pesanan") && builder.includes("Konfirmasi & Bayar"), "ringkasan tampil sebelum pembayaran");
expect(builder.includes('navigate("/payment"'), "konfirmasi ringkasan menuju pembayaran");
expect(builder.includes('onClick={() => setSummaryOpen(true)}') && builder.includes('onClick={submit}'), "pembuatan pesanan hanya tersedia dari konfirmasi ringkasan");
expect(builder.includes("Durasi setiap pertemuan") && builder.includes("([1, 2] as DurationHours[])"), "durasi paket dapat dipilih satu atau dua jam per sesi");
expect(builder.includes("ScheduleTimePicker") && builder.includes('role="dialog"'), "pemilih jam memakai panel responsif, bukan daftar native yang keluar layar");
expect(!builder.includes('<Field label="Jam belajar">\n                      <select'), "pemilih jam native yang terlalu besar sudah dihapus");
expect(builder.includes("duration_hours: durationHours"), "durasi ikut dikirim saat menghitung dan membuat paket");
expect(builder.includes("total_learning_hours"), "ringkasan menampilkan total jam belajar");
expect(globalStyles.includes("overflow-x: clip") && globalStyles.includes("[data-sonner-toaster][data-x-position=\"center\"]"), "viewport dan notifikasi HP tidak membuat halaman bergeser horizontal");

expect(app.includes('/student/account'), "rute halaman Saya tersedia");
expect(app.includes('/student/messages') && app.includes('/student/progress'), "rute Pesan dan Perkembangan tersedia");
expect(progressPage.includes('"/student/packages"') && progressPage.includes('scope: "progress"'), "halaman Progress mengambil Paket Belajar dan Kelas Kelompok sebagai program utama");
expect(progressDetail.includes('initialTab="progress"') && progressDetail.includes("package_subject_id"), "detail Progress dapat membuka laporan tutor yang sesuai paket");
expect(studentClassesController.includes("'latest_message'") && studentClassesController.includes("'latest_report'") && studentClassesController.includes("'package_subject_id'"), "daftar kelas menyediakan ringkasan laporan dan pengikat ke paket");
expect(learningHub.includes('initialTab = "session"') && learningHub.includes("setTab(initialTab)"), "ruang belajar menerima tab awal dari halaman pemanggil");
for (const item of ["Paket Saya", "Voucher Saya", "Riwayat Pembayaran", "Perkembangan Belajar", "Tutorial penggunaan", "Pusat Bantuan"]) {
  expect(account.includes(item), `halaman Saya memuat ${item}`);
}
expect(account.includes('to: "/student/progress"'), "tautan perkembangan tidak kembali ke daftar kelas umum");
expect(registration.includes("DateOfBirthInput") && !registration.includes('type="date"'), "tanggal lahir tidak memakai kalender bulanan native");
expect(birthDateInput.includes('placeholder="HH/BB/TTTT"') && birthDateInput.includes('inputMode="numeric"'), "tanggal lahir dapat diketik cepat melalui keypad HP");
expect(birthDateInput.includes("return iso <= max ? iso : \"\""), "tanggal lahir tetap divalidasi dan dikirim sebagai ISO");
expect(progress.includes("Pembayaran") && progress.includes("Cari Tutor") && progress.includes("Tutor Ditemukan"), "progres pesanan menunjukkan urutan pembayaran sebelum tutor");
expect(subjectPicker.includes('event.key === "ArrowDown"') && subjectPicker.includes('event.key === "Enter"') && subjectPicker.includes('event.key === "Escape"'), "dropdown mapel dapat digunakan dengan keyboard");

expect(studentController.includes("'status' => 'awaiting_payment'"), "paket baru menunggu pembayaran");
expect(studentController.includes("createInvoiceBeforeMatching"), "invoice dibuat saat paket disimpan");
expect(studentController.includes("Rule::in([1, 2])"), "backend menerima durasi satu atau dua jam");
expect(studentController.includes("addHours($durationHours)"), "waktu selesai dan konflik memakai durasi pilihan");
expect(durationMigration.includes("duration_hours") && durationMigration.includes("default(1)"), "migrasi durasi aman untuk paket lama");
expect(!studentController.includes("Paket dibuat. Sistem mulai mencari tutor"), "pencarian tidak dimulai sebelum pembayaran");
expect(checkout.includes("public function createInvoiceBeforeMatching"), "service menyediakan invoice sebelum matching");
expect(checkout.includes("'teacher_name' => 'Dicari setelah pembayaran'"), "invoice tidak mengklaim tutor sudah ditemukan");
expect(checkout.includes("public function activatePaidPackage") && checkout.includes("$this->dispatchSubject($subject)"), "pembayaran yang disetujui memulai pencarian tutor");
expect(checkout.includes("private function activateMatchedPackage"), "paket aktif setelah semua tutor menerima");
expect(order.includes("payment_submitted") && order.includes("bookingRequest?->update"), "unggah bukti memperbarui paket dan permintaan induk");

for (const field of ["student_education_level", "learning_needs", "location_consent_at"]) {
  expect(profile.includes(field), `profil murid mendukung ${field}`);
}
expect(packageTest.includes("test_package_quote_accepts_one_or_two_hour_sessions") && packageTest.includes("test_two_hour_package_creates_two_hour_sessions"), "durasi satu dan dua jam memiliki pengujian backend");

console.log("Kontrak Tahap 6A lulus (navigasi, tutorial, durasi, mobile, pembayaran, tanggal lahir, Pesan, Perkembangan, dan profil).");
