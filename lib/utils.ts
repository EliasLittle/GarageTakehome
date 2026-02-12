export function extractUuidFromGarageUrl(url: string): string | null {
  const uuidRegex =
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const match = url.match(uuidRegex);
  return match ? match[0] : null;
}

export function formatCurrency(
  value: number,
  decimals: number = 2
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDeliveryMethod(method?: string): string {
  if (!method) return "";
  const parts = method.split("_");
  if (parts.length === 1) {
    return method.length <= 3 ? method : method.charAt(0) + method.slice(1).toLowerCase();
  }
  const first = parts[0].charAt(0) + parts[0].slice(1).toLowerCase();
  const second = parts[1];
  return second.length <= 3 ? `${first} (${second})` : `${first} ${second}`;
}
