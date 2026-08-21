import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const file = path.join(root, 'src/pages/WhyUs.tsx');
const text = fs.readFileSync(file, 'utf8');

const checks = [
  ['uses current Paket Belajar terminology', text.includes('Paket Belajar')],
  ['uses current Kelas Kelompok terminology', text.includes('Kelas Kelompok')],
  ['explains material progress', text.includes('Progress berbasis materi')],
  ['explains session history', text.includes('riwayat per sesi') || text.includes('Riwayat per sesi')],
  ['keeps StudentPackageLink guard', text.includes('StudentPackageLink')],
  ['removes old Kelas Privat heading', !text.includes('Kelas Privat.')],
  ['removes old Kelas Grup heading', !text.includes('Kelas Grup.')],
  ['removes oversized person icon visual', !text.includes('size={300}')],
  ['keeps responsive mobile-first layout', text.includes('sm:grid-cols-2') && text.includes('lg:grid-cols-2')],
  ['avoids old malformed hover utility', !text.includes('group-hover-shadow') && !text.includes('group-hover-scale')],
  ['centers final CTA across full reveal width', text.includes('<Reveal width="100%">') && text.includes('mx-auto flex w-full max-w-5xl')],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failed += 1;
}

if (failed) process.exit(1);
console.log(`\n${checks.length}/${checks.length} WhyUs refresh checks PASS`);
