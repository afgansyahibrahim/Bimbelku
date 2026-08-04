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

const css = read("src/index.css");
expect(!css.includes("fonts.googleapis.com"), "CSS masih memuat Google Fonts yang menghambat render awal.");
expect(css.includes(":focus-visible"), "Style fokus keyboard global belum tersedia.");
expect(css.includes(".skip-link"), "Style skip link belum tersedia.");
expect(/@media \(max-width: 639px\)[\s\S]*font-size:\s*16px\s*!important/.test(css), "Input HP belum dipaksa minimal 16px untuk mencegah auto zoom.");
expect(css.includes("100dvh"), "CSS belum memakai dynamic viewport height untuk modal HP.");

for (const layout of [
  "src/components/AdminLayout.tsx",
  "src/components/StudentLayout.tsx",
  "src/components/TeacherLayout.tsx",
]) {
  const source = read(layout);
  expect(source.includes('href="#main-content"'), `${layout} belum memiliki skip link.`);
  expect(source.includes('id="main-content"'), `${layout} belum memiliki target konten utama.`);
  expect(source.includes("tabIndex={-1}"), `${layout} belum dapat menerima fokus dari skip link.`);
}

const guide = read("src/components/RoleQuickGuide.tsx");
expect(guide.includes("restoreFocusRef"), "Tutorial belum mengembalikan fokus setelah ditutup.");
expect(guide.includes("dialogRef"), "Tutorial belum memindahkan fokus ke dialog aktif.");

const preview = read("src/components/FilePreviewProvider.tsx");
expect(preview.includes("restoreFocusRef"), "Pratinjau file belum mengembalikan fokus.");
expect(preview.includes("100dvh"), "Pratinjau file masih memakai tinggi viewport lama.");

const middleware = "bimbelku-backend/app/Http/Middleware/ApplySecurityHeaders.php";
expect(exists(middleware), "Middleware header keamanan belum tersedia.");
if (exists(middleware)) {
  const security = read(middleware);
  for (const header of [
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "Strict-Transport-Security",
    "Cache-Control",
  ]) {
    expect(security.includes(header), `Header ${header} belum diterapkan.`);
  }
}
expect(read("bimbelku-backend/bootstrap/app.php").includes("ApplySecurityHeaders"), "Middleware header keamanan belum didaftarkan.");
expect(read("bimbelku-backend/config/sanctum.php").includes("SANCTUM_TOKEN_EXPIRATION"), "Token Sanctum masih tanpa masa aktif terkonfigurasi.");
expect(read("bimbelku-backend/routes/console.php").includes("sanctum:prune-expired"), "Token Sanctum kedaluwarsa belum dijadwalkan untuk dibersihkan.");
expect(read("vite.config.ts").includes('host: "127.0.0.1"'), "Server Vite development masih terbuka ke seluruh jaringan secara default.");
expect(read("src/pages/admin/SettingsDisplay.tsx").includes("image/webp"), "Sampul tutor belum dioptimalkan sebelum upload.");

const staleRuntime = [
  "src/components/PackageBuilderGuide.tsx",
  "src/components/PackageCheckoutReview.tsx",
  "src/lib/navigation.ts",
  "scripts/check-revision3-navigation.mjs",
  "scripts/check-revision8-package-sessions.mjs",
];
for (const stale of staleRuntime) {
  expect(!exists(stale), `${stale} masih ada; jalankan scripts/apply-checkpoint4-cleanup.ps1.`);
}

const tsxFiles = [];
const walk = (directory) => {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, item.name);
    if (item.isDirectory()) walk(full);
    else if (item.isFile() && full.endsWith(".tsx")) tsxFiles.push(full);
  }
};
walk(path.join(root, "src"));
for (const file of tsxFiles) {
  const source = fs.readFileSync(file, "utf8");
  const tags = source.match(/<img\b[\s\S]*?>/g) || [];
  for (const tag of tags) {
    const relative = path.relative(root, file);
    expect(tag.includes("alt="), `${relative} memiliki gambar tanpa alt.`);
    expect(tag.includes("loading="), `${relative} memiliki gambar tanpa strategi loading.`);
    expect(tag.includes("decoding="), `${relative} memiliki gambar tanpa decoding async.`);
  }
}

if (failures.length) {
  console.error("Checkpoint 4 gagal:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Checkpoint 4 lulus: aksesibilitas dasar, responsif, header keamanan, token, dan ${tsxFiles.length} file TSX diperiksa.`);
