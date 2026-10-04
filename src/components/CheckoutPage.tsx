import { demoUrl } from "../demo/navigation";
import { useEffect, useMemo, useState } from "react";
import type { AccountAddress, AccountUser } from "../api/account";
import type { AccountOrder, NewAddress } from "../api/commerce";
import { formatPrice, type Product } from "../data/products";
import { SignalField } from "./SignalField";

type CheckoutLine = { product: Product; quantity: number };

type CheckoutPageProps = {
  addresses: AccountAddress[];
  lines: CheckoutLine[];
  status: "checking" | "guest" | "authenticated";
  user: AccountUser | null;
  onCreateAddress: (address: NewAddress) => Promise<AccountAddress>;
  onNavigateAccount: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  onNavigateHome: (event: React.MouseEvent<HTMLAnchorElement>, hash?: string) => void;
  onPlaceOrder: (addressId: string, couponCode: string) => Promise<AccountOrder>;
};

const emptyAddress: NewAddress = {
  label: "Ev",
  recipientName: "",
  lineOne: "",
  lineTwo: "",
  city: "Bakı",
  postalCode: "AZ1000",
};

function shortOrderId(id: string): string {
  return id.replace(/^demo-order-/, "").padStart(8, "0").slice(0, 8).toUpperCase();
}

export function CheckoutPage({
  addresses,
  lines,
  status,
  user,
  onCreateAddress,
  onNavigateAccount,
  onNavigateHome,
  onPlaceOrder,
}: CheckoutPageProps) {
  const [addressMode, setAddressMode] = useState<"saved" | "new">(addresses.length ? "saved" : "new");
  const [selectedAddressId, setSelectedAddressId] = useState(addresses[0]?.id ?? "");
  const [newAddress, setNewAddress] = useState<NewAddress>({
    ...emptyAddress,
    recipientName: user?.displayName ?? "",
  });
  const [couponCode, setCouponCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<AccountOrder | null>(null);
  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0),
    [lines],
  );

  useEffect(() => {
    if (selectedAddressId || !addresses[0]) return;
    setSelectedAddressId(addresses[0].id);
    setAddressMode("saved");
  }, [addresses, selectedAddressId]);

  const updateAddress = (field: keyof NewAddress, value: string) => {
    setNewAddress((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      let addressId = selectedAddressId;
      if (addressMode === "new") {
        const created = await onCreateAddress(newAddress);
        addressId = created.id;
        setSelectedAddressId(created.id);
      }
      if (!addressId) throw new Error("Çatdırılma ünvanı seçilməyib.");
      setOrder(await onPlaceOrder(addressId, couponCode));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sifariş tamamlanmadı.");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "checking") {
    return <main id="content" className="account-loading"><div className="account-loading-signal"><i /><i /><i /></div><p>Checkout hazırlanır</p></main>;
  }

  if (status === "guest" || !user) {
    return (
      <main id="content" className="checkout-gate">
        <SignalField accent="#aaa2ff" />
        <div>
          <p>Sifarişi davam etdirmək üçün</p>
          <h1>Əvvəlcə səni<br />tanıyaq.</h1>
          <span>Səbətin qorunur. Hesaba daxil olduqdan sonra checkout-a qayıdacaqsan.</span>
          <a className="button button--primary" href={demoUrl("/account")} onClick={onNavigateAccount}>Hesaba daxil ol</a>
        </div>
      </main>
    );
  }

  if (order) {
    return (
      <main id="content" className="checkout-success">
        <SignalField accent="#ff765f" />
        <div className="checkout-success-orbit" aria-hidden="true"><i /><i /><i /></div>
        <div className="checkout-success-copy">
          <p>Sifariş qəbul edildi · {shortOrderId(order.id)}</p>
          <h1>Səsin<br />yoldadır.</h1>
          <span>{order.items.length} məhsul · {formatPrice(order.total)} · Bakı daxilində çatdırılma</span>
          <div>
            <a className="button button--primary" href={demoUrl("/account")} onClick={onNavigateAccount}>Sifarişə hesabda bax</a>
            <a href={demoUrl("/")} onClick={(event) => onNavigateHome(event)}>Ana səhifəyə qayıt</a>
          </div>
        </div>
      </main>
    );
  }

  if (!lines.length) {
    return (
      <main id="content" className="checkout-empty">
        <p>Səbət boşdur</p><h1>Əvvəlcə bir<br />səs forması seç.</h1>
        <a className="button button--primary" href={demoUrl("/#collection")} onClick={(event) => onNavigateHome(event, "#collection")}>Kolleksiyaya bax</a>
      </main>
    );
  }

  return (
    <main id="content" className="checkout-page">
      <div className="checkout-heading">
        <a href={demoUrl("/")} onClick={(event) => onNavigateHome(event)}>← Mağazaya qayıt</a>
        <p>Təhlükəsiz checkout</p>
        <h1>Son toxunuş.</h1>
        <span>Sifarişin yalnız bu təqdimat demosunda simulyasiya olunur.</span>
      </div>

      <form className="checkout-layout" onSubmit={submit}>
        <div className="checkout-form-column">
          <section className="checkout-step">
            <div className="checkout-step-title"><span>01</span><div><p>Çatdırılma</p><h2>Səs hara gəlsin?</h2></div></div>
            {!!addresses.length && (
              <div className="checkout-address-modes">
                <button type="button" className={addressMode === "saved" ? "is-active" : ""} onClick={() => setAddressMode("saved")}>Yadda saxlanmış ünvan</button>
                <button type="button" className={addressMode === "new" ? "is-active" : ""} onClick={() => setAddressMode("new")}>Yeni ünvan</button>
              </div>
            )}
            {addressMode === "saved" ? (
              <div className="checkout-address-list">
                {addresses.map((address) => (
                  <label key={address.id} className={selectedAddressId === address.id ? "is-selected" : ""}>
                    <input type="radio" name="address" value={address.id} checked={selectedAddressId === address.id} onChange={() => setSelectedAddressId(address.id)} />
                    <span><b>{address.label}</b><small>{address.recipientName} · {address.lineOne}, {address.city}</small></span>
                    <i aria-hidden="true" />
                  </label>
                ))}
              </div>
            ) : (
              <div className="checkout-address-form">
                <label>Ünvan adı<input value={newAddress.label} onChange={(event) => updateAddress("label", event.target.value)} minLength={2} maxLength={30} required /></label>
                <label>Ad və soyad<input value={newAddress.recipientName} onChange={(event) => updateAddress("recipientName", event.target.value)} minLength={2} maxLength={60} required /></label>
                <label className="is-wide">Ünvan<input value={newAddress.lineOne} onChange={(event) => updateAddress("lineOne", event.target.value)} minLength={4} maxLength={100} required /></label>
                <label className="is-wide">Mənzil / qeyd <span>İstəyə bağlı</span><input value={newAddress.lineTwo} onChange={(event) => updateAddress("lineTwo", event.target.value)} maxLength={100} /></label>
                <label>Şəhər<input value={newAddress.city} onChange={(event) => updateAddress("city", event.target.value)} minLength={2} maxLength={50} required /></label>
                <label>Poçt indeksi<input value={newAddress.postalCode} onChange={(event) => updateAddress("postalCode", event.target.value)} minLength={3} maxLength={12} required /></label>
              </div>
            )}
          </section>

          <section className="checkout-step">
            <div className="checkout-step-title"><span>02</span><div><p>Üstünlük</p><h2>Kuponun varmı?</h2></div></div>
            <label className="checkout-coupon">Kupon kodu<input value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} maxLength={30} placeholder="Məsələn, SALAM10" /></label>
            <p className="checkout-help"><b>TEKSES20</b> dinləyici kampaniyası hər hesab üçün bir sifarişdə keçərlidir. Endirim sifariş təsdiqlənəndə hesablanacaq.</p>
          </section>

          <section className="checkout-step checkout-payment">
            <div className="checkout-step-title"><span>03</span><div><p>Ödəniş</p><h2>Simulyasiya rejimi.</h2></div></div>
            <div><i aria-hidden="true" /><span><b>Demo ödəniş</b><small>Heç bir kart məlumatı daxil edilmir və real ödəniş aparılmır.</small></span><strong>DEMO</strong></div>
          </section>
        </div>

        <aside className="checkout-summary">
          <div className="checkout-summary-signal" aria-hidden="true"><SignalField accent="#aaa2ff" /><span>{String(lines.reduce((sum, line) => sum + line.quantity, 0)).padStart(2, "0")}</span></div>
          <p>Sifariş xülasəsi</p>
          <div className="checkout-summary-lines">
            {lines.map(({ product, quantity }) => (
              <div key={product.id}><img src={product.image} alt="" /><span><b>{product.name} {product.model}</b><small>{quantity} ədəd</small></span><strong>{formatPrice(product.price * quantity)}</strong></div>
            ))}
          </div>
          <div className="checkout-summary-total"><span>Aralıq cəm</span><strong>{formatPrice(subtotal)}</strong></div>
          <p className="checkout-summary-note">Çatdırılma Bakı daxilində pulsuzdur. Kupon endirimi təsdiqdən sonra görünəcək.</p>
          {error && <p className="checkout-error" role="alert">{error}</p>}
          <button className="button button--coral" type="submit" disabled={submitting}>{submitting ? "Sifariş yaradılır" : "Sifarişi təsdiqlə"}</button>
        </aside>
      </form>
    </main>
  );
}
