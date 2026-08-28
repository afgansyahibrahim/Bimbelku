import { lazy, Suspense, useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";

const SubjectsSection = lazy(() => import("@/components/SubjectsSection"));
const HowItWorksSection = lazy(() => import("@/components/HowItWorksSection"));
const FeaturesSection = lazy(() => import("@/components/FeaturesSection"));
const PackagePreviewSection = lazy(() => import("@/components/PackagePreviewSection"));
const DashboardPreviewSection = lazy(() => import("@/components/DashboardPreviewSection"));
const CTASection = lazy(() => import("@/components/CTASection"));
const Footer = lazy(() => import("@/components/Footer"));

const SectionLoader = () => (
  <div className="my-8 flex h-[360px] w-full items-center justify-center bg-slate-50/60" role="status" aria-label="Memuat konten">
    <div className="flex flex-col items-center gap-2 opacity-60">
      <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-orange-500" />
      <span className="text-xs font-bold text-slate-400">Memuat konten...</span>
    </div>
  </div>
);

interface DeferredSectionProps {
  children: React.ReactNode;
  minHeight: number;
  rootMargin?: string;
}

const DeferredSection = ({ children, minHeight, rootMargin = "300px 0px" }: DeferredSectionProps) => {
  const markerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;
    const marker = markerRef.current;
    if (!marker || !("IntersectionObserver" in window)) {
      setReady(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setReady(true);
        observer.disconnect();
      },
      { rootMargin },
    );

    observer.observe(marker);
    return () => observer.disconnect();
  }, [ready, rootMargin]);

  return (
    <div ref={markerRef} style={ready ? undefined : { minHeight }} aria-hidden={ready ? undefined : true}>
      {ready ? children : null}
    </div>
  );
};

const Index = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main>
      <HeroSection />

      <DeferredSection minHeight={560}>
        <Suspense fallback={<SectionLoader />}><HowItWorksSection /></Suspense>
      </DeferredSection>

      <DeferredSection minHeight={560}>
        <Suspense fallback={<SectionLoader />}><FeaturesSection /></Suspense>
      </DeferredSection>

      <DeferredSection minHeight={560}>
        <Suspense fallback={<SectionLoader />}><SubjectsSection /></Suspense>
      </DeferredSection>

      {/* Dua preview produk lama tetap dipertahankan agar tidak ada capability landing yang hilang. */}
      <DeferredSection minHeight={620}>
        <Suspense fallback={<SectionLoader />}><PackagePreviewSection /></Suspense>
      </DeferredSection>

      <DeferredSection minHeight={560}>
        <Suspense fallback={<SectionLoader />}><DashboardPreviewSection /></Suspense>
      </DeferredSection>

      <DeferredSection minHeight={420}>
        <Suspense fallback={<SectionLoader />}><CTASection /></Suspense>
      </DeferredSection>
    </main>

    <DeferredSection minHeight={420} rootMargin="600px 0px">
      <Suspense fallback={<div className="h-32 animate-pulse bg-slate-100" />}><Footer /></Suspense>
    </DeferredSection>
  </div>
);

export default Index;
