export const EDUCATION_LEVELS = [
  "SD",
  "SMP",
  "SMA",
  "Umum",
] as const;

export const GRADES_BY_EDUCATION_LEVEL: Record<string, string[]> = {
  SD: ["Kelas 1", "Kelas 2", "Kelas 3", "Kelas 4", "Kelas 5", "Kelas 6"],
  SMP: ["Kelas 7", "Kelas 8", "Kelas 9"],
  SMA: ["Kelas 10", "Kelas 11", "Kelas 12"],
  Umum: ["Semua tingkat", "Pemula", "Menengah", "Lanjutan"],
};

export const educationDetailLabel = (educationLevel: string) => {
  if (educationLevel === "Umum") return "Tingkat kemampuan";
  return "Kelas";
};
