import { demoUrl } from "../demo/navigation";
import { useCallback, useEffect, useState } from "react";
import type { AccountUser } from "../api/account";
import {
  fetchStaffDashboard,
  updateStaffOrder,
  updateStaffProduct,
  updateStaffReview,
  type StaffDashboard,
  type StaffOrderStatus,
  type StaffReviewPreviewState,
} from "../api/staff";
import { formatPrice } from "../data/products";
import { SignalField } from "./SignalField";

type StaffPageProps = {
  accountStatus: "checking" | "guest" | "authenticated";
  user: AccountUser | null;
  onNavigateAccount: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  onNavigateHome: (event: React.MouseEvent<HTMLAnchorElement>, hash?: string) => void;
};

const statusLabels: Record<StaffOrderStatus, string> = {
  placed: "Qəbul edildi",
  paid: "Ödəndi",
  packed: "Paketləndi",
  shipped: "Yola salındı",
  cancelled: "Ləğv edildi",
};

const previewLabels: Record<StaffReviewPreviewState, string> = {
  idle: "Ön-yoxlama başlamayıb",
  queued: "Ön-yoxlama növbədədir",
  running: "Ön-yoxlama işləyir",
  complete: "Ön-yoxlama tamamlanıb",
  failed: "Ön-yoxlama tamamlanmayıb",
};

function InventoryRow({ product, busy, onSave }: {
  product: StaffDashboard["products"][number];
  busy: boolean;
  onSave: (inventory: number, active: boolean) => Promise<void>;
}) {
  const [inventory, setInventory] = useState(product.inventory);
  const [active, setActive] = useState(Boolean(product.active));
  useEffect(() => { setInventory(product.inventory); setActive(Boolean(product.active)); }, [product]);
  const changed = inventory !== product.inventory || active !== Boolean(product.active);

  return (
    <form className="staff-inventory-row" onSubmit={(event) => { event.preventDefault(); void onSave(inventory, active); }}>
      <div><span>{product.model}</span><strong>{product.name}</strong></div>
      <label>Stok<input type="number" min="0" max="999" value={inventory} onChange={(event) => setInventory(Number(event.target.value))} /></label>
      <label className="staff-switch"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /><span />{active ? "Aktiv" : "Gizli"}</label>
      <button type="submit" disabled={!changed || busy}>{busy ? "Yadda saxlanır" : "Yadda saxla"}</button>
    </form>
  );
}

export function StaffPage({ accountStatus, user, onNavigateAccount, onNavigateHome }: StaffPageProps) {
  const [dashboard, setDashboard] = useState<StaffDashboard | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    setState("loading");
    try {
      setDashboard(await fetchStaffDashboard(signal));
      setState("ready");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setState("error");
    }
  }, []);

  useEffect(() => {
    if (accountStatus !== "authenticated" || user?.role !== "staff") return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [accountStatus, load, user?.role]);

  const run = async (key: string, action: () => Promise<void>, success: string) => {
    setBusy(key);
    setNotice("");
    try {
      await action();
      await load();
      setNotice(success);
    } catch {
      setNotice("Dəyişiklik tamamlanmadı. Mövcud vəziyyəti yenilə və yenidən yoxla.");
    } finally {
      setBusy("");
    }
  };

  if (accountStatus === "checking") {
    return <main id="content" className="staff-gate"><div className="account-loading-signal" aria-hidden="true"><i /><i /><i /></div><p>Studio girişi yoxlanılır</p></main>;
  }

  if (!user || user.role !== "staff") {
    return (
      <main id="content" className="staff-gate">
        <p>Studio sahəsi</p><h1>Studio panelinə bax.</h1>
        <span>Stok, sifariş və dinləyici qeydlərini demo Studio hesabı ilə sına.</span>
        <a className="button button--primary" href={demoUrl("/account")} onClick={onNavigateAccount}>Staff hesabına daxil ol</a>
      </main>
    );
  }

  return (
    <main id="content" className="staff-page">
      <section className="staff-hero">
        <SignalField accent="#aaa2ff" />
        <div className="staff-hero-copy">
          <a href={demoUrl("/")} onClick={(event) => onNavigateHome(event)}>← Mağazaya qayıt</a>
          <p>Studio idarəetməsi · demo</p>
          <h1>Səsin arxa<br />səhnəsi.</h1>
          <span>{user.displayName} · stok, sifariş və qeydlər</span>
        </div>
        <div className="staff-pulse" aria-hidden="true"><i /><i /><i /><b>S</b></div>
      </section>

      {state === "loading" && !dashboard ? <section className="staff-state">Studio məlumatları yüklənir.</section>
        : state === "error" || !dashboard ? <section className="staff-state"><p>Studio məlumatları alınmadı.</p><button type="button" onClick={() => void load()}>Yenidən yoxla</button></section>
          : (
            <>
              <nav className="staff-nav" aria-label="Studio bölmələri"><a href="#staff-orders">Sifarişlər</a><a href="#staff-inventory">Stok</a><a href="#staff-reviews">Qeydlər</a></nav>
              <section className="staff-metrics" aria-label="Studio xülasəsi">
                <div><span>Sifariş</span><strong>{String(dashboard.metrics.orderCount).padStart(2, "0")}</strong></div>
                <div><span>Dövriyyə</span><strong>{formatPrice(dashboard.metrics.revenue)}</strong></div>
                <div><span>Gözləyən qeyd</span><strong>{String(dashboard.metrics.pendingReviews).padStart(2, "0")}</strong></div>
                <div><span>Aktiv stok</span><strong>{dashboard.metrics.unitsInStock}</strong></div>
              </section>

              {notice && <p className="staff-notice" role="status">{notice}</p>}

              <section id="staff-orders" className="staff-section staff-orders">
                <div className="staff-section-heading"><p>Sifariş axını</p><h2>Hər sifarişin<br />bir ritmi var.</h2></div>
                <div className="staff-order-list">
                  {dashboard.orders.length ? dashboard.orders.map((order) => {
                    const next: Array<{ status: StaffOrderStatus; label: string }> = order.status === "placed"
                      ? [{ status: "paid", label: "Ödənişi təsdiqlə" }, { status: "cancelled", label: "Ləğv et" }]
                      : order.status === "paid"
                        ? [{ status: "packed", label: "Paketlə" }, { status: "cancelled", label: "Ləğv et" }]
                        : order.status === "packed" ? [{ status: "shipped", label: "Yola sal" }] : [];
                    return <article key={order.id}>
                      <div className="staff-order-status"><i /><span>{statusLabels[order.status]}</span></div>
                      <div><strong>{order.customerName}</strong><small>{order.customerEmail}</small></div>
                      <div><strong>{order.itemCount} məhsul</strong><small>{new Date(order.createdAt).toLocaleDateString("az-AZ")}</small></div>
                      <b>{formatPrice(order.total)}</b>
                      <div className="staff-row-actions">{next.map((action) => <button key={action.status} type="button" disabled={busy === `order-${order.id}`} onClick={() => void run(`order-${order.id}`, () => updateStaffOrder(order.id, action.status), "Sifariş statusu yeniləndi.")}>{action.label}</button>)}</div>
                    </article>;
                  }) : <p className="staff-empty">Hələ sifariş yoxdur.</p>}
                </div>
              </section>

              <section id="staff-inventory" className="staff-section staff-inventory">
                <div className="staff-section-heading"><p>Kolleksiya nəzarəti</p><h2>Stok sakit,<br />dəqiq qalır.</h2></div>
                <div className="staff-inventory-list">{dashboard.products.map((product) => <InventoryRow key={product.id} product={product} busy={busy === `product-${product.id}`} onSave={(inventory, active) => run(`product-${product.id}`, () => updateStaffProduct(product.id, inventory, active), `${product.name} ${product.model} yeniləndi.`)} />)}</div>
              </section>

              <section id="staff-reviews" className="staff-section staff-moderation">
                <div className="staff-section-heading"><p>Dinləyici qeydləri</p><h2>Söz yayımdan<br />əvvəl dinlənir.</h2></div>
                <div className="staff-review-list">
                  {dashboard.reviews.map((review) => <article key={review.id} className={`is-${review.status}`}>
                    <div><span>{review.productName} {review.model}</span><b>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</b></div>
                    <h3>{review.title}</h3><p>{review.body}</p><small>{review.authorName} · {review.status}</small>
                    <div className="staff-preview-status">
                      <i className={`is-${review.previewState}`} aria-hidden="true" />
                      <span>{previewLabels[review.previewState]}</span>
                      {review.previewedAt && <time dateTime={review.previewedAt}>{new Date(review.previewedAt).toLocaleString("az-AZ")}</time>}
                    </div>
                    {review.moderationNote && <aside className="staff-moderation-note"><small>Moderasiya qeydi</small><p>{review.moderationNote}</p></aside>}
                    <div className="staff-row-actions">
                      {review.status !== "published" && <button type="button" disabled={busy === `review-${review.id}`} onClick={() => void run(`review-${review.id}`, () => updateStaffReview(review.id, "published"), "Qeyd yayımlandı.")}>Yayımla</button>}
                      {review.status !== "hidden" && <button type="button" disabled={busy === `review-${review.id}`} onClick={() => void run(`review-${review.id}`, () => updateStaffReview(review.id, "hidden"), "Qeyd gizlədildi.")}>Gizlət</button>}
                      {review.status !== "pending" && <button type="button" disabled={busy === `review-${review.id}`} onClick={() => void run(`review-${review.id}`, () => updateStaffReview(review.id, "pending"), "Qeyd yoxlama sırasına qaytarıldı.")}>Yoxlamaya qaytar</button>}
                    </div>
                  </article>)}
                </div>
              </section>
            </>
          )}
    </main>
  );
}
