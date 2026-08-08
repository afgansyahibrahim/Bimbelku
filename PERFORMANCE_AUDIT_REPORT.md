# BimbelKu — Performance Audit & Revisi 1

Tanggal audit: 8 Agustus 2026  
Fokus: React + Vite frontend, Laravel + MySQL API, mobile-first performance.  
Halaman prioritas: `/student/packages/new`.

> Status validasi: perubahan source sudah dibuat dan lulus pemeriksaan statis/sintaks yang tersedia. Angka Lighthouse final **tidak diisi dengan angka perkiraan** karena environment eksekusi ini tidak dapat menjalankan browser ke URL lokal dan dependency frontend tidak dapat dipasang dari registry internal. Bagian benchmark yang belum dapat diukur ditandai jelas.

---

## 0. Ringkasan Eksekutif

Akar masalah yang berhasil dibuktikan dari source dan production bundle lama:

1. **CORS/preflight lokal diperbanyak oleh frontend sendiri.** `src/lib/http.ts` sebelumnya memasang `Authorization` ke semua request ketika token ada, termasuk GET endpoint yang Laravel nyatakan publik. Pada setup frontend `:8080` dan API `:8000`, GET publik itu menjadi request non-simple dan memicu preflight yang sebenarnya tidak dibutuhkan.
2. **Preflight tidak boleh dicache.** `bimbelku-backend/config/cors.php` sebelumnya `max_age = 0`, sehingga keputusan preflight tidak dapat digunakan ulang.
3. **Bearer pada endpoint publik juga mematikan public caching.** Middleware security Laravel memberi `Cache-Control: no-store, private` bila bearer token ada. Akibatnya ETag/public cache yang sudah dipasang di learning catalog/package plans/time slots tidak efektif untuk user yang login.
4. **LCP mobile bukan image dan tidak menunggu API.** Paragraf intro Package Builder dirender bahkan saat state `loading` masih true. Jadi API bukan gate langsung untuk munculnya elemen LCP; jalur JS/module + React initialization lebih relevan untuk render delay awal.
5. **Route Package Builder memiliki graph JS yang cukup lebar.** Existing production bundle mem-preload 29 dependency untuk direct route Package Builder. Bundle lama: main ~69.4 KiB gzip, PackageBuilder ~14.7 KiB gzip, StudentLayout ~5.3 KiB gzip, CSS awal ~21.3 KiB gzip. Total dependency route Package Builder yang terpetakan ~38.7 KiB gzip di luar main.
6. **Quote dapat menyisakan request lama saat form berubah.** Debounce sudah ada, tetapi request yang sudah terlanjur dikirim sebelumnya tidak dibatalkan.
7. **Backend quote menghitung rate dua lintasan.** `HourlyRateService::resolve()` dipanggil saat menghitung subtotal, lalu dipanggil lagi saat membentuk `lines`. Pada environment project saat ini cache Laravel memakai database, sehingga cache lookup juga berarti round-trip database.
8. **Responsive duplicate mount terbukti sebagian.** Sidebar desktop Student tetap dimount di mobile lalu digeser dengan CSS; MobileBottomNav juga sebelumnya dimount di desktop lalu disembunyikan CSS. Tidak ditemukan API effect di MobileBottomNav/sidebar tersebut, jadi tidak ada bukti bahwa dua nav ini menggandakan request API. Revisi ini hanya menghentikan mount MobileBottomNav pada desktop; sidebar mobile tidak di-unmount agar animasi drawer tidak berubah tanpa profiling browser.
9. **CSS awal masih melewati budget internal.** `check-performance-budget.mjs` pada dist lama mencatat CSS gzip 21,544 byte vs budget 20,480 byte. Belum diubah karena tanpa rebuild + visual regression test, mengubah strategi critical CSS berisiko FOUC/perubahan visual.

---

# 1. Environment

### Source yang diperiksa

Frontend:
- `package.json`
- `vite.config.ts`
- `src/main.tsx`
- `src/App.tsx`
- `src/components/PrivateRoute.tsx`
- `src/components/SessionLifecycle.tsx`
- `src/components/StudentLayout.tsx`
- `src/components/MobileBottomNav.tsx`
- `src/lib/http.ts`
- `src/pages/students/PackageBuilder.tsx`
- `src/components/SubjectCombobox.tsx`
- `src/index.css`
- `tailwind.config.ts`
- existing `dist/`

Backend:
- `bimbelku-backend/routes/api.php`
- `config/cors.php`
- middleware auth/role/security
- `LearningCatalogController`
- `StudentPackageController`
- `OrderController`
- `NotificationController`
- `HourlyRateService`
- migration/index yang relevan dengan hourly rate
- konfigurasi cache/database yang relevan

### Production bundle lama terverifikasi

`dist/index.html` memakai:
- `/assets/index-*.js`
- `/assets/index-*.css`

Tidak ditemukan referensi:
- `/@vite/client`
- `/@react-refresh`
- `/src/main.tsx`
- `/node_modules/.vite/deps/...`

Artinya dist yang diberikan memang production bundle, bukan Vite dev server.

### Kenapa benchmark baru tidak dapat dijalankan di sandbox ini

1. `npm ci` gagal karena registry internal environment mengembalikan 404 untuk `yocto-queue@0.1.0`. Akibatnya `vite`/dependency project tidak tersedia untuk rebuild.
2. `npm run build` kemudian gagal karena binary `vite` tidak tersedia.
3. Chromium environment ini dikelola dengan policy `URLBlocklist: ["*"]`, sehingga browser tidak boleh membuka URL local test server.
4. Backend archive tidak membawa `vendor/` dan environment tidak memiliki Composer, sehingga Laravel runtime tidak dapat dijalankan di sini.

Karena itu, laporan ini **tidak mengarang** Run 1/2/3 atau skor Lighthouse final.

---

# 2. Baseline Mobile

Data yang tersedia dari brief yang diberikan untuk `/student/packages/new`:

| Metric | Supplied baseline |
|---|---:|
| Performance | ~56 |
| FCP | ~3.1 s |
| LCP | ~5.9 s |
| TBT | ~530 ms |
| CLS | 0 |
| Speed Index | ~5.1 s |
| Main-thread work | ~5.7 s |
| JS boot/evaluation | ~2.2 s |
| Long tasks | 15 |

Run 1: data di atas.  
Run 2: belum tersedia di file yang diberikan.  
Run 3: belum tersedia di file yang diberikan.  
Median: **tidak diklaim**, karena hanya satu set angka yang tersedia.

LCP element yang disebut pada brief adalah paragraf Package Builder:
`Pilih jumlah sesi, durasi pertemuan, hari, dan jam mulai...`

Source memverifikasi paragraf ini ada di `PackageBuilderIntro` dan tetap dirender saat `loading=true`.

---

# 3. Baseline Desktop

Brief menyatakan Desktop lebih tinggi daripada Mobile, tetapi tidak menyertakan tiga run Desktop lengkap di file yang tersedia.

Run 1: tidak tersedia.  
Run 2: tidak tersedia.  
Run 3: tidak tersedia.  
Median: tidak diklaim.

Existing production bundle yang sama dipakai sebagai dasar static audit frontend.

---

# 4. Root Cause Ranking

## Rank 1 — Cross-origin preflight amplification pada initial API

**Area:** Frontend + API + Environment  
**Bukti source:**
- Default API client adalah origin API terpisah dari frontend local.
- Interceptor sebelumnya memasang Bearer token ke semua request ketika user login.
- `/learning-catalog`, `/package-plans`, `/learning-time-slots`, dan beberapa content endpoint dideklarasikan Laravel sebagai route publik.
- CORS `max_age` sebelumnya 0.
- Security middleware mengubah response ber-bearer menjadi `no-store, private`.

**Dampak:**
- GET publik dapat memicu OPTIONS hanya karena `Authorization`.
- Browser tidak dapat memakai public cache/ETag endpoint tersebut saat bearer ikut dikirim.
- Pada local server yang OPTIONS-nya lambat/queueing, waterfall membesar.

**Perubahan:**
- Bearer hanya dikirim ke request yang memang membutuhkan auth.
- GET publik yang cocok dengan route Laravel tidak diberi Authorization.
- Preflight caching diaktifkan 600 detik.

**Metric terkait:** FCP/LCP secara tidak langsung, network wait, request chain, backend request pressure.

---

## Rank 2 — LCP text tertahan oleh JS/module/render path, bukan image/API gate

**Area:** React/Vite  
**Bukti source:**
- `PackageBuilderIntro` dirender baik pada state loading maupun loaded.
- `PrivateRoute` hanya membaca `localStorage`, tidak menunggu auth API.
- Direct navigation `/student/packages/new` langsung memulai import PackageBuilder.
- Existing production bundle memetakan 29 dependency untuk route ini.
- Supplied trace menyebut element render delay ~1.852 s, script evaluation ~2.0 s, dan JS boot ~2.2 s.

**Dampak:** LCP, FCP, TBT.

**Perubahan Revisi 1:**
- Tidak dilakukan refactor besar route/component tanpa clean Performance trace karena berisiko mengubah UX.
- Responsive hidden tree dikurangi secara aman pada Desktop untuk MobileBottomNav.
- Fokus awal ditempatkan pada preflight/API yang dapat dibuktikan dan request lifecycle quote.

**Remaining:** clean trace diperlukan untuk menunjuk fungsi React/JS terbesar sebelum split berikutnya.

---

## Rank 3 — Quote request lifecycle + backend redundant rate work

**Area:** React + Laravel + cache/database  
**Bukti source:**
- Quote dipanggil setelah debounce 450 ms saat draft valid.
- Request lama yang sudah dikirim sebelumnya tidak memiliki cancellation.
- Backend memanggil `HourlyRateService::resolve()` sekali untuk subtotal dan sekali lagi untuk output line.
- Environment project memakai Laravel database cache, sehingga cache read sendiri memakai database.

**Perubahan:**
- Axios quote sekarang memakai `AbortController`.
- Stale response tidak boleh menimpa quote terbaru.
- Backend membangun `lines` satu kali dan subtotal dijumlah dari `lines`.
- Cache version HourlyRate dimemoisasi pada service instance.

**Delta eksekusi untuk N subject:**
- Rate resolution controller: `2N -> N`.
- Cache-version lookup service: dari satu per resolve menjadi satu per service instance.
- Request quote lama: dapat dibatalkan saat dependency form berubah.

**Metric terkait:** API latency, server/database work, network contention saat form berubah.

---

## Rank 4 — Responsive duplicate mount

**Area:** Responsive/React  
**Bukti source sebelum revisi:**
- Desktop sidebar Student selalu berada di React tree dan disembunyikan/ditransform pada mobile.
- MobileBottomNav selalu berada di React tree dan `xl:hidden` pada desktop.

**Penting:** MobileBottomNav/sidebar tidak punya API effects sendiri, sehingga tidak ditemukan bukti duplicate API dari dua nav tersebut.

**Perubahan aman:**
- Desktop tidak lagi me-mount `MobileBottomNav`.
- Sidebar tetap mempertahankan lifecycle lama di Mobile untuk menjaga animasi drawer identik.

**Metric terkait:** DOM/render kecil pada Desktop.  
**Mobile gain:** belum diklaim.

---

## Rank 5 — Render-blocking global CSS

**Area:** Vite/Tailwind/CSS  
**Bukti:**
- existing CSS ~138 KiB raw / ~21.3 KiB gzip.
- internal performance budget: 21,544 byte > 20,480 byte.
- brief menyebut potensi render-blocking saving ~450 ms.

**Perubahan:** belum dilakukan pada Revisi 1.

**Alasan:** tanpa rebuild + screenshot regression, async stylesheet/critical-CSS extraction berisiko FOUC atau visual berubah. Ini ditahan sampai bisa diuji secara browser.

---

# 5. Responsive Audit

## Mobile initial path

`Navigation`
→ `dist/index.html`
→ main JS + global CSS
→ React root
→ BrowserRouter
→ PrivateRoute (localStorage, tidak menunggu API)
→ PackageBuilder lazy route
→ StudentLayout
→ PackageBuilderIntro + loading skeleton
→ first render/LCP text
→ primary API `Promise.all`
→ full builder
→ secondary API
→ quote hanya saat draft valid.

### Mobile-only/desktop-only component

- MobileBottomNav: diperlukan mobile.
- Desktop sidebar: masih dimount mobile dan disembunyikan via CSS.
- Floating desktop message button: sekarang hanya dimount pada desktop.
- MobileBottomNav: sekarang hanya dimount di bawah breakpoint XL.

## Desktop initial path

Struktur sama, tetapi:
- MobileBottomNav tidak lagi dimount.
- Floating message shortcut dimount.
- Desktop sidebar tetap aktif.

### Tidak ditemukan

- Tidak ditemukan request API di `MobileBottomNav`.
- Tidak ditemukan auth API gate di `PrivateRoute`.
- Tidak ada bukti bahwa DesktopSidebar dan MobileBottomNav menggandakan API request.

---

# 6. API Audit

| Endpoint | Trigger | Before | Revisi 1 | Above the fold |
|---|---|---|---|---|
| `/package-plans` | PackageBuilder primary | GET + bearer; cross-origin dapat preflight | GET publik tanpa bearer; public cache dapat bekerja | Dibutuhkan form, bukan LCP intro |
| `/learning-catalog?compact=1` | PackageBuilder primary | GET + bearer; cross-origin dapat preflight | GET publik tanpa bearer | Dibutuhkan form |
| `/learning-time-slots` | PackageBuilder primary | GET + bearer; cross-origin dapat preflight | GET publik tanpa bearer | Dibutuhkan form |
| `/user` | StudentLayout + secondary | protected; `getCached` dapat dedupe/cache | tetap protected | profil/header/offline |
| `/student/vouchers?compact=1` | secondary | protected | tetap protected | tidak untuk LCP |
| `/student/packages/tutorial-status` | secondary | protected | tetap protected | tidak untuk LCP |
| `/notifications` | StudentLayout idle | protected, deferred | tetap protected/deferred | tidak |
| `/active-order` | StudentRuntime idle | protected, deferred | tetap protected/deferred | tidak |
| `/student/packages/quote` | effect setelah draft valid | debounce, no cancellation; backend rate 2 lintasan | debounce + cancellation; backend 1 lintasan | harga harus tersedia saat form valid |

### `/api/student/packages/quote`

**Preflight:** masih diperlukan pada arsitektur cross-origin karena POST JSON + Authorization. Revisi 1 tidak mencoba menghapus auth atau mengubah API contract. `CORS_MAX_AGE=600` hanya membuat preflight yang sudah sukses dapat dicache untuk request berikutnya.

**Laravel path:** route → auth:sanctum → active.account → role:student → throttle → `StudentPackageController::previewPromotion`.

**Database:** existing schema sudah memiliki index lookup HourlyRate yang relevan. Tidak ditambah index baru karena tidak ada measured query plan/slow query yang membuktikan kebutuhan index baru.

---

# 7. Files Changed

## `src/lib/http.ts`
**Masalah:** bearer dipasang ke GET publik.  
**Perubahan:** allowlist route publik yang divalidasi terhadap `routes/api.php`, Authorization tidak dipasang untuk GET tersebut.  
**Alasan:** menghindari preflight tidak perlu dan membuka browser/public caching.  
**Risiko:** rendah; endpoint yang dikecualikan memang route publik Laravel dan tidak bergantung user.  
**Hasil terukur di sandbox:** source-level validation lulus; runtime timing perlu browser user.

## `bimbelku-backend/config/cors.php`
**Masalah:** `max_age=0`.  
**Perubahan:** `CORS_MAX_AGE`, default 600 detik.  
**Risiko:** perubahan kebijakan CORS yang baru dapat membutuhkan maksimum 10 menit untuk sepenuhnya terlihat pada cache preflight browser. Actual authorization tetap divalidasi setiap request.

## `bimbelku-backend/.env.example`
Menambahkan `CORS_MAX_AGE=600`.

## `src/pages/students/PackageBuilder.tsx`
**Masalah:** stale in-flight quote tidak dibatalkan.  
**Perubahan:** AbortController + request id guard.  
**Risiko:** rendah; hanya response request lama yang diabaikan/dibatalkan. Harga terbaru tetap dihitung dengan payload yang sama.

## `bimbelku-backend/app/Http/Controllers/Api/StudentPackageController.php`
**Masalah:** rate dihitung dua lintasan.  
**Perubahan:** bangun `lines` sekali, subtotal dari `lines`.  
**API contract:** tidak berubah.

## `bimbelku-backend/app/Services/HourlyRateService.php`
**Masalah:** cache version dibaca setiap `resolve`; current cache store project adalah database.  
**Perubahan:** memoize cache version pada instance service, sinkronkan saat `clearCache`.  
**Business rule/rate:** tidak berubah.

## `src/components/StudentLayout.tsx`
**Masalah:** MobileBottomNav tetap dimount desktop meskipun CSS menyembunyikan.  
**Perubahan:** `matchMedia('(min-width: 1280px)')` untuk mount path sesuai breakpoint.  
**UI:** breakpoint dan visual tetap sama.  
**Catatan:** sidebar mobile sengaja belum di-unmount agar animasi drawer tidak berubah tanpa browser regression test.

## `scripts/check-performance-revision1.mjs`
Pemeriksaan source-level khusus changeset ini.

## `package.json`
Menambahkan script `check:performance-revision1`.

---

# 8. Final Mobile

Run 1: **belum dapat dijalankan di sandbox ini**.  
Run 2: **belum dapat dijalankan di sandbox ini**.  
Run 3: **belum dapat dijalankan di sandbox ini**.  
Median: **tidak diklaim**.

Alasan teknis terverifikasi ada pada bagian Environment. Target tetap:
- Performance median >= 93
- FCP <= 1.8 s
- LCP <= 2.5 s
- TBT <= 200 ms
- CLS <= 0.1

Jangan menganggap Revisi 1 selesai hanya karena source-level changes sudah dibuat. Sesudah build di mesin yang memiliki dependency, lakukan 3 clean run dan profil ulang.

---

# 9. Final Desktop

Run 1: belum dapat dijalankan.  
Run 2: belum dapat dijalankan.  
Run 3: belum dapat dijalankan.  
Median: tidak diklaim.

Target Performance median >= 93 dan tidak boleh turun dibanding baseline clean.

---

# 10. Before vs After

Karena Lighthouse final tidak dapat dieksekusi di environment ini, tabel di bawah hanya menampilkan delta yang benar-benar dibuktikan dari code path.

| Item | Before | After |
|---|---|---|
| Bearer pada GET publik initial PackageBuilder | Ya | Tidak |
| Potential CORS preflight untuk 3 GET primary publik | Ya, pada cross-origin login session | Dihilangkan oleh source path |
| CORS preflight cache | 0 s | 600 s default |
| Public ETag/cache saat user login | Dapat dioverride `no-store` karena bearer | Endpoint publik tidak membawa bearer |
| Quote request cancellation | Tidak | Ya |
| `resolve()` quote per N subject | 2N | N |
| cache-version read HourlyRate | per resolve | per service instance |
| MobileBottomNav mounted desktop | Ya | Tidak |
| CSS awal | 21,544 B gzip menurut checker | belum diubah |
| Lighthouse Mobile | ~56 supplied | belum diukur |
| LCP | ~5.9 s supplied | belum diukur |
| TBT | ~530 ms supplied | belum diukur |

---

# 11. Regression Test

### Lulus setelah changeset

- PHP lint:
  - `config/cors.php`
  - `StudentPackageController.php`
  - `HourlyRateService.php`
- TypeScript/TSX syntax transpilation:
  - `src/lib/http.ts`
  - `src/components/StudentLayout.tsx`
  - `src/pages/students/PackageBuilder.tsx`
- `check-api-contract.mjs`
- `check-php-static.mjs`
- `check-page-routes.mjs`
- Checkpoint 1–5
- Stage 2
- Stage 3
- Stage 4
- Stage 5 experience
- Stage 6B
- Stage 6C-A/B/C/D/final
- `check-file-preview.mjs`
- `check-performance-revision1.mjs`

### Checker yang sudah gagal sebelum perubahan dan tetap gagal

Dibandingkan dengan original source yang diupload, kegagalan berikut **pre-existing**, bukan regresi Revisi 1:
- `check-education-levels.mjs`
- `check-revision1-tutorial.mjs`
- `check-revision2-subject-dropdown.mjs`
- `check-stage6a.mjs`
- `check-performance-budget.mjs` karena CSS 21,544 B > 20,480 B

### Belum dapat dilakukan di sandbox

- Runtime login/logout.
- Student/teacher/admin interactive regression.
- Mobile portrait/landscape/tablet/desktop browser interaction.
- Laravel integration test/database query timing.
- New production `npm run build`.
- Clean Lighthouse 3x Mobile/Desktop.

Ini wajib dilakukan pada mesin project setelah dependency tersedia.

---

# 12. Remaining Bottleneck

## A. LCP/JS main-thread
Masih perlu Chrome Performance trace bersih setelah Revisi 1. Source menunjukkan LCP intro tidak menunggu API; route/module/render path tetap kandidat utama. Jangan melakukan memoization massal sebelum trace menunjuk component/function.

## B. CSS render-blocking
Masih 21.5 KiB gzip pada dist baseline. Ini kandidat berikutnya, tetapi harus dikerjakan dengan rebuild + visual regression agar tidak FOUC.

## C. First preflight quote pada cross-origin
Tetap ada karena POST JSON authenticated. Jika OPTIONS pertama masih memerlukan beberapa detik setelah source changes, itu bukti kuat local server/origin setup menjadi bottleneck. Bandingkan:
1. API handler direct timing,
2. OPTIONS timing,
3. same-origin/reverse-proxy timing,
4. actual production hosting.

## D. Laravel/database actual duration
Tidak ada server runtime di sandbox, jadi 3.3 s actual quote tidak boleh diasumsikan seluruhnya berasal dari controller. Query timing wajib diambil di mesin dengan database asli.

## E. Mobile desktop-sidebar subtree
Masih dimount di mobile untuk mempertahankan drawer animation identik. Jika clean React/Performance trace menunjukkan subtree ini bermakna, tahap berikutnya adalah split/deferred mount dengan transition-preserving implementation dan browser regression.

---

# Dependency Map `/student/packages/new`

```text
Navigation
  ↓
dist/index.html
  ├─ /assets/index-*.css (render blocking)
  └─ /assets/index-*.js
       ↓
React createRoot
       ↓
BrowserRouter
       ├─ SessionLifecycle (event listeners, no initial API)
       ├─ StudentRuntime (active-order deferred idle)
       └─ PrivateRoute (localStorage auth/role; no API gate)
              ↓
PackageBuilder lazy module
  direct navigation starts import early
              ↓
StudentLayout
  ├─ stored user from localStorage
  ├─ /user via getCached
  ├─ /notifications deferred idle
  └─ responsive navigation
              ↓
PackageBuilderIntro + Skeleton
  ↓
LCP text can render here
              ↓
Primary API Promise.all
  ├─ /package-plans [public]
  ├─ /learning-catalog?compact=1 [public]
  ├─ /learning-time-slots [public]
  └─ renewal package [only renewal]
              ↓
full form state
              ↓
Secondary Promise.all
  ├─ /student/vouchers?compact=1 [auth]
  ├─ /user [auth, getCached can reuse]
  └─ /student/packages/tutorial-status [auth]
              ↓
draft becomes valid
              ↓
450ms debounce
              ↓
POST /student/packages/quote [auth + JSON]
```

---

# Cara Validasi di Mesin Project

1. Gunakan source revisi dan `.env` milik project sendiri.
2. Pastikan dependency terpasang.
3. Jalankan:
   - `npm run check:performance-revision1`
   - `npm run build`
   - `npm run check:performance`
4. Pastikan `dist/index.html` hanya memuat `/assets/*`, bukan Vite dev client.
5. Jalankan Laravel/API dengan database asli.
6. Gunakan Chrome Guest Profile/profile baru tanpa extension.
7. Uji minimum 3 run per halaman dan gunakan median:
   - landing
   - `/student/packages/new`
   - student dashboard
   - satu halaman database-heavy lain
8. Catat Performance, FCP, LCP, TBT, CLS, Speed Index.
9. Rekam Performance trace Mobile untuk `/student/packages/new`.
10. Network: catat OPTIONS + actual `/student/packages/quote`, tiga GET primary, `/user`, vouchers, tutorial-status, notifications, active-order.
11. Setelah itu lanjutkan Revisi 2 hanya terhadap bottleneck terbesar yang masih terlihat.

Target bukan sekadar score; user flow, layout, role, auth, harga, data, dan API contract harus tetap sama.
