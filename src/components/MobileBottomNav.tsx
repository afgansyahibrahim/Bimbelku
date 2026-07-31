import { Link, useLocation } from "react-router-dom";
import {
  Bell,
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  Home,
  MessageSquare,
  ShoppingBag,
  User,
} from "lucide-react";

type Role = "student" | "teacher";
type NavItem = {
  to: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
};

const studentItems: NavItem[] = [
  { to: "/student/dashboard", label: "Beranda", icon: Home, exact: true },
  { to: "/student/packages", label: "Pesanan Saya", icon: ShoppingBag },
  { to: "/student/my-classes", label: "Pesan", icon: MessageSquare },
  { to: "/student/dashboard", label: "Notifikasi", icon: Bell },
  { to: "/student/profile", label: "Saya", icon: User },
];

const teacherItems: NavItem[] = [
  { to: "/guru", label: "Beranda", icon: Home, exact: true },
  { to: "/guru/permintaan", label: "Permintaan", icon: ClipboardCheck },
  { to: "/guru/kelas", label: "Kelas", icon: BookOpen },
  { to: "/guru/jadwal", label: "Jadwal", icon: CalendarClock },
];

export default function MobileBottomNav({ role }: { role: Role }) {
  const location = useLocation();
  const items = role === "student" ? studentItems : teacherItems;
  const accent = role === "student" ? "text-blue-600" : "text-indigo-600";
  const activeBackground = role === "student" ? "bg-blue-50" : "bg-indigo-50";

  return (
    <nav
      aria-label={`Navigasi utama ${role === "student" ? "murid" : "tutor"}`}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.4rem)] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl xl:hidden"
    >
      <div className={`mx-auto grid max-w-lg gap-1 ${role === "student" ? "grid-cols-5" : "grid-cols-4"}`}>
        {items.map((item, index) => {
          // For student "Notifikasi" tab (index 3), mark active only when on dashboard AND no other tab is active
          // It redirects to dashboard so we don't want it to look active when dashboard is the real page
          const isNotificationTab = role === "student" && index === 3;
          const active = isNotificationTab
            ? false
            : item.exact
              ? location.pathname === item.to
              : location.pathname === item.to
                || location.pathname.startsWith(`${item.to}/`);
          const Icon = item.icon;

          return (
            <Link
              key={`${item.to}-${index}`}
              to={item.to}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-bold transition ${
                active
                  ? `${activeBackground} ${accent}`
                  : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              }`}
            >
              <Icon size={19} strokeWidth={active ? 2.7 : 2} />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
