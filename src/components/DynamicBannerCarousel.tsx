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
      className="group relative min-h-[250px] overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-800 text-white shadow-xl"
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
          className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
        />
      ) : (
        <>
          <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full border-[34px] border-white/10" />
          <div className="absolute right-12 top-16 grid h-24 w-24 place-items-center rounded-3xl bg-white/10 backdrop-blur">
            <ImageIcon size={38} className="text-white/80" />
          </div>
        </>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent" />
      <div className="relative flex min-h-[250px] max-w-2xl flex-col justify-end p-6 pr-14 sm:p-8 sm:pr-20">
        <h2 className="text-2xl font-black tracking-tight sm:text-3xl">{banner.title}</h2>
        {banner.description && (
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/80 sm:text-base">{banner.description}</p>
        )}
        {banner.button_text && (
          <span className="mt-4 inline-flex w-fit rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950">
            {banner.button_text}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <section className="relative" aria-label="Informasi BimbelKu">
      {banner.destination_kind === "external" ? (
        <a href={banner.destination_url} target="_blank" rel="noreferrer" onClick={(event) => {
          if (didSwipe.current) {
            event.preventDefault();
            didSwipe.current = false;
          }
        }}>{content}</a>
      ) : (
        <Link to={banner.destination_url} onClick={(event) => {
          if (didSwipe.current) {
            event.preventDefault();
            didSwipe.current = false;
          }
        }}>{content}</Link>
      )}

      {items.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Banner sebelumnya"
            onClick={(event) => {
              event.preventDefault();
              move(-1);
            }}
            className="absolute left-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-slate-950/40 text-white backdrop-blur transition hover:bg-slate-950/70"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label="Banner berikutnya"
            onClick={(event) => {
              event.preventDefault();
              move(1);
            }}
            className="absolute right-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-slate-950/40 text-white backdrop-blur transition hover:bg-slate-950/70"
          >
            <ChevronRight size={18} />
          </button>
          <div className="absolute bottom-4 right-5 z-10 flex gap-1.5" aria-label={`${active + 1} dari ${items.length} banner`}>
            {items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Buka banner ${index + 1}`}
                onClick={(event) => {
                  event.preventDefault();
                  setActive(index);
                }}
                className={`h-2 rounded-full transition-all ${index === active ? "w-6 bg-white" : "w-2 bg-white/45"}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
