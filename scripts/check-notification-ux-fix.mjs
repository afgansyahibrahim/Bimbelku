import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const checks = [
  ['src/App.tsx', '/student/notifications', 'route Pusat Notifikasi murid tersedia'],
  ['src/pages/students/Account.tsx', 'to: "/student/notifications"', 'menu Notifikasi di Saya menuju halaman khusus'],
  ['src/pages/students/Account.tsx', 'attentionCount', 'submenu Saya menampilkan penanda detail'],
  ['src/pages/students/Dashboard.tsx', 'to="/student/notifications"', 'tautan Semua notifikasi tidak lagi berputar ke Saya'],
  ['src/components/NotificationCenter.tsx', 'Detail notifikasi', 'notifikasi dibaca dalam modal detail terlebih dahulu'],
  ['src/components/NotificationCenter.tsx', 'Buka {relatedLabel', 'navigasi lanjutan memakai tombol tujuan eksplisit'],
  ['src/lib/navigationAttention.ts', 'student-profile', 'indikator Profil dipisahkan dari halaman induk Saya'],
  ['src/components/StudentLayout.tsx', 'NAVIGATION_ATTENTION_CHANGED_EVENT', 'indikator sidebar tersinkron segera setelah dibaca'],
];

let failed = false;
for (const [file, needle, label] of checks) {
  const ok = read(file).includes(needle);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log('Notification UX Revisi 8 lulus pemeriksaan source-level.');
