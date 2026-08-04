import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { BrowserRouter, Navigate, Routes, Route, useLocation } from "react-router-dom";
import { BookOpenCheck } from "lucide-react";

// --- IMPORT KOMPONEN KEAMANAN & GLOBAL (Tetap Import Biasa) ---
import PrivateRoute from "./components/PrivateRoute"; 
import { ConfirmDialogProvider } from "./components/ConfirmDialogProvider";
import SessionLifecycle from "./components/SessionLifecycle";
import FilePreviewProvider from "./components/FilePreviewProvider";

// =================================================================
// KONFIGURASI LAZY LOAD (Code Splitting)
// Halaman hanya akan didownload saat user membukanya
// =================================================================

// 1. Halaman Umum
const Index = lazy(() => import("./pages/Index"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const WhyUs = lazy(() => import("./pages/WhyUs"));
const AccessDenied = lazy(() => import("./pages/AccessDenied"));

// 2. Halaman Rules
const PrivacyPolicy = lazy(() => import("./pages/rules/PrivacyPolicy"));
const TermsConditions = lazy(() => import("./pages/rules/TermsConditions"));

// 3. Halaman Autentikasi
const Register = lazy(() => import("./pages/Register"));
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

// 4. Halaman Admin
const DashboardOverview = lazy(() => import("./pages/admin/DashboardOverview"));
const TutorSearchMonitoring = lazy(() => import("./pages/admin/TutorSearchMonitoring"));
const TeacherVerification = lazy(() => import("./pages/admin/TeacherVerification"));
const PaymentVerification = lazy(() => import("./pages/admin/PaymentVerification"));
const RefundManagement = lazy(() => import("./pages/admin/RefundManagement"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const PaymentSettings = lazy(() => import("./pages/admin/PaymentSettings"));
const FinanceReport = lazy(() => import("./pages/admin/FinanceReport"));
const EditFooter = lazy(() => import("./pages/admin/EditFooter")); 
const AdminMessages = lazy(() => import("./pages/admin/AdminMessages")); 
const SendMessage = lazy(() => import("./pages/admin/SendMessage")); 
const ClassMonitoring = lazy(() => import("./pages/admin/ClassMonitoring"));
const ClassDetail = lazy(() => import("./pages/admin/ClassDetail"));
const AdminNotes = lazy(() => import("./pages/admin/AdminNotes"));
const SettingsDisplay = lazy(() => import("./pages/admin/SettingsDisplay"));
const AdminRatings = lazy(() => import("./pages/admin/AdminRatings"));
const HourlyRates = lazy(() => import("./pages/admin/HourlyRates"));
const LearningTopics = lazy(() => import("./pages/admin/LearningTopics"));
const SubjectManagement = lazy(() => import("./pages/admin/SubjectManagement"));
const CaseCenter = lazy(() => import("./pages/admin/CaseCenter"));
const StageFiveManagement = lazy(() => import("./pages/admin/StageFiveManagement"));
const AdminAuditLog = lazy(() => import("./pages/admin/AdminAuditLog"));

// 5. Halaman Guru
const TeacherDashboard = lazy(() => import("./pages/teacher/TeacherDashboard"));
const ManageClasses = lazy(() => import("./pages/teacher/ManageClasses"));
const TeacherProfile = lazy(() => import("./pages/teacher/TeacherProfile"));
const TeacherBankSettings = lazy(() => import("./pages/teacher/TeacherBankSettings"));
const TeacherSalary = lazy(() => import("./pages/teacher/TeacherSalary")); 
const ManageSchedule = lazy(() => import("./pages/teacher/ManageSchedule"));
const BookingGuru = lazy(() => import("./pages/teacher/BookingGuru"));
const TeacherMessages = lazy(() => import("./pages/teacher/TeacherMessages"));
const TeacherAccount = lazy(() => import("./pages/teacher/TeacherAccount"));
const TeacherPerformance = lazy(() => import("./pages/teacher/TeacherPerformance"));
const TeacherNotifications = lazy(() => import("./pages/teacher/TeacherNotifications"));

// 6. Halaman Murid 
const Dashboard = lazy(() => import("./pages/students/Dashboard"));
const MyClasses = lazy(() => import("./pages/students/MyClasses"));
const TransactionHistory = lazy(() => import("./pages/students/TransactionHistory"));
const Profile = lazy(() => import("./pages/students/Profile"));
const Account = lazy(() => import("./pages/students/Account"));
const PackageBuilder = lazy(() => import("./pages/students/PackageBuilder"));
const MyPackages = lazy(() => import("./pages/students/MyPackages"));
const Vouchers = lazy(() => import("./pages/students/Vouchers"));
const PromotionDetail = lazy(() => import("./pages/students/PromotionDetail"));
const Messages = lazy(() => import("./pages/students/Messages"));
const LearningProgress = lazy(() => import("./pages/students/LearningProgress"));

// 7. Payment
const PaymentPage = lazy(() => import("./pages/pembayaran/PaymentPage"));

// 8. Halaman Common (Bantuan)
const StudentHelp = lazy(() => import("./pages/students/Help"));
const TeacherHelp = lazy(() => import("./pages/teacher/Help"));
const PendingPaymentPopup = lazy(() => import("./components/PendingPaymentPopup"));

const StudentRuntime = () => {
  // useLocation membuat pemeriksaan peran ikut diperbarui setelah login/logout
  // tanpa memuat widget pembayaran pada halaman publik, tutor, atau admin.
  useLocation();
  let role = "";
  try {
    role = JSON.parse(localStorage.getItem("user") || "null")?.role || "";
  } catch {
    role = "";
  }

  return role === "student" ? (
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
      <BookOpenCheck className="relative text-orange-300" size={32} />
    </div>
    <p className="mt-5 text-sm font-black text-slate-700">Menyiapkan BimbelKu</p>
    <div className="mt-3 h-1.5 w-36 overflow-hidden rounded-full bg-slate-200">
      <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-orange-500 to-indigo-600 motion-reduce:animate-none" />
    </div>
  </div>
);

const App = () => (
  <ConfirmDialogProvider>
        {/* Toast Notifikasi Global */}
        <Toaster position="top-center" richColors closeButton />
        <FilePreviewProvider />
        
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
              <Route path="/student/history" element={<TransactionHistory />} />
              <Route path="/student/profile" element={<Profile />} />
              <Route path="/student/account" element={<Account />} />
              <Route path="/student/packages" element={<MyPackages />} />
              <Route path="/student/packages/new" element={<PackageBuilder />} />
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
