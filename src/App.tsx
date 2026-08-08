import { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Routes, Route, useLocation } from "react-router-dom";

// --- IMPORT KOMPONEN KEAMANAN & GLOBAL (Tetap Import Biasa) ---
import PrivateRoute from "./components/PrivateRoute"; 
import { ConfirmDialogProvider } from "./components/ConfirmDialogProvider";
import SessionLifecycle from "./components/SessionLifecycle";
import DeferredToaster from "./components/DeferredToaster";
import { scheduleNonCriticalTask } from "./lib/schedule";

// =================================================================
// KONFIGURASI LAZY LOAD (Code Splitting)
// Halaman hanya akan didownload saat user membukanya
// =================================================================

const CURRENT_PATH = window.location.pathname.replace(/\/+$/, "") || "/";

const exactPath = (...paths: string[]) => (path: string) => paths.includes(path);
const pathPattern = (pattern: RegExp) => (path: string) => pattern.test(path);

const routeLazy = <T extends React.ComponentType<any>>(
  matchesCurrentRoute: (path: string) => boolean,
  importer: () => Promise<{ default: T }>,
) => {
  // Hanya chunk route yang sedang dibuka yang dimulai seawal mungkin.
  // Route lain tetap lazy sehingga Student tidak mengunduh halaman Admin/Teacher.
  const preloadedModule = matchesCurrentRoute(CURRENT_PATH) ? importer() : null;
  return lazy(() => preloadedModule ?? importer());
};

// 1. Halaman Umum
const Index = routeLazy(exactPath("/"), () => import("./pages/Index"));
const SearchPage = routeLazy(exactPath("/search", "/student/find"), () => import("./pages/SearchPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const WhyUs = routeLazy(exactPath("/why-us"), () => import("./pages/WhyUs"));
const AccessDenied = routeLazy(exactPath("/access-denied"), () => import("./pages/AccessDenied"));

// 2. Halaman Rules
const PrivacyPolicy = routeLazy(exactPath("/privacy"), () => import("./pages/rules/PrivacyPolicy"));
const TermsConditions = routeLazy(exactPath("/terms"), () => import("./pages/rules/TermsConditions"));

// 3. Halaman Autentikasi
const Register = routeLazy(exactPath("/register"), () => import("./pages/Register"));
const Login = routeLazy(exactPath("/login"), () => import("./pages/Login"));
const ForgotPassword = routeLazy(exactPath("/forgot-password"), () => import("./pages/ForgotPassword"));
const ResetPassword = routeLazy(exactPath("/reset-password"), () => import("./pages/ResetPassword"));

// 4. Halaman Admin
const DashboardOverview = routeLazy(exactPath("/admin"), () => import("./pages/admin/DashboardOverview"));
const TutorSearchMonitoring = routeLazy(exactPath("/admin/tutor-searches"), () => import("./pages/admin/TutorSearchMonitoring"));
const TeacherVerification = routeLazy(exactPath("/admin/guru"), () => import("./pages/admin/TeacherVerification"));
const PaymentVerification = routeLazy(exactPath("/admin/pembayaran"), () => import("./pages/admin/PaymentVerification"));
const RefundManagement = routeLazy(exactPath("/admin/refunds"), () => import("./pages/admin/RefundManagement"));
const UserManagement = routeLazy(exactPath("/admin/users"), () => import("./pages/admin/UserManagement"));
const PaymentSettings = routeLazy(exactPath("/admin/settings-payment"), () => import("./pages/admin/PaymentSettings"));
const FinanceReport = routeLazy(exactPath("/admin/finance"), () => import("./pages/admin/FinanceReport"));
const EditFooter = routeLazy(exactPath("/admin/settings-footer"), () => import("./pages/admin/EditFooter"));
const AdminMessages = routeLazy(exactPath("/admin/pesan"), () => import("./pages/admin/AdminMessages"));
const SendMessage = routeLazy(exactPath("/admin/notifikasi"), () => import("./pages/admin/SendMessage"));
const ClassMonitoring = routeLazy(exactPath("/admin/classes"), () => import("./pages/admin/ClassMonitoring"));
const ClassDetail = routeLazy(pathPattern(/^\/admin\/classes\/[^/]+$/), () => import("./pages/admin/ClassDetail"));
const AdminNotes = routeLazy(exactPath("/admin/notes"), () => import("./pages/admin/AdminNotes"));
const SettingsDisplay = routeLazy(exactPath("/admin/settings-display"), () => import("./pages/admin/SettingsDisplay"));
const AdminRatings = routeLazy(exactPath("/admin/ratings"), () => import("./pages/admin/AdminRatings"));
const HourlyRates = routeLazy(exactPath("/admin/hourly-rates"), () => import("./pages/admin/HourlyRates"));
const LearningTopics = routeLazy(exactPath("/admin/learning-topics"), () => import("./pages/admin/LearningTopics"));
const SubjectManagement = routeLazy(exactPath("/admin/subjects"), () => import("./pages/admin/SubjectManagement"));
const CaseCenter = routeLazy(exactPath("/admin/cases"), () => import("./pages/admin/CaseCenter"));
const StageFiveManagement = routeLazy(exactPath("/admin/stage-five"), () => import("./pages/admin/StageFiveManagement"));
const AdminAuditLog = routeLazy(exactPath("/admin/audit-log"), () => import("./pages/admin/AdminAuditLog"));

// 5. Halaman Guru
const TeacherDashboard = routeLazy(exactPath("/guru"), () => import("./pages/teacher/TeacherDashboard"));
const ManageClasses = routeLazy(exactPath("/guru/kelas"), () => import("./pages/teacher/ManageClasses"));
const TeacherProfile = routeLazy(exactPath("/guru/profil"), () => import("./pages/teacher/TeacherProfile"));
const TeacherBankSettings = routeLazy(exactPath("/guru/rekening"), () => import("./pages/teacher/TeacherBankSettings"));
const TeacherSalary = routeLazy(exactPath("/guru/gaji"), () => import("./pages/teacher/TeacherSalary"));
const ManageSchedule = routeLazy(exactPath("/guru/jadwal"), () => import("./pages/teacher/ManageSchedule"));
const BookingGuru = routeLazy(exactPath("/guru/permintaan"), () => import("./pages/teacher/BookingGuru"));
const TeacherMessages = routeLazy(exactPath("/guru/pesan"), () => import("./pages/teacher/TeacherMessages"));
const TeacherAccount = routeLazy(exactPath("/guru/saya"), () => import("./pages/teacher/TeacherAccount"));
const TeacherPerformance = routeLazy(exactPath("/guru/performa"), () => import("./pages/teacher/TeacherPerformance"));
const TeacherNotifications = routeLazy(exactPath("/guru/notifikasi"), () => import("./pages/teacher/TeacherNotifications"));

// 6. Halaman Murid
const Dashboard = routeLazy(exactPath("/student/dashboard"), () => import("./pages/students/Dashboard"));
const MyClasses = routeLazy(exactPath("/student/my-classes"), () => import("./pages/students/MyClasses"));
const TransactionHistory = routeLazy(exactPath("/student/history"), () => import("./pages/students/TransactionHistory"));
const Profile = routeLazy(exactPath("/student/profile"), () => import("./pages/students/Profile"));
const Account = routeLazy(exactPath("/student/account"), () => import("./pages/students/Account"));
const PackageBuilder = routeLazy(exactPath("/student/packages/new"), () => import("./pages/students/PackageBuilder"));
const PackageReschedule = routeLazy(pathPattern(/^\/student\/packages\/[^/]+\/reschedule$/), () => import("./pages/students/PackageReschedule"));
const MyPackages = routeLazy(exactPath("/student/packages"), () => import("./pages/students/MyPackages"));
const Vouchers = routeLazy(exactPath("/student/vouchers"), () => import("./pages/students/Vouchers"));
const PromotionDetail = routeLazy(pathPattern(/^\/student\/offers\/[^/]+$/), () => import("./pages/students/PromotionDetail"));
const Messages = routeLazy(exactPath("/student/messages"), () => import("./pages/students/Messages"));
const LearningProgress = routeLazy(exactPath("/student/progress"), () => import("./pages/students/LearningProgress"));
const StudentNotifications = routeLazy(exactPath("/student/notifications"), () => import("./pages/students/Notifications"));

// 7. Payment
const PaymentPage = routeLazy(exactPath("/payment"), () => import("./pages/pembayaran/PaymentPage"));

// 8. Halaman Common (Bantuan)
const StudentHelp = routeLazy(exactPath("/student/help"), () => import("./pages/students/Help"));
const TeacherHelp = routeLazy(exactPath("/guru/bantuan"), () => import("./pages/teacher/Help"));
const PendingPaymentPopup = lazy(() => import("./components/PendingPaymentPopup"));
const FilePreviewProvider = lazy(() => import("./components/FilePreviewProvider"));

const DeferredFilePreviewProvider = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const activate = () => setReady(true);
    const cancelScheduledActivation = scheduleNonCriticalTask(activate);
    window.addEventListener("bimbelku:file-preview-needed", activate, { once: true });

    return () => {
      cancelScheduledActivation();
      window.removeEventListener("bimbelku:file-preview-needed", activate);
    };
  }, []);

  return ready ? (
    <Suspense fallback={null}>
      <FilePreviewProvider />
    </Suspense>
  ) : null;
};

const StudentRuntime = () => {
  // Pemeriksaan peran tetap mengikuti perpindahan halaman, tetapi widget pembayaran
  // ditunda sampai pekerjaan utama halaman selesai agar tidak berebut request awal.
  useLocation();
  const [ready, setReady] = useState(false);
  let role = "";
  try {
    role = JSON.parse(localStorage.getItem("user") || "null")?.role || "";
  } catch {
    role = "";
  }

  useEffect(() => {
    if (role !== "student") {
      setReady(false);
      return;
    }

    return scheduleNonCriticalTask(() => setReady(true));
  }, [role]);

  return role === "student" && ready ? (
    <Suspense fallback={null}>
      <PendingPaymentPopup />
    </Suspense>
  ) : null;
};

// --- KOMPONEN LOADING PAGE ---
const PageLoader = () => (
  <div
    role="status"
    aria-live="polite"
    className="flex h-dvh w-full flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-white to-indigo-50"
  >
    <div className="relative grid h-20 w-20 place-items-center rounded-3xl bg-slate-950 text-white shadow-2xl shadow-indigo-200">
      <div className="absolute inset-0 animate-ping rounded-3xl border border-indigo-300/40 motion-reduce:animate-none" />
      <span aria-hidden="true" className="relative text-2xl font-black text-orange-300">B</span>
    </div>
    <p className="mt-5 text-sm font-black text-slate-700">Menyiapkan BimbelKu</p>
    <div className="mt-3 h-1.5 w-36 overflow-hidden rounded-full bg-slate-200">
      <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-orange-500 to-indigo-600 motion-reduce:animate-none" />
    </div>
  </div>
);

const App = () => (
  <ConfirmDialogProvider>
        {/* Toast dimuat setelah konten awal selesai atau saat pertama kali dibutuhkan. */}
        <DeferredToaster />
        <DeferredFilePreviewProvider />
        
        <BrowserRouter>
        <SessionLifecycle />
        
        {/* === GLOBAL COMPONENTS === */}
        <StudentRuntime /> 

        {/* Suspense Wajib Ada untuk Lazy Loading */}
        <Suspense fallback={<PageLoader />}>
          <Routes>
            
            {/* =========================================
                1. RUTE PUBLIK 
               ========================================= */}
            <Route path="/" element={<Index />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            

            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsConditions />} />
            <Route path="/why-us" element={<WhyUs />} />
            <Route path="/access-denied" element={<AccessDenied />} />

            {/* =========================================
                2. RUTE ADMIN (Role: admin)
               ========================================= */}
            <Route element={<PrivateRoute allowedRoles={['admin']} />}>
              <Route path="/admin" element={<DashboardOverview />} />
              <Route path="/admin/tutor-searches" element={<TutorSearchMonitoring />} />
              <Route path="/admin/guru" element={<TeacherVerification />} />
              <Route path="/admin/pembayaran" element={<PaymentVerification />} />
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/settings-payment" element={<PaymentSettings />} />
              <Route path="/admin/settings-footer" element={<EditFooter />} />
              <Route path="/admin/finance" element={<FinanceReport />} />
              <Route path="/admin/refunds" element={<RefundManagement />} />
              <Route path="/admin/finance-security" element={<Navigate to="/admin/pembayaran" replace />} />
              <Route path="/admin/pesan" element={<AdminMessages />} />
              <Route path="/admin/notifikasi" element={<SendMessage />} /> 
              <Route path="/admin/classes" element={<ClassMonitoring />} />
              <Route path="/admin/classes/:id" element={<ClassDetail />} />
              <Route path="/admin/notes" element={<AdminNotes />} />
              <Route path="/admin/settings-display" element={<SettingsDisplay />} />
              <Route path="/admin/ratings" element={<AdminRatings />} />
              <Route path="/admin/hourly-rates" element={<HourlyRates />} />
              <Route path="/admin/learning-topics" element={<LearningTopics />} />
              <Route path="/admin/subjects" element={<SubjectManagement />} />
              <Route path="/admin/cases" element={<CaseCenter />} />
              <Route path="/admin/stage-five" element={<StageFiveManagement />} />
              <Route path="/admin/access-control" element={<Navigate to="/admin" replace />} />
              <Route path="/admin/audit-log" element={<AdminAuditLog />} />
            </Route>

            {/* =========================================
                3. RUTE GURU (Role: teacher)
               ========================================= */}
            <Route element={<PrivateRoute allowedRoles={['teacher']} />}>
              <Route path="/guru" element={<TeacherDashboard />} />
              <Route path="/guru/kelas" element={<ManageClasses />} />
              <Route path="/guru/profil" element={<TeacherProfile />} />
              <Route path="/guru/jadwal" element={<ManageSchedule />} />
              <Route path="/guru/permintaan" element={<BookingGuru />} />
              <Route path="/guru/rekening" element={<TeacherBankSettings />} />
              <Route path="/guru/gaji" element={<TeacherSalary />} />
              <Route path="/guru/pesan" element={<TeacherMessages />} />
              <Route path="/guru/saya" element={<TeacherAccount />} />
              <Route path="/guru/performa" element={<TeacherPerformance />} />
              <Route path="/guru/notifikasi" element={<TeacherNotifications />} />
              
              <Route path="/guru/bantuan" element={<TeacherHelp />} />
            </Route>

            {/* =========================================
                4. RUTE MURID (Role: student)
               ========================================= */}
            <Route element={<PrivateRoute allowedRoles={['student']} />}>
              <Route path="/student/dashboard" element={<Dashboard />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/student/find" element={<SearchPage />} />
              <Route path="/student/my-classes" element={<MyClasses />} />
              <Route path="/student/messages" element={<Messages />} />
              <Route path="/student/progress" element={<LearningProgress />} />
              <Route path="/student/notifications" element={<StudentNotifications />} />
              <Route path="/student/history" element={<TransactionHistory />} />
              <Route path="/student/profile" element={<Profile />} />
              <Route path="/student/account" element={<Account />} />
              <Route path="/student/packages" element={<MyPackages />} />
              <Route path="/student/packages/new" element={<PackageBuilder />} />
              <Route path="/student/packages/:id/reschedule" element={<PackageReschedule />} />
              <Route path="/student/vouchers" element={<Vouchers />} />
              <Route path="/student/offers/:id" element={<PromotionDetail />} />
              
              <Route path="/student/help" element={<StudentHelp />} />
              
              <Route path="/payment" element={<PaymentPage />} />
            </Route>

            {/* =========================================
                5. RUTE 404 
               ========================================= */}
            <Route path="*" element={<NotFound />} />

          </Routes>
        </Suspense>
        </BrowserRouter>
  </ConfirmDialogProvider>
);

export default App;
