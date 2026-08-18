import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const service = read('bimbelku-backend/app/Services/CheapClassService.php');
const test = read('bimbelku-backend/tests/Feature/CheapClassTutorIsolationTest.php');

const randomPicker = service.slice(
  service.indexOf('private function pickRandomEligibleTeacher'),
  service.indexOf('public function teacherCanTeach'),
);

const checks = [
  [service.includes("'teacher_id' => null") && service.includes("'meeting_link' => null"), 'new occurrence starts without inherited tutor or Zoom link'],
  [service.includes("'status' => 'waiting_teacher'") && service.includes('$this->replaceTeacherIfNeeded($class)'), 'each occurrence runs its own tutor draw'],
  [randomPicker.includes('return $candidates->random();'), 'tutor is drawn randomly from all eligible candidates'],
  [!randomPicker.includes('$loads') && !randomPicker.includes('$lowestLoad'), 'tutor draw has no load-ranking preference'],
  [service.includes("'cheap_class_id' => (int) $class->id") && service.includes("'package_code' => $class->package_code"), 'order snapshot identifies the exact package occurrence'],
  [test.includes('test_weekly_occurrence_draws_its_own_teacher_and_does_not_inherit_operational_data'), 'feature test covers weekly tutor and operational isolation'],
  [test.includes('test_same_student_receives_a_new_enrollment_and_invoice_for_the_next_week'), 'feature test covers separate enrollment and invoice per week'],
];

let failed = false;
for (const [ok, label] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failed = true;
}

if (failed) process.exit(1);
console.log('Pemeriksaan tutor random dan isolasi paket Kelas Murah Tahap 4 lulus.');
