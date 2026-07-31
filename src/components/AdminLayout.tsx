import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import LogoutButton from "@/components/LogoutButton";
import {
  LayoutDashboard,
  Users,
  FileCheck,
  CreditCard,
  Menu,
  X,
  QrCode,
  Coins,
  PieChart,
  Globe,
  MessageSquare,
  Bell,
  BookOpen, // [BARU] Icon untuk Monitoring Kelas
  StickyNote,
  Image,
  Gavel,
  Layers3,
  LibraryBig,
  ShieldCheck,
  Tags,
  
} from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string, exact = false) => exact
    ? location.pathname === path
    : location.pathname === path || location.pathname.startsWith(`${path}/`);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="h-dvh overflow-hidden bg-[#F8FAFC] flex font-sans text-slate-800">
      
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 xl:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* --- SIDEBAR --- */}
      <aside className={`fixed xl:static inset-y-0 left-0 z-50 w-[min(18rem,88vw)] bg-white border-r border-slate-100 transform transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'} flex flex-col shadow-2xl xl:shadow-none`}>
        
        {/* Logo Area */}
        <div className="h-24 flex items-center px-8 border-b border-slate-50">
             <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-rose-600 rounded-xl flex items-center justify-center mr-3 shadow-lg shadow-orange-500/20 text-white transform rotate-3 hover:rotate-0 transition-all duration-500">
               <span className="font-black text-xl">B</span>
             </div>
             <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">BimbelKu</h1>
                <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded mt-1 inline-block">Super Admin</span>
             </div>
             <button aria-label="Tutup menu" className="xl:hidden ml-auto text-slate-400 hover:text-rose-500 transition" onClick={() => setSidebarOpen(false)}>
               <X size={24} />
             </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-5 py-6 space-y-8 overflow-y-auto custom-scrollbar">
            
            {/* GROUP 1: DASHBOARD */}
            <div>
                <div className="px-4 mb-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> Dashboard
                </div>
                <div className="space-y-1">
                    <NavItem to="/admin" icon={LayoutDashboard} label="Overview" active={isActive('/admin', true)} />
                    <NavItem to="/admin/pesan" icon={MessageSquare} label="Pesan Masuk" active={isActive('/admin/pesan')} />
                    <NavItem to="/admin/notifikasi" icon={Bell} label="Kirim Notifikasi" active={isActive('/admin/notifikasi')} />
                    <NavItem to="/admin/notes" icon={StickyNote} label="Catatan" active={isActive('/admin/notes')} />
                </div>
            </div>

            {/* GROUP 2: VERIFIKASI */}
            <div>
                <div className="px-4 mb-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> Verifikasi
                </div>
                <div className="space-y-1">
                    <NavItem to="/admin/guru" icon={FileCheck} label="Verifikasi Tutor" active={isActive('/admin/guru')} />
                    <NavItem to="/admin/pembayaran" icon={CreditCard} label="Cek Pembayaran" active={isActive('/admin/pembayaran')} />
                    <NavItem to="/admin/cases" icon={Gavel} label="Pusat Kasus" active={isActive('/admin/cases')} />
                </div>
            </div>

            {/* [BARU] GROUP 3: AKADEMIK */}
            <div>
                <div className="px-4 mb-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> Akademik
                </div>
                <div className="space-y-1">
                    {/* Menu Monitoring Kelas */}
                    <NavItem to="/admin/classes" icon={BookOpen} label="Monitoring Kelas" active={isActive('/admin/classes')} />
                    <NavItem to="/admin/subjects" icon={LibraryBig} label="Mata Pelajaran" active={isActive('/admin/subjects')} />
                    <NavItem to="/admin/learning-topics" icon={Layers3} label="Materi Kurikulum" active={isActive('/admin/learning-topics')} />
                    <NavItem to="/admin/stage-five" icon={Tags} label="Paket, Promo & Konten" active={isActive('/admin/stage-five')} />
                </div>
            </div>
            
            {/* GROUP 4: DATABASE & SYSTEM */}
            <div>
                <div className="px-4 mb-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> Database & System
                </div>
                <div className="space-y-1">
                    <NavItem to="/admin/finance" icon={PieChart} label="Keuangan" active={isActive('/admin/finance')} />
                    <NavItem to="/admin/finance-security" icon={ShieldCheck} label="Keamanan Keuangan" active={isActive('/admin/finance-security')} />
                    <NavItem to="/admin/ratings" icon={MessageSquare} label="Moderasi Ulasan" active={isActive('/admin/ratings')} />
                    <NavItem to="/admin/settings-display" icon={Image} label="Tampilan Tutor" active={isActive('/admin/settings-display')} />
                    <NavItem to="/admin/users" icon={Users} label="Data User" active={isActive('/admin/users')} />
                    <NavItem to="/admin/hourly-rates" icon={Coins} label="Harga Per Sesi" active={isActive('/admin/hourly-rates')} />
                    <NavItem to="/admin/settings-payment" icon={QrCode} label="Rekening & QRIS" active={isActive('/admin/settings-payment')} />
                    <NavItem to="/admin/settings-footer" icon={Globe} label="Footer Website" active={isActive('/admin/settings-footer')} />
                </div>
            </div>
        </nav>

        {/* Footer Sidebar */}
        <div className="p-6 border-t border-slate-50">
            <LogoutButton accent="admin" />
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        
        {/* Header */}
        <header className="h-16 sm:h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 flex items-center justify-between px-3 sm:px-6 xl:px-10 sticky top-0 z-30 transition-all">
          <div className="flex items-center gap-2 sm:gap-4">
            <button aria-label="Buka menu" className="xl:hidden p-2.5 bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl shadow-sm transition" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            
            <div className="hidden md:flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Pusat operasional aktif
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-6">
             {/* Admin Profile */}
             <div className="flex items-center gap-3 pl-2 sm:pl-6 border-l border-slate-200 h-8">
                 <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-slate-800 leading-none">Administrator</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">Super User</p>
                 </div>
                 <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-lg ring-2 ring-slate-100 cursor-pointer hover:ring-slate-300 transition-all">
                    AD
                 </div>
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 xl:p-10 scroll-smooth">
          <div className="max-w-7xl mx-auto pb-12">
            {/* Breadcrumb Title */}
            <div className="mb-5 sm:mb-8">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{title}</h2>
                <p className="text-slate-500 text-sm font-medium">Dashboard Admin Area</p>
            </div>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({ to, icon: Icon, label, active }: any) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center justify-between px-4 py-3.5 text-sm font-bold rounded-2xl transition-all duration-300 mb-1 ${
        active 
          ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 translate-x-1' 
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <div className="flex items-center gap-3.5">
        <Icon 
            size={20} 
            className={`${active ? 'text-orange-400' : 'text-slate-400 group-hover:text-orange-500'} transition-colors duration-300`} 
            strokeWidth={active ? 2.5 : 2}
        />
        <span>{label}</span>
      </div>
      {active && (
          <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-sm animate-pulse"></div>
      )}
    </Link>
  );
}
