import { lazy, Suspense, useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";

const FeaturesSection = lazy(() => import("@/components/FeaturesSection"));
const HowItWorksSection = lazy(() => import("@/components/HowItWorksSection"));
const SubjectsSection = lazy(() => import("@/components/SubjectsSection"));
const PackagePreviewSection = lazy(() => import("@/components/PackagePreviewSection"));
const DashboardPreviewSection = lazy(() => import("@/components/DashboardPreviewSection"));
const CTASection = lazy(() => import("@/components/CTASection"));
const Footer = lazy(() => import("@/components/Footer"));

const SectionLoader = () => (
  <div className="w-full h-[400px] bg-gray-50/50 animate-pulse flex items-center justify-center my-8">
    <div className="flex flex-col items-center gap-2 opacity-50">
      <div className="w-10 h-10 border-4 border-gray-300 border-t-orange-500 rounded-full animate-spin"></div>
      <span className="text-xs font-medium text-gray-400">Memuat Konten...</span>
    </div>
  </div>
);

interface DeferredSectionProps {
  children: React.ReactNode;
  minHeight: number;
  rootMargin?: string;
}

const DeferredSection = ({
  children,
  minHeight,
  rootMargin = "900px 0px",
}: DeferredSectionProps) => {
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
    <div
      ref={markerRef}
      style={ready ? undefined : { minHeight }}
      aria-hidden={ready ? undefined : true}
    >
      {ready ? children : null}
    </div>
  );
};

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar + hero tetap critical agar FCP yang sudah bagus tidak dikorbankan. */}
      <Navbar />
      <main>
        <HeroSection />

        <DeferredSection minHeight={560}>
          <Suspense fallback={<SectionLoader />}>
            <HowItWorksSection />
          </Suspense>
        </DeferredSection>

        <DeferredSection minHeight={620}>
          <Suspense fallback={<SectionLoader />}>
            <FeaturesSection />
          </Suspense>
        </DeferredSection>

        <DeferredSection minHeight={560}>
          <Suspense fallback={<SectionLoader />}>
            <SubjectsSection />
          </Suspense>
        </DeferredSection>

        <DeferredSection minHeight={620}>
          <Suspense fallback={<SectionLoader />}>
            <PackagePreviewSection />
          </Suspense>
        </DeferredSection>

        <DeferredSection minHeight={560}>
          <Suspense fallback={<SectionLoader />}>
            <DashboardPreviewSection />
          </Suspense>
        </DeferredSection>

        <DeferredSection minHeight={440}>
          <Suspense fallback={<SectionLoader />}>
            <CTASection />
          </Suspense>
        </DeferredSection>
      </main>

      <DeferredSection minHeight={420} rootMargin="1200px 0px">
        <Suspense fallback={<div className="h-32 bg-gray-100 animate-pulse" />}>
          <Footer />
        </Suspense>
      </DeferredSection>
    </div>
  );
};

export default Index;
