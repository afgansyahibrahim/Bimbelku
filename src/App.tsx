import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BookOpenCheck } from "lucide-react";

// --- IMPORT KOMPONEN KEAMANAN & GLOBAL (Tetap Import Biasa) ---
import PrivateRoute from "./components/PrivateRoute"; 
import PendingPaymentPopup from "./components/PendingPaymentPopup"; 
import { ConfirmDialogProvider } from "./components/ConfirmDialogProvider";
import SessionLifecycle from "./components/SessionLifecycle";

// --- IMPORT LAYOUTS (Tetap Import Biasa agar kerangka stabil) ---
import TeacherLayout from "./components/TeacherLayout";
import StudentLayout from "./components/StudentLayout";

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
const TeacherVerification = lazy(() => import("./pages/admin/TeacherVerification"));
const PaymentVerification = lazy(() => import("./pages/admin/PaymentVerification"));
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
const CaseCenter = lazy(() => import("./pages/admin/CaseCenter"));

// 5. Halaman Guru
const TeacherDashboard = lazy(() => import("./pages/teacher/TeacherDashboard"));
const ManageClasses = lazy(() => import("./pages/teacher/ManageClasses"));
const TeacherProfile = lazy(() => import("./pages/teacher/TeacherProfile"));
const TeacherBankSettings = lazy(() => import("./pages/teacher/TeacherBankSettings"));
const TeacherSalary = lazy(() => import("./pages/teacher/TeacherSalary")); 
const ManageSchedule = lazy(() => import("./pages/teacher/ManageSchedule"));
const BookingGuru = lazy(() => import("./pages/teacher/BookingGuru"));

// 6. Halaman Murid 
const Dashboard = lazy(() => import("./pages/students/Dashboard"));
const MyClasses = lazy(() => import("./pages/students/MyClasses"));
const TransactionHistory = lazy(() => import("./pages/students/TransactionHistory"));
const Profile = lazy(() => import("./pages/students/Profile"));

// 7. Payment
const PaymentPage = lazy(() => import("./pages/pembayaran/PaymentPage"));

// 8. Halaman Common (Bantuan)
const HelpCenter = lazy(() => import("./pages/common/HelpCenter")); 

// --- KOMPONEN LOADING PAGE ---
const PageLoader = () => (
  <div
    role="status"
    aria-live="polite"
    className="flex h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-white to-indigo-50"
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
        
        <BrowserRouter>
        <SessionLifecycle />
        
        {/* === GLOBAL COMPONENTS === */}
        <PendingPaymentPopup /> 

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
              <Route path="/admin/guru" element={<TeacherVerification />} />
              <Route path="/admin/pembayaran" element={<PaymentVerification />} />
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/settings-payment" element={<PaymentSettings />} />
              <Route path="/admin/settings-footer" element={<EditFooter />} />
              <Route path="/admin/finance" element={<FinanceReport />} />
              <Route path="/admin/pesan" element={<AdminMessages />} />
              <Route path="/admin/notifikasi" element={<SendMessage />} /> 
              <Route path="/admin/classes" element={<ClassMonitoring />} />
              <Route path="/admin/classes/:id" element={<ClassDetail />} />
              <Route path="/admin/notes" element={<AdminNotes />} />
              <Route path="/admin/settings-display" element={<SettingsDisplay />} />
              <Route path="/admin/ratings" element={<AdminRatings />} />
              <Route path="/admin/hourly-rates" element={<HourlyRates />} />
              <Route path="/admin/learning-topics" element={<LearningTopics />} />
              <Route path="/admin/cases" element={<CaseCenter />} />
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
              
              <Route path="/guru/bantuan" element={
                <TeacherLayout title="Pusat Bantuan">
                  <HelpCenter />
                </TeacherLayout>
              } />
            </Route>

            {/* =========================================
                4. RUTE MURID (Role: student)
               ========================================= */}
            <Route element={<PrivateRoute allowedRoles={['student']} />}>
              <Route path="/student/dashboard" element={<Dashboard />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/student/find" element={<SearchPage />} />
              <Route path="/student/my-classes" element={<MyClasses />} />
              <Route path="/student/history" element={<TransactionHistory />} />
              <Route path="/student/profile" element={<Profile />} />
              
              <Route path="/student/help" element={
                <StudentLayout title="Bantuan & Support">
                  <HelpCenter />
                </StudentLayout>
              } />
              
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
