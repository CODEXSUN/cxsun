export function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "—";
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");
}

export function whatsappUrl(value: string | null) {
  if (!value) return null;
  const digits = value.trim().replace(/^00/u, "").replace(/\D/gu, "");
  const phone = digits.length === 10 ? `91${digits}` : digits;
  return phone.length >= 8 && phone.length <= 15 ? `https://wa.me/${phone}` : null;
}
