import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { resetDemo, readState, storageKey } from "../src/demo/store.ts";
import * as account from "../src/api/account.ts";
import * as commerce from "../src/api/commerce.ts";
import * as reviews from "../src/api/reviews.ts";
import * as studio from "../src/api/staff.ts";
import * as support from "../src/api/support.ts";
import * as warranty from "../src/api/warranty.ts";

const values = new Map();
globalThis.window = { localStorage: { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) } };
globalThis.fetch = () => { throw new Error("Network calls are forbidden in the static demo."); };
beforeEach(() => resetDemo());
const customer = () => account.login("demo@seda.example", "ignored-password");
const staff = () => account.login("studio@seda.example", "ignored-password");

test("demo sessions never store passwords and customer accounts cannot open Studio", async () => {
  assert.equal(await account.fetchSession(), null);
  await customer();
  assert.equal((await account.fetchSession()).role, "customer");
  assert.ok(!values.get(storageKey).includes("ignored-password"));
  await assert.rejects(studio.fetchStaffDashboard());
  await staff();
  assert.equal((await studio.fetchStaffDashboard()).products.length, 8);
  await account.logout();
  assert.equal(await account.fetchSession(), null);
});

test("checkout persists receipts, clears the cart, and redeems a single-use coupon only once", async () => {
  await customer();
  await commerce.replaceCart([{ productId: "m1", quantity: 1 }]);
  const address = (await account.fetchAddresses())[0];
  const order = await commerce.placeOrder(address.id, [{ productId: "m1", quantity: 1 }], "TEKSES20");
  assert.equal(order.total, 471.2);
  assert.equal((await commerce.fetchCart()).length, 0);
  assert.equal((await commerce.fetchOrderReceipt(order.publicNumber)).total, 471.2);
  await assert.rejects(commerce.placeOrder(address.id, [{ productId: "m1", quantity: 1 }], "TEKSES20"));
  assert.equal(readState().inventory.m1.inventory, 17);
  await staff();
  await studio.updateStaffOrder(order.id, "paid");
  await studio.updateStaffOrder(order.id, "packed");
  await studio.updateStaffOrder(order.id, "shipped");
  await customer();
  assert.equal((await commerce.fetchOrderReceipt(order.publicNumber)).status, "shipped");
});

test("review preview is local and Studio publication updates the product reviews", async () => {
  await customer();
  const review = await reviews.submitProductReview("m1", { rating: 4, title: "Demo review", body: "A fictional listening note for the presentation." });
  assert.equal((await reviews.requestReviewPreview(review.id)).previewState, "complete");
  await staff();
  await studio.updateStaffReview(review.id, "published");
  assert.equal((await reviews.fetchProductReviews("m1")).length, 2);
});

test("warranty selections invalidate prior approval and finalization is single-use", async () => {
  await customer();
  const eligible = (await warranty.fetchWarranty()).items[0];
  let item = await warranty.openWarranty(eligible.id, eligible.product.id);
  item = await warranty.approveWarranty(item.id);
  const oldApproval = item.approvals[0].id;
  item = await warranty.amendWarranty(item.id, item.choices[1].product.id);
  item = await warranty.reserveWarranty(item.id);
  await assert.rejects(warranty.finalizeWarranty(item.id, oldApproval, item.reservation.id));
  item = await warranty.approveWarranty(item.id);
  const reservationId = item.reservation.id;
  const approvalId = item.approvals.at(-1).id;
  await warranty.finalizeWarranty(item.id, approvalId, reservationId);
  assert.equal((await warranty.fetchWarrantyReceipt(item.id)).product.id, item.product.id);
  await assert.rejects(warranty.finalizeWarranty(item.id, approvalId, reservationId));
});

test("support manuals and fictional previews resolve without a network request", async () => {
  const manuals = await support.fetchSupportManuals();
  assert.equal(manuals.length, 8);
  assert.match(support.supportManualUrl(manuals[0].filename), /^data:text\/plain/);
  assert.equal((await support.fetchSupportPreview(await support.fetchPreviewExample())).status, 200);
  await assert.rejects(support.fetchSupportPreview("https://example.com/other"));
});

test("demo still works if browser storage is unavailable", async () => {
  const previous = window.localStorage;
  window.localStorage = { getItem() { throw new Error("Storage unavailable"); }, setItem() { throw new Error("Storage unavailable"); } };
  try { resetDemo(); await customer(); assert.equal((await account.fetchAddresses()).length, 1); }
  finally { window.localStorage = previous; }
});
