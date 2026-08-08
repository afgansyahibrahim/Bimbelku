# BimbelKu — Performance Audit Revisi Whole-Site

Tanggal audit source: 8 Agustus 2026. Baseline source: `Website_Bimbelku_FULL_TERBARU_20260808`. Working revision: `Website_Bimbelku_Performance_Revisi4_WholeSite`.

## 0. Status validasi yang perlu dibaca dulu

- Audit dan perubahan dilakukan pada **seluruh arsitektur aplikasi**, bukan hanya `/student/my-classes`.
- Source berhasil dipetakan: **60 React routes**, **177 literal links**, **190 action API** mempunyai controller/method sesuai menurut checker project.
- PHP controller yang diubah lolos `php -l`; 121 berkas TS/TSX lolos parser syntax; checker whole-site baru lulus.
- **Production build/Lighthouse final belum dapat dijalankan di sandbox ini** karena project tidak membawa `node_modules`, dan registry paket environment gagal menyediakan dependency sehingga `npm run build` berhenti pada `vite: not found`. Karena itu tidak ada skor Lighthouse sesudah yang dikarang.
- Baseline runtime yang dapat ditulis hanya angka sampel terbaru yang diberikan pengguna: Mobile FCP ~1,7 s, LCP ~9,9 s, Speed Index ~7 s, TBT ~300 ms, CLS 0 pada salah satu dynamic data page.

## 1. Route Audit

| Group | Route | Main component | Layout / protection |
|---|---|---|---|
| PUBLIC / AUTH | `/` | `Index` | Public/Auth; page-owned layout |
| PUBLIC / AUTH | `/register` | `Register` | Public/Auth; page-owned layout |
| PUBLIC / AUTH | `/login` | `Login` | Public/Auth; page-owned layout |
| PUBLIC / AUTH | `/forgot-password` | `ForgotPassword` | Public/Auth; page-owned layout |
| PUBLIC / AUTH | `/reset-password` | `ResetPassword` | Public/Auth; page-owned layout |
| PUBLIC / AUTH | `/privacy` | `PrivacyPolicy` | Public/Auth; page-owned layout |
| PUBLIC / AUTH | `/terms` | `TermsConditions` | Public/Auth; page-owned layout |
| PUBLIC / AUTH | `/why-us` | `WhyUs` | Public/Auth; page-owned layout |
| PUBLIC / AUTH | `/access-denied` | `AccessDenied` | Public/Auth; page-owned layout |
| ADMIN | `/admin` | `DashboardOverview` | PrivateRoute(admin) + AdminLayout pada page |
| ADMIN | `/admin/tutor-searches` | `TutorSearchMonitoring` | PrivateRoute(admin) + AdminLayout pada page |
| ADMIN | `/admin/guru` | `TeacherVerification` | PrivateRoute(admin) + AdminLayout pada page |
| ADMIN | `/admin/pembayaran` | `PaymentVerification` | PrivateRoute(admin) + AdminLayout pada page |
| ADMIN | `/admin/users` | `UserManagement` | PrivateRoute(admin) + AdminLayout pada page |
| ADMIN | `/admin/settings-payment` | `PaymentSettings` | PrivateRoute(admin) + AdminLayout pada page |
| ADMIN | `/admin/settings-footer` | `EditFooter` | PrivateRoute(admin) + AdminLayout pada page |
| ADMIN | `/admin/finance` | `FinanceReport` | PrivateRoute(admin) + AdminLayout pada page |
| ADMIN | `/admin/refunds` | `RefundManagement` | PrivateRoute(admin) + AdminLayout pada page |
| ADMIN | `/admin/finance-security` | `redirect → /admin/pembayaran` | PrivateRoute(admin) + AdminLayout pada page |
| ADMIN | `/admin/pesan` | `AdminMessages` | PrivateRoute(admin) + AdminLayout pada page |
| ADMIN | `/admin/notifikasi` | `SendMessage` | PrivateRoute(admin) + AdminLayout pada page |
| ADMIN | `/admin/classes` | `ClassMonitoring` | PrivateRoute(admin) + AdminLayout pada page |
| ADMIN | `/admin/classes/:id` | `ClassDetail` | PrivateRoute(admin) + AdminLayout pada page |
| ADMIN | `/admin/notes` | `AdminNotes` | PrivateRoute(admin) + AdminLayout pada page |
| ADMIN | `/admin/settings-display` | `SettingsDisplay` | PrivateRoute(admin) + AdminLayout pada page |
| ADMIN | `/admin/ratings` | `AdminRatings` | PrivateRoute(admin) + AdminLayout pada page |
| ADMIN | `/admin/hourly-rates` | `HourlyRates` | PrivateRoute(admin) + AdminLayout pada page |
| ADMIN | `/admin/learning-topics` | `LearningTopics` | PrivateRoute(admin) + AdminLayout pada page |
| ADMIN | `/admin/subjects` | `SubjectManagement` | PrivateRoute(admin) + AdminLayout pada page |
| ADMIN | `/admin/cases` | `CaseCenter` | PrivateRoute(admin) + AdminLayout pada page |
| ADMIN | `/admin/stage-five` | `StageFiveManagement` | PrivateRoute(admin) + AdminLayout pada page |
| ADMIN | `/admin/access-control` | `redirect → /admin` | PrivateRoute(admin) + AdminLayout pada page |
| ADMIN | `/admin/audit-log` | `AdminAuditLog` | PrivateRoute(admin) + AdminLayout pada page |
| TEACHER | `/guru` | `TeacherDashboard` | PrivateRoute(teacher) + TeacherLayout pada page |
| TEACHER | `/guru/kelas` | `ManageClasses` | PrivateRoute(teacher) + TeacherLayout pada page |
| TEACHER | `/guru/profil` | `TeacherProfile` | PrivateRoute(teacher) + TeacherLayout pada page |
| TEACHER | `/guru/jadwal` | `ManageSchedule` | PrivateRoute(teacher) + TeacherLayout pada page |
| TEACHER | `/guru/permintaan` | `BookingGuru` | PrivateRoute(teacher) + TeacherLayout pada page |
| TEACHER | `/guru/rekening` | `TeacherBankSettings` | PrivateRoute(teacher) + TeacherLayout pada page |
| TEACHER | `/guru/gaji` | `TeacherSalary` | PrivateRoute(teacher) + TeacherLayout pada page |
| TEACHER | `/guru/pesan` | `TeacherMessages` | PrivateRoute(teacher) + TeacherLayout pada page |
| TEACHER | `/guru/saya` | `TeacherAccount` | PrivateRoute(teacher) + TeacherLayout pada page |
| TEACHER | `/guru/performa` | `TeacherPerformance` | PrivateRoute(teacher) + TeacherLayout pada page |
| TEACHER | `/guru/notifikasi` | `TeacherNotifications` | PrivateRoute(teacher) + TeacherLayout pada page |
| TEACHER | `/guru/bantuan` | `TeacherHelp` | PrivateRoute(teacher) + TeacherLayout pada page |
| STUDENT | `/student/dashboard` | `Dashboard` | PrivateRoute(student) + StudentLayout pada page |
| STUDENT | `/search` | `SearchPage` | PrivateRoute(student) + StudentLayout pada page |
| STUDENT | `/student/find` | `SearchPage` | PrivateRoute(student) + StudentLayout pada page |
| STUDENT | `/student/my-classes` | `MyClasses` | PrivateRoute(student) + StudentLayout pada page |
| STUDENT | `/student/messages` | `Messages` | PrivateRoute(student) + StudentLayout pada page |
| STUDENT | `/student/progress` | `LearningProgress` | PrivateRoute(student) + StudentLayout pada page |
| STUDENT | `/student/history` | `TransactionHistory` | PrivateRoute(student) + StudentLayout pada page |
| STUDENT | `/student/profile` | `Profile` | PrivateRoute(student) + StudentLayout pada page |
| STUDENT | `/student/account` | `Account` | PrivateRoute(student) + StudentLayout pada page |
| STUDENT | `/student/packages` | `MyPackages` | PrivateRoute(student) + StudentLayout pada page |
| STUDENT | `/student/packages/new` | `PackageBuilder` | PrivateRoute(student) + StudentLayout pada page |
| STUDENT | `/student/vouchers` | `Vouchers` | PrivateRoute(student) + StudentLayout pada page |
| STUDENT | `/student/offers/:id` | `PromotionDetail` | PrivateRoute(student) + StudentLayout pada page |
| STUDENT | `/student/help` | `StudentHelp` | PrivateRoute(student) + StudentLayout pada page |
| STUDENT | `/payment` | `PaymentPage` | PrivateRoute(student) + StudentLayout pada page |
| FALLBACK | `*` | `NotFound` | Public fallback |

**Temuan route-level:** seluruh halaman sudah lazy, tetapi lazy route standar masih menyisakan waterfall main entry → render router → import route. Revisi ini memulai import **route yang sedang aktif** saat `App.tsx` dievaluasi; route lain tetap lazy. Redirect/alias membuat 60 route URL tetapi 57 current-route loader declarations.

## 2. Baseline Matrix

Angka per-page lengkap tidak tersedia pada file yang diberikan untuk turn ini. Nilai berikut hanya sampel terbaru yang disebutkan dalam prompt; sel lain sengaja tidak diisi agar tidak mengarang benchmark.

| Representative page | Mobile Perf | Mobile FCP | Mobile LCP | Mobile SI | Mobile TBT | Mobile CLS | Desktop Perf/FCP/LCP/SI/TBT |
|---|---:|---:|---:|---:|---:|---:|---|
| `/student/my-classes` (sample/clue) | tidak diberikan | ~1,7 s | ~9,9 s | ~7 s | ~300 ms | 0 | tidak diberikan |
| `/` landing | pending clean runtime | pending | pending | pending | pending | pending | pending |
| `/login` | pending clean runtime | pending | pending | pending | pending | pending | pending |
| `/student/dashboard` | pending clean runtime | pending | pending | pending | pending | pending | pending |
| `/student/packages/new` | pending clean runtime | pending | pending | pending | pending | pending | pending |
| `/guru` | pending clean runtime | pending | pending | pending | pending | pending | pending |
| `/guru/kelas` | pending clean runtime | pending | pending | pending | pending | pending | pending |
| `/admin` | pending clean runtime | pending | pending | pending | pending | pending | pending |
| `/admin/classes` / heavy admin table | pending clean runtime | pending | pending | pending | pending | pending | pending |

## 3. Global Root Cause Ranking

### 1 — Route chunk discovery terlambat (GLOBAL)
Semua page sudah `lazy`, tetapi import chunk aktif baru diminta ketika React mencapai route. Pada Mobile, satu round-trip/dependency step tambahan dapat memperbesar render delay. `routeLazy` sekarang hanya mem-preload module untuk `window.location.pathname` aktif; Admin/Teacher/Student lain tetap code-split.

### 2 — Sonner tersebar di hampir seluruh route chunk (GLOBAL)
Baseline mempunyai **54 static imports** Sonner. Sesudah revisi tinggal **1** static import di wrapper UI Toaster. Page/component memakai `notify` yang mengimpor Sonner saat toast benar-benar terjadi. Ini bukan penghapusan notifikasi; hanya mengubah timing load.

### 3 — Global layout melakukan request non-kritis bersamaan dengan request halaman (ROLE)
StudentLayout/TeacherLayout dapat melakukan refresh user/profile, notifikasi dan tutorial bersamaan dengan API utama page. Nama user sekarang berasal dari localStorage pada render pertama; refresh/profile/notifikasi/tutorial dijadwalkan sebagai pekerjaan non-kritis melalui `requestIdleCallback` (fallback dua animation frame), **tanpa fixed multi-second timeout**.

### 4 — Responsive subtree yang tidak aktif tetap hidup (ROLE)
Teacher layout sebelumnya tetap me-mount `MobileBottomNav` pada Desktop dan hanya mengandalkan CSS. Sekarang Student dan Teacher hanya me-mount bottom nav saat breakpoint mobile aktif. Admin mobile nav diaudit tetapi dibiarkan: komponennya ringan, tidak memiliki hook/API sendiri, sehingga perubahan arsitektur tambahan tidak dibenarkan tanpa profiler.

### 5 — Dynamic page menahan critical text sampai API selesai (PAGE PATTERN)
`MyClasses`, `ManageClasses`, dan `SearchPage` mempunyai pola loader yang dapat menahan hero/heading. Static critical hero sekarang dirender segera, sedangkan loader hanya menempati area data. PackageBuilder sudah memakai pola intro + skeleton dari revisi sebelumnya dan dipertahankan.

### 6 — Interaction-only JS ikut initial page chunk (PAGE/SHARED)
`LearningSessionHub`, `CameraCapture`, dan teacher-only register UI tidak diperlukan pada first viewport. Komponen tersebut sekarang lazy dan baru dimount pada interaction/state yang membutuhkannya.

### 7 — Backend N+1 / over-fetching pada class pages (BACKEND)
`/teacher/classes` sebelumnya menjalankan unread count di dalam map per booking. `/student/classes` memuat semua progress report untuk booking lalu `unique()` di PHP. Keduanya diperbaiki pada query layer tanpa mengubah JSON contract.

## 4. Mobile vs Desktop

- Mobile lebih terkena biaya parsing/evaluation, layout, dan request dependency karena CPU/network throttling lebih ketat. Karena itu route-discovery waterfall, shared JS dan duplicate responsive mount terasa lebih berat daripada Desktop.
- Student/Teacher bottom nav sekarang tidak hidup pada Desktop. Pada Mobile, Desktop sidebar masih merupakan **satu responsive sidebar yang sama**, bukan duplicate desktop subtree dengan API/hook terpisah; tidak dibongkar agar resize/drawer behavior tetap aman.
- `render-auto` (`content-visibility:auto`) diterapkan pada card list Kelas Student/Teacher agar browser dapat melewati layout/paint card di luar viewport, paling bermanfaat pada layar Mobile yang hanya menampilkan sedikit card sekaligus.

## 5. API Audit

Static source inventory (bukan Network timing) menemukan kira-kira: Student 25 endpoint literal/37 call-sites, Teacher 20/26, Admin 49/57 dalam page folders. Exact start time, preflight dan server duration **harus diisi dari Chrome Network pada mesin yang dapat menjalankan production build**.

| Endpoint / area | Source issue | Revisi | Runtime timing status |
|---|---|---|---|
| public GET (`/learning-catalog`, `/settings/footer`, `/content/*`, dll.) | public request dapat membawa token / cache terfragmentasi | public GET tidak diberi Bearer dan cache key publik (dipertahankan dari Revisi 1, diperketat) | perlu Network final |
| `/student/classes` | critical class list + repeat navigation | GET cache/in-flight dedupe 10 s; mutation menginvalidasi cache | perlu Network final |
| `/teacher/classes` | critical class list + backend N+1 | GET cache/dedupe 10 s + backend `withCount` | perlu Network + SQL log final |
| `/student/dashboard-v2` | dashboard data | sudah memakai `getCached` 10 s dari baseline terbaru | perlu Network final |
| `/teacher/dashboard-v2` | dashboard repeat navigation selalu network | getCached 10 s; tombol `Muat ulang` menggunakan force | perlu Network final |
| `/admin/dashboard-stats` | dashboard repeat navigation selalu network | getCached 10 s; refresh manual force | perlu Network final |
| `/notifications` | global non-critical request | dijadwalkan setelah critical work + polling 60 s tetap | perlu Network final |
| `/content/tutorials` | global tutorial request | dijadwalkan non-kritis; fallback tutorial tetap langsung tersedia | perlu Network final |

## 6. Backend Audit

### `/teacher/classes` — `ClassroomController::index`
- **Sebelum:** setiap booking menghitung unread message melalui relation query di dalam mapping. Route membatasi 200 booking, sehingga pola ini dapat menambah sampai N count query.
- **Sesudah:** `withCount(['classroomMessages as unread_message_count' => ...])` dilakukan sebagai bagian query eager aggregate; mapping hanya membaca atribut hasil.
- JSON field `unread_message_count` tetap sama.

### `/student/classes` — `StudentController::getMyClasses`
- **Sebelum:** seluruh `LearningProgressReport` untuk booking yang ditemukan diambil, lalu `latest()->get()->unique('booking_id')` di PHP.
- **Sesudah:** Booking eager-load `latestLearningProgressReport` yang menggunakan `latestOfMany`, dibatasi `student_id`. Hanya report terbaru per booking yang diperlukan oleh response.
- Response field tidak diubah.

### Backend risk yang belum diubah tanpa profiling
- `LearningSessionController::conversations` masih memiliki pola query latest-message + unread per conversation. Karena visibility/hidden threshold berbeda per conversation, batching perlu dirancang berdasarkan SQL log; sengaja **tidak** direfactor tanpa runtime evidence.
- Aggregate dashboard Admin memiliki beberapa query count/sum lintas tabel. Bisa dioptimalkan jika query log membuktikan >500 ms, tetapi tidak diubah secara spekulatif.

## 7. React Audit

- **Root/router:** active route module dimulai lebih awal; route role lain tetap lazy.
- **Public landing:** below-fold lazy module sekarang benar-benar viewport-deferred. `React.lazy` tanpa conditional mount sebelumnya belum cukup.
- **Auth:** Login/Forgot/Reset tidak lagi perlu Axios pada first paint; Register mendefer CameraCapture/SubjectCombobox sampai flow teacher memerlukannya.
- **Student/Teacher layouts:** localStorage memberi identity awal; non-critical server refresh dan notifications tidak berebut critical page fetch; mobile bottom nav tidak duplicate-mount di Desktop.
- **MyClasses/ManageClasses:** hero tidak lagi data-gated; heavy hub/camera lazy; card offscreen memakai content-visibility.
- **Toast:** 54 → 1 static Sonner import; behavior toast tetap dipanggil lewat wrapper dinamis.
- Tidak dilakukan mass `React.memo/useMemo/useCallback`; perubahan memoization hanya dipertahankan bila sudah ada atau memang terkait state existing.

## 8. Files Changed

Total path berbeda terhadap baseline terbaru: **66**. Banyak page di bawah hanya mengalami migrasi Sonner statik → `notify` dinamis; konten/markup page tidak diubah.

| Path | Masalah | Perubahan | Alasan | Dampak/risiko |
|---|---|---|---|---|
| `bimbelku-backend/app/Http/Controllers/Api/ClassroomController.php` | `/teacher/classes` menghitung unread pesan per booking di dalam map (N+1). | Unread count dipindah ke `withCount` pada query utama. | Menghapus query per booking dengan response contract sama. | Menghilangkan hingga N query count tambahan (limit route 200). |
| `bimbelku-backend/app/Http/Controllers/Api/StudentController.php` | `/student/classes` memuat semua progress report lalu `unique` di PHP hanya untuk mengambil terbaru. | Eager-load relasi `latestLearningProgressReport` (`latestOfMany`) dengan filter student. | Database memilih record terbaru per booking; payload internal dan memory lebih kecil. | Mengurangi over-fetching/serialization pada halaman kelas. |
| `package.json` | Validasi whole-site belum memiliki checker khusus revisi ini. | Menambah script `check:performance-whole-site`. | Memastikan invariant optimasi dapat diuji ulang. | Tidak mengubah runtime. |
| `scripts/check-performance-revision2-whole-site.mjs` | Tidak ada automated source invariant untuk optimasi whole-site. | Memeriksa route preload, deferred global work, Sonner, responsive mount, LCP gating, lazy heavy components, cache GET, dan backend query fix. | Mencegah revisi berikutnya tanpa sengaja membatalkan optimasi. | Regression guard source-level. |
| `src/App.tsx` | Lazy route baru mulai setelah React/router mencapai elemen route; global widget non-kritis juga dapat ikut critical path. | Menambah current-route early preload dan menjadwalkan FilePreview/PendingPayment setelah pekerjaan kritis tanpa timeout angka arbitrer. | Memulai chunk halaman aktif lebih awal tanpa membuat role lain ikut terunduh. | Mengurangi route waterfall/initial contention; perilaku route tetap sama. |
| `src/components/ChangePasswordDialog.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/components/DeferredToaster.tsx` | Toaster tidak perlu berada di first-render critical path dan fixed multi-second activation tidak ideal. | Aktivasi via event/interaksi atau scheduler non-kritis tanpa timeout angka. | Toast tetap siap ketika dibutuhkan. | Mengurangi initial JS tanpa fake delay. |
| `src/components/LearningSessionHub.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/components/MarketplaceMessages.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/components/Navbar.tsx` | Landing Navbar menarik HTTP/Axios dan Sonner sejak awal hanya untuk logout; user localStorage diisi sesudah mount. | HTTP logout di-import saat aksi; notify dinamis; user dibaca pada initial state. | Anonymous/public initial path tidak perlu Axios/Sonner. | Mengurangi initial landing JS dan render kedua. |
| `src/components/NotificationCenter.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/components/PendingPaymentPopup.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/components/RoleQuickGuide.tsx` | `/content/tutorials` dipanggil dari layout walau tidak critical untuk viewport. | Fetch tutorial dijadwalkan sebagai pekerjaan non-kritis; fallback tutorial tetap tersedia langsung. | Tutorial tidak berebut initial API page. | Mengurangi role-global request contention tanpa menghapus tutorial. |
| `src/components/StudentLayout.tsx` | Refresh `/user` dan notifikasi global bersaing dengan API page; mobile nav tidak diperlukan di Desktop. | Header memakai localStorage segera; refresh/notifikasi dijadwalkan non-kritis; MobileBottomNav hanya dimount pada mobile. | Critical page API mendapat prioritas, responsive duplicate lifecycle dihentikan. | Terutama membantu Mobile main-thread/network contention. |
| `src/components/StudentWorkspaceList.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/components/TeacherLayout.tsx` | Profile + notifikasi global dimulai bersama API page; MobileBottomNav tetap dimount di Desktop; toast statik. | LocalStorage first render, request non-kritis pasca-critical, nav kondisional, custom toast dinamis, RoleQuickGuide lazy. | Mengurangi global role overhead. | Membantu semua halaman teacher dan Desktop duplicate work. |
| `src/lib/apiBase.ts` | Auth page hanya butuh base URL tetapi sebelumnya menarik HTTP/Axios penuh. | Memisahkan konstanta API/storage dari HTTP client. | Login/reset bisa menampilkan UI tanpa memuat Axios sebelum interaksi. | Mengurangi critical JS auth pages. |
| `src/lib/http.ts` | GET publik dapat terfragmentasi cache berdasarkan token dan duplicate in-flight GET dapat terjadi lintas caller. | Public GET memakai cache key publik; cache/in-flight dedupe dipertahankan dengan invalidasi mutation. | Data publik aman dibagi lintas status login, data privat tetap token-scoped. | Mengurangi duplicate GET dan mempercepat navigasi ulang. |
| `src/lib/notify.ts` | Import Sonner statik tersebar pada puluhan page chunk. | Toast dimuat dinamis hanya saat notifikasi benar-benar dipakai dan opsi Sonner tetap diteruskan. | Mengeluarkan library toast dari jalur kritis mayoritas halaman. | Static Sonner imports turun 54 → 1. |
| `src/lib/schedule.ts` | Pekerjaan global non-kritis perlu ditunda tanpa timeout palsu. | Scheduler requestIdleCallback dengan fallback dua animation frame. | Memberi kesempatan first paint terjadi sebelum request/widget non-kritis. | Mengurangi contention awal tanpa delay angka Lighthouse. |
| `src/pages/ForgotPassword.tsx` | Axios masuk initial bundle sebelum pengguna submit. | Dynamic Axios saat submit. | Request library tidak diperlukan untuk first paint. | Auth initial JS lebih kecil. |
| `src/pages/Index.tsx` | React.lazy saja tetap memulai import semua section karena semuanya langsung dimount. | Section below-fold dimount saat mendekati viewport memakai IntersectionObserver; Navbar/Hero tetap critical. | Menahan JS/API below-fold tanpa mengubah final section. | Mengurangi initial landing JS/work dan menjaga FCP. |
| `src/pages/Login.tsx` | Login initial path memuat Axios walau request baru terjadi setelah submit. | API base ringan + dynamic Axios saat submit; error behavior dipertahankan. | Mengurangi critical auth JS. | Login first paint lebih ringan. |
| `src/pages/Register.tsx` | CameraCapture/SubjectCombobox teacher-heavy ikut route register meski default flow murid tidak memakainya. | Keduanya dilazy-load dan dibungkus Suspense saat dibutuhkan. | Student registration tidak membayar biaya fitur teacher di awal. | Mengurangi route JS/register TBT. |
| `src/pages/ResetPassword.tsx` | Axios masuk initial bundle sebelum pengguna submit. | Dynamic Axios saat submit. | Request library tidak diperlukan untuk first paint. | Auth initial JS lebih kecil. |
| `src/pages/SearchPage.tsx` | Static hero sebelumnya hilang selama data loading sehingga kandidat LCP baru muncul setelah API. | Hero selalu dirender; loader hanya pada data/form area. | Konten critical tidak menunggu API. | Mengurangi dynamic-text LCP render delay. |
| `src/pages/admin/AdminAuditLog.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/admin/AdminMessages.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/admin/AdminNotes.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/admin/AdminRatings.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/admin/CaseCenter.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/admin/ClassDetail.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/admin/ClassMonitoring.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/admin/DashboardOverview.tsx` | Dashboard GET dapat diulang saat navigasi bolak-balik. | GET memakai cache/dedupe 10 detik; refresh manual memakai `force`. | Mempercepat role dashboard repeat navigation dengan kontrol refresh. | Mengurangi network round-trip yang tidak perlu. |
| `src/pages/admin/EditFooter.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/admin/FinanceReport.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/admin/HourlyRates.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/admin/LearningTopics.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/admin/PaymentSettings.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/admin/PaymentVerification.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/admin/RefundManagement.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/admin/SendMessage.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/admin/SettingsDisplay.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/admin/StageFiveManagement.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/admin/SubjectManagement.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/admin/TeacherVerification.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/admin/TutorSearchMonitoring.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/admin/UserManagement.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/common/HelpCenter.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/pembayaran/PaymentPage.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/students/Dashboard.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/students/MyClasses.tsx` | Hero ditahan sampai `/student/classes`; LearningSessionHub masuk initial chunk; list panjang tetap layout/paint penuh. | Hero selalu tampil; loader hanya area data; Hub lazy; `render-auto`; GET 10s cache/dedupe. | Langsung menyerang pola LCP sampel tanpa fake data. | LCP/SI/TBT Mobile lebih sehat secara arsitektur. |
| `src/pages/students/MyPackages.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/students/Profile.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/students/PromotionDetail.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/students/TransactionHistory.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/students/Vouchers.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/teacher/BookingGuru.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/teacher/ManageClasses.tsx` | Pola sama dengan MyClasses; Hub + CameraCapture interaction-only masuk initial chunk. | Hero selalu tampil; Hub/Camera lazy; `render-auto`; `/teacher/classes` cached/deduped. | Kelas teacher tidak memuat interaction-heavy code sebelum dibutuhkan. | Mengurangi JS/render kerja dan navigation latency. |
| `src/pages/teacher/ManageSchedule.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/teacher/TeacherAccount.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/teacher/TeacherBankSettings.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/teacher/TeacherDashboard.tsx` | Dashboard GET selalu network walau navigasi ulang dekat waktunya. | GET memakai cache/dedupe 10 detik; tombol refresh memaksa request baru. | Mutation tetap menginvalidasi cache; refresh tetap real. | Navigasi ulang lebih cepat tanpa stale global cache. |
| `src/pages/teacher/TeacherPerformance.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/teacher/TeacherProfile.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |
| `src/pages/teacher/TeacherSalary.tsx` | Import Sonner statik menambah dependency pada page/component chunk. | Mengganti pemanggilan `toast.*` ke `notify.*` dinamis; pesan/opsi tetap sama. | Menghapus toast library dari critical chunk sampai benar-benar dipakai. | Tidak mengubah visual/flow; menurunkan initial JS dependency. |

## 9. After Matrix

**Belum diisi dengan angka**. Sandbox tidak dapat membangun production bundle karena Vite/dependency project tidak tersedia dan install package gagal dari registry environment. Ini sengaja dibiarkan `pending`, bukan diganti estimasi.

| Page | Mobile Perf | FCP | LCP | SI | TBT | CLS | Desktop |
|---|---|---|---|---|---|---|---|
| `/` | pending | pending | pending | pending | pending | pending | pending 3-run median |
| `/login` | pending | pending | pending | pending | pending | pending | pending 3-run median |
| `/student/dashboard` | pending | pending | pending | pending | pending | pending | pending 3-run median |
| `/student/packages/new` | pending | pending | pending | pending | pending | pending | pending 3-run median |
| `/student/my-classes` | pending | pending | pending | pending | pending | pending | pending 3-run median |
| `/guru` | pending | pending | pending | pending | pending | pending | pending 3-run median |
| `/guru/kelas` | pending | pending | pending | pending | pending | pending | pending 3-run median |
| `/admin` | pending | pending | pending | pending | pending | pending | pending 3-run median |
| `/admin/classes` | pending | pending | pending | pending | pending | pending | pending 3-run median |

## 10. Global Improvement — bukti source-level yang dapat dibuktikan sekarang

| Evidence | Before | After |
|---|---:|---:|
| Static `toast` imports from Sonner | 54 | 1 (Toaster UI wrapper) |
| Active-route eager discovery | khusus PackageBuilder | generic current-route preload untuk 57 lazy page declarations |
| Teacher class unread count | query count di map per booking | `withCount` aggregate |
| Student latest progress | semua report booking + PHP `unique` | `latestOfMany` eager relation |
| Teacher MobileBottomNav pada Desktop | mounted lalu CSS-hidden | tidak dimount |
| Student/Teacher global profile/notif/tutorial | bersaing dengan critical fetch | non-critical scheduler tanpa fixed seconds |
| MyClasses/ManageClasses hero | dapat tertahan loading data | critical hero tersedia sebelum data |
| Landing below-fold lazy sections | mounted segera, lazy imports tetap dimulai | mount saat mendekati viewport |

Lighthouse improvement numerik harus diisi setelah production build bersih; source evidence di atas tidak boleh diterjemahkan menjadi klaim skor.

## 11. Regression Test

### Lulus pada environment audit
- TS/TSX syntax parse: 121 file, 0 parse diagnostics.
- PHP lint: `ClassroomController.php`, `StudentController.php` lulus.
- `check-api-contract.mjs`: 190 action API memiliki controller/method.
- `check-page-routes.mjs`: 60 route, 177 literal links, seluruh lazy page mapped.
- `check-performance-revision1.mjs`: PASS.
- `check-performance-revision2-whole-site.mjs`: PASS.
- `check-php-static.mjs`: 260 PHP files PASS.
- Checkpoint 1–5, stage2–5, stage6b, stage6c-a/b/c/d/final: PASS pada run audit.
### Failure yang sudah ada pada baseline sebelum revisi ini
`check-education-levels`, `check-revision1-tutorial`, `check-revision2-subject-dropdown`, dan `check-stage6a` juga gagal pada `Website_Bimbelku_FULL_TERBARU_20260808`, sehingga tidak diklaim sebagai regresi revisi performa ini.
### Belum dapat dilakukan di sandbox
- Full TypeScript typecheck/ESLint berbasis dependency project.
- `npm run build`: berhenti `vite: not found`; install dependency tidak dapat diselesaikan oleh registry environment.
- Browser functional regression Mobile/Tablet/Desktop.
- Lighthouse/Performance/Network 3-run median.

## 12. Remaining Bottleneck / Next profiling

1. **Dynamic API-dependent LCP** pada halaman yang hero-nya memang berasal dari data (contoh Admin dashboard/profile). Jangan diselesaikan dengan fake/stale data; ukur endpoint dan render timing.
2. **Messages/conversations backend**: ukur query count `LearningSessionController::conversations` sebelum batching.
3. **Admin dashboard aggregate**: ukur masing-masing SQL sum/count; optimalkan hanya query >500 ms atau scan berat.
4. **CSS ~global Tailwind**: FCP sampel sudah ~1,7 s, sehingga jangan lakukan critical-CSS refactor agresif sebelum bottleneck multi-second selesai.
5. **Real Mobile CPU/TBT**: perlu Chrome Performance trace untuk melihat long task setelah Sonner/heavy components dipisah.
6. **Local CORS vs production origin**: benchmark final harus mencatat apakah frontend/API same-origin atau cross-origin. Jangan menganggap localhost preflight identik dengan hosting.
7. Setelah runtime matrix tersedia, urutan iterasi berikutnya: halaman Mobile terburuk → LCP render delay → API >500 ms → long task >50 ms → Speed Index visual completion.

## Benchmark yang wajib dilakukan pada laptop/project runtime

Gunakan `npm run build` lalu `npm run preview -- --port 8080`, Chrome Guest/profile tanpa extension, backend/database yang sama untuk seluruh run. Jalankan 3x per page dan ambil median. Jangan pakai `npm run dev` untuk angka final.