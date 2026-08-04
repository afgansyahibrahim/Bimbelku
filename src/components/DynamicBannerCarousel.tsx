import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { getCached } from "@/lib/http";

export type DynamicBanner = {
  id: number;
  title: string;
  description?: string | null;
  button_text?: string | null;
  image_url?: string | null;
  destination_kind: "internal" | "external";
  destination_url: string;
};

const fallback: DynamicBanner[] = [
  {
    id: -1,
    title: "Pilih paket belajarmu",
    description: "Bagikan sesi ke beberapa mapel, pilih jadwal, lalu biarkan radar mencari tutor.",
    button_text: "Lihat Paket",
    destination_kind: "internal",
    destination_url: "/student/packages/new",
  },
];

export default function DynamicBannerCarousel({ audience = "student" }: { audience?: string }) {
  const [items, setItems] = useState<DynamicBanner[]>(fallback);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef<number | null>(null);
  const didSwipe = useRef(false);

  useEffect(() => {
    let mounted = true;
    void getCached<DynamicBanner[]>("/content/banners", {
      params: { audience },
      maxAgeMs: 60_000,
    })
      .then((response) => {
        if (mounted && response.data.length) {
          setItems(response.data);
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

    const timer = window.setInterval(() => {
      setActive((value) => (value + 1) % items.length);
    }, 4000);

    return () => window.clearInterval(timer);
  }, [items.length, paused]);

  const move = (direction: number) => {
    setActive((value) => (value + direction + items.length) % items.length);
  };
  const banner = items[active];

  const content = (
    <div
      className="group relative min-h-[180px] w-full min-w-0 overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-800 text-white shadow-xl sm:min-h-[260px] sm:rounded-[2rem]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(event) => {
        setPaused(true);
        didSwipe.current = false;
        touchStart.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const end = event.changedTouches[0]?.clientX;
        if (touchStart.current !== null && end !== undefined) {
          const delta = end - touchStart.current;
          if (Math.abs(delta) > 45) {
            didSwipe.current = true;
            move(delta > 0 ? -1 : 1);
          }
        }
        touchStart.current = null;
        setPaused(false);
      }}
    >
      {banner.image_url ? (
        <img
          src={banner.image_url}
          alt=""
          loading="eager"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]"
        />
      ) : (
        <>
          <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full border-[30px] border-white/10 sm:h-72 sm:w-72" />
          <div className="absolute right-6 top-12 grid h-20 w-20 place-items-center rounded-3xl bg-white/10 backdrop-blur sm:right-12 sm:top-16 sm:h-24 sm:w-24">
            <ImageIcon size={34} className="text-white/80 sm:size-[38px]" />
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
            <p className="mt-1.5 line-clamp-2 break-words text-[11px] font-medium leading-4 text-white/85 sm:mt-2 sm:text-base sm:leading-6">
              {banner.description}
            </p>
          )}
          {banner.button_text && (
            <span className="mt-3 inline-flex w-fit max-w-full items-center justify-center rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-950 shadow-lg shadow-slate-950/10 sm:mt-4 sm:px-4 sm:text-sm">
              <span className="truncate">{banner.button_text}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <section className="relative w-full min-w-0 overflow-hidden" aria-label="Informasi BimbelKu">
      {banner.destination_kind === "external" ? (
        <a
          href={banner.destination_url}
          target="_blank"
          rel="noreferrer"
          className="block w-full min-w-0"
          onClick={(event) => {
            if (didSwipe.current) {
              event.preventDefault();
              didSwipe.current = false;
            }
          }}
        >
          {content}
        </a>
      ) : (
        <Link
          to={banner.destination_url}
          className="block w-full min-w-0"
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
        <>
          <div className="absolute right-3 top-3 z-10 flex gap-1.5 sm:right-4 sm:top-4">
            <button
              type="button"
              aria-label="Banner sebelumnya"
              onClick={() => move(-1)}
              className="grid h-8 w-8 place-items-center rounded-full bg-slate-950/45 text-white shadow-lg backdrop-blur transition hover:bg-slate-950/75 sm:h-9 sm:w-9"
            >
              <ChevronLeft size={17} />
            </button>
            <button
              type="button"
              aria-label="Banner berikutnya"
              onClick={() => move(1)}
              className="grid h-8 w-8 place-items-center rounded-full bg-slate-950/45 text-white shadow-lg backdrop-blur transition hover:bg-slate-950/75 sm:h-9 sm:w-9"
            >
              <ChevronRight size={17} />
            </button>
          </div>

          <div
            className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 rounded-full bg-slate-950/20 px-2 py-1.5 backdrop-blur"
            aria-label={`${active + 1} dari ${items.length} banner`}
          >
            {items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Buka banner ${index + 1}`}
                onClick={() => setActive(index)}
                className={`h-1.5 rounded-full transition-all ${index === active ? "w-5 bg-white" : "w-1.5 bg-white/50"}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
