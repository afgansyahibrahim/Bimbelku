import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  BadgeDollarSign,
  Bell,
  BookOpen,
  Coins,
  CreditCard,
  FileCheck,
  Gavel,
  Globe,
  Image,
  Layers3,
  LayoutDashboard,
  LibraryBig,
  Menu,
  MessageSquare,
  MoreHorizontal,
  NotebookPen,
  PieChart,
  QrCode,
  RotateCcw,
  SearchCheck,
  ScrollText,
  Tags,
  Users,
  X,
} from "lucide-react";
import LogoutButton from "@/components/LogoutButton";
import { ADMIN_PERMISSIONS, canAdmin } from "@/lib/adminPermissions";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

type NavigationItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  permission: string;
};

type NavigationSection = {
  label: string;
  items: NavigationItem[];
};

const navigation: NavigationSection[] = [
  {
    label: "Pusat operasional",
    items: [
      { to: "/admin", label: "Ringkasan kerja", icon: LayoutDashboard, exact: true, permission: ADMIN_PERMISSIONS.OPERATIONS_DASHBOARD },
      { to: "/admin/tutor-searches", label: "Pencarian tutor", icon: SearchCheck, permission: ADMIN_PERMISSIONS.MATCHING_MANAGE },
      { to: "/admin/classes", label: "Monitoring kelas", icon: BookOpen, permission: ADMIN_PERMISSIONS.CLASSES_MANAGE },
      { to: "/admin/cases", label: "Pusat kasus", icon: Gavel, permission: ADMIN_PERMISSIONS.CASES_MANAGE },
    ],
  },
  {
    label: "Transaksi dan dana",
    items: [
      { to: "/admin/pembayaran", label: "Pembayaran murid", icon: CreditCard, permission: ADMIN_PERMISSIONS.FINANCE_PAYMENTS },
      { to: "/admin/finance", label: "Pencairan tutor", icon: BadgeDollarSign, permission: ADMIN_PERMISSIONS.FINANCE_PAYOUTS },
      { to: "/admin/refunds", label: "Refund & saldo", icon: RotateCcw, permission: ADMIN_PERMISSIONS.FINANCE_REFUNDS },
      { to: "/admin/settings-payment", label: "Rekening penerimaan", icon: QrCode, permission: ADMIN_PERMISSIONS.FINANCE_PAYMENTS },
    ],
  },
  {
    label: "Tutor dan pengguna",
    items: [
      { to: "/admin/guru", label: "Verifikasi tutor", icon: FileCheck, permission: ADMIN_PERMISSIONS.TEACHERS_MANAGE },
      { to: "/admin/users", label: "Data pengguna", icon: Users, permission: ADMIN_PERMISSIONS.USERS_MANAGE },
      { to: "/admin/pesan", label: "Pesan bantuan", icon: MessageSquare, permission: ADMIN_PERMISSIONS.SUPPORT_MANAGE },
      { to: "/admin/notifikasi", label: "Kirim notifikasi", icon: Bell, permission: ADMIN_PERMISSIONS.SUPPORT_MANAGE },
    ],
  },
  {
    label: "Katalog dan konten",
    items: [
      { to: "/admin/subjects", label: "Mata pelajaran", icon: LibraryBig, permission: ADMIN_PERMISSIONS.CONTENT_MANAGE },
      { to: "/admin/learning-topics", label: "Materi kurikulum", icon: Layers3, permission: ADMIN_PERMISSIONS.CONTENT_MANAGE },
      { to: "/admin/hourly-rates", label: "Harga per sesi", icon: Coins, permission: ADMIN_PERMISSIONS.CONTENT_MANAGE },
      { to: "/admin/stage-five", label: "Paket, promo, dan konten", icon: Tags, permission: ADMIN_PERMISSIONS.CONTENT_MANAGE },
    ],
  },
  {
    label: "Pengaturan",
    items: [
      { to: "/admin/ratings", label: "Moderasi ulasan", icon: PieChart, permission: ADMIN_PERMISSIONS.CLASSES_MANAGE },
      { to: "/admin/settings-display", label: "Tampilan tutor", icon: Image, permission: ADMIN_PERMISSIONS.SETTINGS_MANAGE },
      { to: "/admin/notes", label: "Catatan admin", icon: NotebookPen, permission: ADMIN_PERMISSIONS.SETTINGS_MANAGE },
      { to: "/admin/settings-footer", label: "Footer website", icon: Globe, permission: ADMIN_PERMISSIONS.SETTINGS_MANAGE },
    ],
  },
  {
    label: "Keamanan dan pengawasan",
    items: [
      { to: "/admin/audit-log", label: "Audit perubahan", icon: ScrollText, permission: ADMIN_PERMISSIONS.AUDIT_VIEW },
    ],
  },
];

const readAdmin = () => {
  try {
    const value = JSON.parse(localStorage.getItem("user") || "null") as { name?: string; email?: string; role?: string; admin_type?: string | null; admin_permissions?: string[] } | null;
    return {
      name: value?.name || "Administrator",
      email: value?.email || "Admin BimbelKu",
      role: value?.role || "admin",
      admin_type: value?.admin_type,
      admin_permissions: value?.admin_permissions,
    };
  } catch {
    return { name: "Administrator", email: "Admin BimbelKu", role: "admin", admin_type: null, admin_permissions: undefined };
  }
};

export default function AdminLayout({ children, title, subtitle = "Pusat operasional BimbelKu" }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const admin = useMemo(readAdmin, []);
  const visibleNavigation = useMemo(
    () => navigation
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => canAdmin(admin, item.permission)),
      }))
      .filter((section) => section.items.length > 0),
    [admin],
  );
  const mobileNavigation = useMemo(() => {
    const preferredPaths = ["/admin", "/admin/guru", "/admin/pembayaran", "/admin/pesan"];
    const availableItems = visibleNavigation.flatMap((section) => section.items);
    return preferredPaths
      .map((path) => availableItems.find((item) => item.to === path))
      .filter((item): item is NavigationItem => Boolean(item));
  }, [visibleNavigation]);
  const adminLabel = "Admin utama";
  const initials = admin.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "AD";

  const isActive = (item: NavigationItem) => {
    if (item.exact) return location.pathname === item.to;
    return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
  };

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, location.search]);

  return (
    <div className="flex h-dvh w-full max-w-full overflow-hidden bg-slate-50 font-sans text-slate-800">
      <a href="#main-content" className="skip-link">Lewati ke konten utama</a>
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Tutup menu admin"
          className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm xl:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(19rem,90vw)] flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 xl:static xl:translate-x-0 xl:shadow-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-5 sm:px-6">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-950 text-lg font-black text-white shadow-lg shadow-slate-300">
            B
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-black tracking-tight text-slate-950">BimbelKu Admin</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-600">Pusat operasional</p>
          </div>
          <button
            type="button"
            aria-label="Tutup menu"
            className="ml-auto grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 xl:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={21} />
          </button>
        </div>

        <nav className="custom-scrollbar flex-1 space-y-7 overflow-y-auto px-4 py-5">
          {visibleNavigation.map((section) => (
            <div key={section.label}>
              <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                {section.label}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavItem key={item.to} item={item} active={isActive(item)} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className="mb-3 flex min-w-0 items-center gap-3 rounded-2xl bg-slate-50 p-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-xs font-black text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-900">{admin.name}</p>
              <p className="truncate text-xs text-slate-500">{admin.email}</p>
              <p className="mt-0.5 text-[10px] font-black uppercase tracking-wider text-orange-600">{adminLabel}</p>
            </div>
          </div>
          <LogoutButton accent="admin" />
        </div>
      </aside>

      <main id="main-content" tabIndex={-1} className="relative flex min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden">
        <header className="z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 px-3 backdrop-blur-xl sm:h-20 sm:px-6 xl:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Buka menu admin"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 xl:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={21} />
            </button>
            <div className="min-w-0">
              <p className="truncate text-base font-black text-slate-950 sm:text-lg">{title}</p>
              <p className="hidden truncate text-xs font-medium text-slate-500 sm:block">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-[11px] font-black text-emerald-700 sm:px-4">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="hidden sm:inline">Sistem aktif</span>
            <span className="sm:hidden">Aktif</span>
          </div>
        </header>

        <div className="flex-1 overflow-x-hidden overflow-y-auto px-3 py-5 pb-[calc(6.75rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-7 sm:pb-[calc(6.75rem+env(safe-area-inset-bottom))] xl:px-8 xl:pb-7">
          <div className="mx-auto w-full min-w-0 max-w-[90rem] pb-12">{children}</div>
        </div>
        <AdminMobileBottomNav
          items={mobileNavigation}
          isActive={isActive}
          menuActive={!mobileNavigation.some((item) => isActive(item))}
          onOpenMenu={() => setSidebarOpen(true)}
        />
      </main>
    </div>
  );
}

function NavItem({ item, active }: { item: NavigationItem; active: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
        active
          ? "bg-slate-950 text-white shadow-lg shadow-slate-200"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
      }`}
    >
      <Icon
        size={19}
        className={active ? "text-orange-400" : "text-slate-400 transition group-hover:text-orange-500"}
        strokeWidth={active ? 2.5 : 2}
      />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {active && <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />}
    </Link>
  );
}

function AdminMobileBottomNav({
  items,
  isActive,
  menuActive,
  onOpenMenu,
}: {
  items: NavigationItem[];
  isActive: (item: NavigationItem) => boolean;
  menuActive: boolean;
  onOpenMenu: () => void;
}) {
  return (
    <nav
      aria-label="Navigasi utama admin"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.45rem)] pt-1.5 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl xl:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
        {items.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          const shortLabel = item.to === "/admin"
            ? "Beranda"
            : item.to === "/admin/guru"
              ? "Tutor"
              : item.to === "/admin/pembayaran"
                ? "Bayar"
                : item.to === "/admin/pesan"
                  ? "Pesan"
                  : item.label;

          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              className={`flex min-h-[3.6rem] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-bold transition ${
                active
                  ? "bg-orange-50 text-orange-600"
                  : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              }`}
            >
              <Icon size={19} strokeWidth={active ? 2.7 : 2} />
              <span className="max-w-full truncate">{shortLabel}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Buka semua menu admin"
          aria-pressed={menuActive}
          className={`flex min-h-[3.6rem] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-bold transition ${
            menuActive
              ? "bg-orange-50 text-orange-600"
              : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          }`}
        >
          <MoreHorizontal size={19} strokeWidth={menuActive ? 2.7 : 2} />
          <span className="max-w-full truncate">Menu</span>
        </button>
      </div>
    </nav>
  );
}
