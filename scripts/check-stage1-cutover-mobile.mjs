import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));

const app = read("src/App.tsx");
const packageBuilder = read("src/pages/students/PackageBuilder.tsx");
const packageReschedule = read("src/pages/students/PackageReschedule.tsx");
const responsiveSelect = read("src/components/ResponsiveSelect.tsx");
const baseSelect = read("src/components/ui/select.tsx");
const subjectCombobox = read("src/components/SubjectCombobox.tsx");
const css = read("src/index.css");
const packageLink = read("src/components/StudentPackageLink.tsx");
const packageRoute = read("src/components/StudentPackageRoute.tsx");
const dynamicBanner = read("src/components/DynamicBannerCarousel.tsx");

const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

expect(!app.includes('import("./pages/SearchPage")'), "Router masih memuat SearchPage");
expect(!exists("src/pages/SearchPage.tsx"), "SearchPage legacy masih tersisa setelah cleanup Tahap 3");
expect(app.includes('<Route path="/search" element={<LegacyPackageRedirect />} />'), "/search belum menjadi redirect");
expect(app.includes('<Route path="/student/find" element={<LegacyPackageRedirect />} />'), "/student/find belum menjadi redirect");
expect(app.indexOf('<Route path="/search" element={<LegacyPackageRedirect />} />') < app.indexOf('<Route element={<StudentPackageRoute />}>'), "/search harus dinormalisasi sebelum guard Paket Baru");
expect(app.indexOf('<Route path="/student/find" element={<LegacyPackageRedirect />} />') < app.indexOf('<Route element={<StudentPackageRoute />}>'), "/student/find harus dinormalisasi sebelum guard Paket Baru");
expect(app.includes('exactPath("/student/packages/new", "/search", "/student/find")'), "Chunk Paket Baru belum dipreload saat alias lama dibuka");
expect(app.includes('legacyParams.set("subject_name", subjectName)'), "Parameter mapel lama belum dipertahankan");
expect(packageLink.includes('currentUser.role === "student"'), "Akses Paket Baru belum dijaga berdasarkan peran");
expect(packageLink.includes("onNavigate?.()"), "Menu mobile belum ditutup setelah navigasi Paket Baru/ke dashboard");
expect(packageLink.includes('dashboardByRole'), "Tujuan dashboard CTA terblokir belum dibatasi berdasarkan role yang dikenal");
expect(app.includes('import StudentPackageRoute from "./components/StudentPackageRoute"'), "Guard khusus Paket Belajar belum dipasang");
expect(app.includes('<Route element={<StudentPackageRoute />}>'), "Rute Paket Belajar belum memakai guard khusus");
expect(!packageRoute.includes('/access-denied'), "Guard Paket Belajar masih mengirim admin/tutor ke Access Denied");
expect(packageRoute.includes('user.role === "student"'), "Guard Paket Belajar belum mengizinkan murid secara eksplisit");
expect(packageRoute.includes('Akun ini tidak dapat membeli atau membuat Paket Belajar'), "Pesan ramah untuk admin/tutor belum tersedia");
expect(dynamicBanner.includes('isStudentPackageDestination'), "Banner dinamis belum mengenali tujuan Paket Belajar");
expect(dynamicBanner.includes('<StudentPackageLink'), "Banner Paket Belajar belum memakai guard CTA berdasarkan role");
expect(!dynamicBanner.includes('{content}</StudentPackageLink>\n      ) : ('), "Banner masih memiliki self-reference content pada fallback gambar");

expect(!packageBuilder.includes("<select"), "Paket Baru masih memakai select bawaan yang rawan overflow mobile");
expect(!packageReschedule.includes("<select"), "Penjadwalan ulang masih memakai select bawaan");
expect(packageBuilder.includes('tone="emerald"'), "Dropdown hijau Paket Baru belum dipulihkan");
expect(packageBuilder.includes("<ResponsiveSelect"), "Paket Baru belum memakai dropdown responsif");
expect(packageReschedule.includes("<ResponsiveSelect"), "Penjadwalan ulang belum memakai dropdown responsif");

expect(responsiveSelect.includes("100dvw-1.5rem"), "Dropdown responsif belum dibatasi dynamic viewport");
expect(baseSelect.includes("collisionPadding = 12"), "Dropdown dasar belum menjaga jarak dari tepi layar");
expect(baseSelect.includes("!z-[var(--layer-detail-popover)]"), "Dropdown dasar belum aman di atas modal");
expect(subjectCombobox.includes("overflow-x-hidden"), "Dropdown mapel belum menahan teks panjang");
expect(subjectCombobox.includes("break-anywhere"), "Nama mapel buatan belum dapat dibungkus");
expect(/\.form-field\s*\{[\s\S]*min-w-0[\s\S]*max-w-full/.test(css), "Field global belum dibatasi oleh lebar induk");

if (failures.length) {
  console.error("Tahap 1 cutover dan mobile gagal:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Tahap 1 lulus: alur lama dialihkan dan seluruh dropdown Paket Baru aman secara struktural untuk mobile.");
