import type { AccountAddress } from "./account";
import { catalogProducts } from "../../shared/catalog";
import { currentProfile, mutate, nextId, now, readState, type DemoState } from "../demo/store";

export type CartPayloadItem = {
  productId: string;
  quantity: number;
};

export type ServerCartItem = CartPayloadItem & {
  name: string;
  model: string;
  price: number;
  inventory: number;
};

export type OrderItem = {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
};

export type AccountOrder = {
  id: string;
  publicNumber: number;
  status: "placed" | "paid" | "packed" | "shipped" | "cancelled";
  subtotal: number;
  discount: number;
  total: number;
  createdAt: string;
  items: OrderItem[];
};

export type OrderReceipt = AccountOrder & {
  recipientName: string;
  lineOne: string;
  lineTwo: string | null;
  city: string;
  postalCode: string;
};

export type NewAddress = {
  label: string;
  recipientName: string;
  lineOne: string;
  lineTwo: string;
  city: string;
  postalCode: string;
};

function cartItems(state: DemoState): ServerCartItem[] {
  return state.cart.map((line) => {
    const product = catalogProducts.find((p) => p.id === line.productId)!;
    return { ...line, name: product.name, model: product.model, price: product.price, inventory: state.inventory[product.id].inventory };
  });
}
function normalizeItems(items: CartPayloadItem[]): CartPayloadItem[] {
  const merged = new Map<string, number>();
  for (const item of items) {
    if (!catalogProducts.some((p) => p.id === item.productId) || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) throw new Error("Səbətdəki məhsulu və miqdarı yoxla.");
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);
  }
  return Array.from(merged, ([productId, quantity]) => ({ productId, quantity }));
}
export async function fetchCart(): Promise<ServerCartItem[]> { return cartItems(readState()); }
export async function replaceCart(items: CartPayloadItem[]): Promise<ServerCartItem[]> {
  return mutate((state) => { state.cart = normalizeItems(items); return cartItems(state); });
}
export async function fetchOrders(): Promise<AccountOrder[]> { return currentProfile().orders; }
export async function fetchOrderReceipt(publicNumber: number): Promise<OrderReceipt> {
  const order = currentProfile().orders.find((o) => o.publicNumber === publicNumber);
  if (!order) throw new Error("Qəbz tapılmadı.");
  return order;
}
export async function createAddress(address: NewAddress): Promise<AccountAddress> {
  return mutate((state) => {
    const profile = currentProfile(state);
    if (!address.label.trim() || !address.recipientName.trim() || address.lineOne.trim().length < 4 || !address.city.trim() || !address.postalCode.trim()) throw new Error("Ünvan məlumatlarını tamamla.");
    const result: AccountAddress = { ...address, id: nextId(state, "address"), lineTwo: address.lineTwo.trim() || null, isDefault: Number(!profile.addresses.length) };
    profile.addresses.push(result);
    return result;
  });
}
export async function placeOrder(addressId: string, items: CartPayloadItem[], couponCode: string): Promise<AccountOrder> {
  return mutate((state) => {
    const profile = currentProfile(state);
    const address = profile.addresses.find((a) => a.id === addressId);
    if (!address) throw new Error("Çatdırılma ünvanını seç.");
    const lines = normalizeItems(items);
    if (!lines.length) throw new Error("Səbət boşdur.");
    for (const line of lines) {
      if (!state.inventory[line.productId].active || state.inventory[line.productId].inventory < line.quantity) throw new Error("Seçilmiş miqdar stokda yoxdur.");
    }
    const code = couponCode.trim().toUpperCase();
    if (code && !["SALAM10", "TEKSES20"].includes(code)) throw new Error("Kupon kodunu yoxla.");
    if (code === "TEKSES20" && profile.usedCoupons.includes(code)) throw new Error("Bu kupon artıq istifadə edilib.");
    const orderItems = lines.map((line) => {
      const p = catalogProducts.find((item) => item.id === line.productId)!;
      return { productId: p.id, productName: `${p.name} ${p.model}`, unitPrice: p.price, quantity: line.quantity };
    });
    const subtotal = orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const discount = Math.round(subtotal * (code === "TEKSES20" ? 0.2 : code === "SALAM10" ? 0.1 : 0) * 100) / 100;
    const order: OrderReceipt = { id: nextId(state, "order"), publicNumber: 1043 + state.profiles.reduce((sum, p) => sum + p.orders.filter((o) => o.publicNumber !== 1042).length, 0),
      status: "placed", subtotal, discount, total: Math.round((subtotal - discount) * 100) / 100, createdAt: now(), items: orderItems,
      recipientName: address.recipientName, lineOne: address.lineOne, lineTwo: address.lineTwo, city: address.city, postalCode: address.postalCode };
    profile.orders.unshift(order);
    if (code) profile.usedCoupons.push(code);
    lines.forEach((line) => { state.inventory[line.productId].inventory -= line.quantity; });
    state.cart = [];
    return order;
  });
}
