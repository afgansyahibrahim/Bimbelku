import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const checks = [];
const expect = (condition, message) => checks.push([Boolean(condition), message]);

const css = read("src/index.css");
const dialog = read("src/components/ui/dialog.tsx");
const preview = read("src/components/FilePreviewProvider.tsx");
const profile = read("src/components/ProfileQuickMenu.tsx");
const admin = read("src/components/AdminLayout.tsx");
const adminController = read("bimbelku-backend/app/Http/Controllers/Api/AdminController.php");
const matching = read("bimbelku-backend/app/Services/TeacherMatchingService.php");
const cases = read("src/pages/admin/CaseCenter.tsx");
const caseBackend = read("bimbelku-backend/app/Http/Controllers/Api/SessionWorkflowController.php");
const hub = read("src/components/LearningSessionHub.tsx");
const finance = read("src/pages/admin/FinanceReport.tsx");
const users = read("src/pages/admin/UserManagement.tsx");
const app = read("src/App.tsx");

expect(
  ["--layer-dropdown:", "--layer-modal:", "--layer-detail:", "--layer-preview:", "--layer-alert:"]
    .every((token) => css.includes(token)),
  "sistem layer global lengkap",
);
expect(dialog.includes('type DialogLayer = "modal" | "detail"'), "dialog biasa dan detail dibedakan");
expect(preview.includes("z-[var(--layer-preview)]"), "viewer bukti berada di layer preview");
expect(profile.includes('(min-width: 1024px)') && profile.includes("lg:absolute"), "profile memakai bottom sheet hingga breakpoint desktop");
expect(profile.includes("Profil Saya") && profile.includes("Pengaturan") && profile.includes("Bantuan"), "isi profile menu lengkap");
expect(admin.includes("OperationalAttentionCounts") && admin.includes("attentionCount"), "sidebar admin memakai badge jumlah operasional");
expect(adminController.includes("monitoring_attention") && adminController.includes("matching_attention"), "backend menyediakan hitungan perhatian admin");
expect(matching.includes("min(24") && matching.includes("?? 24"), "pencarian tutor dibatasi 24 jam");
expect(cases.includes('setScope("active")') && cases.includes('setScope("history")'), "pusat kasus memisahkan aktif dan riwayat");
expect(caseBackend.includes("['active', 'history']"), "API kasus memisahkan aktif dan riwayat");
expect(hub.includes("grid-cols-[2.5rem_minmax(0,1fr)_2.5rem]") && hub.includes("Tutup Ruang Belajar"), "header Ruang Belajar simetris");
expect(finance.includes("md:hidden") && finance.includes("hidden overflow-x-auto md:block"), "pencairan memakai kartu mobile dan tabel desktop");
expect(users.includes("Kartu mobile") && users.includes("hidden overflow-x-auto md:block"), "data pengguna tidak memaksa tabel desktop di mobile");
expect(app.includes('path="/admin/profile"') && admin.includes('profileTo="/admin/profile"'), "profile menu admin memiliki halaman tujuan nyata");

for (const [ok, message] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${message}`);
const failed = checks.filter(([ok]) => !ok);
console.log(`Demo audit revisions ${checks.length - failed.length}/${checks.length}`);
if (failed.length) process.exit(1);
