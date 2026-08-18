import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const checks = [];

const expect = (condition, message) => {
  checks.push({ condition, message });
  if (!condition) {
    throw new Error(`Kontrak Tahap 4 gagal: ${message}`);
  }
};

const routes = read("bimbelku-backend/routes/api.php");
const controller = read("bimbelku-backend/app/Http/Controllers/Api/LearningSessionController.php");
const migration = read("bimbelku-backend/database/migrations/2026_07_30_000400_build_stage_four_learning_sessions.php");
const matching = read("bimbelku-backend/app/Services/TeacherMatchingService.php");
const workflow = read("bimbelku-backend/app/Http/Controllers/Api/SessionWorkflowController.php");
const hub = read("src/components/LearningSessionHub.tsx");
const teacherPage = read("src/pages/teacher/ManageClasses.tsx");
const studentPage = read("src/pages/students/MyClasses.tsx");

for (const route of [
  "/bookings/{booking}/learning-session",
  "/bookings/{booking}/messages",
  "/student/bookings/{booking}/session-pin",
  "/bookings/{booking}/check-in",
  "/bookings/{booking}/check-out",
  "/bookings/{booking}/learning-plan",
  "/bookings/{booking}/progress-reports",
]) {
  expect(routes.includes(route), `rute ${route} harus tersedia`);
}

for (const table of [
  "classroom_messages",
  "learning_plans",
  "learning_progress_reports",
  "session_attendances",
]) {
  expect(migration.includes(`Schema::create('${table}'`), `tabel ${table} harus dibuat`);
}

expect(controller.includes("containsExternalContact"), "chat wajib menyaring kontak luar");
expect(controller.includes("Hash::check"), "PIN wajib diverifikasi memakai hash");
expect(controller.includes("validateSessionLocation"), "check-in offline wajib memeriksa lokasi");
expect(controller.includes("student_acknowledged_at"), "target wajib disetujui murid");
expect(controller.includes("actual_duration_minutes"), "durasi aktual wajib dicatat");
expect(workflow.includes("Verifikasi kehadiran dan laporan perkembangan belum lengkap"), "penyelesaian privat wajib memakai hasil Tahap 4");
expect(matching.includes("continuityTeacherId"), "permintaan lanjutan wajib memprioritaskan tutor tetap");
expect(hub.includes("Kontak pribadi, media sosial, dan tautan luar akan ditolak"), "peringatan chat harus terlihat");
expect(hub.includes("Buat PIN hanya setelah tutor benar-benar hadir") && hub.includes("Sebutkan PIN langsung kepada tutor"), "PIN murid harus dijelaskan");
expect(hub.includes("Simpan dan minta persetujuan murid"), "alur persetujuan target harus terlihat");
expect(teacherPage.includes("LearningSessionHub"), "ruang belajar harus terhubung ke halaman tutor");
expect(studentPage.includes("LearningSessionHub"), "ruang belajar harus terhubung ke halaman murid");
expect(!teacherPage.includes("wa.me"), "halaman tutor tidak boleh membuka WhatsApp langsung");

console.log(`Kontrak Tahap 4 lulus (${checks.length} pemeriksaan).`);
