import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount) {
  const n = typeof amount === "number" ? amount : parseFloat(amount ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(n) ? n : 0);
}

export function formatDate(date, opts = { month: "short", day: "numeric", year: "numeric" }) {
  return new Date(date).toLocaleDateString("en-US", opts);
}

export function categoryLabel(categories, id) {
  return categories?.find((c) => c.id === id)?.name ?? id;
}

export function categoryColor(colorMap, id) {
  return colorMap?.[id] ?? "#94a3b8";
}
