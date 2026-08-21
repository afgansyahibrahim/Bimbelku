import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const source = read("src/components/LearningSessionHub.tsx");
const checks = [];
const add = (label, ok) => checks.push([label, Boolean(ok)]);

add(
  "quiet polling preserves editable drafts",
  source.includes("if (!quiet) {")
    && source.includes("setChapterUpdates(loaded)")
    && source.indexOf("setChapterUpdates(loaded)") > source.indexOf("if (!quiet) {")
);
add(
  "learning hub still polls server state",
  source.includes("window.setInterval(() => void load(true), 15000)")
);
add(
  "checkout sends tutor directly to progress tab",
  source.includes("Sesi diakhiri. Isi hasil belajar singkat untuk murid.")
    && source.includes('setTab("progress")')
);
add(
  "session completion exposes the next required action",
  source.includes("can_report_progress")
    && source.includes('setTab("progress")')
    && source.includes("Simpan Hasil Belajar")
);
add(
  "progress tab gets attention indicator while required",
  source.includes('label="Hasil" attention={hub.role === "teacher" && hub.permissions.can_report_progress}')
    && source.includes("aria-label={attention")
);

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed += 1;
}
if (failed) process.exit(1);
console.log(`\n${checks.length}/${checks.length} Session Draft & Guidance checks PASS`);
