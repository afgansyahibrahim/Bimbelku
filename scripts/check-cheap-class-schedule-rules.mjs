import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const controller = read('bimbelku-backend/app/Http/Controllers/Api/AdminCheapClassController.php');
const service = read('bimbelku-backend/app/Services/CheapClassService.php');
const ui = read('src/pages/admin/CheapClassManagement.tsx');
const test = read('bimbelku-backend/tests/Feature/CheapClassScheduleRulesTest.php');

const checks = [
  [controller.includes("'registration_open_date'") && controller.includes("'registration_open_time'"), 'backend accepts registration opening date and time'],
  [controller.includes('nextLearningSlot') && controller.includes('firstAllowedSessionAt'), 'backend computes the first eligible learning slot'],
  [controller.includes('Pendaftaran paket baru berlangsung tetap selama 24 jam.') && ui.includes('24 jam · tetap'), 'new scheduling flow fixes registration to one day'],
  [controller.includes('min(4, (int) $data[\'session_count\'])') && controller.includes('Paket 1 sesi hanya boleh memilih 1 hari belajar.'), 'backend limits learning days by session count'],
  [service.includes('$explicitRegistrationOpensAt') && service.includes("->addHours((int) $data['registration_window_hours'])"), 'service derives registration deadline from the chosen opening'],
  [service.includes('$startOffsetSeconds') && service.includes('recurrence_anchor_at'), 'recurring engine preserves the computed weekly session offset'],
  [ui.includes('Tanggal pembukaan pendaftaran') && ui.includes('Jam pembukaan pendaftaran'), 'UI explains that date and time open registration'],
  [ui.includes('firstEligibleSession') && ui.includes('Sesi pertama otomatis'), 'UI previews the first computed session'],
  [ui.includes('maximumWeekdays') && ui.includes('Paket satu sesi hanya memakai satu hari.'), 'UI enforces the dynamic day limit'],
  [test.includes('opening_date_controls_registration') && test.includes('one_session_package_rejects') && test.includes('preserves_weekly_opening'), 'feature tests cover opening, one-day limit, and weekly recurrence'],
];

let failed = false;
for (const [ok, label] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failed = true;
}

if (failed) process.exit(1);
console.log('Pemeriksaan aturan tanggal dan hari Kelas Kelompok Tahap 3 lulus.');
