import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const checks = [];
const add = (label, ok) => checks.push([label, Boolean(ok)]);

const builder = read("src/pages/students/PackageBuilder.tsx");
const hub = read("src/components/LearningSessionHub.tsx");
const studentDetail = read("src/pages/students/LearningProgressDetail.tsx");
const teacherDetail = read("src/pages/teacher/TeacherLearningProgressDetail.tsx");
const progressLib = read("src/lib/studentProgress.ts");
const packageController = read("bimbelku-backend/app/Http/Controllers/Api/StudentPackageController.php");
const sessionController = read("bimbelku-backend/app/Http/Controllers/Api/LearningSessionController.php");
const catalogController = read("bimbelku-backend/app/Http/Controllers/Api/LearningCatalogController.php");
const helper = read("bimbelku-backend/app/Support/PackageChapterProgress.php");
const adminController = read("bimbelku-backend/app/Http/Controllers/Api/AdminClassController.php");
const adminPage = read("src/pages/admin/ClassMonitoring.tsx");
const migration = read("bimbelku-backend/database/migrations/2026_08_19_190000_add_admin_monitoring_booking_index.php");
const adminTest = read("bimbelku-backend/tests/Feature/StageSixCAdminOperationsTest.php");
const packageTest = read("bimbelku-backend/tests/Feature/StageFivePackageExperienceTest.php");
const sessionTest = read("bimbelku-backend/tests/Feature/StageOneSessionActionReminderTest.php");

add("package builder is Bab-only", builder.includes("Bab yang ingin dipelajari") && builder.includes("chapters_only: 1") && !builder.includes("Subbab"));
const submitBlock = builder.split('const response = await http.post("/student/packages", {')[1]?.split('});')[0] ?? "";
add("package submission no longer sends learning_topic_ids", submitBlock.includes("curriculum_chapter_ids: item.curriculum_chapter_ids") && submitBlock.includes("learning_goal: item.learning_goal") && !submitBlock.includes("learning_topic_ids"));
add("new package stores native PackageChapter rows", packageController.includes("PackageChapter::create") && packageController.includes("'curriculum_chapter_id' => $chapter->id") && packageController.includes("'title' => $chapter->title"));
add("package API exposes learning_chapters", packageController.includes("'learning_chapters' => PackageChapterProgress::chapters"));
add("legacy topic payload is retired", !packageController.includes("learning_topic_id") && !sessionController.includes("learning_topic_id"));
add("catalog is chapter-native", !catalogController.includes("LearningTopic") && catalogController.includes("chapters"));
add("Bab helper is native without Subbab aggregation", !helper.includes("groupBy") && helper.includes("total_chapters") && helper.includes("completed_chapters") && helper.includes("chapterLogs"));
add("session report uses chapter_updates", hub.includes("chapter_updates") && sessionController.includes("'chapter_updates' => ['nullable', 'array', 'max:8']") && sessionTest.includes("'chapter_updates' => ["));
add("progress percentages are Bab-based", progressLib.includes("packageChapterStats") && sessionController.includes("PackageChapterProgress::summary($preview)['progress_percent']"));
add("student progress detail is Bab-only", studentDetail.includes("Progress dihitung dari Bab") && !studentDetail.toLowerCase().includes("subbab"));
add("teacher progress detail is Bab-only", teacherDetail.includes("Bab selesai") && !teacherDetail.toLowerCase().includes("subbab"));
add("new package regression test asserts native Bab row", packageTest.includes("package_chapters") && packageTest.includes("'title' => $chapter->title"));

add("admin monitoring defaults to attention", adminController.includes("query('scope', 'attention')") && adminPage.includes('useState<Scope>("attention")'));
add("admin monitoring forbids all-data scope", adminController.includes("['attention', 'active', 'upcoming', 'history']") && !adminController.includes("'scope', 'all'"));
add("admin monitoring is server paginated", adminController.includes("$query->paginate($perPage)") && adminController.includes("min(50") && adminPage.includes("per_page: 20"));
add("admin search and filters run server-side", adminController.includes("whereHas('teacher'") && adminController.includes("where('start_at', '>=', $fromBoundary)") && adminController.includes("where('start_at', '<', $toBoundary)") && adminController.includes("where('class_type', 'private')"));
add("admin list does not eager-load participant records", adminController.includes("withCount") && !adminController.split("public function index")[1].split("public function show")[0].includes("'participants.student'"));
add("admin detail loads heavy relations on demand", adminController.split("public function show")[1].includes("'participants.student'") && adminController.split("public function show")[1].includes("'reports'"));
add("admin monitoring has responsive cards instead of squeezed mobile table", adminPage.includes("md:hidden") && adminPage.includes("hidden overflow-x-auto md:block"));
add("admin search is debounced", adminPage.includes("setTimeout") && adminPage.includes("400"));
add("monitoring index exists", migration.includes("bookings_class_type_status_start_idx") && migration.includes("['class_type', 'status', 'start_at']"));
add("admin pagination regression test exists", adminTest.includes("test_admin_class_monitoring_is_server_paginated_and_attention_first") && adminTest.includes("assertCount(20") && adminTest.includes("search=Fisika%20Monitoring"));

const frontendUserFiles = [
  "src/pages/students/PackageBuilder.tsx",
  "src/components/LearningSessionHub.tsx",
  "src/pages/students/LearningProgressDetail.tsx",
  "src/pages/students/LearningProgress.tsx",
  "src/pages/teacher/TeacherLearningProgressDetail.tsx",
  "src/pages/teacher/ManageClasses.tsx",
  "src/components/DashboardPreviewSection.tsx",
  "src/pages/WhyUs.tsx",
  "src/pages/students/Account.tsx",
  "src/pages/rules/TermsConditions.tsx",
  "src/pages/rules/PrivacyPolicy.tsx",
];
add("no Subbab wording remains in active user-facing Stage 2 surfaces", frontendUserFiles.every((file) => !read(file).toLowerCase().includes("subbab")));

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed += 1;
}
if (failed) process.exit(1);
console.log(`\n${checks.length}/${checks.length} Tahap 2 Bab-only + Admin Monitoring checks PASS`);
