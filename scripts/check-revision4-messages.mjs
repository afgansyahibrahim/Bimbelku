import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const app = read("src/App.tsx");
const page = read("src/pages/students/Messages.tsx");
const layout = read("src/components/StudentLayout.tsx");
const learningHub = read("src/components/LearningSessionHub.tsx");
const studentClasses = read("src/pages/students/MyClasses.tsx");
const teacherClasses = read("src/pages/teacher/ManageClasses.tsx");
const routes = read("bimbelku-backend/routes/api.php");
const controller = read("bimbelku-backend/app/Http/Controllers/Api/ClassroomConversationController.php");
const learningController = read("bimbelku-backend/app/Http/Controllers/Api/LearningSessionController.php");
const readMigration = read("bimbelku-backend/database/migrations/2026_07_31_000100_create_classroom_conversation_reads_table.php");
const systemMigration = read("bimbelku-backend/database/migrations/2026_07_31_000200_add_system_context_to_classroom_messages.php");
const systemService = read("bimbelku-backend/app/Services/ClassroomSystemMessageService.php");
const checkoutService = read("bimbelku-backend/app/Services/PackageCheckoutService.php");
const adminController = read("bimbelku-backend/app/Http/Controllers/Api/AdminController.php");
const booking = read("bimbelku-backend/app/Models/Booking.php");

const checks = [
  [app.includes('path="/student/messages"'), "Rute halaman pesan murid belum terdaftar."],
  [layout.includes('to="/student/messages"'), "Menu murid belum menuju halaman Pesan."],
  [page.includes('getCached<{ conversations: ConversationSummary[] }>("/conversations"'), "Halaman Pesan belum memuat daftar percakapan."],
  [page.includes('http.post(`/bookings/${selectedId}/messages`'), "Halaman Pesan belum mengirim chat melalui endpoint internal."],
  [page.includes('http.post(`/conversations/${bookingId}/read`)'), "Status pesan dibaca belum dikirim ke backend."],
  [learningHub.includes('http.post(`/conversations/${bookingId}/read`)'), "Ruang Belajar lama belum menyelaraskan status pesan dibaca."],
  [page.includes('placeholder="Cari tutor atau mata pelajaran"'), "Pencarian percakapan belum tersedia."],
  [routes.includes("Route::get('/conversations'"), "Endpoint daftar percakapan belum tersedia."],
  [routes.includes("Route::post('/conversations/{booking}/read'"), "Endpoint status baca belum tersedia."],
  [controller.includes("where('classroom_messages.message_type', 'system')"), "Pesan sistem belum dihitung sebagai pesan baru untuk penerima."],
  [controller.includes("ensurePaidAccess"), "Akses percakapan belum dibatasi ke kelas berbayar."],
  [readMigration.includes("classroom_conversation_reads"), "Tabel cursor baca percakapan belum dibuat."],
  [booking.includes("latestClassroomMessage"), "Relasi pesan terakhir belum tersedia."],

  [systemMigration.includes("system_event_key"), "Konteks event pesan otomatis belum disimpan."],
  [systemMigration.includes("classroom_messages_system_event_unique"), "Pesan otomatis belum dilindungi dari duplikasi."],
  [systemService.includes("class ClassroomSystemMessageService"), "Service pesan transaksi otomatis belum tersedia."],
  [systemService.includes("'system_event_key' => 'order-connected'"), "Event otomatis pesanan terhubung belum dibuat."],
  [systemService.includes("ClassroomMessage::firstOrCreate"), "Pembuatan pesan otomatis belum idempoten."],
  [systemService.includes("Detail invoice peserta tidak ditaruh pada ruang kelompok"), "Privasi invoice pada ruang kelompok belum dilindungi."],
  [checkoutService.includes("ensureOrderConnected"), "Pembayaran paket belum memicu pesan otomatis."],
  [adminController.includes("ensureOrderConnected"), "Verifikasi pembayaran reguler belum memicu pesan otomatis."],
  [controller.includes("$this->systemMessageService->ensureForBookings($bookings)"), "Transaksi lama belum mendapat backfill pesan otomatis."],
  [learningController.includes("$systemMessageService->ensureOrderConnected($booking)"), "Ruang Belajar belum memastikan pesan transaksi tersedia."],
  [page.includes("Pesan otomatis dari sistem"), "Pesan transaksi belum diberi label sistem yang jujur."],
  [page.includes('item.message_type === "system"'), "Halaman Pesan belum membedakan kartu pesan sistem."],
  [learningHub.includes('item.message_type === "system"'), "Ruang Belajar belum membedakan kartu pesan sistem."],
  [studentClasses.includes('searchParams.get("booking")'), "Tautan detail pesanan murid belum membuka kelas yang tepat."],
  [teacherClasses.includes('searchParams.get("booking")'), "Tautan detail pesanan guru belum membuka kelas yang tepat."],
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  for (const [, message] of failed) console.error(`FAIL: ${message}`);
  process.exit(1);
}

console.log(`Revision 4 message checks passed (${checks.length} assertions).`);
