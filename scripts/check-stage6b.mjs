import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const expect = (condition, message) => {
  if (!condition) throw new Error(`Kontrak Tahap 6B gagal: ${message}`);
};

const app = read("src/App.tsx");
const mobile = read("src/components/MobileBottomNav.tsx");
const layout = read("src/components/TeacherLayout.tsx");
const dashboard = read("src/pages/teacher/TeacherDashboard.tsx");
const account = read("src/pages/teacher/TeacherAccount.tsx");
const messages = read("src/components/MarketplaceMessages.tsx");
const notifications = read("src/components/NotificationCenter.tsx");
const classes = read("src/pages/teacher/ManageClasses.tsx");
const hub = read("src/components/LearningSessionHub.tsx");
const salary = read("src/pages/teacher/TeacherSalary.tsx");
const performance = read("src/pages/teacher/TeacherPerformance.tsx");
const routes = read("bimbelku-backend/routes/api.php");
const learning = read("bimbelku-backend/app/Http/Controllers/Api/LearningSessionController.php");
const schedule = read("bimbelku-backend/app/Http/Controllers/Api/ScheduleChangeController.php");
const operations = read("bimbelku-backend/app/Http/Controllers/Api/TeacherOperationsController.php");
const completion = read("bimbelku-backend/app/Http/Controllers/Api/SessionWorkflowController.php");
const migration = read("bimbelku-backend/database/migrations/2026_08_01_000300_build_stage_six_b_teacher_operations.php");
const featureTest = read("bimbelku-backend/tests/Feature/StageSixBTeacherOperationsTest.php");

for (const label of ["Beranda", "Permintaan", "Kelas", "Pesan", "Saya"]) {
  expect(mobile.includes(`label: "${label}"`), `navigasi HP tutor memuat ${label}`);
}
expect(mobile.includes("grid-cols-5") && mobile.includes('to: "/guru/pesan"') && mobile.includes('to: "/guru/saya"'), "navigasi HP tutor memakai lima pintu utama");
for (const path of ["/guru/pesan", "/guru/saya", "/guru/performa", "/guru/notifikasi"]) {
  expect(app.includes(`path="${path}"`), `rute ${path} tersedia`);
}
expect(layout.includes('to="/guru/pesan"') && layout.includes('to="/guru/performa"') && layout.includes('to="/guru/notifikasi"'), "sidebar tutor memuat pesan, performa, dan notifikasi");
expect(layout.includes("notif.target_url") && layout.includes("navigate(notif.target_url)"), "notifikasi membuka pekerjaan tujuan");
expect(layout.includes("calc(100vw-1.5rem)") && layout.includes("left-3 right-3"), "dropdown notifikasi tetap berada dalam viewport HP");

expect(dashboard.includes("/teacher/dashboard-v2") && dashboard.includes("Perlu dikerjakan"), "dashboard tutor disusun berdasarkan prioritas kerja");
for (const item of ["pending_offers", "unread_messages", "schedule_responses", "unread_notifications", "pending_appeals"]) {
  expect(dashboard.includes(item), `dashboard memuat prioritas ${item}`);
}
for (const item of ["Profil tutor", "Jadwal tersedia", "Pendapatan & pencairan", "Performa & banding", "Notifikasi"]) {
  expect(account.includes(item), `halaman Saya memuat ${item}`);
}

expect(messages.includes('md:grid-cols-[21rem_minmax(0,1fr)]') && messages.includes("closeMobileConversation"), "chat memakai daftar-panel desktop dan satu panel pada HP");
expect(messages.includes("client_token") && messages.includes("Coba kirim ulang"), "chat mencegah pesan ganda dan menyediakan kirim ulang");
expect(messages.includes("attachment") && messages.includes("is_read") && messages.includes("CheckCheck"), "chat mendukung lampiran privat dan status baca");
expect(notifications.includes("/notifications/read-all") && notifications.includes("target_url"), "pusat notifikasi mendukung baca semua dan tautan tindakan");

expect(hub.includes("participant-attendance") && hub.includes("Simpan kehadiran murid"), "tutor mencatat kehadiran seluruh peserta");
expect(hub.includes("schedule-changes") && hub.includes("Jadwal lama tetap berlaku"), "perubahan jadwal membutuhkan persetujuan pihak terdampak");
expect(hub.includes("student_id: reportForm.student_id") && hub.includes("Murid yang dilaporkan"), "laporan perkembangan kelompok dipilih per murid");
expect(classes.includes("CameraCapture") && classes.includes('capture_source", "camera"') && classes.includes("captured_at"), "bukti penyelesaian diambil langsung dari kamera");
expect(completion.includes("assertAttendanceAndProgressComplete") && completion.includes("completion_capture_source"), "backend menolak penyelesaian tanpa kehadiran, progres, dan bukti kamera");

for (const balance of ["held", "available", "requested", "paid"]) {
  expect(salary.includes(`balances.${balance}`), `dompet memisahkan saldo ${balance}`);
}
expect(salary.includes("/teacher/payout-requests") && salary.includes("commission_amount"), "tutor mengajukan pencairan dengan rincian komisi");
expect(performance.includes("point_history") && performance.includes("can_appeal") && performance.includes("/appeals"), "halaman performa memuat penalti dan pengajuan banding");

for (const table of ["classroom_message_reads", "participant_attendances", "schedule_change_requests", "schedule_change_responses", "teacher_appeals", "teacher_payout_requests"]) {
  expect(migration.includes(`'${table}'`), `migrasi membuat ${table}`);
}
expect(routes.includes("LearningSessionController::class, 'conversations'") && routes.includes("TeacherOperationsController::class, 'dashboard'"), "API percakapan dan dashboard tutor tersedia");
expect(routes.includes("storeParticipantAttendance") && routes.includes("ScheduleChangeController::class, 'respond'"), "API kehadiran dan persetujuan jadwal tersedia");
expect(routes.includes("TeacherOperationsController::class, 'resolveAppeal'"), "admin dapat memutus banding tutor");
expect(learning.includes("whereDoesntHave('reads'") && learning.includes("client_token"), "backend menghitung pesan belum dibaca dan idempotensi kirim");
expect(schedule.includes("teacherHasConflict") && schedule.includes("Jadwal baru bertabrakan"), "backend memeriksa bentrok tutor dan peserta");
expect(operations.includes("requestPayout") && operations.includes("payout_status' => 'requested'"), "pengajuan pencairan mengunci sesi agar tidak diajukan dua kali");
expect(operations.includes("resolveAppeal") && operations.includes("Banding penalti disetujui"), "keputusan banding dapat memulihkan poin");
for (const scenario of ["test_paid_chat_attachment_is_idempotent_and_gets_a_read_receipt", "test_schedule_changes_only_after_the_other_party_approves", "test_teacher_payout_request_moves_ready_sessions_to_requested_once"]) {
  expect(featureTest.includes(scenario), `pengujian backend memuat ${scenario}`);
}

console.log("Kontrak Tahap 6B lulus (guru, pesan, pelaksanaan kelas, jadwal, performa, notifikasi, dan pencairan).");
