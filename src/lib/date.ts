export function formatAccountDate(value?: string | null) {
  if (!value) return "belum tercatat";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "belum tercatat";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}
