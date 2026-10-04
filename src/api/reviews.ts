import { catalogProducts } from "../../shared/catalog";
import { abortIfNeeded, currentProfile, mutate, nextId, now, readState, type DemoReview } from "../demo/store";

export type ProductReview = {
  id: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
};

export type ReviewPreviewState = "idle" | "queued" | "running" | "complete" | "failed";

export type CustomerReview = ProductReview & {
  status: "pending";
  previewState: ReviewPreviewState;
  moderationNote: string | null;
  previewedAt: string | null;
};

function customerReview(review: DemoReview): CustomerReview {
  return { id: review.id, author: review.authorName, rating: review.rating, title: review.title, body: review.body,
    createdAt: review.createdAt, status: "pending", previewState: review.previewState, moderationNote: review.moderationNote, previewedAt: review.previewedAt };
}
export async function fetchProductReviews(productId: string, signal?: AbortSignal): Promise<ProductReview[]> {
  abortIfNeeded(signal);
  return readState().reviews.filter((r) => r.productId === productId && r.status === "published").map(customerReview);
}
export async function submitProductReview(productId: string, input: { rating: number; title: string; body: string }): Promise<CustomerReview> {
  return mutate((state) => {
    const profile = currentProfile(state);
    const product = catalogProducts.find((p) => p.id === productId);
    if (!product || !Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5 || input.title.trim().length < 4 || input.title.length > 80 || input.body.trim().length < 20 || input.body.length > 600) throw new Error("Qeydin məlumatlarını yoxla.");
    const existing = state.reviews.find((r) => r.userId === profile.user.id && r.productId === productId && r.status === "pending");
    if (existing) return customerReview(existing);
    const review: DemoReview = { ...input, id: nextId(state, "review"), userId: profile.user.id, productId,
      productName: product.name, model: product.model, authorName: profile.user.displayName, status: "pending",
      previewState: "idle", moderationNote: null, previewedAt: null, createdAt: now() };
    state.reviews.unshift(review);
    return customerReview(review);
  });
}
export async function fetchReviewPreview(reviewId: string, signal?: AbortSignal): Promise<CustomerReview> {
  abortIfNeeded(signal);
  const state = readState();
  const profile = currentProfile(state);
  const review = state.reviews.find((r) => r.id === reviewId && r.userId === profile.user.id);
  if (!review) throw new Error("Qeyd tapılmadı.");
  return customerReview(review);
}
export async function requestReviewPreview(reviewId: string): Promise<CustomerReview> {
  return mutate((state) => {
    const profile = currentProfile(state);
    const review = state.reviews.find((r) => r.id === reviewId && r.userId === profile.user.id);
    if (!review) throw new Error("Qeyd tapılmadı.");
    review.previewState = "complete";
    review.previewedAt = now();
    review.moderationNote = "Demo ön-yoxlaması tamamlandı. Qeyd Studio panelində yayımlana bilər.";
    return customerReview(review);
  });
}
