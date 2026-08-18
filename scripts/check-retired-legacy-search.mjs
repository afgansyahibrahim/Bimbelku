import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const legacyPage = path.join(root, "src/pages/SearchPage.tsx");
const app = read("src/App.tsx");
const packageBuilder = read("src/pages/students/PackageBuilder.tsx");
const landingFiles = [
  "src/components/Navbar.tsx",
  "src/components/SubjectsSection.tsx",
  "src/components/CTASection.tsx",
  "src/components/Footer.tsx",
].map(read).join("\n");

const failures = [];
if (fs.existsSync(legacyPage)) failures.push("Halaman SearchPage lama masih tersedia.");
if (/import\("\.\/pages\/SearchPage"\)/.test(app)) failures.push("App masih memuat SearchPage lama.");
if (!/exactPath\("\/student\/packages\/new", "\/search", "\/student\/find"\)/.test(app)) failures.push("Alias rute lama belum diarahkan ke PackageBuilder.");
if (/to="\/search|href:\s*"\/search|navigate\(`\/search/.test(landingFiles)) failures.push("Landing page masih mempunyai tautan menuju alur lama.");
if (!/searchParams\.get\("subject_name"\)/.test(packageBuilder)) failures.push("PackageBuilder belum menerima pilihan mapel landing.");

if (failures.length) {
  console.error("Pensiun alur pencarian lama gagal:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Alur pencarian lama sudah dipensiunkan dan seluruh tautan landing memakai pembuat paket.");
