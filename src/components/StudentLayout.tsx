import { useCallback, useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import http, { getCached } from "@/lib/http"; 
import LogoutButton from "@/components/LogoutButton";
import MobileBottomNav from "@/components/MobileBottomNav";
import RoleQuickGuide from "@/components/RoleQuickGuide";
import {
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  HelpCircle,
  History,
  Info,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Search,
  Tag,
  User,
  X,
} from "lucide-react";

interface StudentLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function StudentLayout({ children, title }: StudentLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userData, setUserData] = useState<any>(null); 
  
  // --- STATE NOTIFIKASI ---
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  
  // [BARU] State untuk Modal Detail Notifikasi
  const [selectedNotif, setSelectedNotif] = useState<any>(null);
  
  const lastNotificationIdRef = useRef<number>(0);
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);

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

  // 1. Fetch User Data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (token) {
            const res = await getCached("/user", { maxAgeMs: 60_000 });
            setUserData(res.data);
        }
      } catch (e) { console.error("Gagal load user", e); }
    };
    fetchUser();
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

  // 2. Fetch Notifications (Polling)
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
                  
                  // Munculkan Custom Toast
                  toast.custom((t) => (
                    <div 
                        className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 p-4 flex gap-4 animate-in slide-in-from-top-5 duration-500 cursor-pointer pointer-events-auto hover:bg-slate-50 transition"
                        onClick={() => {
                            toast.dismiss(t);
                            handleNotifClick(latest); // Buka modal saat diklik
                        }}
                    >
                        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                            <Bell size={20} className="animate-bounce"/>
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-slate-800 text-sm">{latest.title}</h4>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{latest.message}</p>
                            <p className="text-[10px] text-blue-500 mt-2 font-bold">Ketuk untuk membaca</p>
                        </div>
                    </div>
                  ), { duration: 5000, position: 'top-center' });
              }
              lastNotificationIdRef.current = latest.id;
          }

      } catch (error) { console.error("Notif error", error); }
  }, [handleNotifClick]);

  useEffect(() => {
      fetchNotifications(false);
      const interval = setInterval(() => {
          if (document.visibilityState === "visible") void fetchNotifications(true);
      }, 60000);
      return () => clearInterval(interval);
  }, [fetchNotifications]);

  return (
    <div className="flex h-dvh min-h-screen overflow-hidden bg-[#F8FAFC] font-sans text-slate-800 selection:bg-blue-100 selection:text-blue-900">
      
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 xl:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* --- SIDEBAR --- */}
      <aside className={`fixed xl:static inset-y-0 left-0 z-40 w-[min(18rem,88vw)] shrink-0 bg-white border-r border-slate-100 transform transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'} shadow-2xl xl:shadow-none flex flex-col`}>
        {/* LOGO AREA */}
        <div className="h-24 flex items-center px-8">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 text-white transform rotate-3 hover:rotate-0 transition-all duration-300">
                  <span className="font-black text-xl">B</span>
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">BimbelKu</h1>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em] bg-blue-50 px-1.5 py-0.5 rounded mt-1 inline-block">Student</span>
                </div>
            </div>
            <button aria-label="Tutup menu" className="ml-auto rounded-xl bg-slate-50 p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 xl:hidden" onClick={() => setSidebarOpen(false)}>
              <X size={20} />
            </button>
        </div>

        <nav className="flex-1 px-5 space-y-8 overflow-y-auto custom-scrollbar py-6">
          <div>
              <p className="px-4 mb-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span> Menu Utama</p>
              <div className="space-y-1">
                  <NavItem to="/student/dashboard" icon={LayoutDashboard} label="Dashboard" active={isActive('/student/dashboard')} />
                  <NavItem to="/student/packages/new" icon={Search} label="Cari Les" active={isActive('/student/packages/new') || isActive('/student/find') || isActive('/search')} />
                  <NavItem to="/student/packages" icon={BookOpen} label="Kelas Saya" active={isActive('/student/packages')} />
                  <NavItem to="/student/vouchers" icon={Tag} label="Voucher" active={isActive('/student/vouchers') || isActive('/student/offers')} />
                  <NavItem to="/student/my-classes" icon={CalendarDays} label="Seluruh Sesi" active={isActive('/student/my-classes')} />
              </div>
          </div>
          <div>
              <p className="px-4 mb-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2"><span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span> Akun</p>
              <div className="space-y-1">
                  <NavItem to="/student/history" icon={History} label="Riwayat Transaksi" active={isActive('/student/history')} />
                  <NavItem to="/student/profile" icon={User} label="Profil Saya" active={isActive('/student/profile')} />
                  <NavItem to="/student/help" icon={HelpCircle} label="Bantuan & Support" active={isActive('/student/help')} />
              </div>
          </div>
        </nav>

        <div className="p-6 border-t border-slate-50">
          <LogoutButton accent="student" />
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/50 bg-white/80 px-3 backdrop-blur-xl transition-all sm:h-20 sm:px-6 xl:px-8">
          <div className="flex items-center gap-4">
            <button aria-label="Buka menu" className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm transition hover:bg-slate-50 xl:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <div><h1 className="text-xl font-black text-slate-800 tracking-tight hidden sm:block">{title}</h1></div>
          </div>
          
          <div className="flex items-center gap-5">
             <RoleQuickGuide role="student" />
             
             {/* DROPDOWN NOTIFIKASI */}
             <div className="relative">
                 <button 
                    onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                    aria-label={`Notifikasi${unreadCount ? `, ${unreadCount} belum dibaca` : ""}`}
                    aria-expanded={showNotifDropdown}
                    className="relative p-2.5 rounded-full text-slate-400 hover:bg-white hover:text-blue-600 hover:shadow-md transition-all duration-300 group"
                 >
                    <Bell size={20} className={unreadCount > 0 ? 'animate-swing' : ''} />
                    {unreadCount > 0 && (
                        <span className="absolute top-2.5 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse"></span>
                    )}
                 </button>

                 {showNotifDropdown && (
                     <>
                        <div className="fixed inset-0 z-[100]" onClick={() => setShowNotifDropdown(false)}></div>
                        <div className="absolute right-0 z-[101] mt-4 w-[min(24rem,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-2xl ring-1 ring-slate-100 animate-in fade-in zoom-in-95 duration-200">
                            
                            <div className="p-5 border-b border-slate-50 bg-white flex justify-between items-center sticky top-0 z-10">
                                <h3 className="font-bold text-slate-800 text-lg">Notifikasi</h3>
                                {unreadCount > 0 && <span className="text-[10px] bg-rose-50 text-rose-600 px-2.5 py-1 rounded-full font-bold border border-rose-100">{unreadCount} Baru</span>}
                            </div>
                            
                            <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                                {notifications.length > 0 ? notifications.map((notif) => (
                                    <button
                                        type="button"
                                        key={notif.id} 
                                        onClick={() => handleNotifClick(notif)} // BUKA MODAL
                                        className={`group flex w-full items-start gap-4 rounded-2xl p-4 text-left transition-all ${notif.is_read ? 'bg-white hover:bg-slate-50 opacity-60' : 'bg-blue-50/50 hover:bg-blue-50 border border-blue-100'}`}
                                    >
                                        <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${notif.is_read ? 'bg-slate-300' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]'}`}></div>
                                        <div>
                                            <h4 className={`text-sm ${notif.is_read ? 'font-medium text-slate-600' : 'font-bold text-slate-800'}`}>{notif.title}</h4>
                                            <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{notif.message}</p>
                                            <p className="text-[10px] text-slate-400 mt-2 font-medium flex items-center gap-1">
                                                {new Date(notif.created_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'})}
                                            </p>
                                        </div>
                                    </button>
                                )) : (
                                    <div className="py-12 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                                        <Bell size={32} className="opacity-20"/>
                                        <span>Belum ada notifikasi.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                     </>
                 )}
             </div>

             {/* Profile */}
             <div className="group flex h-8 cursor-pointer items-center gap-2 border-l border-slate-200 pl-3 sm:gap-4 sm:pl-6">
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">{userData ? userData.name : "Memuat..."}</p>
                    <p className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full inline-block mt-1">Siswa Aktif</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 p-[2px] shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                       {userData?.avatar_url || userData?.avatar ? (
                         <img
                           src={userData.avatar_url || userData.avatar}
                           alt={`Foto profil ${userData.name || "murid"}`}
                           className="w-full h-full object-cover"
                         />
                       ) : (
                         <div className="w-full h-full bg-slate-100 flex items-center justify-center font-bold text-indigo-600 text-sm">{userData?.name?.charAt(0)}</div>
                       )}
                    </div>
                </div>
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 pb-24 scroll-smooth sm:p-6 sm:pb-24 xl:p-8 xl:pb-8">
          <div className="max-w-7xl mx-auto pb-10">{children}</div>
        </div>
        <MobileBottomNav role="student" />
        <Link
          to="/student/my-classes"
          aria-label="Buka pesan kelas"
          title="Pesan kelas"
          className="fixed bottom-24 right-4 z-20 grid h-14 w-14 place-items-center rounded-full bg-slate-950 text-white shadow-xl transition hover:-translate-y-1 hover:bg-indigo-700 xl:bottom-7 xl:right-7"
        >
          <MessageSquare size={21} />
        </Link>

        {/* --- [FIXED] MODAL DETAIL NOTIFIKASI SISWA --- */}
        {selectedNotif && (
            <div role="dialog" aria-modal="true" aria-label="Detail notifikasi" className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                {/* [PERBAIKAN] 
                    1. flex flex-col: Agar children (header, content, footer) tertata vertikal
                    2. max-h-[90vh]: Batasi tinggi modal agar tidak melebihi layar
                */}
                <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                    
                    {/* Header: Fixed */}
                    <div className="relative z-10 shrink-0 bg-white p-5 pb-4 sm:p-8 sm:pb-4">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                                <MessageSquare size={28}/>
                            </div>
                            <button 
                                onClick={() => setSelectedNotif(null)} 
                                aria-label="Tutup notifikasi"
                                className="p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-rose-50 hover:text-rose-500 transition"
                            >
                                <X size={20}/>
                            </button>
                        </div>

                        <div>
                            <h3 className="text-2xl font-black text-slate-900 leading-tight">{selectedNotif.title}</h3>
                            <div className="flex items-center gap-2 mt-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                                <span>Dari Admin</span>
                                <span>•</span>
                                <span>{new Date(selectedNotif.created_at).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}</span>
                            </div>
                        </div>
                    </div>

                    {/* Content: Scrollable */}
                    <div className="relative z-10 overflow-y-auto px-5 custom-scrollbar sm:px-8">
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-slate-600 leading-relaxed text-sm whitespace-pre-wrap">
                            {selectedNotif.message}
                        </div>
                    </div>

                    {/* Footer: Fixed */}
                    <div className="relative z-10 shrink-0 bg-white p-5 pt-6 sm:p-8 sm:pt-6">
                        <button 
                            onClick={() => setSelectedNotif(null)} 
                            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:scale-105 active:scale-95 transition-all"
                        >
                            Tutup Pesan
                        </button>
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
    <Link to={to} aria-current={active ? "page" : undefined} className={`group relative flex items-center justify-between px-5 py-3.5 text-sm font-bold rounded-[1.2rem] transition-all duration-300 mb-1 ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30 translate-x-1' : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'}`}>
      <div className="flex items-center gap-3.5"><Icon size={20} className={`${active ? 'text-blue-200' : 'text-slate-400 group-hover:text-blue-500'} transition-colors duration-300`} strokeWidth={active ? 2.5 : 2}/><span>{label}</span></div>
      {active && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm animate-pulse"></div>}
    </Link>
  );
}
