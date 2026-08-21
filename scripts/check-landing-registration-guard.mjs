import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const guard = read("src/components/RegistrationGuardLink.tsx");
const cta = read("src/components/CTASection.tsx");
const footer = read("src/components/Footer.tsx");

const requirements = [
  [guard, 'localStorage.getItem("user")', "status login belum diperiksa"],
  [guard, "event.preventDefault()", "navigasi pendaftaran belum dicegah saat login"],
  [guard, "Anda sudah login", "box informasi login belum tersedia"],
  [guard, 'return "/admin"', "dashboard admin belum diarahkan dengan benar"],
  [guard, 'return "/guru"', "dashboard tutor belum diarahkan dengan benar"],
  [guard, 'return "/student/dashboard"', "dashboard siswa belum diarahkan dengan benar"],
  [cta, '<StudentPackageLink to="/student/packages/new"', "CTA utama belum memakai penjaga alur paket untuk pengunjung/login"],
  [footer, '<FooterLink to="/register" protectRegistration>', "link daftar footer belum memakai penjaga login"],
];

const failures = requirements
  .filter(([source, needle]) => !source.includes(needle))
  .map(([, , message]) => message);

if (failures.length) {
  console.error("Penjaga pendaftaran landing gagal:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("CTA paket dan link pendaftaran landing aman untuk pengunjung maupun pengguna yang sudah login.");
