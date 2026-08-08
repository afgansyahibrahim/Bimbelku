type IdleWindow = typeof window & {
  requestIdleCallback?: (callback: () => void) => number;
  cancelIdleCallback?: (id: number) => void;
};

/**
 * Jalankan pekerjaan non-kritis setelah browser memiliki kesempatan
 * menampilkan frame utama. Tidak memakai delay berbasis angka Lighthouse.
 */
export function scheduleNonCriticalTask(task: () => void): () => void {
  const idleWindow = window as IdleWindow;
  let cancelled = false;
  let idleId: number | undefined;
  let rafOne: number | undefined;
  let rafTwo: number | undefined;

  const run = () => {
    if (!cancelled) task();
  };

  if (idleWindow.requestIdleCallback) {
    idleId = idleWindow.requestIdleCallback(run);
  } else {
    // Fallback: lewatkan paint pertama tanpa menunggu timeout arbitrer.
    rafOne = window.requestAnimationFrame(() => {
      rafTwo = window.requestAnimationFrame(run);
    });
  }

  return () => {
    cancelled = true;
    if (idleId !== undefined) idleWindow.cancelIdleCallback?.(idleId);
    if (rafOne !== undefined) window.cancelAnimationFrame(rafOne);
    if (rafTwo !== undefined) window.cancelAnimationFrame(rafTwo);
  };
}
