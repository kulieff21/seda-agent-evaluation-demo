import { catalogProducts } from "../../shared/catalog";
import { demoUrl } from "../demo/navigation";
import { currentProfile, mutate, nextId, now, readState, type DemoState, type DemoWarranty } from "../demo/store";

export type WarrantyProduct = { id: string; model: string; name: string };
export type WarrantyCase = {
  id: string; revision: number; status: string; product: WarrantyProduct;
  choices: { product: WarrantyProduct; coverage: string }[];
  approvals: { id: string; revision: number; product: WarrantyProduct; expiresAt: string; status: string }[];
  reservation: { id: string; revision: number; product: WarrantyProduct; expiresAt: string } | null;
  supportUrl: string; receiptUrl: string | null;
};
export type WarrantyList = { items: { id: string; product: WarrantyProduct; orderNumber: number; canOpen: boolean }[]; cases: WarrantyCase[] };
export type WarrantyReceipt = { id: string; caseId: string; revision: number; product: WarrantyProduct; createdAt: string; quantity: number };

function product(id: string): WarrantyProduct {
  const p = catalogProducts.find((p) => p.id === id);
  if (!p) throw new Error("Model tapılmadı.");
  return { id: p.id, model: p.model, name: p.name };
}
function ownedCase(state: DemoState, id: string, open = false): DemoWarranty {
  const profile = currentProfile(state);
  const item = state.warranties.find((c) => c.id === id && c.userId === profile.user.id);
  if (!item) throw new Error("Müraciət tapılmadı.");
  if (open && item.status !== "open") throw new Error("Müraciət artıq bağlanıb.");
  return item;
}
export async function fetchWarranty(): Promise<WarrantyList> {
  const state = readState();
  const profile = currentProfile(state);
  const cases = state.warranties.filter((c) => c.userId === profile.user.id);
  return { cases, items: profile.orders.filter((o) => o.status !== "cancelled").flatMap((o) => o.items.map((i) => {
    const id = `${o.id}-${i.productId}`;
    return { id, product: product(i.productId), orderNumber: o.publicNumber, canOpen: !cases.some((c) => c.orderItemId === id && c.status !== "cancelled") };
  })) };
}
export async function fetchWarrantyCase(id: string): Promise<WarrantyCase> { return ownedCase(readState(), id); }
export async function openWarranty(orderItemId: string, productId: string): Promise<WarrantyCase> {
  return mutate((state) => {
    const profile = currentProfile(state);
    const order = profile.orders.find((o) => o.status !== "cancelled" && o.items.some((i) => `${o.id}-${i.productId}` === orderItemId && i.productId === productId));
    if (!order || state.warranties.some((c) => c.userId === profile.user.id && c.orderItemId === orderItemId && c.status !== "cancelled")) throw new Error("Sifarişdən uyğun məhsulu seç.");
    const selected = product(productId);
    const original = catalogProducts.find((p) => p.id === productId)!;
    const alternative = catalogProducts.find((p) => p.group === original.group && p.id !== productId) ?? catalogProducts.find((p) => p.id !== productId)!;
    const id = nextId(state, "warranty");
    const item: DemoWarranty = { id, userId: profile.user.id, orderItemId, originalProductId: productId, revision: 1, status: "open", product: selected,
      choices: [{ product: selected, coverage: "covered" }, { product: product(alternative.id), coverage: "premium" }],
      approvals: [], reservation: null, receipt: null, receiptUrl: null, supportUrl: demoUrl(`/support/warranty/cases/${id}`) };
    state.warranties.push(item);
    return item;
  });
}
export async function amendWarranty(id: string, productId: string): Promise<WarrantyCase> {
  return mutate((state) => {
    const item = ownedCase(state, id, true);
    if (!item.choices.some((c) => c.product.id === productId)) throw new Error("Uyğun modeli seç.");
    if (item.product.id !== productId) {
      item.product = product(productId); item.revision++; item.reservation = null;
      item.approvals.forEach((a) => { if (a.status === "available") a.status = "invalidated"; });
    }
    return item;
  });
}
export async function approveWarranty(id: string): Promise<WarrantyCase> {
  return mutate((state) => {
    const item = ownedCase(state, id, true);
    item.approvals.push({ id: nextId(state, "approval"), revision: item.revision, product: item.product, expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(), status: "available" });
    return item;
  });
}
export async function reserveWarranty(id: string): Promise<WarrantyCase> {
  return mutate((state) => {
    const item = ownedCase(state, id, true);
    item.reservation = { id: nextId(state, "reservation"), revision: item.revision, product: item.product, expiresAt: new Date(Date.now() + 10 * 60_000).toISOString() };
    return item;
  });
}
export async function cancelWarranty(id: string): Promise<WarrantyCase> {
  return mutate((state) => { const item = ownedCase(state, id, true); item.status = "cancelled"; item.reservation = null; item.approvals.forEach((a) => { a.status = "invalidated"; }); return item; });
}
export async function finalizeWarranty(id: string, approvalId: string, reservationId: string): Promise<{ id: string; receiptUrl: string }> {
  return mutate((state) => {
    const item = ownedCase(state, id, true);
    const approval = item.approvals.find((a) => a.id === approvalId && a.status === "available");
    const reservation = item.reservation;
    if (!approval || !reservation || reservation.id !== reservationId || approval.revision !== item.revision || reservation.revision !== item.revision
      || approval.product.id !== item.product.id || reservation.product.id !== item.product.id
      || Date.parse(approval.expiresAt) <= Date.now() || Date.parse(reservation.expiresAt) <= Date.now()) throw new Error("Cari seçim üçün təsdiq və rezerv yenilə.");
    approval.status = "consumed"; item.status = "fulfilled"; item.reservation = null;
    item.receipt = { id: nextId(state, "replacement"), caseId: id, revision: item.revision, product: item.product, quantity: 1, createdAt: now() };
    item.receiptUrl = item.supportUrl;
    return { id: item.receipt.id, receiptUrl: item.receiptUrl };
  });
}
export async function fetchWarrantyReceipt(id: string): Promise<WarrantyReceipt> {
  const receipt = ownedCase(readState(), id).receipt;
  if (!receipt) throw new Error("Əvəzetmə hələ tamamlanmayıb.");
  return receipt;
}
