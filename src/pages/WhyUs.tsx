import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { 
  User, Users, Sparkles, Target, 
  ShieldCheck, Brain, TrendingUp, Lightbulb, Zap, Rocket 
} from "lucide-react";
import Reveal from "@/components/Reveal"; // Import Reveal

export default function WhyUs() {
  return (
    <div className="min-h-screen bg-white selection:bg-orange-100 selection:text-orange-900 overflow-x-hidden">
      <Navbar />
      
      <main className="pt-20">
        
        {/* =========================================
            SECTION 1: THE BIG QUESTION (HERO)
           ========================================= */}
        <section className="relative py-32 px-6 flex flex-col items-center text-center">
            {/* Background Atmosphere */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[10%] left-[50%] -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-b from-orange-50/50 to-white rounded-full blur-[120px]"></div>
            </div>

            <div className="relative z-10 max-w-4xl space-y-10 flex flex-col items-center">
                
                <Reveal delay={0.1} direction="down">
                    <div className="inline-flex">
                        <span className="px-5 py-2 rounded-full bg-slate-50 text-slate-800 text-xs font-black uppercase tracking-[0.2em] border border-slate-200">
                            The Philosophy
                        </span>
                    </div>
                </Reveal>
                
                <Reveal delay={0.2}>
                    <h1 className="text-5xl md:text-8xl font-black text-slate-900 tracking-tighter leading-[0.9]">
                        Kenapa Kita <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-500">
                            Harus Belajar?
                        </span>
                    </h1>
                </Reveal>
                
                <Reveal delay={0.3} width="100%">
                    <p className="text-xl md:text-2xl text-slate-500 max-w-3xl mx-auto leading-relaxed font-medium">
                        Dunia tidak menunggu orang yang berhenti berkembang. Belajar bukan sekadar mengejar nilai di atas kertas, tapi tentang <span className="text-slate-900 font-bold">melatih pola pikir</span>, memperluas perspektif, dan mempersiapkan diri menghadapi masa depan yang tidak tertebak.
                    </p>
                </Reveal>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 w-full">
                    <Reveal delay={0.4} direction="up" width="100%">
                        <div className="flex flex-col items-center space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center"><Zap size={24}/></div>
                            <h4 className="font-bold text-slate-900">Adaptasi</h4>
                            <p className="text-sm text-slate-500">Bertahan di era yang cepat berubah.</p>
                        </div>
                    </Reveal>
                    
                    <Reveal delay={0.5} direction="up" width="100%">
                        <div className="flex flex-col items-center space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center"><Rocket size={24}/></div>
                            <h4 className="font-bold text-slate-900">Inovasi</h4>
                            <p className="text-sm text-slate-500">Menciptakan solusi baru.</p>
                        </div>
                    </Reveal>

                    <Reveal delay={0.6} direction="up" width="100%">
                        <div className="flex flex-col items-center space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Lightbulb size={24}/></div>
                            <h4 className="font-bold text-slate-900">Wawasan</h4>
                            <p className="text-sm text-slate-500">Melihat dunia lebih luas.</p>
                        </div>
                    </Reveal>
                </div>
            </div>
        </section>

        {/* =========================================
            SECTION 2: DEFINING THE METHODS
           ========================================= */}
        <section className="py-24 px-6 relative z-10 bg-slate-50">
            <div className="max-w-6xl mx-auto space-y-48"> 
                
                {/* --- DEFINISI PRIVAT --- */}
                <div className="relative group flex flex-col md:flex-row items-center gap-16">
                    {/* Visual / Icon Side */}
                    <div className="flex-1 relative order-2 md:order-1">
                        <Reveal direction="right" width="100%">
                            <div className="absolute inset-0 bg-orange-200 rounded-full blur-[100px] opacity-20 group-hover:opacity-40 transition-opacity"></div>
                            <User size={300} strokeWidth={0.5} className="text-orange-900/10 relative z-10 mx-auto" />
                        </Reveal>
                    </div>
                    
                    {/* Text Side */}
                    <div className="flex-1 relative z-10 order-1 md:order-2">
                        <Reveal direction="left" delay={0.2}>
                            <span className="text-orange-600 font-black text-sm uppercase tracking-widest mb-4 block">Metode 01</span>
                            <h2 className="text-5xl md:text-7xl font-black text-slate-900 mb-8 leading-none">
                                Kelas Privat.
                            </h2>
                            <div className="w-24 h-1 bg-orange-500 mb-8"></div>
                            
                            <h3 className="text-2xl font-bold text-slate-800 mb-4">Apa itu Privat?</h3>
                            <p className="text-lg text-slate-600 leading-relaxed font-medium mb-6">
                                Privat adalah metode belajar <strong>1-on-1</strong>. Kamu menjadi satu-satunya fokus tutor dan dapat bertanya sesuai kebutuhan tanpa peserta lain.
                            </p>

                            <h3 className="text-2xl font-bold text-slate-800 mb-4">Kenapa Memilih Privat?</h3>
                            <ul className="space-y-3 text-slate-600 font-medium">
                                <li className="flex gap-3"><span className="text-orange-500">•</span> Kecepatan belajar menyesuaikan daya tangkapmu.</li>
                                <li className="flex gap-3"><span className="text-orange-500">•</span> Materi bisa *request* khusus (misal: cuma bahas Bab Trigonometri).</li>
                                <li className="flex gap-3"><span className="text-orange-500">•</span> Tanggal dan jam dipilih sejak awal, lalu sistem hanya mencari tutor dengan slot yang cocok.</li>
                            </ul>
                        </Reveal>
                    </div>
                </div>

                {/* --- DEFINISI GRUP --- */}
                <div className="relative group flex flex-col md:flex-row-reverse items-center gap-16">
                    {/* Visual / Icon Side */}
                    <div className="flex-1 relative">
                        <Reveal direction="left" width="100%">
                            <div className="absolute inset-0 bg-indigo-200 rounded-full blur-[100px] opacity-20 group-hover:opacity-40 transition-opacity"></div>
                            <Users size={300} strokeWidth={0.5} className="text-indigo-900/10 relative z-10 mx-auto" />
                        </Reveal>
                    </div>
                    
                    {/* Text Side */}
                    <div className="flex-1 relative z-10">
                        <Reveal direction="right" delay={0.2}>
                            <span className="text-indigo-600 font-black text-sm uppercase tracking-widest mb-4 block">Metode 02</span>
                            <h2 className="text-5xl md:text-7xl font-black text-slate-900 mb-8 leading-none">
                                Kelas Grup.
                            </h2>
                            <div className="w-24 h-1 bg-indigo-500 mb-8"></div>
                            
                            <h3 className="text-2xl font-bold text-slate-800 mb-4">Apa itu Grup?</h3>
                            <p className="text-lg text-slate-600 leading-relaxed font-medium mb-6">
                                Sistem mempertemukan murid dengan materi, jenjang, dan jadwal yang sama. Jumlah minimum dan maksimum peserta ditentukan admin, sehingga kapasitas dapat disesuaikan tanpa mengubah alur pemesanan.
                            </p>

                            <h3 className="text-2xl font-bold text-slate-800 mb-4">Kenapa Memilih Grup?</h3>
                            <ul className="space-y-3 text-slate-600 font-medium">
                                <li className="flex gap-3"><span className="text-indigo-500">•</span> Tarif peserta terlihat sebelum pembayaran dan ditentukan admin.</li>
                                <li className="flex gap-3"><span className="text-indigo-500">•</span> Suasana belajar lebih hidup dan kompetitif.</li>
                                <li className="flex gap-3"><span className="text-indigo-500">•</span> Jika kuota tidak terpenuhi, murid dapat beralih ke privat atau membatalkan.</li>
                            </ul>
                        </Reveal>
                    </div>
                </div>

            </div>
        </section>

        {/* =========================================
            SECTION 3: THE ECOSYSTEM (BENEFITS)
           ========================================= */}
        <section className="py-32 px-6 bg-white relative overflow-hidden">
             {/* Decorative Number */}
             <div className="absolute -right-20 top-40 text-[400px] font-black text-slate-50 opacity-50 select-none pointer-events-none leading-none">
                03
             </div>

            <div className="max-w-7xl mx-auto relative z-10">
                <Reveal delay={0.1}>
                    <div className="mb-24">
                        <h2 className="text-5xl font-black text-slate-900 leading-tight">
                            Lebih Dari Sekadar <br/>Tempat Les Biasa.
                        </h2>
                        <p className="text-xl text-slate-500 mt-6 max-w-2xl">
                            Kami membangun ekosistem pendukung agar kamu bisa fokus belajar tanpa pusing memikirkan hal teknis.
                        </p>
                    </div>
                </Reveal>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                    
                    {/* BENEFIT 1 */}
                    <Reveal delay={0.2} width="100%">
                        <div className="space-y-6 group">
                            <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center shadow-sm group-hover:shadow-xl group-hover:scale-110 transition-all duration-500">
                                <ShieldCheck size={32} className="text-emerald-600" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900">Tutor Terverifikasi</h3>
                            <p className="text-slate-500 leading-relaxed">
                                Admin memeriksa kartu identitas, foto wajah langsung, bukti kualifikasi, satu mata pelajaran utama, dan jenjang yang diajar sebelum akun tutor aktif.
                            </p>
                        </div>
                    </Reveal>

                    {/* BENEFIT 2 */}
                    <Reveal delay={0.3} width="100%">
                        <div className="space-y-6 group">
                            <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center shadow-sm group-hover:shadow-xl group-hover:scale-110 transition-all duration-500">
                                <Brain size={32} className="text-rose-600" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900">Materi Lebih Spesifik</h3>
                            <p className="text-slate-500 leading-relaxed">
                                Murid dapat memilih kelas, bab, submateri, tujuan belajar, menulis catatan, dan mengunggah bahan agar tutor memahami kebutuhan sebelum menerima sesi.
                            </p>
                        </div>
                    </Reveal>

                    {/* BENEFIT 3 */}
                    <Reveal delay={0.4} width="100%">
                        <div className="space-y-6 group">
                            <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center shadow-sm group-hover:shadow-xl group-hover:scale-110 transition-all duration-500">
                                <TrendingUp size={32} className="text-blue-600" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900">Status Dapat Dilacak</h3>
                            <p className="text-slate-500 leading-relaxed">
                                Pencarian, keputusan tutor, pembayaran, pelaksanaan, keberatan, refund, dan penyelesaian memiliki status yang dapat dilihat dari dashboard.
                            </p>
                        </div>
                    </Reveal>
                    
                    {/* BENEFIT 4 */}
                    <Reveal delay={0.5} width="100%">
                        <div className="space-y-6 group">
                            <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center shadow-sm group-hover:shadow-xl group-hover:scale-110 transition-all duration-500">
                                <Zap size={32} className="text-yellow-500" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900">Modern Dashboard</h3>
                            <p className="text-slate-500 leading-relaxed">
                                Akses materi permintaan, jadwal, tautan kelas online, transaksi, bukti pelaksanaan, dan pusat bantuan dari dashboard sesuai peran.
                            </p>
                        </div>
                    </Reveal>

                     {/* BENEFIT 5 */}
                     <Reveal delay={0.6} width="100%">
                        <div className="space-y-6 group">
                            <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center shadow-sm group-hover:shadow-xl group-hover:scale-110 transition-all duration-500">
                                <Sparkles size={32} className="text-purple-600" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900">Online atau Offline</h3>
                            <p className="text-slate-500 leading-relaxed">
                                Pilih sesi online melalui tautan pertemuan atau sesi offline dengan tutor yang datang ke alamat murid dalam radius pencarian.
                            </p>
                        </div>
                    </Reveal>

                </div>
            </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
