import fs from "node:fs";
const read=(f)=>fs.readFileSync(f,"utf8"); const checks=[]; const add=(l,o)=>checks.push([l,!!o]);
const demo=read("bimbelku-backend/app/Console/Commands/DemoSessionReminder.php"), test=read("bimbelku-backend/tests/Feature/StageOneSessionActionReminderTest.php");
add("demo creates real package", demo.includes("LearningPackage::create") && demo.includes("PackageChapter::create") && demo.includes("PackageSession::create"));
add("demo is presence V2 only", demo.includes("presence_confirmation_v2") && !demo.includes("session_pin"));
add("demo test verifies V2 reminder", test.includes("teacher_mark_ready") && test.includes("student_confirm_presence"));
add("demo supports reset/status", demo.includes("'status' => $this->status()") && demo.includes("'reset' => $this->resetDemo()"));
let failed=0; for(const [l,o] of checks){console.log(`${o?'PASS':'FAIL'}  ${l}`); if(!o) failed++;} if(failed) process.exit(1); console.log(`\n${checks.length}/${checks.length} Demo Session V2 checks PASS`);
