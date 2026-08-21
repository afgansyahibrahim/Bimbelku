import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const button = read('src/components/ui/button.tsx');
const dialog = read('src/components/ui/dialog.tsx');
const alertDialog = read('src/components/ui/alert-dialog.tsx');
const select = read('src/components/ui/select.tsx');
const css = read('src/index.css');
const studentClasses = read('src/pages/students/MyClasses.tsx');
const teacherClasses = read('src/pages/teacher/ManageClasses.tsx');
const teacherOffers = read('src/pages/teacher/BookingGuru.tsx');
const studentCheap = read('src/pages/students/CheapClasses.tsx');
const packages = read('src/pages/students/MyPackages.tsx');
const sessionHub = read('src/components/LearningSessionHub.tsx');
const promo = read('src/pages/admin/StageFiveManagement.tsx');
const responsiveSelect = read('src/components/ResponsiveSelect.tsx');
const monitoring = read('src/pages/admin/ClassMonitoring.tsx');
const userManagement = read('src/pages/admin/UserManagement.tsx');
const teacherLayout = read('src/components/TeacherLayout.tsx');
const classDetail = read('src/pages/admin/ClassDetail.tsx');
const paymentPopup = read('src/components/PendingPaymentPopup.tsx');

const checks = [
  ['Button shared tidak memaksa nowrap di mobile', button.includes('whitespace-normal break-words') && button.includes('sm:whitespace-nowrap')],
  ['Button shared memiliki min/max width guard', button.includes('min-w-0 max-w-full')],
  ['Dialog shared aman dari horizontal overflow', dialog.includes('min-w-0') && dialog.includes('overflow-x-hidden')],
  ['Dialog shared memakai dvh untuk layar mobile', dialog.includes('100dvh')],
  ['Alert dialog shared aman dari horizontal overflow', alertDialog.includes('min-w-0') && alertDialog.includes('overflow-x-hidden')],
  ['Alert dialog title dapat wrap', alertDialog.includes('break-words text-lg font-semibold')],
  ['Select arrow tidak menyempitkan label', select.includes('shrink-0')],
  ['Select overlay tetap di atas modal', select.includes('!z-[var(--layer-detail-popover)]')],
  ['Guardrail mobile mencegah article/dialog melebar', css.includes('article,') && css.includes('[role="dialog"]') && css.includes('overflow-wrap: anywhere')],
  ['Input mobile memakai 16px untuk mencegah zoom browser', css.includes('font-size: 16px !important')],
  ['Toast mobile dibatasi viewport', css.includes('[data-sonner-toaster]') && css.includes('calc(100vw - 1.5rem)')],
  ['Card Kelas Saya murid min-width safe', studentClasses.includes('flex min-w-0 max-w-full flex-col overflow-hidden')],
  ['Judul kelas murid dapat membungkus', studentClasses.includes('break-words text-lg font-black leading-snug')],
  ['Card Kelas Saya tutor min-width safe', teacherClasses.includes('flex min-w-0 max-w-full flex-col overflow-hidden')],
  ['Card tawaran tutor aman di mobile sempit', teacherOffers.includes('min-[360px]:grid-cols-2') && teacherOffers.includes('break-words')],
  ['Card Kelas Kelompok murid stack di bawah 360px', studentCheap.includes('min-[360px]:flex-row') || studentCheap.includes('min-[360px]:grid-cols-2')],
  ['Card Paket murid stack di bawah 360px', packages.includes('min-[360px]:grid-cols-3')],
  ['Ruang Belajar dibatasi viewport mobile', sessionHub.includes('calc(100dvh-0.5rem)') && sessionHub.includes('overflow-x-hidden')],
  ['Tab Ruang Belajar dipadatkan untuk layar kecil', sessionHub.includes('min-[360px]')],
  ['Toggle promo full width di mobile', promo.includes('w-full min-w-0') && promo.includes('sm:w-auto sm:min-w-[8.5rem]')],
  ['Selector promo multi-select footer stack di mobile', responsiveSelect.includes('min-[360px]:grid-cols-2')],
  ['Monitoring admin memakai kartu mobile terpisah', monitoring.includes('md:hidden') && monitoring.includes('hidden overflow-x-auto md:block')],
  ['Detail user admin menjadi sheet aman di mobile', userManagement.includes('items-end justify-center') && userManagement.includes('overflow-x-hidden')],
  ['Detail notifikasi tutor menjadi sheet aman di mobile', teacherLayout.includes('items-end justify-center') && teacherLayout.includes('break-words text-xl font-black')],
  ['Detail kelas admin ringkasan keuangan stack di layar sangat kecil', classDetail.includes('min-[360px]:grid-cols-2 lg:grid-cols-4')],
  ['Modal pembatalan pembayaran menjadi sheet mobile', paymentPopup.includes('items-end justify-center') && paymentPopup.includes('overflow-x-hidden')],
];

let passed = 0;
for (const [label, ok] of checks) {
  if (ok) {
    passed += 1;
    console.log(`PASS ${label}`);
  } else {
    console.error(`FAIL ${label}`);
  }
}

console.log(`Whole-site UI Mobile Safety ${passed}/${checks.length}`);
if (passed !== checks.length) process.exit(1);
