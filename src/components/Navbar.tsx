import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, User, LogOut, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import http from "@/lib/http";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const confirm = useConfirmDialog();

  const isNavActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(`${href}/`);

  const navLinks = [
    { href: "/search", label: "Cari Bimbingan" },
    { href: "/why-us", label: "Kenapa Harus Belajar?" },
  ];

  // 1. Cek User Login saat Website Dimuat
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return;

    try {
      setUser(JSON.parse(storedUser));
    } catch {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      setUser(null);
    }
  }, []);

  // 2. Fungsi Logout
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
      await http.post("/logout");
    } catch {
      // Token lokal tetap dibersihkan jika sesi server sudah berakhir.
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
      setIsOpen(false);
      toast.success("Anda telah keluar dari akun.");
      navigate("/", { replace: true });
    }
  };

  // 3. Helper Link Dashboard
  const getDashboardLink = () => {
    if (!user) return "/login";
    if (user.role === "admin") return "/admin";
    if (user.role === "teacher") return "/guru";
    return "/student/dashboard";
  };

  return (
    // Menggunakan style asli (transparan/blur) karena logo sudah aman (transparan)
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          
          {/* === LOGO === */}
          <Link to="/" className="flex items-center gap-3">
            <img 
              src="/bimbel_cerdas.png" 
              alt="Logo BimbelKu" 
              loading="eager"
              decoding="async"
              className="h-10 w-auto object-contain" 
            />
            <span className="text-xl font-bold text-foreground"></span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isNavActive(link.href) ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              // --- TAMPILAN SUDAH LOGIN ---
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 mr-2">
                   <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-xs border border-orange-200">
                      {user.name.charAt(0).toUpperCase()}
                   </div>
                   <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-900 leading-none">{user.name.split(" ")[0]}</span>
                      <span className="text-[10px] text-gray-500 capitalize leading-none mt-1">{user.role}</span>
                   </div>
                </div>

                <Link to={getDashboardLink()}>
                  <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-200">
                    <LayoutDashboard size={16} className="mr-2"/> Dashboard Saya
                  </Button>
                </Link>
                
                {/* [MODIFIKASI] Tombol Logout jadi Teks "Keluar" */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleLogout} 
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 font-bold"
                >
                   Keluar
                </Button>
              </div>
            ) : (
              // --- TAMPILAN TAMU ---
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Masuk
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Daftar Gratis</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t animate-fade-in">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    isNavActive(link.href) ? "text-primary" : "text-muted-foreground"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              
              <div className="flex flex-col gap-2 pt-4 border-t">
                {user ? (
                   // MOBILE: SUDAH LOGIN
                   <>
                      <div className="flex items-center gap-3 px-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-sm">{user.name}</span>
                      </div>
                      <Link to={getDashboardLink()} onClick={() => setIsOpen(false)}>
                        <Button className="w-full justify-start bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100">
                          <LayoutDashboard className="h-4 w-4 mr-2" /> Dashboard Saya
                        </Button>
                      </Link>
                      <Button variant="ghost" onClick={handleLogout} className="w-full justify-start text-red-600">
                         <LogOut className="h-4 w-4 mr-2" /> Keluar
                      </Button>
                   </>
                ) : (
                   // MOBILE: TAMU
                   <>
                    <Link to="/login" onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        <User className="h-4 w-4 mr-2" />
                        Masuk
                      </Button>
                    </Link>
                    <Link to="/register" onClick={() => setIsOpen(false)}>
                      <Button className="w-full">Daftar Gratis</Button>
                    </Link>
                   </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
