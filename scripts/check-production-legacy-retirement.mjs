import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const add = (label, ok) => checks.push([label, Boolean(ok)]);
const checks = [];

const routes = read('bimbelku-backend/routes/api.php');
const app = read('src/App.tsx');
const adminLayout = read('src/components/AdminLayout.tsx');
const migration = read('bimbelku-backend/database/migrations/2026_08_20_120000_retire_preproduction_legacy_runtime.php');
const bookingRequest = read('bimbelku-backend/app/Models/BookingRequest.php');
const packageSubject = read('bimbelku-backend/app/Models/PackageSubject.php');
const packageChapter = read('bimbelku-backend/app/Models/PackageChapter.php');
const packageSessionLog = read('bimbelku-backend/app/Models/PackageSessionChapterLog.php');

for (const file of [
  'src/pages/students/LegacyRequests.tsx',
  'bimbelku-backend/app/Http/Controllers/Api/BookingRequestController.php',
  'bimbelku-backend/app/Http/Controllers/Api/LearningAttachmentController.php',
  'bimbelku-backend/app/Http/Controllers/Api/LearningTopicController.php',
  'bimbelku-backend/app/Services/GroupClassService.php',
  'bimbelku-backend/app/Models/GroupPool.php',
  'bimbelku-backend/app/Models/GroupMember.php',
  'bimbelku-backend/app/Models/LearningPlan.php',
  'bimbelku-backend/app/Models/LearningTopic.php',
  'bimbelku-backend/app/Models/PackageLearningTopic.php',
  'bimbelku-backend/app/Models/PackageSessionTopicLog.php',
]) add(`retired file removed: ${file}`, !existsSync(resolve(root, file)));

add('Bab-native admin route exists', app.includes('/admin/chapters') && routes.includes("Route::get('/chapters'") && adminLayout.includes('/admin/chapters'));
add('Bab-native progress models exist', existsSync(resolve(root, 'bimbelku-backend/app/Models/PackageChapter.php')) && existsSync(resolve(root, 'bimbelku-backend/app/Models/PackageSessionChapterLog.php')));
add('PackageSubject uses chapters relation', packageSubject.includes('function chapters()') && packageSubject.includes('PackageChapter::class'));
add('chapter model belongs to package subject', packageChapter.includes('PackageSubject::class'));
add('chapter session log belongs to native chapter', packageSessionLog.includes('PackageChapter::class'));
add('legacy BookingRequest model remains internal matching anchor', bookingRequest.includes('offers()') && bookingRequest.includes('packageSubject()'));
add('legacy user-facing booking request route removed', !routes.includes('/student/booking-requests'));
add('legacy learning attachment route removed', !routes.includes('learning-attachments'));
add('legacy PIN route removed', !routes.includes('session-pin') && routes.includes('presence-confirm'));
add('legacy Group V1 route removed', !routes.includes('group-decision'));
add('cleanup migration creates native chapter tables', migration.includes("Schema::create('package_chapters'") && migration.includes("Schema::create('package_session_chapter_logs'"));
add('cleanup migration backfills before dropping legacy tables', migration.indexOf('backfillChapterProgress();') < migration.indexOf('retireLegacyTablesAndColumns();'));
add('cleanup migration removes legacy tables', ['package_learning_topics','package_session_topic_logs','learning_topics','learning_plans','group_members','group_pools'].every((name) => migration.includes(`dropIfExists('${name}')`)));
add('cleanup migration removes legacy session PIN/evidence columns', ['session_pin_hash','session_pin_expires_at','completion_evidence','completion_capture_source','completion_captured_at','pin_verified_at'].every((name) => migration.includes(`'${name}'`)));

const failed = checks.filter(([, ok]) => !ok);
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
console.log(`\n${checks.length - failed.length}/${checks.length} Production Legacy Retirement checks PASS`);
if (failed.length) process.exit(1);
