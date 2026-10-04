import { catalogProducts } from "../../shared/catalog";
import { abortIfNeeded } from "../demo/store";

export type SupportManual = {
  description: string;
  filename: string;
  model: string;
  title: string;
};

export type SupportPreview = { body: string; contentType: string; finalUrl: string; redirects: number; status: number };
export async function fetchSupportManuals(signal?: AbortSignal): Promise<SupportManual[]> {
  abortIfNeeded(signal);
  return catalogProducts.map((p) => ({ filename: `seda-${p.id}-guide.txt`, model: p.model,
    title: `${p.name} · ilk addımlar`, description: `${p.name} ${p.model} üçün quraşdırma, istifadə və qulluq bələdçisi.` }));
}
export function supportManualUrl(filename: string): string {
  const product = catalogProducts.find((p) => filename === `seda-${p.id}-guide.txt`);
  if (!product) return "#";
  return `data:text/plain;charset=utf-8,${encodeURIComponent(`SƏDA ${product.name} ${product.model}\n\nTəqdimat üçün nümunə bələdçi.\n\n${product.detail}\n\n${product.features.join('\n')}\n\nMəhsulu quru parça ilə təmizlə. Real cihaz və xidmət simulyasiya edilmir.`)}`;
}
export async function fetchPreviewExample(signal?: AbortSignal): Promise<string> {
  abortIfNeeded(signal);
  return "https://media.seda.example/guides/m1";
}
export async function fetchSupportPreview(url: string): Promise<SupportPreview> {
  // Resolve a fictional catalogue entry locally; never request the entered URL.
  const entry = new URL(url);
  const product = catalogProducts.find((p) => entry.pathname === `/guides/${p.id}`);
  if (entry.protocol !== "https:" || entry.hostname !== "media.seda.example" || !product) throw new Error("Nümunə media linkini seç.");
  return { body: `SƏDA ${product.name} ${product.model} — ${product.detail}`, contentType: "text/plain", finalUrl: url, redirects: 0, status: 200 };
}
