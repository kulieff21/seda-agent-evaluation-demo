import { catalogProducts } from "../../shared/catalog";
import { hydrateProducts, type Product } from "../data/products";
import { abortIfNeeded, readState } from "../demo/store";

export async function fetchCatalog(signal?: AbortSignal, query?: string): Promise<Product[]> {
  abortIfNeeded(signal);
  const state = readState();
  const term = query?.trim().toLocaleLowerCase("az") ?? "";
  return hydrateProducts(catalogProducts
    .filter((p) => state.inventory[p.id]?.active !== 0)
    .filter((p) => !term || [p.name, p.model, p.category, p.group, p.description].join(" ").toLocaleLowerCase("az").includes(term))
    .map((p) => ({ ...p, inventory: state.inventory[p.id]?.inventory ?? p.inventory })));
}
