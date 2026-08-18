import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const app = read("src/App.tsx");
const packageBuilder = read("src/pages/students/PackageBuilder.tsx");
const subjectsSection = read("src/components/SubjectsSection.tsx");
const packageLink = read("src/components/StudentPackageLink.tsx");

const requirements = [
  [app, 'const LegacyPackageRedirect', "Redirect alamat belajar lama belum tersedia"],
  [app, '<Route path="/search" element={<LegacyPackageRedirect />} />', "Rute /search belum dialihkan ke Paket Baru"],
  [app, '<Route path="/student/find" element={<LegacyPackageRedirect />} />', "Alias /student/find belum dialihkan ke Paket Baru"],
  [app, 'legacyParams.set("subject_name", subjectName)', "Parameter mapel lama belum dikonversi"],
  [subjectsSection, "/student/packages/new?subject_name=", "Kartu mapel landing belum membuka pembuat paket"],
  [packageBuilder, 'searchParams.get("subject_name")', "Pembuat paket belum menerima mapel landing"],
  [packageLink, 'currentUser.role === "student"', "Tautan Paket Baru belum membedakan akun murid"],
  [packageLink, "Fitur belajar khusus murid", "Admin dan tutor belum menerima penjelasan saat membuka paket"],
];

const failures = requirements
  .filter(([source, needle]) => !source.includes(needle))
  .map(([, , message]) => message);

if (failures.length) {
  console.error("Sinkronisasi dua alur belajar gagal:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Seluruh pintu belajar lama dialihkan ke Paket Baru dan akses landing sudah sesuai peran.");
