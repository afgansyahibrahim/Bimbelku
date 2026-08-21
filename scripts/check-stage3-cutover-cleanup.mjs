import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const app = read("src/App.tsx");
const packageBuilder = read("src/pages/students/PackageBuilder.tsx");
const stage2Checker = read("scripts/check-stage2.mjs");
const terms = read("src/pages/rules/TermsConditions.tsx");
const privacy = read("src/pages/rules/PrivacyPolicy.tsx");
const popup = read("src/components/PendingPaymentPopup.tsx");
const apiRoutes = read("bimbelku-backend/routes/api.php");

expect(!exists("src/pages/SearchPage.tsx"), "SearchPage.tsx legacy masih ada");
expect(!app.includes("SearchPage"), "App masih mereferensikan SearchPage");
expect(app.includes('<Route path="/search" element={<LegacyPackageRedirect />} />'), "/search tidak lagi diarahkan ke Paket Belajar");
expect(app.includes('<Route path="/student/find" element={<LegacyPackageRedirect />} />'), "/student/find tidak lagi diarahkan ke Paket Belajar");
expect(app.includes('exactPath("/student/packages/new", "/search", "/student/find")'), "preload alias Paket Belajar hilang");
expect(stage2Checker.includes('file: "src/pages/students/PackageBuilder.tsx"'), "checker Tahap 2 belum dipindahkan ke PackageBuilder");
expect(!stage2Checker.includes('file: "src/pages/SearchPage.tsx"'), "checker Tahap 2 masih bergantung pada SearchPage");

const sourceFiles = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(?:ts|tsx|js|jsx)$/.test(entry.name)) sourceFiles.push(full);
  }
};
walk(path.join(root, "src"));
const staleRuntimeRefs = sourceFiles
  .map((file) => [file, fs.readFileSync(file, "utf8")])
  .filter(([, source]) => source.includes("SearchPage"));
expect(staleRuntimeRefs.length === 0, `runtime frontend masih mereferensikan SearchPage: ${staleRuntimeRefs.map(([file]) => path.relative(root, file)).join(", ")}`);

const sourceBundle = sourceFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
expect(!sourceBundle.includes('http.post("/student/booking-requests",'), "frontend masih dapat membuat booking legacy secara langsung");
expect(packageBuilder.includes("Pencarian tutor baru dimulai setelah pembayaran dinyatakan diterima oleh sistem"), "PackageBuilder tidak lagi mengunci payment-before-matching");

expect(terms.includes("Versi 15 Agustus 2026"), "versi Syarat & Ketentuan belum diperbarui");
expect(terms.includes("Pencarian tutor untuk Paket Belajar baru dimulai setelah pembayaran dinyatakan diterima oleh sistem") && terms.includes("Bagian pembayaran melalui transfer diperiksa admin"), "Terms belum mengikuti flow payment-before-matching");
expect(terms.includes("Jalur pembuatan booking lama tidak lagi menjadi jalur pemesanan baru bagi murid"), "Terms belum menjelaskan cutover booking legacy");
expect(terms.includes('title: "Kelas Kelompok"'), "Terms belum mengganti aturan kelompok legacy dengan Kelas Kelompok");
expect(!terms.includes("Profil tutor ditampilkan setelah tutor menerima permintaan dan sebelum murid membayar"), "Terms masih memuat urutan pembayaran legacy");
expect(privacy.includes("Versi 15 Agustus 2026"), "versi Kebijakan Privasi belum diperbarui");
expect(privacy.includes("pencocokan tutor setelah pembayaran Paket Belajar dinyatakan diterima"), "Privacy belum mengikuti flow Paket Belajar baru");
expect(privacy.includes("Data booking lama yang masih dibutuhkan untuk penyelesaian transaksi atau riwayat sistem dapat tetap disimpan"), "Privacy belum menjelaskan retensi data legacy");

expect(popup.includes("bottom-[calc(4.75rem+env(safe-area-inset-bottom))]"), "popup pembayaran masih dapat bertabrakan dengan bottom navigation mobile");
expect(popup.includes("max-h-[calc(100dvh-5.75rem-env(safe-area-inset-bottom))]"), "popup pembayaran belum dibatasi tinggi dynamic viewport");
expect(popup.includes("min-[340px]:flex-row"), "aksi popup belum beradaptasi untuk layar sangat sempit");
expect(popup.includes("line-clamp-2 break-words"), "judul popup belum aman terhadap teks panjang");

expect(app.includes('<Route path="/admin/finance-security" element={<Navigate to="/admin/pembayaran" replace />} />'), "redirect kompatibilitas finance-security hilang");
expect(app.includes('<Route path="/admin/access-control" element={<Navigate to="/admin" replace />} />'), "redirect kompatibilitas access-control hilang");
expect(!apiRoutes.includes("Route::get('/finance-security'"), "API finance-security lama hidup kembali");
expect(!apiRoutes.includes("Route::get('/access-control'"), "API access-control lama hidup kembali");

const reactPaths = [...app.matchAll(/<Route\s+path="([^"]+)"/g)].map((match) => match[1]);
const duplicateReactPaths = [...new Set(reactPaths.filter((route, index) => reactPaths.indexOf(route) !== index))];
expect(duplicateReactPaths.length === 0, `route React duplikat ditemukan: ${duplicateReactPaths.join(", ")}`);

const adminBlock = apiRoutes.slice(apiRoutes.indexOf("Route::prefix('admin')"));
const adminRoutes = [...adminBlock.matchAll(/Route::(get|post|put|patch|delete)\('([^']+)'/g)].map((match) => `${match[1].toUpperCase()} ${match[2]}`);
const duplicateAdminRoutes = [...new Set(adminRoutes.filter((route, index) => adminRoutes.indexOf(route) !== index))];
expect(duplicateAdminRoutes.length === 0, `route API admin duplikat ditemukan: ${duplicateAdminRoutes.join(", ")}`);

if (failures.length) {
  console.error("Cleanup Tahap 3 gagal:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Tahap 3 cleanup lulus: SearchPage dihapus aman, policy sinkron, route admin tidak duplikat, dan popup pembayaran aman secara struktural di mobile.");
