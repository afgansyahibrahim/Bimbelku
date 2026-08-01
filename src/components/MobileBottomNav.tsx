import { Link, useLocation } from "react-router-dom";
import {
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  Home,
  MessageSquare,
  Search,
  User,
} from "lucide-react";

type Role = "student" | "teacher";
type NavItem = {
  to: string;
  label: string;
  icon: typeof Home;
  key: string;
  tour?: string;
};

const studentItems: NavItem[] = [
  { key: "home", to: "/student/dashboard", label: "Beranda", icon: Home, tour: "student-home" },
  { key: "search", to: "/student/packages/new", label: "Cari Les", icon: Search, tour: "student-cari-les" },
  { key: "classes", to: "/student/packages", label: "Kelas Saya", icon: BookOpen, tour: "student-kelas" },
  { key: "messages", to: "/student/messages", label: "Pesan", icon: MessageSquare, tour: "student-pesan" },
  { key: "account", to: "/student/account", label: "Saya", icon: User, tour: "student-saya" },
];

const teacherItems: NavItem[] = [
  { key: "home", to: "/guru", label: "Beranda", icon: Home },
  { key: "offers", to: "/guru/permintaan", label: "Permintaan", icon: ClipboardCheck },
  { key: "classes", to: "/guru/kelas", label: "Kelas", icon: BookOpen },
  { key: "schedule", to: "/guru/jadwal", label: "Jadwal", icon: CalendarClock },
];

export default function MobileBottomNav({ role }: { role: Role }) {
  const location = useLocation();
  const items = role === "student" ? studentItems : teacherItems;
  const accent = role === "student" ? "text-blue-600" : "text-indigo-600";
  const activeBackground = role === "student" ? "bg-blue-50" : "bg-indigo-50";
  const studentActive = (() => {
    const path = location.pathname;
    if (path === "/student/dashboard") return "home";
    if (path === "/student/packages/new") return "search";
    if (path === "/student/packages" || path.startsWith("/student/packages/") || path === "/student/my-classes" || path.startsWith("/student/my-classes/") || path === "/student/progress") return "classes";
    if (path === "/student/messages" || path.startsWith("/student/messages/")) return "messages";
    if (["/student/account", "/student/profile", "/student/history", "/student/vouchers", "/student/help"].some((route) => path === route || path.startsWith(`${route}/`))) return "account";
    return "";
  })();

  return (
    <nav
      aria-label={`Navigasi utama ${role === "student" ? "murid" : "tutor"}`}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.45rem)] pt-1.5 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl xl:hidden"
    >
      <div className={`mx-auto grid max-w-lg gap-1 ${role === "student" ? "grid-cols-5" : "grid-cols-4"}`}>
        {items.map((item, index) => {
          const active = role === "student"
            ? studentActive === item.key
            : location.pathname === item.to || (item.to !== "/guru" && location.pathname.startsWith(`${item.to}/`));
          const Icon = item.icon;

          return (
            <Link
              key={`${item.to}-${index}`}
              data-tour={item.tour}
              to={item.to}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              className={`flex min-h-[3.6rem] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-bold transition ${
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
