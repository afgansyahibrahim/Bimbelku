import { notify } from "@/lib/notify";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { BookOpenCheck, LayoutDashboard, LogOut, Menu, User, X } from "lucide-react";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import StudentPackageLink from "@/components/StudentPackageLink";

const readStoredUser = () => {
  const storedUser = localStorage.getItem("user");
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser);
  } catch {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    return null;
  }
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<any>(() => readStoredUser());
  const location = useLocation();
  const navigate = useNavigate();
  const confirm = useConfirmDialog();

  const isNavActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(`${href}/`);

  const navLinks = [
    { href: "/student/packages/new", label: "Cari Bimbingan", studentOnly: true },
    { href: "/why-us", label: "Kenapa BimbelKu?" },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname, location.search]);

  const handleLogout = async () => {
    const approved = await confirm({
      title: "Keluar dari akun?",
      description: "Sesi pada perangkat ini akan ditutup. Data yang sudah tersimpan tetap aman.",
      confirmText: "Ya, keluar",
      cancelText: "Tetap masuk",
      tone: "danger",
    });
    if (!approved) return;

    try {
      const { default: http } = await import("@/lib/http");
      await http.post("/logout");
    } catch {
      // Token lokal tetap dibersihkan jika sesi server sudah berakhir.
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
      setIsOpen(false);
      notify.success("Anda telah keluar dari akun.");
      navigate("/", { replace: true });
    }
  };

  const getDashboardLink = () => {
    if (!user) return "/login";
    if (user.role === "admin") return "/admin";
    if (user.role === "teacher") return "/guru";
    return "/student/dashboard";
  };

  return (
    <nav
      className={`sticky top-0 z-50 w-full border-b transition-[background-color,box-shadow,border-color] duration-300 ${
        scrolled
          ? "border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-xl"
          : "border-slate-200/60 bg-white/90 backdrop-blur-lg"
      }`}
    >
      <div className="container mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-[4.25rem] items-center justify-between gap-4">
          <Link
            to="/"
            className="group inline-flex shrink-0 items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="BimbelKu - halaman utama"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-sm transition-transform duration-300 group-hover:-rotate-2 group-hover:scale-105">
              <BookOpenCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">
              Bimbel<span className="text-primary">Ku</span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-1 md:flex">
            {navLinks.map((link) => {
              const className = `rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                isNavActive(link.href)
                  ? "bg-white text-primary shadow-sm"
                  : "text-slate-600 hover:bg-white/80 hover:text-slate-950"
              }`;
              return link.studentOnly ? (
                <StudentPackageLink key={link.href} to={link.href} className={className}>
                  {link.label}
                </StudentPackageLink>
              ) : (
                <Link key={link.href} to={link.href} className={className}>
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <>
                <div className="mr-1 flex items-center gap-2 rounded-xl px-2 py-1.5">
                  <div className="grid h-8 w-8 place-items-center rounded-full border border-orange-200 bg-orange-50 text-xs font-black text-orange-700">
                    {(user.name || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="max-w-28 leading-none">
                    <span className="block truncate text-xs font-black text-slate-900">{(user.name || "Pengguna").split(" ")[0]}</span>
                    <span className="mt-1 block text-[10px] font-semibold capitalize text-slate-500">{user.role}</span>
                  </div>
                </div>
                <Link to={getDashboardLink()}>
                  <Button size="sm" className="rounded-xl font-bold">
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="rounded-xl font-bold text-red-600 hover:bg-red-50 hover:text-red-700">
                  Keluar
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="rounded-xl font-bold">Masuk</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="rounded-xl px-4 font-black shadow-sm">Daftar Gratis</Button>
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 md:hidden"
            onClick={() => setIsOpen((value) => !value)}
            aria-label={isOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-slate-100 bg-white/98 shadow-xl backdrop-blur-xl md:hidden">
          <div className="container mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => {
                const className = `rounded-xl px-3 py-3 text-sm font-bold ${
                  isNavActive(link.href) ? "bg-orange-50 text-primary" : "text-slate-700 hover:bg-slate-50"
                }`;
                return link.studentOnly ? (
                  <StudentPackageLink key={link.href} to={link.href} className={className} onNavigate={() => setIsOpen(false)}>
                    {link.label}
                  </StudentPackageLink>
                ) : (
                  <Link key={link.href} to={link.href} className={className} onClick={() => setIsOpen(false)}>
                    {link.label}
                  </Link>
                );
              })}

              <div className="mt-2 border-t border-slate-100 pt-3">
                {user ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-orange-100 text-sm font-black text-orange-700">
                        {(user.name || "U").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900">{user.name || "Pengguna"}</p>
                        <p className="mt-0.5 text-xs font-semibold capitalize text-slate-500">{user.role}</p>
                      </div>
                    </div>
                    <Link to={getDashboardLink()} onClick={() => setIsOpen(false)}>
                      <Button className="w-full justify-start rounded-xl font-bold">
                        <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard Saya
                      </Button>
                    </Link>
                    <Button variant="ghost" onClick={handleLogout} className="w-full justify-start rounded-xl font-bold text-red-600 hover:bg-red-50">
                      <LogOut className="mr-2 h-4 w-4" /> Keluar
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Link to="/login" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" className="w-full justify-center rounded-xl font-bold">
                        <User className="mr-2 h-4 w-4" /> Masuk
                      </Button>
                    </Link>
                    <Link to="/register" onClick={() => setIsOpen(false)}>
                      <Button className="w-full rounded-xl font-black">Daftar Gratis</Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
