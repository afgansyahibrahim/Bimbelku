import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Mail, MapPin, Phone, GraduationCap } from "lucide-react"; // Hapus ArrowRight jika tidak dipakai
import Reveal from "@/components/Reveal"; // Import Reveal
import { getCached } from "@/lib/http";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [settings, setSettings] = useState<any>(null);
  const [socials, setSocials] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
        try {
            const [resSettings, resSocials] = await Promise.all([
              getCached("/settings/footer", { maxAgeMs: 5 * 60_000 }),
              getCached("/socials", { maxAgeMs: 5 * 60_000 }),
            ]);
            setSettings(resSettings.data);
            setSocials(resSocials.data);
        } catch {
            console.error("Gagal load footer");
        }
    };
    fetchData();
  }, []);

  const address = settings?.footer_address || "-";
  const phone = settings?.footer_phone || "-";
  const email = settings?.footer_email || "-";

  return (
    <footer className="bg-white border-t border-slate-100 font-sans relative overflow-hidden">
      
      {/* Dekorasi Background Halus */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-50/40 rounded-full blur-3xl -mr-40 -mt-40 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-50/40 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

      <div className="container mx-auto px-6 pt-20 pb-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-16">
          
          {/* KOLOM 1: BRAND & DESKRIPSI (Lebar 4 Kolom) */}
          <div className="lg:col-span-4 space-y-6">
            <Reveal delay={0.1} direction="up">
                <Link to="/" className="flex items-center gap-3 group w-fit">
                <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl text-white shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform duration-300">
                    <GraduationCap size={28} strokeWidth={2}/>
                </div>
                <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight">
                    BimbelKu
                </span>
                </Link>
            </Reveal>
            
            <Reveal delay={0.2} direction="up">
                <p className="text-slate-500 leading-relaxed text-sm pr-4">
                Platform belajar masa depan yang menghubungkan siswa dengan pengajar terbaik. Raih prestasi akademik maksimal bersama kami.
                </p>
            </Reveal>
            
            {/* SOCIAL MEDIA ICONS */}
            <Reveal delay={0.3} direction="up">
                <div className="flex items-center gap-3 pt-2 flex-wrap">
                {socials.length > 0 ? socials.map((item) => (
                    <a 
                        key={item.id} 
                        href={item.link} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 hover:bg-white hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-100 hover:-translate-y-1 transition-all duration-300 group"
                        title={item.name}
                    >
                        <img 
                            src={item.icon_url} 
                            alt={item.name} 
                            className="w-5 h-5 object-contain opacity-70 group-hover:opacity-100 transition-opacity"
                        />
                    </a>
                )) : (
                    <span className="text-xs text-slate-400 italic">Ikuti kami di media sosial</span>
                )}
                </div>
            </Reveal>
          </div>

          {/* KOLOM 2: TAUTAN CEPAT (Lebar 2 Kolom) */}
          <div className="lg:col-span-2 lg:pl-4">
            <Reveal delay={0.2} direction="up">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6 border-b-2 border-indigo-100 w-fit pb-1">Menu</h3>
                <ul className="space-y-3">
                <FooterLink to="/">Beranda</FooterLink>
                <FooterLink to="/search">Cari Bimbingan</FooterLink>
                <FooterLink to="/login">Masuk</FooterLink>
                <FooterLink to="/register">Daftar</FooterLink>
                </ul>
            </Reveal>
          </div>

          {/* KOLOM 3: MAPEL (Lebar 2 Kolom) */}
          <div className="lg:col-span-2">
            <Reveal delay={0.3} direction="up">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6 border-b-2 border-indigo-100 w-fit pb-1">Populer</h3>
                <ul className="space-y-3">
                <FooterLink to="/search?q=Matematika">Matematika</FooterLink>
                <FooterLink to="/search?q=Bahasa Inggris">B. Inggris</FooterLink>
                <FooterLink to="/search?q=Fisika">Fisika</FooterLink>
                <FooterLink to="/search?q=Kimia">Kimia</FooterLink>
                </ul>
            </Reveal>
          </div>

          {/* KOLOM 4: KONTAK (Lebar 4 Kolom) */}
          <div className="lg:col-span-4 lg:pl-8">
            <Reveal delay={0.4} direction="up">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6 border-b-2 border-indigo-100 w-fit pb-1">Hubungi Kami</h3>
                <ul className="space-y-5">
                <li className="flex items-start gap-4 group">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0 mt-0.5 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                        <MapPin size={18}/>
                    </div>
                    <span className="text-slate-600 text-sm leading-relaxed group-hover:text-slate-900 transition-colors">
                        {address}
                    </span>
                </li>
                <li className="flex items-center gap-4 group">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                        <Phone size={18}/>
                    </div>
                    <span className="text-slate-600 text-sm font-medium group-hover:text-slate-900 transition-colors">
                        {phone}
                    </span>
                </li>
                <li className="flex items-center gap-4 group">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                        <Mail size={18}/>
                    </div>
                    <span className="text-slate-600 text-sm font-medium group-hover:text-slate-900 transition-colors">
                        {email}
                    </span>
                </li>
                </ul>
            </Reveal>
          </div>

        </div>

        {/* BOTTOM COPYRIGHT */}
        <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <Reveal delay={0.5} direction="up" width="100%">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 w-full">
                <p className="text-slate-500 text-sm font-medium">
                    &copy; {currentYear} <span className="text-slate-800 font-bold">BimbelKu</span>. All rights reserved.
                </p>
                <div className="flex gap-6">
                    <Link to="/privacy" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">Kebijakan Privasi</Link>
                    <Link to="/terms" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">Syarat & Ketentuan</Link>
                </div>
              </div>
          </Reveal>
        </div>
      </div>
    </footer>
  );
};

// Helper Component untuk Link (Tidak perlu di-Reveal lagi karena sudah di dalam parent Reveal)
const FooterLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <li>
    <Link to={to} className="group flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors text-sm font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-indigo-500 transition-colors"></span>
      {children}
    </Link>
  </li>
);

export default Footer;
