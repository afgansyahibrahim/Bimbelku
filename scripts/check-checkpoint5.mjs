import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const exists = (relative) => fs.existsSync(path.join(root, relative));
const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const requiredFiles = [
  "src/components/AppErrorBoundary.tsx",
  "bimbelku-backend/tests/Feature/CheckpointFiveFinalRegressionTest.php",
  "scripts/run-final-regression.ps1",
  "AUDIT_CHECKPOINT_5_REGRESI_AKHIR_DAN_DOKUMENTASI_2026-08-03.md",
  "FINAL_AUDIT_SUMMARY_WEBSITE_BIMBELKU_2026-08-03.md",
];
for (const file of requiredFiles) expect(exists(file), `${file} belum tersedia.`);

const main = read("src/main.tsx");
expect(main.includes("AppErrorBoundary"), "Aplikasi belum dibungkus error boundary global.");
expect(main.includes("document.createElement(\"div\")"), "Entrypoint belum membuat fallback root secara aman.");

const boundary = read("src/components/AppErrorBoundary.tsx");
expect(boundary.includes("getDerivedStateFromError"), "Error boundary belum menangkap error render.");
expect(boundary.includes("window.location.reload"), "Error boundary belum menyediakan pemulihan muat ulang.");
expect(boundary.includes('window.location.assign("/login")'), "Error boundary belum menyediakan pemulihan sesi/login.");
expect(boundary.includes('role="alert"'), "Error boundary belum mengumumkan kegagalan kepada pembaca layar.");

const login = read("src/pages/Login.tsx");
expect(login.includes("catch (error: unknown)"), "Penanganan error login masih memakai any.");
expect(login.includes("axios.isAxiosError(error)"), "Error login belum dibaca secara aman.");
expect(!login.includes("console.error(error)"), "Error login masih mencetak object request mentah ke console.");

const app = read("src/App.tsx");
for (const [role, paths] of Object.entries({
  admin: ["/admin", "/admin/pembayaran", "/admin/classes", "/admin/audit-log"],
  teacher: ["/guru", "/guru/kelas", "/guru/jadwal", "/guru/gaji"],
  student: ["/student/dashboard", "/student/my-classes", "/student/packages", "/payment"],
})) {
  expect(app.includes(`allowedRoles={['${role}']}`), `Guard frontend role ${role} tidak ditemukan.`);
  for (const route of paths) expect(app.includes(`path="${route}"`), `Rute frontend penting ${route} tidak ditemukan.`);
}
expect(app.includes('path="*"'), "Rute 404 frontend tidak ditemukan.");

const api = read("bimbelku-backend/routes/api.php");
for (const token of [
  "auth:sanctum",
  "active.account",
  "role:student",
  "role:teacher",
  "role:admin",
  "admin.audit",
  "admin.permission",
]) expect(api.includes(token), `Middleware/rute ${token} tidak ditemukan pada API.`);

for (const removed of [
  "FinanceSecurityController",
  "FinanceApprovalController",
  "payout-approvals",
  "finance-security/setup",
]) expect(!api.includes(removed), `Rute lama ${removed} kembali muncul.`);

const finalTest = read("bimbelku-backend/tests/Feature/CheckpointFiveFinalRegressionTest.php");
for (const scenario of [
  "student_can_login_use_the_session_logout_and_cannot_reuse_the_token",
  "pending_teacher_cannot_login_before_admin_verification",
  "public_bootstrap_endpoints_remain_accessible_without_a_token",
  "critical_role_routes_keep_their_authentication_and_role_middleware",
  "removed_multi_admin_and_authenticator_routes_are_not_registered",
]) expect(finalTest.includes(scenario), `Skenario regresi ${scenario} belum ada.`);

const packageJson = JSON.parse(read("package.json"));
expect(packageJson.scripts?.["check:checkpoint5"] === "node scripts/check-checkpoint5.mjs", "Script check:checkpoint5 belum terdaftar.");
expect(packageJson.scripts?.check?.includes("check:checkpoint5"), "Script check utama belum menyertakan Checkpoint 5.");
expect(packageJson.scripts?.["check:final"] === "npm run check", "Script check:final belum menunjuk pemeriksaan utama.");

const pagesRoot = path.join(root, "src", "pages");
const pageFiles = [];
const walk = (directory) => {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, item.name);
    if (item.isDirectory()) walk(full);
    else if (item.isFile() && full.endsWith(".tsx")) pageFiles.push(full);
  }
};
walk(pagesRoot);
for (const file of pageFiles) {
  const source = fs.readFileSync(file, "utf8");
  const relative = path.relative(root, file);
  expect(!/return\s*\(\s*<>\s*<\/\>\s*\)/s.test(source), `${relative} memiliki return halaman kosong.`);
  expect(!source.includes("<<<<<<<") && !source.includes(">>>>>>>"), `${relative} memiliki konflik merge.`);
}

if (failures.length) {
  console.error("Checkpoint 5 gagal:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Checkpoint 5 lulus: pemulihan layar kosong, login aman, matriks role, ${pageFiles.length} halaman, dan skenario regresi final tersedia.`);
