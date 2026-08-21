import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const combobox = read("src/components/SubjectCombobox.tsx");
const packageBuilder = read("src/pages/students/PackageBuilder.tsx");
const packageController = read("bimbelku-backend/app/Http/Controllers/Api/StudentPackageController.php");

const checks = [
  [combobox.includes("createPortal") && combobox.includes("document.body"), "dropdown dirender melalui portal agar tidak terpotong parent"],
  [combobox.includes('z-[var(--layer-detail-popover)]') && combobox.includes("visualViewport"), "posisi dan layer dropdown mengikuti ruang viewport"],
  [combobox.includes('placement: "top" | "bottom"') && combobox.includes('"translateY(-100%)"'), "dropdown dapat berpindah ke atas saat ruang bawah sempit"],
  [combobox.includes("maxHeight: menuPosition.maxHeight") && combobox.includes("overflow-y-auto") && combobox.includes("overscroll-contain"), "daftar panjang memiliki batas tinggi dan scroll internal"],
  [combobox.includes('document.addEventListener("pointerdown", closeWhenOutside)'), "klik atau sentuh di luar menutup dropdown"],
  [combobox.includes('event.key === "ArrowDown"') && combobox.includes('event.key === "ArrowUp"'), "navigasi panah keyboard tersedia"],
  [combobox.includes('event.key === "Enter"') && combobox.includes('event.key === "Escape"'), "Enter memilih dan Escape menutup dropdown"],
  [combobox.includes('event.key === "Home"') && combobox.includes('event.key === "End"'), "navigasi awal dan akhir daftar tersedia"],
  [combobox.includes("aria-activedescendant") && combobox.includes('role="listbox"') && combobox.includes('role="option"'), "semantik combobox aksesibel tersedia"],
  [combobox.includes("useId") && combobox.includes("listboxId"), "setiap dropdown memiliki ID unik"],
  [packageBuilder.includes("<SubjectCombobox") && packageBuilder.includes('placeholder="Cari mata pelajaran"'), "pemilih mapel paket menggunakan combobox pencarian"],
  [!packageBuilder.includes('<option value="">Pilih mapel</option>'), "dropdown mapel native lama sudah dihapus dari pembuat paket"],
  [packageBuilder.includes("other.key !== item.key") && packageBuilder.includes("other.curriculum_subject_id === subject.id"), "mapel yang sama tidak dapat dipilih dua kali dalam satu paket"],
  [packageBuilder.includes('curriculum_subject_id: ""') && packageBuilder.includes("setGrade"), "pilihan mapel lama dibersihkan saat jenjang atau kelas berubah"],
  [packageController.includes("'subjects.*.curriculum_subject_id' => ['required', 'integer', 'distinct', 'exists:curriculum_subjects,id']"), "backend memvalidasi ID mapel paket dan mencegah duplikasi"],
  [(packageController.match(/'subjects\.\*\.curriculum_subject_id'/g) || []).length >= 2, "backend memvalidasi ID mapel ketika menghitung harga"],
];

const failures = checks.filter(([passed]) => !passed);
for (const [passed, description] of checks) {
  console.log(`${passed ? "✓" : "✗"} ${description}`);
}

if (failures.length) {
  console.error(`\nPemeriksaan Revisi 2 gagal pada ${failures.length} bagian.`);
  process.exit(1);
}

console.log("\nPemeriksaan Revisi 2 lulus.");
