import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CalendarClock, CreditCard, Radar, ShieldCheck } from "lucide-react";
import Reveal from "@/components/Reveal";

const HeroSection = () => {
  const navigate = useNavigate();
  const steps = [
    { icon: CalendarClock, label: "Pilih materi & jadwal" },
    { icon: Radar, label: "Radar mencari tutor" },
    { icon: CreditCard, label: "Bayar setelah cocok" },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-coral-dark py-20 md:py-32">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 h-64 w-64 rounded-full bg-background blur-3xl" />
        <div className="absolute bottom-20 right-10 h-80 w-80 rounded-full bg-background blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          
          {/* Badge */}
          <Reveal delay={0.1}>
            <div className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <ShieldCheck className="h-4 w-4 text-primary-foreground" />
              <span className="text-primary-foreground text-sm font-medium">
                Tutor terverifikasi · Pencocokan adil
              </span>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <h1 className="text-4xl md:text-6xl font-extrabold text-primary-foreground mb-6 leading-tight">
                Tentukan kebutuhanmu,
                <br />
                <span className="text-primary-foreground/90">biarkan radar mencari tutor</span>
            </h1>
          </Reveal>

          <Reveal delay={0.3}>
            <p className="text-lg md:text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
                Pilih materi, waktu, dan metode belajar. Sistem akan mencocokkan tutor yang tersedia tanpa katalog atau pilih-pilih profil.
            </p>
          </Reveal>

          <Reveal delay={0.4} width="100%">
            <Button
                type="button"
                size="xl"
                onClick={() => navigate("/search")}
                className="h-14 rounded-2xl bg-white px-8 font-bold text-primary shadow-xl hover:bg-white/90"
            >
                Mulai Cari Bimbingan
                <Radar className="ml-2 h-5 w-5" />
            </Button>
          </Reveal>

          <div className="mt-8 grid w-full max-w-3xl gap-2 sm:grid-cols-3">
            {steps.map(({ icon: Icon, label }, index) => (
              <Reveal key={label} delay={0.5 + index * 0.1} direction="up">
                <div className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-primary-foreground backdrop-blur-sm">
                  <Icon className="h-4 w-4" />
                  {label}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* Wave decoration */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            className="fill-background"
          />
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;
