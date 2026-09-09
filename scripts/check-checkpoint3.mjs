import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const requireText = (path, values) => {
  const source = read(path);
  for (const value of values) {
    if (!source.includes(value)) throw new Error(`${path} tidak memuat kontrak: ${value}`);
  }
};

requireText("bimbelku-backend/app/Http/Controllers/Api/LearningSessionController.php", [
  "ClassroomSystemMessageService",
  "ensureForBookings",
  "ensureOrderConnected",
  "markConversationRead",
  "chunkById(200",
  "message_type",
  "student_name",
  "Hasil belajar sesi ini sudah tersimpan.",
]);
requireText("bimbelku-backend/app/Http/Controllers/Api/StudentController.php", [
  "student_learning_progress_reports_count",
  "where('student_id', $studentId)",
]);
requireText("bimbelku-backend/app/Http/Controllers/Api/TicketController.php", [
  "CASE WHEN status = 'open' THEN 0 ELSE 1 END",
  "latestReply",
  "notifyPrimaryAdmin",
  "/admin/pesan",
  "/student/help",
  "/guru/bantuan",
]);
requireText("bimbelku-backend/app/Http/Controllers/Api/NotificationController.php", [
  "findOrFail($id)",
  "where('user_id', $request->user()->id)",
  "public function recipients",
  "paginate($perPage)",
]);
requireText("src/pages/admin/SendMessage.tsx", [
  '"/admin/notifications/recipients"',
  "Array.isArray(response.data?.data)",
  "getApiError",
  "Muat lebih banyak",
]);
if (read("src/pages/admin/SendMessage.tsx").includes("/admin/users?role=")) {
  throw new Error("Daftar penerima notifikasi kembali memakai endpoint pengguna lama.");
}
for (const path of [
  "bimbelku-backend/app/Http/Controllers/Api/ProtectedFileController.php",
  "bimbelku-backend/app/Http/Controllers/Api/TeacherDocumentController.php",
]) requireText(path, ["safeFilename", "Content-Disposition"]);
requireText("bimbelku-backend/app/Http/Controllers/Api/LearningSessionController.php", [
  "classroom_attachments",
  "classroom-messages/{$message->id}/attachment",
]);
requireText("src/components/MarketplaceMessages.tsx", ["message_type", "Informasi BimbelKu"]);
requireText("src/components/LearningSessionHub.tsx", ["student_name", "message_type", 'item.message_type === "system"', "sender_name"]);
requireText("src/pages/common/HelpCenter.tsx", ["latest_reply?.message"]);
requireText("src/pages/admin/AdminMessages.tsx", ["latest_reply?.message"]);


const featureTestDir = "bimbelku-backend/tests/Feature";
for (const name of fs.readdirSync(featureTestDir).filter((entry) => entry.endsWith(".php"))) {
  const path = `${featureTestDir}/${name}`;
  const source = read(path);
  for (const match of source.matchAll(/Booking::create\(\[(.*?)\]\);/gs)) {
    if (!match[1].includes("'booking_request_id'")) {
      throw new Error(`${path} membuat booking uji tanpa booking_request_id.`);
    }
  }
}

for (const obsolete of [
  "bimbelku-backend/app/Http/Controllers/Api/ClassroomConversationController.php",
  "bimbelku-backend/app/Models/ClassroomConversationRead.php",
  "bimbelku-backend/app/Http/Controllers/Api/LearningAttachmentController.php",
  "scripts/check-revision4-messages.mjs",
]) {
  if (fs.existsSync(obsolete)) throw new Error(`File lama belum dibersihkan: ${obsolete}`);
}

console.log("Checkpoint 3 lulus: chat, privasi laporan, notifikasi, bantuan, dan file privat sinkron.");
