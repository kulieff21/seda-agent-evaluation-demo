import { catalogProducts } from "../../shared/catalog";
import { abortIfNeeded, mutate, readState, requireStudio } from "../demo/store";

export type StaffOrderStatus = "placed" | "paid" | "packed" | "shipped" | "cancelled";
export type StaffReviewStatus = "pending" | "published" | "hidden";
export type StaffReviewPreviewState = "idle" | "queued" | "running" | "complete" | "failed";

export type StaffDashboard = {
  metrics: { orderCount: number; revenue: number; pendingReviews: number; unitsInStock: number };
  products: Array<{ id: string; model: string; name: string; inventory: number; active: number }>;
  orders: Array<{
    id: string;
    status: StaffOrderStatus;
    total: number;
    createdAt: string;
    customerName: string;
    customerEmail: string;
    itemCount: number;
  }>;
  reviews: Array<{
    id: string;
    productId: string;
    productName: string;
    model: string;
    authorName: string;
    rating: number;
    title: string;
    body: string;
    status: StaffReviewStatus;
    previewState: StaffReviewPreviewState;
    moderationNote: string | null;
    previewedAt: string | null;
    createdAt: string;
  }>;
};

export async function fetchStaffDashboard(signal?: AbortSignal): Promise<StaffDashboard> {
  abortIfNeeded(signal);
  const state = readState();
  requireStudio(state);
  const orders = state.profiles.flatMap((p) => p.orders.map((o) => ({ id: o.id, status: o.status, total: o.total,
    createdAt: o.createdAt, customerName: p.user.displayName, customerEmail: p.user.email, itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0) })));
  return { metrics: { orderCount: orders.length, revenue: orders.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + o.total, 0),
    pendingReviews: state.reviews.filter((r) => r.status === "pending").length,
    unitsInStock: Object.values(state.inventory).filter((p) => p.active).reduce((sum, p) => sum + p.inventory, 0) },
    products: catalogProducts.map((p) => ({ id: p.id, model: p.model, name: p.name, ...state.inventory[p.id] })), orders, reviews: state.reviews };
}
export async function updateStaffProduct(productId: string, inventory: number, active: boolean): Promise<void> {
  mutate((state) => {
    requireStudio(state);
    if (!Object.hasOwn(state.inventory, productId) || !Number.isSafeInteger(inventory) || inventory < 0 || inventory > 999) throw new Error("Stok məlumatını yoxla.");
    state.inventory[productId] = { inventory, active: Number(active) };
  });
}
export async function updateStaffOrder(orderId: string, status: StaffOrderStatus): Promise<void> {
  mutate((state) => {
    requireStudio(state);
    const order = state.profiles.flatMap((p) => p.orders).find((o) => o.id === orderId);
    const next: Record<StaffOrderStatus, StaffOrderStatus[]> = { placed: ["paid", "cancelled"], paid: ["packed", "cancelled"], packed: ["shipped"], shipped: [], cancelled: [] };
    if (!order || !next[order.status].includes(status)) throw new Error("Bu status dəyişikliyi mümkün deyil.");
    if (status === "cancelled") order.items.forEach((i) => { state.inventory[i.productId].inventory += i.quantity; });
    order.status = status;
  });
}
export async function updateStaffReview(reviewId: string, status: StaffReviewStatus): Promise<void> {
  mutate((state) => {
    requireStudio(state);
    const review = state.reviews.find((r) => r.id === reviewId);
    if (!review || !["pending", "published", "hidden"].includes(status)) throw new Error("Qeyd tapılmadı.");
    review.status = status;
  });
}
