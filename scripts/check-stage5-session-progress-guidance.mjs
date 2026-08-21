import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const myPackages = read("src/pages/students/MyPackages.tsx");
const manageClasses = read("src/pages/teacher/ManageClasses.tsx");
const teacherProgress = read("src/pages/teacher/TeacherLearningProgressDetail.tsx");
const studentProgress = read("src/pages/students/LearningProgressDetail.tsx");
const teacherCheap = read("src/pages/teacher/CheapClasses.tsx");
const hub = read("src/components/LearningSessionHub.tsx");
const app = read("src/App.tsx");
const routes = read("bimbelku-backend/routes/api.php");
const classroom = read("bimbelku-backend/app/Http/Controllers/Api/ClassroomController.php");
const studentPackageController = read("bimbelku-backend/app/Http/Controllers/Api/StudentPackageController.php");
const learningSession = read("bimbelku-backend/app/Http/Controllers/Api/LearningSessionController.php");
const teacherCheapController = read("bimbelku-backend/app/Http/Controllers/Api/TeacherCheapClassController.php");
const cheapClassService = read("bimbelku-backend/app/Services/CheapClassService.php");

expect(myPackages.includes('type PackageScope = "active" | "history"'), "Kelas Saya murid belum memisahkan Aktif dan Riwayat");
expect(myPackages.includes('setScope("history")') && myPackages.includes("Riwayat paket masih kosong"), "Tab Riwayat Paket murid belum lengkap");
expect(myPackages.includes("Pemakaian sesi") && myPackages.includes("Bukan persentase penguasaan materi"), "Pemakaian sesi masih dapat disalahartikan sebagai progress akademik");
expect(myPackages.includes('/student/progress/package/${item.id}'), "Shortcut progress dari Kelas Saya murid hilang");
expect(myPackages.includes('scope: "active"') && myPackages.includes('scope: "history"'), "Kelas Saya murid masih membagi riwayat hanya dari satu halaman pagination");
expect(studentPackageController.includes("$scope === 'history'") && studentPackageController.includes("$scope === 'active'"), "Backend Paket Belajar belum menyediakan scope Aktif/Riwayat yang terpisah");

expect(manageClasses.includes('type ClassScope = "active" | "history"'), "Kelas Saya tutor belum memisahkan Aktif dan Riwayat");
expect(manageClasses.includes("Penyelesaian sesi") && manageClasses.includes("Hasil belajar baru dapat diisi setelah sesi diakhiri"), "Tutor belum mendapat panduan penyelesaian sesi yang jelas");
expect(manageClasses.includes("canOpenProgress") && manageClasses.includes("disabled={!canOpenProgress}"), "Pengisian hasil tutor belum dikunci oleh readiness sesi");
expect(manageClasses.includes('/guru/progress/package-subject/${item.package_subject_id}'), "Shortcut progress kelas tutor belum tersedia");
expect(manageClasses.includes('teacherHistoryStatuses.has(item.status) ? "Lihat detail" : "Kelola sesi"'), "Kartu riwayat tutor masih tampil seperti kelas aktif");

expect(app.includes('path="/guru/progress/package-subject/:id"'), "Route detail progress tutor belum terdaftar");
expect(routes.includes("Route::get('/package-subjects/{packageSubject}/progress'"), "Endpoint progress paket untuk tutor belum terdaftar");
expect(classroom.includes("function packageSubjectProgress") && classroom.includes("'completion_steps' => ["), "Backend tutor belum menyediakan ringkasan progress dan langkah penyelesaian");
expect(teacherProgress.includes("Riwayat progress per sesi") && teacherProgress.includes("status_before") && teacherProgress.includes("status_after"), "Detail progress tutor belum menampilkan histori before → after");
expect(studentProgress.includes("Riwayat progress per sesi") && studentProgress.includes("status_before") && studentProgress.includes("status_after"), "Detail progress murid belum menampilkan histori before → after");

expect(hub.includes("Simpan Hasil Belajar") && hub.includes('setTab("progress")') && hub.includes('label="Hasil"'), "Form hasil tutor belum terhubung jelas ke akhir sesi V2");
expect(hub.includes("Sesi ini hanya review/latihan, tidak mengubah status Bab") && hub.includes("no_change_reason"), "Sesi review/evaluasi masih memaksa perubahan Bab palsu");
expect(learningSession.includes("'no_material_change' => ['nullable', 'boolean']") && learningSession.includes("Pilih sedikitnya satu Bab yang dibahas.") && learningSession.includes("Pilih alasan ketika sesi tidak mengubah progress Bab."), "Backend belum memvalidasi opsi tanpa perubahan materi");
expect(learningSession.includes("$validated['chapter_updates'] = []") && !learningSession.includes("topic_updates"), "Mode tanpa perubahan materi masih dapat memutasi status Bab dari client stale");
expect(exists("bimbelku-backend/database/migrations/2026_08_14_211000_add_no_change_reason_to_learning_progress_reports.php"), "Migration alasan tanpa perubahan progress belum ada");

expect(teacherCheap.includes('type Scope = "active" | "history"'), "Kelas Kelompok tutor belum memisahkan Aktif dan Riwayat");
expect(teacherCheap.includes("Sesi yang dilaporkan") && teacherCheap.includes("Riwayat sesi") && teacherCheap.includes("session_id"), "Progress Kelas Kelompok belum dicatat per sesi");
expect(teacherCheapController.includes("progress_recorded_at") && teacherCheapController.includes("session_number"), "Backend progress Kelas Kelompok belum mengikat catatan ke sesi");
expect(cheapClassService.includes("'progress_updates' => $hasAccess"), "Riwayat progress Kelas Kelompok belum dibatasi ke peserta yang berhak");
expect(exists("bimbelku-backend/database/migrations/2026_08_14_210000_add_progress_history_to_cheap_class_sessions.php"), "Migration riwayat progress Kelas Kelompok belum ada");

if (failures.length) {
  console.error("Tahap 5 session-progress guidance gagal:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Tahap 5 session-progress guidance lulus: Aktif/Riwayat, workflow tutor, progress per sesi, dan no-change reason terjaga.");
