import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const read = (relativePath) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const checks = [
  {
    file: "src/components/MobileBottomNav.tsx",
    patterns: [
      /role:\s*Role/,
      /\/student\/packages\/new/,
      /\/guru\/permintaan/,
      /xl:hidden/,
      /safe-area-inset-bottom/,
    ],
  },
  {
    file: "src/components/RoleQuickGuide.tsx",
    patterns: [
      /Panduan murid/,
      /Panduan tutor/,
      /role="dialog"/,
      /localStorage\.setItem/,
    ],
  },
  {
    file: "src/pages/students/PackageBuilder.tsx",
    patterns: [
      /Langkah \{activeStepIndex \+ 1\} dari 5/,
      /Konfirmasi & Bayar/,
      /Pencarian tutor baru dimulai setelah pembayaran dinyatakan diterima oleh sistem/,
      /\/student\/packages/,
    ],
  },
  {
    file: "src/pages/teacher/TeacherSalary.tsx",
    patterns: [
      /grid grid-cols-2 gap-3/,
      /sm:flex-row/,
      /ready_bookings/,
    ],
    forbidden: [
      /min-w-\[900px\]/,
    ],
  },
  {
    file: "bimbelku-backend/routes/api.php",
    patterns: [
      /student\/tutor-availability/,
      /throttle:20,1/,
      /role:student/,
    ],
  },
  {
    file: "bimbelku-backend/app/Http/Controllers/Api/TutorAvailabilityController.php",
    patterns: [
      /hasAvailableCandidate/,
      /has_candidate/,
      /search_radius_km/,
    ],
    forbidden: [
      /teacher_name/,
      /teacher_id/,
      /candidate_count/,
    ],
  },
];

const failures = [];

for (const check of checks) {
  const source = read(check.file);
  for (const pattern of check.patterns) {
    if (!pattern.test(source)) {
      failures.push(`${check.file}: pola wajib ${pattern} tidak ditemukan`);
    }
  }
  for (const pattern of check.forbidden || []) {
    if (pattern.test(source)) {
      failures.push(`${check.file}: pola terlarang ${pattern} ditemukan`);
    }
  }
}

if (failures.length) {
  console.error("Kontrak Tahap 2 gagal:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Kontrak Tahap 2 lulus: Paket Belajar canonical, navigasi mobile, panduan, kartu, dan privasi ketersediaan tersedia.");
