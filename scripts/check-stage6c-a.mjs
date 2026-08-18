import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const expect = (condition, message) => {
  if (!condition) throw new Error(`Kontrak Tahap 6C-A gagal: ${message}`);
};

const app = read("src/App.tsx");
const layout = read("src/components/AdminLayout.tsx");
const dashboard = read("src/pages/admin/DashboardOverview.tsx");
const matchingPage = read("src/pages/admin/TutorSearchMonitoring.tsx");
const routes = read("bimbelku-backend/routes/api.php");
const matchingController = read("bimbelku-backend/app/Http/Controllers/Api/AdminMatchingController.php");
const adminController = read("bimbelku-backend/app/Http/Controllers/Api/AdminController.php");
const matchingService = read("bimbelku-backend/app/Services/TeacherMatchingService.php");
const bookingRequestModel = read("bimbelku-backend/app/Models/BookingRequest.php");
const featureTest = read("bimbelku-backend/tests/Feature/StageSixCAdminOperationsTest.php");

expect(app.includes('path="/admin/tutor-searches"'), "rute monitoring pencarian tutor tersedia");
expect(layout.includes('label: "Pusat operasional"'), "sidebar dikelompokkan berdasarkan fungsi operasional");
for (const label of ["Ringkasan kerja", "Pencarian tutor", "Monitoring kelas", "Pusat kasus"]) {
  expect(layout.includes(`label: "${label}"`), `menu operasional memuat ${label}`);
}
for (const label of ["Pembayaran murid", "Pencairan tutor", "Rekening penerimaan"]) {
  expect(layout.includes(`label: "${label}"`), `menu transaksi memuat ${label}`);
}
expect(layout.includes("readAdmin") && layout.includes("localStorage.getItem(\"user\")"), "identitas admin tidak lagi berupa placeholder tetap");

expect(dashboard.includes("work_queue") && dashboard.includes("matching_preview"), "dashboard memakai antrean dan preview pencarian dari backend");
for (const field of ["matching_active", "matching_attention", "cases", "refunds", "payouts"]) {
  expect(dashboard.includes(field), `dashboard memuat data operasional ${field}`);
}
expect(dashboard.includes("Pembayaran terverifikasi, bukan laba bersih") || dashboard.includes("bukan laba bersih"), "dashboard membedakan dana masuk dan laba");

for (const field of ["offer_history", "available_candidate_count", "teacher_response_deadline", "attention_reason"]) {
  expect(matchingPage.includes(field), `halaman pencarian menampilkan ${field}`);
}
expect(matchingPage.includes("Sinkronkan"), "kontrol sinkronisasi pencarian tetap tersedia");

for (const endpoint of [
  "Route::get('/tutor-searches'",
  "Route::get('/tutor-searches/{bookingRequest}'",
  "Route::post('/tutor-searches/{bookingRequest}/synchronize'",
]) {
  expect(routes.includes(endpoint), `API ${endpoint} tersedia`);
}
expect(matchingController.includes("MONITORED_STATUSES") && matchingController.includes("applyAttentionFilter"), "backend memfilter status dan perhatian secara terpusat");
expect(matchingController.includes("offer_history") && matchingController.includes("can_synchronize"), "detail backend memuat riwayat dan kontrol sinkronisasi");
expect(matchingController.includes("Tutor saat ini masih memiliki waktu"), "admin tidak dapat memotong tenggat tutor yang masih sah");
expect(matchingService.includes("availableCandidateCount"), "jumlah kandidat dihitung ulang oleh service pencocokan");
expect(bookingRequestModel.includes("scopeMatchingAnchors") && matchingController.includes("matchingAnchors()"), "pencarian kelompok ditampilkan sebagai satu pekerjaan operasional");

for (const field of ["work_queue", "matching_preview", "matching_attention", "pendingPayouts"]) {
  expect(adminController.includes(field), `dashboard backend memuat ${field}`);
}
for (const scenario of [
  "test_admin_can_monitor_offer_history_and_synchronize_an_overdue_search",
  "test_dashboard_prioritizes_real_admin_work_queues",
]) {
  expect(featureTest.includes(scenario), `tes backend memuat ${scenario}`);
}

console.log("Kontrak Tahap 6C-A lulus (dashboard/menu admin dan kontrol pencarian tutor). ");
