import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Mail, MapPin, Phone, GraduationCap } from "lucide-react"; // Hapus ArrowRight jika tidak dipakai
import Reveal from "@/components/Reveal"; // Import Reveal
import { getCached } from "@/lib/http";
import RegistrationGuardLink from "@/components/RegistrationGuardLink";
import StudentPackageLink from "@/components/StudentPackageLink";
import SocialLogo from "@/components/SocialLogo";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [settings, setSettings] = useState<any>(null);
  const [socials, setSocials] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async (force = false) => {
        try {
            const socialsVersion = sessionStorage.getItem("bimbelku:socials-version");
            const [resSettings, resSocials] = await Promise.all([
              getCached("/settings/footer", { maxAgeMs: 5 * 60_000 }),
              getCached("/socials", {
                maxAgeMs: 5 * 60_000,
                force,
                params: socialsVersion ? { v: socialsVersion } : undefined,
              }),
            ]);
            setSettings(resSettings.data);
            setSocials(resSocials.data);
        } catch {
            console.error("Gagal load footer");
        }
    };
    void fetchData();
    const refreshSocials = () => void fetchData(true);
    window.addEventListener("bimbelku:socials-changed", refreshSocials);
    return () => window.removeEventListener("bimbelku:socials-changed", refreshSocials);
  }, []);

  const address = settings?.footer_address || "-";
  const phone = settings?.footer_phone || "-";
  const email = settings?.footer_email || "-";
  const mapHref = address !== "-" ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;
  const phoneDigits = String(phone).replace(/\D/g, "");
  const whatsappNumber = phoneDigits.startsWith("0")
    ? `62${phoneDigits.slice(1)}`
    : phoneDigits.startsWith("8") ? `62${phoneDigits}` : phoneDigits;
  const whatsappHref = whatsappNumber.length >= 8 ? `https://wa.me/${whatsappNumber}` : null;
  const emailHref = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? `mailto:${email}` : null;

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
                <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl text-white shadow-lg shadow-indigo-200 group-hover-scale-105 transition-transform duration-300">
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
                        className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 hover:bg-white hover:border-indigo-200 hover-shadow-md hover:shadow-indigo-100 hover-rise transition-all duration-300 group"
                        title={item.name}
                    >
                        <SocialLogo
                            iconKey={item.icon_key}
                            iconUrl={item.icon_url}
                            className="h-5 w-5 shrink-0 object-contain text-slate-900 opacity-70 transition-opacity group-hover:opacity-100"
                        />
                        <span className="max-w-[12rem] truncate text-xs font-bold text-slate-700">{item.name}</span>
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
                <FooterLink to="/student/packages/new" protectStudentPackage>Cari Bimbingan</FooterLink>
                <FooterLink to="/login">Masuk</FooterLink>
                <FooterLink to="/register" protectRegistration>Daftar</FooterLink>
                </ul>
            </Reveal>
          </div>

          {/* KOLOM 3: MAPEL (Lebar 2 Kolom) */}
          <div className="lg:col-span-2">
            <Reveal delay={0.3} direction="up">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6 border-b-2 border-indigo-100 w-fit pb-1">Populer</h3>
                <ul className="space-y-3">
                <FooterLink to="/student/packages/new?subject_name=Matematika" protectStudentPackage>Matematika</FooterLink>
                <FooterLink to="/student/packages/new?subject_name=Bahasa%20Inggris" protectStudentPackage>B. Inggris</FooterLink>
                <FooterLink to="/student/packages/new?subject_name=Fisika" protectStudentPackage>Fisika</FooterLink>
                <FooterLink to="/student/packages/new?subject_name=Kimia" protectStudentPackage>Kimia</FooterLink>
                </ul>
            </Reveal>
          </div>

          {/* KOLOM 4: KONTAK (Lebar 4 Kolom) */}
          <div className="lg:col-span-4 lg:pl-8">
            <Reveal delay={0.4} direction="up">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6 border-b-2 border-indigo-100 w-fit pb-1">Hubungi Kami</h3>
                <ul className="space-y-5">
                <li>
                    <ContactFooterItem href={mapHref} external icon={<MapPin size={18}/>} label={`Buka lokasi ${address} di Google Maps`}>
                        {address}
                    </ContactFooterItem>
                </li>
                <li>
                    <ContactFooterItem href={whatsappHref} external icon={<Phone size={18}/>} label={`Hubungi ${phone} melalui WhatsApp`}>
                        {phone}
                    </ContactFooterItem>
                </li>
                <li>
                    <ContactFooterItem href={emailHref} icon={<Mail size={18}/>} label={`Kirim email ke ${email}`}>
                        {email}
                    </ContactFooterItem>
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
const FooterLink = ({
  to,
  children,
  protectRegistration = false,
  protectStudentPackage = false,
}: {
  to: string;
  children: React.ReactNode;
  protectRegistration?: boolean;
  protectStudentPackage?: boolean;
}) => {
  const content = <>
    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-indigo-500 transition-colors"></span>
    {children}
  </>;
  const className = "group flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors text-sm font-medium";

  return (
    <li>
      {protectRegistration ? (
        <RegistrationGuardLink to={to} className={className}>{content}</RegistrationGuardLink>
      ) : protectStudentPackage ? (
        <StudentPackageLink to={to} className={className}>{content}</StudentPackageLink>
      ) : (
        <Link to={to} className={className}>{content}</Link>
      )}
    </li>
  );
};

const ContactFooterItem = ({
  href,
  external = false,
  icon,
  label,
  children,
}: {
  href: string | null;
  external?: boolean;
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) => {
  const content = <>
    <span className="mt-0.5 shrink-0 rounded-lg bg-indigo-50 p-2 text-indigo-600 transition-colors duration-300 group-hover:bg-indigo-600 group-hover:text-white">{icon}</span>
    <span className="text-sm font-medium leading-relaxed text-slate-600 transition-colors group-hover:text-slate-900">{children}</span>
  </>;

  return href ? (
    <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} aria-label={label} className="group flex items-center gap-4 rounded-xl outline-none transition focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
      {content}
    </a>
  ) : <div className="flex items-center gap-4">{content}</div>;
};

export default Footer;
