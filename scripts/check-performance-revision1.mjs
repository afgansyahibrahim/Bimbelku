import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const expect = (condition, message) => {
  if (!condition) throw new Error(`Performance Revisi 1 gagal: ${message}`);
};

const http = read('src/lib/http.ts');
const layout = read('src/components/StudentLayout.tsx');
const builder = read('src/pages/students/PackageBuilder.tsx');
const routes = read('bimbelku-backend/routes/api.php');
const cors = read('bimbelku-backend/config/cors.php');
const packages = read('bimbelku-backend/app/Http/Controllers/Api/StudentPackageController.php');
const rates = read('bimbelku-backend/app/Services/HourlyRateService.php');

const publicGetEndpoints = [
  '/learning-catalog',
  '/settings/footer',
  '/socials',
  '/settings/teacher-cover',
  '/package-plans',
  '/learning-time-slots',
  '/content/banners',
  '/content/tutorials',
  '/content/promotions',
];

for (const endpoint of publicGetEndpoints) {
  expect(routes.includes(`'${endpoint}'`), `rute publik ${endpoint} tidak ditemukan`);
  expect(http.includes(`"${endpoint}"`), `allowlist GET publik ${endpoint} tidak ditemukan`);
}

expect(
  http.includes('token && !isPublicGetRequest(method, url)'),
  'Authorization masih dipasang tanpa membedakan GET publik',
);
expect(
  cors.includes("env('CORS_MAX_AGE', 600)"),
  'preflight cache CORS belum diaktifkan',
);
expect(
  builder.includes('new AbortController()') && builder.includes('signal: controller.signal'),
  'request quote lama belum dapat dibatalkan',
);
expect(
  packages.includes("'lines' => $lines") && packages.includes("$subtotal = (int) $lines->sum('subtotal_amount')"),
  'quote masih menghitung rate/line lebih dari satu lintasan',
);
expect(
  rates.includes('private ?int $cacheVersion = null') && rates.includes('$this->cacheVersion ??='),
  'versi cache hourly rate belum dimemoisasi per service instance',
);
expect(
  layout.includes('window.matchMedia(DESKTOP_MEDIA_QUERY)') && layout.includes('{!isDesktop && <MobileBottomNav role="student"'),
  'mobile bottom navigation masih dimount pada desktop',
);

console.log('Performance Revisi 1 lulus pemeriksaan source-level.');
