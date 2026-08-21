import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const progress = read("src/pages/students/LearningProgress.tsx");
const studentDetail = read("src/pages/students/LearningProgressDetail.tsx");
const teacherDetail = read("src/pages/teacher/TeacherLearningProgressDetail.tsx");
const subjects = read("src/components/SubjectsSection.tsx");
const landing = read("src/components/DashboardPreviewSection.tsx");

expect(progress.includes("from-slate-950 via-indigo-950 to-blue-800"), "Tema Progress murid belum memakai karakter visual lama slate/indigo/blue");
expect(progress.includes("from-blue-500 to-indigo-600") && progress.includes("bg-indigo-600"), "Progress bar/CTA murid belum mengikuti tema lama");
expect(studentDetail.includes("from-slate-950 via-indigo-950 to-blue-800") && studentDetail.includes("bg-indigo-600 text-white shadow-sm"), "Detail Progress murid belum konsisten dengan tema lama");
expect(teacherDetail.includes("from-slate-950 via-indigo-950 to-blue-800") && teacherDetail.includes("bg-indigo-600 text-white shadow-sm"), "Detail Progress tutor belum konsisten dengan tema lama");
expect(!exists("src/components/StudentWorkspaceList.tsx"), "Komponen Progress lama tidak boleh dihidupkan kembali");

expect(
  subjects.includes("block h-full min-h-[") && subjects.includes("min-w-0 overflow-hidden"),
  "Card Mata Pelajaran mobile belum dibuat block/h-full/min-w-0",
);
expect(
  (subjects.includes("hover:shadow-card") || subjects.includes("hover:shadow-lg"))
    && (subjects.includes("group-hover:scale-110") || subjects.includes("group-hover:scale-105")),
  "Interaksi hover Mata Pelajaran belum memakai utility Tailwind yang valid",
);
expect(!subjects.includes("hover-shadow-card") && !subjects.includes("group-hover-scale-110"), "Utility typo Mata Pelajaran lama masih tersisa");
expect(subjects.includes('className="h-full min-w-0"'), "Wrapper Reveal Mata Pelajaran belum ikut stretch mengikuti grid");

expect(landing.includes('className="hidden sm:block"') && landing.includes('className="sm:hidden"'), "Preview Progress landing belum punya layout desktop/mobile terpisah");
expect(landing.includes("bg-[#0b172a]") && landing.includes("to-[#0F172A]") && !landing.includes("to-background"), "Preview Progress landing belum dark atau masih membuat seam terang sebelum CTA");
expect(landing.includes("MobileProgressPreview") && landing.includes("DesktopProgressPreview"), "Komposisi preview Progress responsive belum dipisahkan");

if (failures.length) {
  console.error("Tahap 5.3 UI Progress/landing gagal:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Tahap 5.3 UI lulus: tema Progress lama diterapkan ke struktur baru, card mapel mobile aman, dan preview landing responsive/dark.");
