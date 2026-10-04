import { catalogProducts } from "../../shared/catalog";
import type { AccountUser, AccountAddress, AccountSecurityEvent } from "../api/account";
import type { CartPayloadItem, OrderReceipt } from "../api/commerce";
import type { StaffDashboard } from "../api/staff";
import type { WarrantyCase, WarrantyReceipt } from "../api/warranty";

type Profile = {
  user: AccountUser;
  addresses: AccountAddress[];
  events: AccountSecurityEvent[];
  orders: OrderReceipt[];
  usedCoupons: string[];
};
export type DemoReview = StaffDashboard["reviews"][number] & { userId: string };
export type DemoWarranty = WarrantyCase & { userId: string; orderItemId: string; originalProductId: string; receipt: WarrantyReceipt | null };
export type DemoState = {
  version: 1;
  sequence: number;
  sessionId: string | null;
  cart: CartPayloadItem[];
  profiles: Profile[];
  inventory: Record<string, { inventory: number; active: number }>;
  reviews: DemoReview[];
  warranties: DemoWarranty[];
};

export const storageKey = "seda-presentation-v1";
const seedDate = "2026-09-18T10:00:00.000Z";

function seedProfile(role: "customer" | "staff"): Profile {
  const customer = role === "customer";
  const user: AccountUser = { id: `demo-${role}`, role,
    email: customer ? "demo@seda.example" : "studio@seda.example",
    displayName: customer ? "Aylin Məmmədova" : "SƏDA Studio" };
  const address: AccountAddress = { id: `demo-address-${role}`, label: "Ev", recipientName: user.displayName,
    lineOne: "Səs küçəsi 12", lineTwo: "Mənzil 8", city: "Bakı", postalCode: "AZ1000", isDefault: 1 };
  return { user, addresses: customer ? [address] : [], usedCoupons: [],
    events: customer ? [{ id: 1, eventType: "demo", summary: "Demo hesabı hazırlandı.", addressId: null, occurredAt: seedDate }] : [],
    orders: customer ? [{ id: "demo-order-1", publicNumber: 1042, status: "shipped", subtotal: 589, discount: 0, total: 589,
      createdAt: seedDate, items: [{ productId: "m1", productName: "Məkan M1", unitPrice: 589, quantity: 1 }],
      recipientName: address.recipientName, lineOne: address.lineOne, lineTwo: address.lineTwo, city: address.city, postalCode: address.postalCode }] : [] };
}

export function initialState(): DemoState {
  return { version: 1, sequence: 100, sessionId: null, cart: [],
    profiles: [seedProfile("customer"), seedProfile("staff")],
    inventory: Object.fromEntries(catalogProducts.map((p) => [p.id, { inventory: p.inventory, active: 1 }])),
    warranties: [],
    reviews: catalogProducts.flatMap((p) => [{ id: `demo-review-${p.id}`, userId: "demo-listener", productId: p.id,
      productName: p.name, model: p.model, authorName: "Nərmin Əliyeva", rating: 5,
      title: "Gündəlik dinləmədə sakit detal.", body: "Səs aydın və balanslıdır. Materialın toxunuşu və sadə idarəetmə gündəlik dinləməni daha rahat edir.",
      status: "published" as const, previewState: "complete" as const, moderationNote: null, previewedAt: seedDate, createdAt: seedDate }]) };
}

let memory: DemoState | undefined;
export function readState(): DemoState {
  if (!memory) {
    try {
      const value = window.localStorage.getItem(storageKey);
      const parsed = value ? JSON.parse(value) as DemoState : null;
      if (parsed?.version === 1 && Array.isArray(parsed.profiles) && Array.isArray(parsed.cart)
        && Array.isArray(parsed.reviews) && Array.isArray(parsed.warranties) && parsed.inventory && Number.isSafeInteger(parsed.sequence)) memory = parsed;
    } catch { /* The presentation also works when storage is unavailable. */ }
    memory ??= initialState();
  }
  return structuredClone(memory);
}

export function writeState(state: DemoState): void {
  memory = structuredClone(state);
  try { window.localStorage.setItem(storageKey, JSON.stringify(memory)); } catch { /* In-memory fallback. */ }
}

export function mutate<T>(operation: (state: DemoState) => T): T {
  const state = readState();
  const result = operation(state);
  writeState(state);
  return structuredClone(result);
}

export function resetDemo(): void { writeState(initialState()); }
export function nextId(state: DemoState, kind: string): string { return `demo-${kind}-${++state.sequence}`; }
export function now(): string { return new Date().toISOString(); }
export function abortIfNeeded(signal?: AbortSignal): void { signal?.throwIfAborted(); }
export function currentProfile(state = readState()): Profile {
  const profile = state.profiles.find((item) => item.user.id === state.sessionId);
  if (!profile) throw new Error("Əvvəlcə demo hesabını seç.");
  return profile;
}
export function requireStudio(state = readState()): Profile {
  const profile = currentProfile(state);
  if (profile.user.role !== "staff") throw new Error("Demo Studio hesabını seç.");
  return profile;
}
export function recordEvent(state: DemoState, summary: string, addressId: string | null = null): void {
  currentProfile(state).events.unshift({ id: ++state.sequence, eventType: "demo", summary, addressId, occurredAt: now() });
}
