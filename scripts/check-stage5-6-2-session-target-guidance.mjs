import fs from "node:fs";
const read=(f)=>fs.readFileSync(f,"utf8"); const hub=read("src/components/LearningSessionHub.tsx"), reminder=read("src/components/SessionActionReminder.tsx"), controller=read("bimbelku-backend/app/Http/Controllers/Api/LearningSessionController.php");
const checks=[]; const add=(l,o)=>checks.push([l,!!o]);
add("focus note is optional instead of Target gate", hub.includes("focus_note") && !hub.includes('setTab("plan")') && !hub.includes("learning_plan"));
add("tutor starts with one ready action", hub.includes("Saya Siap Mengajar") && reminder.includes("teacher_mark_ready"));
add("student confirms presence one tap", hub.includes("Saya Sudah Hadir") && reminder.includes("student_confirm_presence"));
add("backend stores optional focus note", controller.includes("session_focus_note") && controller.includes("focus_note"));
add("old goal approval reminders removed", !reminder.includes("student_acknowledge_learning_plan") && !reminder.includes("teacher_prepare_learning_plan"));
let failed=0; for(const [l,o] of checks){console.log(`${o?'PASS':'FAIL'}  ${l}`); if(!o) failed++;} if(failed) process.exit(1); console.log(`\n${checks.length}/${checks.length} Session simplicity checks PASS`);
