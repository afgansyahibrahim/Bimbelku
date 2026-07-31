import { lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";

// --- LAZY LOAD SECTIONS (Below the fold) ---
// Komponen ini ada di bawah layar, jadi tidak perlu dimuat di detik pertama.
// Ini akan meringankan beban awal browser secara drastis.
const FeaturesSection = lazy(() => import("@/components/FeaturesSection"));
const TrustStrip = lazy(() => import("@/components/TrustStrip"));
const HowItWorksSection = lazy(() => import("@/components/HowItWorksSection"));
const SubjectsSection = lazy(() => import("@/components/SubjectsSection"));
const PackagePreviewSection = lazy(() => import("@/components/PackagePreviewSection"));
const DashboardPreviewSection = lazy(() => import("@/components/DashboardPreviewSection"));
const CTASection = lazy(() => import("@/components/CTASection"));
const Footer = lazy(() => import("@/components/Footer"));

// Komponen Loading Sementara (Placeholder)
// Fungsinya: Menjaga tempat agar halaman tidak "lompat" saat loading (Mencegah CLS Score buruk)
const SectionLoader = () => (
  <div className="w-full h-[400px] bg-gray-50/50 animate-pulse flex items-center justify-center my-8">
    <div className="flex flex-col items-center gap-2 opacity-50">
       <div className="w-10 h-10 border-4 border-gray-300 border-t-orange-500 rounded-full animate-spin"></div>
       <span className="text-xs font-medium text-gray-400">Memuat Konten...</span>
    </div>
  </div>
);

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      
      {/* 1. BAGIAN ATAS (CRITICAL PATH) - Harus Import Biasa */}
      <Navbar />
      <main>
        <HeroSection />

        {/* 2. BAGIAN BAWAH - Lazy Load dengan Suspense */}
        <Suspense fallback={<div className="h-20 bg-white" />}>
          <TrustStrip />
        </Suspense>

        <Suspense fallback={<SectionLoader />}>
          <HowItWorksSection />
        </Suspense>

        <Suspense fallback={<SectionLoader />}>
          <FeaturesSection />
        </Suspense>

        <Suspense fallback={<SectionLoader />}>
          <SubjectsSection />
        </Suspense>

        <Suspense fallback={<SectionLoader />}>
          <PackagePreviewSection />
        </Suspense>

        <Suspense fallback={<SectionLoader />}>
          <DashboardPreviewSection />
        </Suspense>

        <Suspense fallback={<SectionLoader />}>
          <CTASection />
        </Suspense>
      </main>

      {/* Footer paling aman di-lazy load karena user jarang langsung scroll ke paling bawah */}
      <Suspense fallback={<div className="h-32 bg-gray-100 animate-pulse" />}>
        <Footer />
      </Suspense>

    </div>
  );
};

export default Index;
