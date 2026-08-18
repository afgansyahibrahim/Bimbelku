import { useCallback, useLayoutEffect, useRef } from "react";
import type { UIEvent } from "react";

const storageKey = (scope: string) => `bimbelku:sidebar-scroll:${scope}`;

const readScrollPosition = (key: string) => {
  try {
    const value = Number(window.sessionStorage.getItem(key));
    return Number.isFinite(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
};

const writeScrollPosition = (key: string, value: number) => {
  try {
    window.sessionStorage.setItem(key, String(Math.max(0, Math.round(value))));
  } catch {
    // Sidebar tetap dapat dipakai ketika penyimpanan browser dinonaktifkan.
  }
};

export function usePersistentSidebarScroll(scope: "admin" | "teacher" | "student", activePath: string) {
  const sidebarScrollRef = useRef<HTMLElement>(null);
  const key = storageKey(scope);

  const handleSidebarScroll = useCallback((event: UIEvent<HTMLElement>) => {
    writeScrollPosition(key, event.currentTarget.scrollTop);
  }, [key]);

  useLayoutEffect(() => {
    const container = sidebarScrollRef.current;
    if (!container) return;

    const savedPosition = readScrollPosition(key);
    container.scrollTop = savedPosition;

    const frame = window.requestAnimationFrame(() => {
      // Nilai diterapkan kembali setelah ukuran daftar menu selesai dihitung.
      container.scrollTop = savedPosition;

      const activeItem = container.querySelector<HTMLElement>('[aria-current="page"]');
      if (activeItem) {
        const containerRect = container.getBoundingClientRect();
        const activeRect = activeItem.getBoundingClientRect();
        const safeGap = 12;

        if (activeRect.top < containerRect.top + safeGap) {
          container.scrollTop -= containerRect.top + safeGap - activeRect.top;
        } else if (activeRect.bottom > containerRect.bottom - safeGap) {
          container.scrollTop += activeRect.bottom - (containerRect.bottom - safeGap);
        }
      }

      writeScrollPosition(key, container.scrollTop);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activePath, key]);

  return { sidebarScrollRef, handleSidebarScroll };
}
