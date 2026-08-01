import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const guide = read("src/components/RoleQuickGuide.tsx");
const studentLayout = read("src/components/StudentLayout.tsx");
const teacherLayout = read("src/components/TeacherLayout.tsx");
const adminLayout = read("src/components/AdminLayout.tsx");

const checks = [
  [guide.includes('type Role = "student" | "teacher" | "admin";'), "tutorial mendukung murid, tutor, dan admin"],
  [guide.includes('role="dialog"') && guide.includes('aria-modal="true"'), "dialog memiliki semantik aksesibel"],
  [guide.includes("items-center justify-center"), "dialog diposisikan di tengah viewport"],
  [guide.includes("createPortal") && guide.includes("document.body"), "dialog dirender melalui portal langsung ke body"],
  [guide.includes("max-h-[calc(100dvh-1.5rem)]"), "tinggi dialog mengikuti dynamic viewport HP"],
  [guide.includes("min-h-0 flex-1 overflow-y-auto overscroll-contain"), "isi panjang memiliki scroll internal"],
  [guide.includes("document.body.style.overflow = \"hidden\""), "scroll halaman belakang dikunci"],
  [guide.includes('event.key === "Escape"'), "tombol Escape menutup tutorial"],
  [guide.includes('event.key !== "Tab"') && guide.includes("focusableSelector"), "fokus keyboard ditahan di dalam dialog"],
  [guide.includes("<header") && guide.includes("<footer"), "header dan navigasi dipisahkan dari area scroll"],
  [guide.includes("activeStep.image_url") && guide.includes("object-contain"), "gambar langkah ditampilkan secara responsif"],
  [studentLayout.includes('<RoleQuickGuide role="student" />'), "tombol tutorial tersedia pada layout murid"],
  [teacherLayout.includes('<RoleQuickGuide role="teacher" />'), "tombol tutorial tersedia pada layout tutor"],
  [adminLayout.includes('<RoleQuickGuide role="admin" />'), "tombol tutorial tersedia pada layout admin"],
];

const failures = checks.filter(([passed]) => !passed);
for (const [passed, description] of checks) {
  console.log(`${passed ? "✓" : "✗"} ${description}`);
}

if (failures.length) {
  console.error(`\nPemeriksaan Revisi 1 gagal pada ${failures.length} bagian.`);
  process.exit(1);
}

const duplicateMigrations = [
  "bimbelku-backend/database/migrations/2026_07_29_000100_remove_higher_education_level.php",
  "bimbelku-backend/database/migrations/2026_07_29_000200_harden_supported_education_levels.php",
].filter((relativePath) => fs.existsSync(path.join(root, relativePath)));

if (duplicateMigrations.length) {
  console.error(`Migrasi duplikat/berisiko masih ditemukan:\n${duplicateMigrations.join("\n")}`);
  process.exit(1);
}

console.log("\nPemeriksaan Revisi 1 lulus.");
