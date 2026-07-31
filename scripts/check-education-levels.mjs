import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const expectedLevels = ["SD", "SMP", "SMA", "Umum"];
const frontendCatalogPath = path.join(root, "src/lib/educationCatalog.ts");
const backendCatalogPath = path.join(
  root,
  "bimbelku-backend/app/Support/EducationCatalog.php",
);
const authControllerPath = path.join(
  root,
  "bimbelku-backend/app/Http/Controllers/Api/AuthController.php",
);
const subjectControllerPath = path.join(
  root,
  "bimbelku-backend/app/Http/Controllers/Api/CurriculumSubjectController.php",
);
const cleanupMigrationPath = path.join(
  root,
  "bimbelku-backend/database/migrations/2026_07_29_000200_harden_supported_education_levels.php",
);

const read = (filePath) => readFile(filePath, "utf8");

const quotedValues = (source) => (
  [...source.matchAll(/["']([^"']+)["']/g)].map((match) => match[1])
);

const extractFrontendLevels = (source) => {
  const match = source.match(/export const EDUCATION_LEVELS\s*=\s*\[([\s\S]*?)\]\s*as const/);
  return match ? quotedValues(match[1]) : [];
};

const extractBackendLevels = (source) => {
  const match = source.match(/public const LEVELS\s*=\s*\[([\s\S]*?)\];/);
  return match ? quotedValues(match[1]) : [];
};

const walkSourceFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkSourceFiles(entryPath));
    if (entry.isFile() && /\.(?:ts|tsx|js|jsx)$/.test(entry.name)) files.push(entryPath);
  }
  return files;
};

const [
  frontendCatalog,
  backendCatalog,
  authController,
  subjectController,
  cleanupMigration,
] = await Promise.all([
  read(frontendCatalogPath),
  read(backendCatalogPath),
  read(authControllerPath),
  read(subjectControllerPath),
  read(cleanupMigrationPath),
]);

const failures = [];
const frontendLevels = extractFrontendLevels(frontendCatalog);
const backendLevels = extractBackendLevels(backendCatalog);
if (JSON.stringify(frontendLevels) !== JSON.stringify(expectedLevels)) {
  failures.push(`Jenjang frontend berubah: ${JSON.stringify(frontendLevels)}`);
}
if (JSON.stringify(backendLevels) !== JSON.stringify(expectedLevels)) {
  failures.push(`Jenjang backend berubah: ${JSON.stringify(backendLevels)}`);
}
if (!authController.includes("Rule::in(EducationCatalog::LEVELS)")) {
  failures.push("Validasi jenjang pendaftaran tidak ditemukan.");
}
if (!subjectController.includes("hasValidScope")) {
  failures.push("Pengaman aktivasi ulang mapel tanpa jenjang tidak ditemukan.");
}
if (!cleanupMigration.includes("cleanStudentProfiles")) {
  failures.push("Pembersihan jenjang lama pada profil murid tidak ditemukan.");
}

const sourceFiles = await walkSourceFiles(path.join(root, "src"));
for (const filePath of sourceFiles) {
  const source = await read(filePath);
  if (/Perguruan Tinggi/i.test(source)) {
    failures.push(`Opsi Perguruan Tinggi masih muncul pada ${path.relative(root, filePath)}.`);
  }
  if (/\bkuliah\b/i.test(source)) {
    failures.push(`Teks kuliah masih muncul pada ${path.relative(root, filePath)}.`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  "Jenjang lulus: frontend dan backend hanya memakai SD, SMP, SMA, dan Umum.",
);
