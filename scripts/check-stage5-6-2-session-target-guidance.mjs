import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const hub = read("src/components/LearningSessionHub.tsx");
const reminder = read("src/components/SessionActionReminder.tsx");
const controller = read("bimbelku-backend/app/Http/Controllers/Api/LearningSessionController.php");
const checks = [];
const add = (label, ok) => checks.push([label, Boolean(ok)]);

add(
  "attendance save automatically guides private tutor to learning goal",
  hub.includes('const shouldGuideToLearningPlan = hub.booking.class_type === "private" && !hub.learning_plan;')
    && hub.includes('if (shouldGuideToLearningPlan) setTab("plan")')
    && hub.includes("Kehadiran murid tersimpan. Selanjutnya tentukan tujuan belajar")
);
add(
  "learning-goal tab is explicit and receives attention",
  hub.includes('label="Tujuan belajar" attention={needsLearningPlanGuidance}')
    && hub.includes('&& attendanceComplete')
    && hub.includes('&& !hub.learning_plan')
);
add(
  "session tab keeps a fallback learning-goal CTA",
  hub.includes("Tentukan tujuan belajar setelah absen")
    && hub.includes("Lanjut isi tujuan belajar")
    && hub.includes('onClick={() => setTab("plan")}')
);
add(
  "learning-goal form explains why the step exists",
  hub.includes("Setelah kehadiran · sebelum hasil belajar")
    && hub.includes("Tentukan tujuan belajar untuk sesi ini")
    && hub.includes("murid akan diminta menyetujuinya")
);
add(
  "teacher and student reminder copy uses learning-goal wording",
  reminder.includes('title: "Tentukan tujuan belajar murid"')
    && reminder.includes('button: "Isi tujuan belajar"')
    && reminder.includes('title: "Cek tujuan belajar"')
    && reminder.includes('button: "Periksa tujuan belajar"')
);
add(
  "acknowledged goal gives tutor a one-time positive teaching cue",
  controller.includes("'kind' => 'teacher_session_ready'")
    && controller.includes("'priority' => 40")
    && reminder.includes('title: "Tujuan sudah disepakati. Selamat mengajar!"')
    && reminder.includes('bimbelku:session-action:ack:')
    && reminder.includes('Setelah dibuka, pesan ini selesai')
);
add(
  "draft-safe polling fix remains intact",
  hub.includes("Background polling only refreshes server state")
    && hub.includes("window.setInterval(() => void load(true), 15000)")
);

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed += 1;
}
if (failed) process.exit(1);
console.log(`\n${checks.length}/${checks.length} Session Target Guidance checks PASS`);
