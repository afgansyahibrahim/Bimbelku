export function formatAccountDate(value?: string | null) {
  if (!value) return "belum tercatat";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "belum tercatat";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

export function formatDateOnly(value?: string | null) {
  if (!value) return "belum tercatat";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "belum tercatat";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
