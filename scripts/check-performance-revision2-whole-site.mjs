import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const app = read("src/App.tsx");
expect(app.includes("const routeLazy"), "Preload route aktif belum tersedia.");
expect(app.includes("CURRENT_PATH"), "Path awal belum dipakai untuk preload route aktif.");
expect(!app.includes("packageBuilderModule"), "Preload masih hanya khusus PackageBuilder.");

const navbar = read("src/components/Navbar.tsx");
expect(!navbar.includes('import http from "@/lib/http"'), "Navbar masih menarik HTTP client pada initial landing.");
expect(navbar.includes('await import("@/lib/http")'), "HTTP logout Navbar belum deferred.");
expect(navbar.includes("readStoredUser"), "Navbar masih membutuhkan render kedua untuk user localStorage.");

const index = read("src/pages/Index.tsx");
expect(index.includes("IntersectionObserver"), "Section landing belum benar-benar deferred berdasarkan viewport.");
expect(index.includes("DeferredSection"), "DeferredSection landing belum tersedia.");

const notify = read("src/lib/notify.ts");
expect(notify.includes('import("sonner")'), "Toast module belum dimuat secara dinamis.");
const scheduler = read("src/lib/schedule.ts");
expect(scheduler.includes("requestIdleCallback"), "Scheduler non-kritis belum memakai idle browser.");
expect(!scheduler.match(/setTimeout\([^,]+,\s*\d{3,}/), "Scheduler non-kritis masih memakai delay angka arbitrer.");
const sourceRoot = path.join(root, "src");
const directSonner = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      const source = fs.readFileSync(full, "utf8");
      const relative = path.relative(root, full).replaceAll("\\", "/");
      if (
        source.match(/import\s+\{\s*toast\s*\}\s+from\s+["']sonner["']/)
        && relative !== "src/components/ui/sonner.tsx"
      ) directSonner.push(relative);
    }
  }
};
walk(sourceRoot);
expect(directSonner.length === 0, `Sonner masih static pada: ${directSonner.join(", ")}`);

const studentLayout = read("src/components/StudentLayout.tsx");
expect(studentLayout.includes("scheduleNonCriticalTask(start)"), "Request layout Student belum dijadwalkan setelah pekerjaan kritis.");
expect(studentLayout.includes("!isDesktop && <MobileBottomNav"), "Bottom nav Student masih dimount pada Desktop.");

const teacherLayout = read("src/components/TeacherLayout.tsx");
expect(teacherLayout.includes("scheduleNonCriticalTask(start)"), "Request layout Teacher belum dijadwalkan setelah pekerjaan kritis.");
expect(teacherLayout.includes("!isDesktop && <MobileBottomNav"), "Bottom nav Teacher masih dimount pada Desktop.");
expect(teacherLayout.includes('const RoleQuickGuide = lazy'), "RoleQuickGuide Teacher belum code-split.");

const roleQuickGuide = read("src/components/RoleQuickGuide.tsx");
expect(roleQuickGuide.includes("scheduleNonCriticalTask(fetchTutorial)"), "Tutorial global masih berebut request pada critical path.");

const myClasses = read("src/pages/students/MyClasses.tsx");
expect(!myClasses.includes('if (loading) {\n    return <StudentLayout title="Kelas Saya">'), "MyClasses masih menahan hero sampai API selesai.");
expect(myClasses.includes('const LearningSessionHub = lazy'), "LearningSessionHub Student masih masuk initial class bundle.");
expect(myClasses.includes("render-auto flex flex-col"), "Daftar kelas Student belum memakai content-visibility.");
expect(myClasses.includes('getCached<ClassListResponse>("/student/classes"'), "Daftar kelas Student belum memakai cache/dedupe GET aman.");

const manageClasses = read("src/pages/teacher/ManageClasses.tsx");
expect(!manageClasses.includes('if (loading) {\n    return <TeacherLayout title="Kelas Saya">'), "ManageClasses masih menahan hero sampai API selesai.");
expect(manageClasses.includes('const LearningSessionHub = lazy'), "LearningSessionHub Teacher masih initial.");
expect(manageClasses.includes('const CameraCapture = lazy'), "CameraCapture Teacher masih initial.");
expect(manageClasses.includes("render-auto flex flex-col"), "Daftar kelas Teacher belum memakai content-visibility.");
expect(manageClasses.includes('getCached<unknown>("/teacher/classes"'), "Daftar kelas Teacher belum memakai cache/dedupe GET aman.");

const classroom = read("bimbelku-backend/app/Http/Controllers/Api/ClassroomController.php");
expect(classroom.includes("'classroomMessages as unread_message_count'"), "N+1 unread teacher classes belum diganti withCount.");
expect(!classroom.includes("'unread_message_count' => $booking->classroomMessages()"), "Query unread per-booking masih ada.");

const studentController = read("bimbelku-backend/app/Http/Controllers/Api/StudentController.php");
expect(studentController.includes("'latestLearningProgressReport' =>"), "Latest progress report Student belum eager-loaded.");
expect(!studentController.includes("->get()\n            ->unique('booking_id')"), "Semua progress report masih dimuat lalu unique di PHP.");

if (failures.length) {
  console.error("Performance whole-site revision gagal:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Performance whole-site revision lulus pemeriksaan source-level.");
