import fs from "node:fs";
const read=(f)=>fs.readFileSync(f,"utf8"); const checks=[]; const add=(l,o)=>checks.push([l,!!o]);
const demo=read("bimbelku-backend/app/Console/Commands/DemoSessionReminder.php"), session=read("bimbelku-backend/app/Http/Controllers/Api/LearningSessionController.php"), workflow=read("bimbelku-backend/app/Http/Controllers/Api/SessionWorkflowController.php"), student=read("src/pages/students/MyClasses.tsx"), teacher=read("src/pages/teacher/ManageClasses.tsx");
add("demo uses PackageChapter", demo.includes("PackageChapter::create") && !demo.includes("PackageLearningTopic"));
add("session writes provisional chapter logs", session.includes("PackageSessionChapterLog::updateOrCreate") && session.includes("provisional"));
add("student approval commits pending progress", workflow.includes("applyPendingPackageProgress"));
add("student has session review action", student.includes("Sesi Sesuai") && student.includes("Ada masalah"));
add("teacher uses V2 result flow", teacher.includes("Isi Hasil Belajar") && !teacher.includes("PIN"));
let failed=0; for(const [l,o] of checks){console.log(`${o?'PASS':'FAIL'}  ${l}`); if(!o) failed++;} if(failed) process.exit(1); console.log(`\n${checks.length}/${checks.length} Session Workflow Final checks PASS`);
