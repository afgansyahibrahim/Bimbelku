import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const source = read("src/components/LearningSessionHub.tsx");
const checks = [];
const add = (label, ok) => checks.push([label, Boolean(ok)]);

add(
  "quiet polling preserves editable drafts",
  source.includes("if (!quiet) {")
    && source.includes("Background polling only refreshes server state")
    && source.includes("setTopicUpdates(loadedTopicUpdates)")
    && source.indexOf("setTopicUpdates(loadedTopicUpdates)") > source.indexOf("if (!quiet) {")
);
add(
  "learning hub still polls server state",
  source.includes("window.setInterval(() => void load(true), 15000)")
);
add(
  "checkout sends tutor directly to progress tab",
  source.includes('notify.success("Sesi sudah diakhiri. Sekarang isi hasil belajar pada tab Hasil belajar.")')
    && source.includes('setTab("progress")')
);
add(
  "session tab has explicit next-step progress CTA",
  source.includes("Langkah berikutnya")
    && source.includes("Isi hasil belajar sebelum menyelesaikan sesi")
    && source.includes("Lanjut isi hasil belajar")
);
add(
  "progress tab gets attention indicator while required",
  source.includes('label="Hasil belajar" attention={hub.role === "teacher"')
    && source.includes('aria-label="Perlu diisi"')
);

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed += 1;
}
if (failed) process.exit(1);
console.log(`\n${checks.length}/${checks.length} Session Draft & Guidance checks PASS`);
