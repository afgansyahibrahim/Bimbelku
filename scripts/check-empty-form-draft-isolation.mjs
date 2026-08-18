import fs from "node:fs";

const source = fs.readFileSync("src/pages/students/PackageBuilder.tsx", "utf8");

const checks = [
  [source.includes("draftKeyForCurrentUser"), "draf paket disimpan dengan kunci per akun"],
  [source.includes("setPendingDraft(saved)"), "draf lama hanya ditawarkan, tidak langsung diterapkan"],
  [source.includes("Lanjutkan draf"), "murid mempunyai tombol eksplisit untuk melanjutkan draf"],
  [source.includes('const [planId, setPlanId] = useState<number | "">("")'), "pilihan paket awal kosong"],
  [source.includes('const [level, setLevel] = useState("")'), "jenjang awal kosong"],
  [source.includes('const [grade, setGrade] = useState("")'), "kelas awal kosong"],
  [source.includes('const [mode, setMode] = useState<"" | "online" | "offline">("")'), "metode awal kosong"],
  [source.includes('const [durationHours, setDurationHours] = useState<DurationHours | "">("")'), "durasi awal kosong"],
  [!source.includes("localStorage.getItem(DRAFT_KEY)"), "draf global lama tidak dibaca oleh akun lain"],
  [!source.includes("localStorage.setItem(DRAFT_KEY"), "draf baru tidak disimpan secara global"],
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  for (const [, label] of failed) console.error(`GAGAL: ${label}`);
  process.exit(1);
}

console.log(`Form kosong dan isolasi draf lulus (${checks.length} pemeriksaan).`);
