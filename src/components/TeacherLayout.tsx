import { useCallback, useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import http, { getCached } from "@/lib/http";
import LogoutButton from "@/components/LogoutButton";
import MobileBottomNav from "@/components/MobileBottomNav";
import RoleQuickGuide from "@/components/RoleQuickGuide";
import {
  LayoutDashboard, BookOpen, Menu, X, Settings, Wallet, Banknote, 
  GraduationCap, User, CalendarClock, HelpCircle, Bell, MessageSquare, ClipboardCheck
} from "lucide-react";

interface TeacherLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function TeacherLayout({ children, title }: TeacherLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userData, setUserData] = useState<any>(null); 
  
  // STATE NOTIFIKASI
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  
  // [BARU] Modal State
  const [selectedNotif, setSelectedNotif] = useState<any>(null);
  
  const lastNotificationIdRef = useRef<number>(0);
  const location = useLocation();
  const isActive = (path: string, exact = false) => exact
    ? location.pathname === path
    : location.pathname === path || location.pathname.startsWith(`${path}/`);

  useEffect(() => {
    setSidebarOpen(false);
    setShowNotifDropdown(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!selectedNotif) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedNotif(null);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [selectedNotif]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await getCached("/teacher/profile", { maxAgeMs: 60_000 });
        setUserData({ name: response.data.user.name, email: response.data.user.email, photo: response.data.profile.photo_url });
      } catch (error) { console.error("Gagal profil", error); }
    };
    fetchProfile();
  }, []);

  const handleNotifClick = useCallback(async (notif: any) => {
      setSelectedNotif(notif);
      setShowNotifDropdown(false);

      if (!notif.is_read) {
          setNotifications(prev => prev.map(n => n.id === notif.id ? {...n, is_read: true} : n));
          setUnreadCount(prev => Math.max(0, prev - 1));
          try {
              await http.post(`/notifications/${notif.id}/read`);
          } catch {
              // Polling berikutnya akan menyelaraskan status jika request gagal.
          }
      }
  }, []);

  // --- LOGIKA NOTIFIKASI ---
  const fetchNotifications = useCallback(async (isPolling = false) => {
      try {
          const token = localStorage.getItem("token");
          if (!token) return;
          const res = await getCached("/notifications", {
            maxAgeMs: isPolling ? 5_000 : 15_000,
            force: isPolling,
          });
          
          const data = Array.isArray(res.data.notifications) ? res.data.notifications : [];
          const count = Number(res.data.unread_count || 0);
          setNotifications(data);
          setUnreadCount(count);

          // TOAST POP-UP
          if (data.length > 0) {
              const latest = data[0];
              if (isPolling && latest.id > lastNotificationIdRef.current) {
                  
                  // Custom Toast
                  toast.custom((t) => (
                    <div 
                        className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 p-4 flex gap-4 animate-in slide-in-from-top-5 duration-500 cursor-pointer pointer-events-auto hover:bg-slate-50 transition"
                        onClick={() => {
                            toast.dismiss(t);
                            handleNotifClick(latest);
                        }}
                    >
                        <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                            <Bell size={20} className="animate-bounce"/>
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-slate-800 text-sm">{latest.title}</h4>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{latest.message}</p>
                            <p className="text-[10px] text-indigo-500 mt-2 font-bold">Ketuk untuk membaca</p>
                        </div>
                    </div>
                  ), { duration: 5000, position: 'top-center' });
              }
              lastNotificationIdRef.current = latest.id;
          }
      } catch {
          // Notifikasi tidak boleh mengganggu halaman utama ketika jaringan terputus.
      }
  }, [handleNotifClick]);

  useEffect(() => {
      fetchNotifications();
      const interval = setInterval(() => {
          if (document.visibilityState === "visible") void fetchNotifications(true);
      }, 60000);
      return () => clearInterval(interval);
  }, [fetchNotifications]);

  return (
    <div className="h-dvh overflow-hidden bg-[#F8FAFC] flex font-sans text-slate-800">
      {sidebarOpen && ( <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 xl:hidden" onClick={() => setSidebarOpen(false)} /> )}

      {/* SIDEBAR */}
      <aside className={`fixed xl:static inset-y-0 left-0 z-40 w-[min(18rem,88vw)] bg-white border-r border-slate-100 transform transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'} shadow-xl xl:shadow-none flex flex-col`}>
        <div className="h-24 flex items-center px-8 border-b border-slate-50">
             <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center mr-3 shadow-lg shadow-indigo-500/20 text-white transform rotate-3 hover:rotate-0 transition-all duration-300"><GraduationCap size={20} /></div>
             <div><h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">BimbelKu</h1><span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest bg-indigo-50 px-1.5 py-0.5 rounded mt-1 inline-block">Teacher</span></div>
             <button aria-label="Tutup menu" className="xl:hidden ml-auto text-slate-400 hover:text-indigo-600 transition" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
        </div>

        <nav className="flex-1 px-5 py-6 space-y-8 overflow-y-auto custom-scrollbar">
            <div>
                <div className="px-4 mb-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2"><span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span> Dashboard</div>
                <NavItem to="/guru" icon={LayoutDashboard} label="Overview" active={isActive('/guru', true)} />
            </div>
            <div>
                <div className="px-4 mb-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2"><span className="w-1.5 h-1.5 bg-violet-400 rounded-full"></span> Akademik</div>
                <div className="space-y-1">
                    <NavItem to="/guru/permintaan" icon={ClipboardCheck} label="Permintaan Bimbel" active={isActive('/guru/permintaan')} />
                    <NavItem to="/guru/kelas" icon={BookOpen} label="Manajemen Kelas" active={isActive('/guru/kelas')} />
                    <NavItem to="/guru/jadwal" icon={CalendarClock} label="Jadwal Mengajar" active={isActive('/guru/jadwal')} />
                </div>
            </div>
            <div>
                <div className="px-4 mb-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span> Keuangan</div>
                <div className="space-y-1">
                    <NavItem to="/guru/rekening" icon={Wallet} label="Rekening" active={isActive('/guru/rekening')} />
                    <NavItem to="/guru/gaji" icon={Banknote} label="Dompet & Gaji" active={isActive('/guru/gaji')} />
                </div>
            </div>
            <div>
                <div className="px-4 mb-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2"><span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span> Pengaturan</div>
                <div className="space-y-1">
                    <NavItem to="/guru/profil" icon={Settings} label="Edit Profil" active={isActive('/guru/profil')} />
                    <NavItem to="/guru/bantuan" icon={HelpCircle} label="Pusat Bantuan" active={isActive('/guru/bantuan')} />
                </div>
            </div>
        </nav>

        <div className="p-6 border-t border-slate-50">
            <LogoutButton accent="teacher" />
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="h-16 sm:h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 flex items-center justify-between px-3 sm:px-6 xl:px-10 sticky top-0 z-20 transition-all">
          <div className="flex items-center gap-2 sm:gap-4">
            <button aria-label="Buka menu" className="xl:hidden p-2.5 bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl shadow-sm transition" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
            <div><h1 className="text-xl font-black text-slate-800 tracking-tight hidden sm:block">{title}</h1></div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-5">
             <RoleQuickGuide role="teacher" />
             
             {/* DROPDOWN NOTIF */}
             <div className="relative">
                 <button onClick={() => setShowNotifDropdown(!showNotifDropdown)} aria-label={`Notifikasi${unreadCount ? `, ${unreadCount} belum dibaca` : ""}`} aria-expanded={showNotifDropdown} className="relative p-2.5 rounded-full text-slate-400 hover:bg-white hover:text-indigo-600 hover:shadow-md transition-all duration-300 group">
                    <Bell size={20} />
                    {unreadCount > 0 && <span className="absolute top-2.5 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse"></span>}
                 </button>
                 {showNotifDropdown && (
                     <>
                        <div className="fixed inset-0 z-[100]" onClick={() => setShowNotifDropdown(false)}></div>
                        <div className="absolute right-0 mt-4 w-[min(24rem,calc(100vw-1.5rem))] bg-white rounded-3xl shadow-2xl border border-slate-100 z-[101] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                            <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center"><h3 className="font-bold text-slate-800">Notifikasi</h3>{unreadCount > 0 && <span className="text-[10px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-bold">{unreadCount} Baru</span>}</div>
                            <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                                {notifications.length > 0 ? notifications.map((notif) => (
                                    <button type="button" key={notif.id} onClick={() => handleNotifClick(notif)} className={`flex w-full items-start gap-4 rounded-2xl p-4 text-left hover:bg-indigo-50/50 transition ${notif.is_read ? 'opacity-60 bg-white' : 'bg-indigo-50/30 border border-indigo-100'}`}>
                                        <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${notif.is_read ? 'bg-slate-300' : 'bg-indigo-500'}`}></div>
                                        <div><h4 className={`text-sm ${notif.is_read ? 'font-medium text-slate-600' : 'font-bold text-slate-800'}`}>{notif.title}</h4><p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{notif.message}</p><p className="text-[10px] text-slate-400 mt-2">{new Date(notif.created_at).toLocaleString('id-ID')}</p></div>
                                    </button>
                                )) : <div className="p-8 text-center text-slate-400 text-sm">Belum ada notifikasi.</div>}
                            </div>
                        </div>
                     </>
                 )}
             </div>

             {/* Profile */}
             <div className="flex items-center gap-2 sm:gap-4 pl-2 sm:pl-6 border-l border-slate-200 h-8 cursor-pointer group">
                 <div className="text-right hidden sm:block"><p className="text-sm font-bold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">{userData ? userData.name : "Memuat..."}</p><p className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full inline-block mt-1">Pengajar Aktif</p></div>
                 <div className="relative"><div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 border-2 border-white shadow-lg ring-2 ring-indigo-50 group-hover:ring-indigo-200 transition-all flex items-center justify-center overflow-hidden">{userData?.photo ? <img src={userData.photo} className="w-full h-full object-cover"/> : <span className="font-bold text-sm">{userData?.name?.charAt(0)}</span>}</div></div>
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 pb-24 sm:p-6 sm:pb-24 xl:p-10 xl:pb-10 scroll-smooth">
          <div className="max-w-7xl mx-auto pb-10">{children}</div>
        </div>
        <MobileBottomNav role="teacher" />

        {/* --- [FIXED] MODAL DETAIL NOTIFIKASI GURU --- */}
        {selectedNotif && (
            <div role="dialog" aria-modal="true" aria-label="Detail notifikasi" className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                {/* [PERBAIKAN] 
                    1. flex flex-col: Agar children (header, content, footer) tertata vertikal
                    2. max-h-[90vh]: Batasi tinggi modal agar tidak melebihi layar
                */}
                <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100/50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                    
                    {/* Header: Fixed (Shrink-0) */}
                    <div className="relative z-10 p-5 sm:p-8 pb-4 shrink-0 bg-white">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                                <MessageSquare size={28}/>
                            </div>
                            <button aria-label="Tutup notifikasi" onClick={() => setSelectedNotif(null)} className="p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-rose-50 hover:text-rose-500 transition"><X size={20}/></button>
                        </div>

                        <div>
                            <h3 className="text-2xl font-black text-slate-900 leading-tight">{selectedNotif.title}</h3>
                            <div className="flex items-center gap-2 mt-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                                <span>Dari Admin</span><span>•</span><span>{new Date(selectedNotif.created_at).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}</span>
                            </div>
                        </div>
                    </div>

                    {/* Content: Scrollable (Overflow-y-auto) */}
                    <div className="relative z-10 px-5 sm:px-8 overflow-y-auto custom-scrollbar">
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-slate-600 leading-relaxed text-sm whitespace-pre-wrap">
                            {selectedNotif.message}
                        </div>
                    </div>

                    {/* Footer: Fixed (Shrink-0) */}
                    <div className="relative z-10 p-5 sm:p-8 pt-6 shrink-0 bg-white">
                        <button onClick={() => setSelectedNotif(null)} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all">Tutup Pesan</button>
                    </div>
                </div>
                
                {/* Scrollbar Style */}
                <style>{`
                    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                `}</style>
            </div>
        )}

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
          ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 translate-x-1' 
          : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'
      }`}
    >
      <div className="flex items-center gap-3.5">
        <Icon 
            size={20} 
            className={`${active ? 'text-indigo-100' : 'text-slate-400 group-hover:text-indigo-500'} transition-colors duration-300`} 
            strokeWidth={active ? 2.5 : 2}
        />
        <span>{label}</span>
      </div>
      {active && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm animate-pulse"></div>}
    </Link>
  );
}
