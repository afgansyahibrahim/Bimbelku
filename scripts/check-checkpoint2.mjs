import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const expect = (condition, message) => {
  if (!condition) throw new Error(`Audit Checkpoint 2 gagal: ${message}`);
};

const routes = read("bimbelku-backend/routes/api.php");
const teacherSchedule = read("bimbelku-backend/app/Http/Controllers/Api/TeacherScheduleController.php");
const teacherSchedulePage = read("src/pages/teacher/ManageSchedule.tsx");
const studentPackages = read("bimbelku-backend/app/Http/Controllers/Api/StudentPackageController.php");
const adminController = read("bimbelku-backend/app/Http/Controllers/Api/AdminController.php");
const stageSixCA = read("scripts/check-stage6c-a.mjs");

for (const route of [
  "Route::get('/student/classes'",
  "Route::post('/orders/{id}/pay'",
  "Route::prefix('teacher')",
  "Route::get('/classes', [ClassroomController::class, 'index'])",
  "Route::post('/schedule', [TeacherScheduleController::class, 'update'])",
  "Route::prefix('admin')",
  "Route::get('/classes', [AdminClassController::class, 'index'])",
  "Route::post('/verify-payment', [AdminController::class, 'verifyPayment'])",
  "Route::post('/payout', [AdminController::class, 'processPayout'])",
]) {
  expect(routes.includes(route), `route inti tidak ditemukan: ${route}`);
}

expect(teacherSchedule.includes("TeacherAvailability::isFullHour"), "backend jadwal tutor belum memaksa jam penuh");
expect(teacherSchedule.includes("Rentang jadwal") && teacherSchedule.includes("tidak boleh bertabrakan"), "backend belum memvalidasi benturan rentang tutor");
expect(teacherSchedulePage.includes("HOUR_OPTIONS") && teacherSchedulePage.includes("rangesOverlap"), "frontend jadwal tutor belum mendukung rentang jam penuh");
expect(!studentPackages.includes("'unread_messages_count' => 0"), "dashboard murid masih memakai angka pesan statis");
expect(studentPackages.includes("ClassroomMessage::query()"), "dashboard murid belum menghitung pesan dari database");
expect(adminController.includes("orWhereHas('learningPackage'"), "rekening penerimaan masih dapat diubah saat tagihan paket aktif");
expect(adminController.includes("$affectedRole === 'teacher'"), "pemblokiran murid masih menjalankan pelepasan penawaran tutor");
expect(!stageSixCA.includes('"Keamanan keuangan"'), "checker lama masih mewajibkan menu autentikator yang sudah dihapus");

console.log("Checkpoint 2 lulus: admin, tutor, murid, kelas, jadwal, dan pembayaran konsisten pada pemeriksaan statis.");
