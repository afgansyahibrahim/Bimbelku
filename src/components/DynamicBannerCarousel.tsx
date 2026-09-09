import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";
import StudentPackageLink from "@/components/StudentPackageLink";

import caraMemesanTutorBanner from "@/assets/banners/cara-memesan-tutor.webp";
import { getCached } from "@/lib/http";

export type DynamicBanner = {
  id: number;
  title: string;
  description?: string | null;
  button_text?: string | null;
  image_url?: string | null;
  image_path?: string | null;
  destination_kind: "internal" | "external";
  destination_url: string;
};

const fallback: DynamicBanner[] = [
  {
    id: -1,
    title: "Cara memesan tutor",
    description: "Pilih kebutuhanmu, atur jadwal, lalu bayar. Kami bantu carikan tutor yang cocok.",
    button_text: "Pesan Tutor",
    destination_kind: "internal",
    destination_url: "/student/packages/new",
  },
];

const isStudentPackageDestination = (destination: string) => {
  const path = destination.split(/[?#]/, 1)[0];
  return path === "/student/packages/new" || path === "/search" || path === "/student/find";
};

const isDashboardTutorialDestination = (destination: string) =>
  destination === "/student/dashboard#tutorial";

const bannerCacheKey = (audience: string) => `bimbelku:dashboard-banners:${audience}`;

const readCachedBanners = (audience: string): DynamicBanner[] | null => {
  try {
    const cached = JSON.parse(sessionStorage.getItem(bannerCacheKey(audience)) || "null");
    return Array.isArray(cached) ? cached : null;
  } catch {
    return null;
  }
};

const writeCachedBanners = (audience: string, banners: DynamicBanner[]) => {
  try {
    sessionStorage.setItem(bannerCacheKey(audience), JSON.stringify(banners));
  } catch {
    // Storage bisa diblokir browser; carousel tetap memakai cache memori HTTP.
  }
};

export default function DynamicBannerCarousel({ audience = "student" }: { audience?: string }) {
  // Banner bawaan hanya ditujukan bagi murid. Tutor dan admin hanya melihat
  // banner yang memang dibuat admin untuk perannya, sehingga pesan tidak salah sasaran.
  const [items, setItems] = useState<DynamicBanner[]>(() => (
    readCachedBanners(audience) ?? (audience === "student" ? fallback : [])
  ));
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const pointerStart = useRef<{ id: number; x: number; y: number } | null>(null);
  const didSwipe = useRef(false);
  const autoplayStarted = useRef(false);

  useEffect(() => {
    let mounted = true;
    autoplayStarted.current = false;
    setItems(readCachedBanners(audience) ?? (audience === "student" ? fallback : []));
    setActive(0);
    void getCached<DynamicBanner[]>("/content/banners", {
      params: { audience },
      // Cache singkat mencegah request berulang saat berpindah halaman. Mutasi
      // admin tetap mengosongkan cache HTTP melalui interceptor global.
      maxAgeMs: 60_000,
    })
      .then((response) => {
        const nextItems = Array.isArray(response.data) ? response.data : [];
        if (mounted) {
          const resolved = nextItems.length ? nextItems : (audience === "student" ? fallback : []);
          writeCachedBanners(audience, resolved);
          setItems(resolved);
          setActive(0);
        }
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, [audience]);

  useEffect(() => {
    if (paused || items.length < 2) return;

    // Jangan mengganti kandidat gambar terbesar saat Lighthouse/browser masih
    // mengukur fase load awal. Tombol desktop dan swipe mobile tetap langsung.
    const timer = window.setTimeout(() => {
      autoplayStarted.current = true;
      setActive((value) => (value + 1) % items.length);
    }, autoplayStarted.current ? 5_000 : 12_000);

    return () => window.clearTimeout(timer);
  }, [active, items.length, paused]);

  const move = (direction: number) => {
    autoplayStarted.current = true;
    setActive((value) => (value + direction + items.length) % items.length);
  };
  const openBanner = (index: number) => {
    autoplayStarted.current = true;
    setActive(index);
  };
  const banner = items[active];
  if (!banner) return null;
  // Banner admin tetap bisa memakai gambar sendiri. Jika belum ada gambar,
  // gunakan ilustrasi ringan ini agar area dashboard tetap informatif.
  // Backend hanya mengirim image_url jika file benar-benar tersedia. Jangan
  // membentuk URL lagi dari image_path karena path yatim akan memicu 404 pada LCP.
  const bannerImage = banner.image_url
    || (audience === "student" ? caraMemesanTutorBanner : null);

  const content = (
    <div
      className="group relative min-h-[180px] w-full min-w-0 touch-pan-y select-none overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-800 text-white shadow-xl sm:min-h-[260px] sm:rounded-[2rem]"
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
      onDragStart={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        if (!event.isPrimary || event.pointerType === "mouse") return;
        setPaused(true);
        didSwipe.current = false;
        pointerStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      }}
      onPointerUp={(event) => {
        const start = pointerStart.current;
        if (start?.id === event.pointerId) {
          const deltaX = event.clientX - start.x;
          const deltaY = event.clientY - start.y;
          if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY)) {
            didSwipe.current = true;
            move(deltaX > 0 ? -1 : 1);
          }
        }
        pointerStart.current = null;
        setPaused(false);
      }}
      onPointerCancel={(event) => {
        if (pointerStart.current?.id === event.pointerId) pointerStart.current = null;
        setPaused(false);
      }}
    >
      {bannerImage ? (
        <img
          src={bannerImage}
          alt=""
          loading="eager"
          fetchPriority="high"
          decoding="async"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]"
        />
      ) : (
        <>
          <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full border-[30px] border-white/10 sm:h-72 sm:w-72" />
          <div className="absolute right-6 top-12 grid h-20 w-20 place-items-center rounded-3xl bg-white/10 backdrop-blur sm:right-12 sm:top-16 sm:h-24 sm:w-24">
            <ImageIcon size={34} className="text-white/90 sm:size-[38px]" />
          </div>
        </>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/48 to-slate-950/5" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/50 via-transparent to-transparent" />

      <div className="relative flex min-h-[180px] w-full min-w-0 flex-col justify-end px-4 pb-10 pt-12 sm:min-h-[260px] sm:max-w-3xl sm:px-8 sm:pb-12 sm:pt-16">
        <div className="min-w-0 max-w-[92%] sm:max-w-2xl">
          <h2 className="break-words text-lg font-black leading-tight tracking-tight drop-shadow-sm sm:text-3xl">
            {banner.title}
          </h2>
          {banner.description && (
            <p className="mt-1.5 line-clamp-2 break-words text-[11px] font-medium leading-4 text-white/95 sm:mt-2 sm:text-base sm:leading-6">
              {banner.description}
            </p>
          )}
          {banner.button_text && (
            <span className="relative z-10 mt-3 inline-flex min-h-11 w-fit max-w-full items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-slate-950/10 transition group-hover:bg-indigo-50 group-hover:text-indigo-800 sm:mt-4">
              <span className="truncate">{banner.button_text}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <section className="w-full min-w-0" aria-label="Informasi BimbelKu">
      {banner.destination_kind === "external" ? (
        <a
          href={banner.destination_url}
          target="_blank"
          rel="noreferrer"
          className="block w-full min-w-0 cursor-pointer rounded-[1.5rem] outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 sm:rounded-[2rem]"
          onClick={(event) => {
            if (didSwipe.current) {
              event.preventDefault();
              didSwipe.current = false;
            }
          }}
        >
          {content}
        </a>
      ) : isDashboardTutorialDestination(banner.destination_url) ? (
        <button
          type="button"
          aria-label={banner.button_text || "Buka tutorial dashboard"}
          className="block w-full min-w-0 cursor-pointer rounded-[1.5rem] text-left outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 sm:rounded-[2rem]"
          onClick={(event) => {
            if (didSwipe.current) {
              event.preventDefault();
              didSwipe.current = false;
              return;
            }
            window.dispatchEvent(new CustomEvent("bimbelku:open-tutorial", {
              detail: { context: "dashboard", source: "banner" },
            }));
          }}
        >
          {content}
        </button>
      ) : isStudentPackageDestination(banner.destination_url) ? (
        <StudentPackageLink
          to={banner.destination_url}
          className="block w-full min-w-0 cursor-pointer rounded-[1.5rem] outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 sm:rounded-[2rem]"
          onClick={(event) => {
            if (didSwipe.current) {
              event.preventDefault();
              didSwipe.current = false;
            }
          }}
        >
          {content}
        </StudentPackageLink>
      ) : (
        <Link
          to={banner.destination_url}
          className="block w-full min-w-0 cursor-pointer rounded-[1.5rem] outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 sm:rounded-[2rem]"
          onClick={(event) => {
            if (didSwipe.current) {
              event.preventDefault();
              didSwipe.current = false;
            }
          }}
        >
          {content}
        </Link>
      )}

      {items.length > 1 && (
        <div
          role="group"
          className="mt-3 flex items-center justify-center gap-3"
          aria-label={`${active + 1} dari ${items.length} banner`}
        >
          <button
            type="button"
            aria-label="Banner sebelumnya"
            onClick={() => move(-1)}
            className="hidden h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 sm:grid"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex items-center gap-1.5">
            {items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Buka banner ${index + 1}`}
                aria-current={index === active ? "true" : undefined}
                onClick={() => openBanner(index)}
                className={`h-2 rounded-full transition-all ${index === active ? "w-6 bg-indigo-600" : "w-2 bg-slate-300 hover:bg-slate-400"}`}
              />
            ))}
          </div>

          <button
            type="button"
            aria-label="Banner berikutnya"
            onClick={() => move(1)}
            className="hidden h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 sm:grid"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </section>
  );
}
