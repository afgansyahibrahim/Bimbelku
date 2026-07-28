export interface UploadRule {
  label: string;
  maxSizeMb: number;
  extensions: string[];
}

const phonePattern = /^[0-9+() .-]+$/;

export function validateUpload(file: File | null | undefined, rule: UploadRule): string | null {
  if (!file) return null;

  const extension = file.name.includes(".")
    ? file.name.split(".").pop()?.toLowerCase() || ""
    : "";

  if (!rule.extensions.includes(extension)) {
    return `${rule.label} harus berformat ${rule.extensions.map((item) => item.toUpperCase()).join(", ")}.`;
  }

  const maximumBytes = rule.maxSizeMb * 1024 * 1024;
  if (file.size > maximumBytes) {
    return `${rule.label} maksimal ${rule.maxSizeMb} MB.`;
  }

  return null;
}

export function isValidPhone(value: string): boolean {
  const normalized = value.trim();
  return normalized.length >= 8 && normalized.length <= 30 && phonePattern.test(normalized);
}

export function isValidHttpUrl(value: string): boolean {
  if (!value.trim()) return true;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
