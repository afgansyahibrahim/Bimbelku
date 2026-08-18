import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const checks = [
  ['single search timeout source', read('bimbelku-backend/app/Services/TeacherMatchingService.php').includes('public function maximumSearchHours()') && !/search_expires_at[^\n]*addHours\(48\)/.test(read('bimbelku-backend/app/Services/PackageCheckoutService.php'))],
  ['matching exhaustion records a reason', read('bimbelku-backend/app/Services/TeacherMatchingService.php').includes("'action' => 'matching_exhausted'") && read('bimbelku-backend/app/Services/TeacherMatchingService.php').includes("'schedule_unavailable'")],
  ['max-scope retry is finite', read('bimbelku-backend/app/Http/Controllers/Api/StudentPackageController.php').includes("$manualRestarts >= 1") && read('bimbelku-backend/app/Http/Controllers/Api/StudentPackageController.php').includes("'search_restarted'" )],
  ['reschedule endpoint exists', read('bimbelku-backend/routes/api.php').includes("/{learningPackage}/reschedule") && read('bimbelku-backend/app/Http/Controllers/Api/StudentPackageController.php').includes('public function reschedule(')],
  ['schedule change resets matching cycle without deleting history', read('bimbelku-backend/app/Http/Controllers/Api/StudentPackageController.php').includes("'action' => 'schedule_changed'") && read('bimbelku-backend/app/Services/TeacherMatchingService.php').includes("->where('action', 'schedule_changed')")],
  ['student UI exposes reason and change schedule', read('src/pages/students/MyPackages.tsx').includes('subject.matching?.message') && read('src/pages/students/MyPackages.tsx').includes('Ubah Jadwal')],
  ['dedicated reschedule page exists', fs.existsSync('src/pages/students/PackageReschedule.tsx') && read('src/App.tsx').includes('/student/packages/:id/reschedule')],
];
let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log('Matching fallback Revisi 9 lulus pemeriksaan source-level.');
