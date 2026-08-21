import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const checks = [];
const expect = (ok, label) => checks.push({ ok: Boolean(ok), label });

const register = read('src/pages/Register.tsx');
const auth = read('bimbelku-backend/app/Http/Controllers/Api/AuthController.php');
const profile = read('src/pages/students/Profile.tsx');
const studentLayout = read('src/components/StudentLayout.tsx');
const teacherLayout = read('src/components/TeacherLayout.tsx');
const quickMenu = read('src/components/ProfileQuickMenu.tsx');
const subject = read('src/components/SubjectCombobox.tsx');
const builder = read('src/pages/students/PackageBuilder.tsx');
const history = read('src/pages/students/TransactionHistory.tsx');

expect(register.includes('student_education_level') && register.includes('GRADES_BY_EDUCATION_LEVEL'), 'Register memisahkan Jenjang dan Kelas/Tingkat');
expect(auth.includes("'student_education_level' => $request->role === 'student'"), 'Backend menyimpan jenjang hasil registrasi');
expect(history.includes('title="Riwayat Pembayaran"'), 'Riwayat Pembayaran menjadi halaman jelas');
expect(studentLayout.includes('label="Riwayat Pembayaran"'), 'Riwayat Pembayaran ada di menu murid');
expect(profile.includes('Atur Lokasi') && profile.includes('Koordinat disimpan otomatis'), 'Lokasi memakai tombol Atur Lokasi dan data teknis tersembunyi');
expect(!profile.includes('>Latitude<') && !profile.includes('>Longitude<') && !profile.includes('Tautan Google Maps</label>'), 'Input Latitude/Longitude/tautan Maps tidak tampil di profil murid');
expect(quickMenu.includes('fixed inset-x-0 bottom-0') && quickMenu.includes('lg:absolute') && quickMenu.includes('(min-width: 1024px)') && quickMenu.includes('bg-slate-950/35'), 'Profile menu responsif: bottom sheet mobile + dropdown layar lebar tanpa blur berat');
expect(studentLayout.includes('<ProfileQuickMenu') && teacherLayout.includes('<ProfileQuickMenu') && quickMenu.includes('type Accent = "student" | "teacher" | "admin"'), 'Profile quick menu aktif untuk murid, tutor, dan admin');
expect(subject.includes('aria-label="Hapus pilihan mata pelajaran"') && subject.includes('onChange("")'), 'Tombol X mereset mata pelajaran');
expect(subject.includes('min-h-11 min-w-11') || subject.includes('h-11 w-11'), 'Tombol reset mapel punya touch target mobile yang nyaman');
expect(builder.includes('Pilih jam belajar') && builder.includes('Pilih waktu yang paling sesuai') && builder.includes('Pagi') && builder.includes('Sore & malam'), 'Pemilih jam memakai konteks pilihan waktu user, bukan availability tutor');
expect(builder.includes('grid-cols-3') && builder.includes('sm:grid-cols-4') && builder.includes('100dvh'), 'Pemilih jam responsif dan aman untuk layar mobile');
expect(builder.includes('animate-in') && builder.includes('slide-in-from-bottom'), 'Pemilih jam memakai animasi ringan yang tetap ramah mobile');
expect(register.includes('px-3 py-4 sm:px-4 sm:py-10') && register.includes('text-3xl') && register.includes('sm:text-4xl'), 'Register disederhanakan untuk layar kecil');

const roots = ['src', 'bimbelku-backend/app'];
const oldLabels = [];
for (const root of roots) {
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else if (/\.(tsx?|php)$/.test(entry.name) && read(path).includes('Kelas Murah')) oldLabels.push(path);
    }
  };
  walk(root);
}
expect(oldLabels.length === 0, `Label user-facing Kelas Murah sudah menjadi Kelas Kelompok${oldLabels.length ? ` (${oldLabels.join(', ')})` : ''}`);

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} - ${item.label}`);
console.log(`\n${checks.length - failed.length}/${checks.length} checks PASS`);
if (failed.length) process.exit(1);
