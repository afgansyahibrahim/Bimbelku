import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const controller = read('bimbelku-backend/app/Http/Controllers/Api/AdminCheapClassController.php');
const service = read('bimbelku-backend/app/Services/CheapClassService.php');
const model = read('bimbelku-backend/app/Models/CheapClass.php');
const ui = read('src/pages/admin/CheapClassManagement.tsx');
const teacherController = read('bimbelku-backend/app/Http/Controllers/Api/TeacherController.php');
const teacherUi = read('src/pages/teacher/TeacherProfile.tsx');
const test = read('bimbelku-backend/tests/Feature/CheapClassWorkflowTest.php');
const migration = read('bimbelku-backend/database/migrations/2026_08_12_000150_add_multi_subjects_to_cheap_classes.php');
const teacherMigration = read('bimbelku-backend/database/migrations/2026_08_12_000160_allow_multiple_teacher_subjects.php');

const checks = [
  [controller.includes('$maximumSubjects = match') && controller.includes('8 => 2') && controller.includes('default => 1'), 'backend limits subjects based on session count'],
  [controller.includes('Mata pelajaran dalam satu paket tidak boleh duplikat.'), 'backend rejects duplicate subjects'],
  [controller.includes("'subjects' => $this->packageSubjects($class)"), 'admin payload exposes normalized subjects'],
  [service.includes("'subjects' => $template->subjects"), 'class copies subject collection from template'],
  [service.includes('foreach ($this->classSubjects($class) as $requiredSubject)'), 'teacher must cover every selected subject'],
  [model.includes("'subjects' => 'array'"), 'model casts subjects JSON'],
  [migration.includes("$table->json('subjects')"), 'migration adds subjects JSON'],
  [teacherMigration.includes('OLD_PROFILE_UNIQUE') && teacherMigration.includes('PROFILE_SUBJECT_UNIQUE') && teacherMigration.includes('dropUnique(self::OLD_PROFILE_UNIQUE)'), 'legacy teacher subject schema preserves distinct subjects for safe review'],
  [teacherController.includes("'subjects' => ['required', 'array', 'size:1']"), 'teacher API accepts exactly one main subject'],
  [teacherUi.includes('teachingSubjects.length >= 1') && teacherUi.includes('satu mapel utama'), 'teacher UI limits the profile to one main subject'],
  [ui.includes('{form.subjects.length}/{maximumSubjects} mapel'), 'UI displays the dynamic package subject limit'],
  [ui.includes('Tambah mapel'), 'UI can add another subject'],
  [ui.includes('disabled={form.subjects.length === 1}'), 'UI cannot remove the final subject'],
  [controller.includes("'weekdays' => ['required', 'array', 'min:1', 'max:4']"), 'backend validates 1-4 learning days'],
  [ui.includes('{maximumWeekdays} hari') && ui.includes('form.weekdays.length >= maximumWeekdays') && ui.includes('current.weekdays.length === 1'), 'UI enforces the dynamic 1-4 learning-day limit'],
  [test.includes('test_admin_can_choose_one_to_three_subjects_and_teacher_must_cover_all_selected_subjects'), 'regression test covers 1-3 package subject rules'],
];

let failed = false;
for (const [ok, label] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log('Pemeriksaan multi-mapel Kelas Kelompok lulus.');
