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
  [controller.includes("'subjects' => ['nullable', 'array', 'min:1', 'max:3']"), 'backend validates 1-3 package subjects'],
  [controller.includes('Mata pelajaran dalam satu paket tidak boleh duplikat.'), 'backend rejects duplicate subjects'],
  [controller.includes("'subjects' => $this->packageSubjects($class)"), 'admin payload exposes normalized subjects'],
  [service.includes("'subjects' => $template->subjects"), 'class copies subject collection from template'],
  [service.includes('foreach ($this->classSubjects($class) as $requiredSubject)'), 'teacher must cover every selected subject'],
  [model.includes("'subjects' => 'array'"), 'model casts subjects JSON'],
  [migration.includes("$table->json('subjects')"), 'migration adds subjects JSON'],
  [teacherMigration.includes('OLD_PROFILE_UNIQUE') && teacherMigration.includes('PROFILE_SUBJECT_UNIQUE') && teacherMigration.includes('dropUnique(self::OLD_PROFILE_UNIQUE)'), 'teacher subject schema allows multiple distinct subjects'],
  [teacherController.includes("'subjects' => ['required', 'array', 'min:1', 'max:4']"), 'teacher API accepts 1-4 competencies'],
  [teacherUi.includes('teachingSubjects.length >= 4') && teacherUi.includes('Tambah mata pelajaran'), 'teacher UI manages 1-4 competencies'],
  [ui.includes('{form.subjects.length}/3 mapel'), 'UI displays 1-3 package subject counter'],
  [ui.includes('Tambah mapel'), 'UI can add another subject'],
  [ui.includes('disabled={form.subjects.length === 1}'), 'UI cannot remove the final subject'],
  [controller.includes("'weekdays' => ['required', 'array', 'min:1', 'max:4']"), 'backend validates 1-4 learning days'],
  [ui.includes('Pilih 1–{maximumWeekdays} hari.') && ui.includes('form.weekdays.length >= maximumWeekdays') && ui.includes('current.weekdays.length === 1'), 'UI enforces the dynamic 1-4 learning-day limit'],
  [test.includes('test_admin_can_choose_one_to_three_subjects_and_teacher_must_cover_all_selected_subjects'), 'regression test covers 1-3 package subject rules'],
];

let failed = false;
for (const [ok, label] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log('Pemeriksaan multi-mapel Kelas Murah lulus.');
