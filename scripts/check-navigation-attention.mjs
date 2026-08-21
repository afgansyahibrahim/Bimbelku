import fs from "node:fs";
import path from "node:path";

const read = (file) => fs.readFileSync(path.resolve(file), "utf8");
const expect = (condition, message) => {
  if (!condition) throw new Error(`Navigation attention gagal: ${message}`);
  console.log(`PASS ${message}`);
};

const helper = read("src/lib/navigationAttention.ts");
const student = read("src/components/StudentLayout.tsx");
const teacher = read("src/components/TeacherLayout.tsx");
const admin = read("src/components/AdminLayout.tsx");
const mobile = read("src/components/MobileBottomNav.tsx");
const center = read("src/components/NotificationCenter.tsx");
const notificationController = read("bimbelku-backend/app/Http/Controllers/Api/NotificationController.php");
const apiRoutes = read("bimbelku-backend/routes/api.php");
const auth = read("bimbelku-backend/app/Http/Controllers/Api/AuthController.php");
const order = read("bimbelku-backend/app/Http/Controllers/Api/OrderController.php");
const checkout = read("bimbelku-backend/app/Services/PackageCheckoutService.php");
const matching = read("bimbelku-backend/app/Services/TeacherMatchingService.php");
const adminController = read("bimbelku-backend/app/Http/Controllers/Api/AdminController.php");

expect(helper.includes("unreadIdsForCurrentPage") && helper.includes("hasSidebarAttention") && helper.includes("hasMobileAttention"), "helper pemetaan indikator tersedia");
expect(helper.includes('role === "student"') && helper.includes('role === "teacher"'), "pemetaan role murid dan tutor tersedia");
expect(student.includes("attentionNotifications") && student.includes('unreadIdsForCurrentPage("student"'), "layout murid memakai indikator unread dan auto-read halaman");
expect(teacher.includes("attentionNotifications") && teacher.includes('unreadIdsForCurrentPage("teacher"'), "layout tutor memakai indikator unread dan auto-read halaman");
expect(admin.includes("attentionNotifications") && admin.includes('unreadIdsForCurrentPage("admin"'), "layout admin memakai indikator unread dan auto-read halaman");
expect(mobile.includes("hasMobileAttention") && mobile.includes("bg-rose-500"), "bottom navigation murid/tutor menampilkan titik merah");
expect(admin.includes("hasAdminMobileMenuAttention") && admin.includes("bg-rose-500"), "bottom navigation admin dan Menu menampilkan titik merah");
expect(notificationController.includes("attention_notifications") && notificationController.includes("get(['id', 'title', 'is_read', 'target_url'])"), "payload indikator notifikasi dibuat ringkas");
expect(notificationController.includes("markManyAsRead") && notificationController.includes("where('user_id', $request->user()->id)"), "batch read dibatasi ke pemilik notifikasi");

const batchIndex = apiRoutes.indexOf("/notifications/read-batch");
const allIndex = apiRoutes.indexOf("/notifications/read-all");
const dynamicIndex = apiRoutes.indexOf("/notifications/{id}/read");
expect(batchIndex >= 0 && allIndex >= 0 && dynamicIndex >= 0 && batchIndex < dynamicIndex && allIndex < dynamicIndex, "route notifikasi statis berada sebelum route id dinamis");
expect(apiRoutes.includes("->whereNumber('id')"), "route read satu notifikasi membatasi id numerik");
expect(center.includes("announceNavigationAttentionChanged"), "Pusat Notifikasi menyinkronkan indikator setelah dibaca");

expect(auth.includes("Pendaftaran tutor baru") && auth.includes("'/admin/guru'"), "pendaftaran tutor menyalakan indikator Verifikasi Tutor admin");
expect(
  (order.includes("Bukti pembayaran baru") && order.includes("'/admin/pembayaran'"))
    || (admin.includes("operationalCountForPath") && adminController.includes("'orders' => $pendingOrders")),
  "bukti pembayaran menyalakan indikator Pembayaran admin",
);
expect(matching.includes("Permintaan bimbel baru") && matching.includes("'/guru/permintaan'"), "permintaan baru menyalakan indikator Permintaan Bimbel tutor");
expect(checkout.includes("Pembayaran diterima") && checkout.includes("'/student/packages'"), "perubahan paket menyalakan indikator Kelas Saya murid");

console.log("Navigation attention Revisi 7 lulus pemeriksaan source-level.");
