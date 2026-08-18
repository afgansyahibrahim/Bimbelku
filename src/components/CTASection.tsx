import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import Reveal from "@/components/Reveal";
import RegistrationGuardLink from "@/components/RegistrationGuardLink";
import StudentPackageLink from "@/components/StudentPackageLink";

const studentBenefits = [
  { 
    title: "Tutor Terverifikasi",
    desc: "Identitas, foto wajah langsung, dan bukti kualifikasi diperiksa admin."
  },
  { 
    title: "Pencocokan Otomatis",
    desc: "Materi, jenjang, jadwal, mode belajar, performa, dan jarak diperiksa sistem."
  },
  { 
    title: "Harga Transparan", 
    desc: "Harga per sesi ditetapkan admin dan terlihat sebelum transfer dilakukan."
  },
  { 
    title: "Jadwal Sejak Awal",
    desc: "Murid memilih jam terlebih dahulu dan hanya tutor yang kosong yang dicocokkan."
  },
];

const CTASection = () => {
  return (
    <section className="py-24 relative overflow-hidden bg-[#0F172A]">
      
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] rounded-full bg-violet-700/30 blur-[120px] mix-blend-screen" />
        <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-orange-600/20 blur-[120px] mix-blend-screen" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-emerald-900/10 blur-[150px] mix-blend-overlay" />
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[length:32px_32px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            {/* --- Left Side: Main CTA --- */}
            <div className="text-center lg:text-left space-y-8">
              <div>
                <Reveal direction="right" delay={0.1}>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-white text-sm font-medium mb-6">
                        <Sparkles size={16} className="text-yellow-400 fill-yellow-400"/> 
                        <span>Belajar sesuai kebutuhanmu</span>
                    </div>
                </Reveal>
                
                <Reveal direction="right" delay={0.2}>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight mb-6">
                    Belajar lebih terarah bersama <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-300 to-violet-400">tutor yang sesuai</span>
                    </h2>
                </Reveal>

                <Reveal direction="right" delay={0.3}>
                    <p className="text-slate-300 text-lg md:text-xl max-w-xl mx-auto lg:mx-0 leading-relaxed">
                    Susun paket, pilih mapel, dan tentukan jadwal. Radar BimbelKu akan mencarikan tutor yang sesuai.
                    </p>
                </Reveal>
              </div>
              
              <Reveal direction="up" delay={0.4}>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                      <StudentPackageLink to="/student/packages/new">
                        <Button size="xl" className="w-full sm:w-auto rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-base shadow-xl shadow-white/10 transition-all hover-scale-105 active:scale-95 flex items-center gap-2">
                          Mulai Cari Tutor <ArrowRight className="h-5 w-5" />
                        </Button>
                      </StudentPackageLink>
                  </div>
              </Reveal>
            </div>

            {/* --- Right Side: Glassmorphism Card --- */}
            <Reveal direction="left" delay={0.5} width="100%">
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600 to-blue-500 blur-2xl opacity-20 rounded-[3rem] transform rotate-3 scale-105"></div>
                    
                    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative z-10 overflow-hidden group hover:border-white/20 transition-all duration-500">
                      
                      <div className="mb-8">
                          <h3 className="text-3xl font-black text-white mb-2">
                            Alur yang jelas
                          </h3>
                          <p className="text-slate-400">Kenapa harus belajar di BimbelKu?</p>
                      </div>

                      <ul className="space-y-5 mb-10">
                        {studentBenefits.map((benefit, index) => (
                          <Reveal key={index} delay={0.6 + (index * 0.1)} direction="left">
                            <li className="flex items-start gap-4 group/item">
                                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 flex items-center justify-center border border-white/10 group-hover/item:border-white/30 transition-colors">
                                    <Check className="h-5 w-5 text-emerald-400" strokeWidth={3} />
                                </div>
                                <div>
                                    <h4 className="text-white font-bold text-lg mb-1 group-hover/item:text-blue-300 transition-colors">{benefit.title}</h4>
                                    <span className="text-slate-400 text-sm leading-snug">{benefit.desc}</span>
                                </div>
                            </li>
                          </Reveal>
                        ))}
                      </ul>

                      <RegistrationGuardLink to="/register?role=student">
                        <Button size="lg" className="w-full h-14 text-base rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-lg shadow-blue-600/30 border-0 transition-all hover-scale-102 active:scale-[0.98]">
                          Buat Akun Siswa Gratis
                        </Button>
                      </RegistrationGuardLink>
                    </div>
                </div>
            </Reveal>

          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
