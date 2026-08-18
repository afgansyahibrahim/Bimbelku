import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const controller = read("bimbelku-backend/app/Http/Controllers/Api/LearningCatalogController.php");
const section = read("src/components/SubjectsSection.tsx");
const packageBuilder = read("src/pages/students/PackageBuilder.tsx");
const privateRoute = read("src/components/PrivateRoute.tsx");
const login = read("src/pages/Login.tsx");
const register = read("src/pages/Register.tsx");
const footer = read("src/components/Footer.tsx");

const requirements = [
  [controller, "'landing_subjects' => $this->landingSubjects($catalogSubjects)", "API belum mengirim landing_subjects"],
  [controller, "->where('is_active', true)", "API belum membatasi mapel aktif"],
  [controller, "->take(8)", "API belum membatasi delapan kartu"],
  [section, "response.data.landing_subjects", "landing page belum memakai kontrak landing_subjects"],
  [section, "/student/packages/new?subject_name=", "kartu mapel belum membuka pembuat paket"],
  [packageBuilder, 'searchParams.get("subject_name")', "pembuat paket belum membaca mapel dari landing"],
  [packageBuilder, "requestedSubjectName", "mapel landing belum dipilih pada pembuat paket"],
  [privateRoute, "redirect=", "tujuan pengguna belum dipertahankan saat login"],
  [login, "allowedRedirect", "redirect setelah login belum divalidasi"],
  [login, "registerHref", "tujuan mapel belum diteruskan ke pendaftaran"],
  [register, "loginHref", "tujuan mapel belum dikembalikan ke login setelah pendaftaran"],
  [footer, "/student/packages/new?subject_name=Matematika", "link mapel footer belum membuka Paket Baru"],
];

const failures = requirements
  .filter(([source, needle]) => !source.includes(needle))
  .map(([, , message]) => message);

if (failures.length) {
  console.error("Sinkronisasi mapel landing gagal:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Kontrak mapel landing, Paket Baru, dan redirect login sudah sinkron.");
