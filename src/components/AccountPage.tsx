import { demoUrl } from "../demo/navigation";
import { useEffect, useState } from "react";
import type { AccountAddress, AccountSecurityEvent, AccountUser } from "../api/account";
import type { AccountOrder, NewAddress, OrderReceipt } from "../api/commerce";
import { formatPrice } from "../data/products";
import { SignalField } from "./SignalField";
import { WarrantySection } from "./WarrantySection";

const monthNames = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr",
];

function formatOrderDate(value: string): string {
  const date = new Date(value);
  return `${String(date.getDate()).padStart(2, "0")} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

type AccountPageProps = {
  addresses: AccountAddress[];
  securityEvents: AccountSecurityEvent[];
  orders: AccountOrder[];
  status: "checking" | "guest" | "authenticated";
  user: AccountUser | null;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onCreateAddress: (address: NewAddress) => Promise<AccountAddress>;
  onLogin: (email: string, password: string) => Promise<void>;
  onLogout: () => Promise<void>;
  onNavigateHome: (event: React.MouseEvent<HTMLAnchorElement>, hash?: string) => void;
  onNavigateRecovery: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  onNavigateStaff: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  onRegister: (displayName: string, email: string, password: string) => Promise<void>;
  onRequestReceipt: (publicNumber: number) => Promise<OrderReceipt>;
  onSetDefaultAddress: (addressId: string) => Promise<void>;
  onUpdateProfile: (displayName: string) => Promise<void>;
};

export function AccountPage({
  addresses,
  securityEvents,
  orders,
  status,
  user,
  onChangePassword,
  onCreateAddress,
  onLogin,
  onLogout,
  onNavigateHome,
  onNavigateRecovery,
  onNavigateStaff,
  onRegister,
  onRequestReceipt,
  onSetDefaultAddress,
  onUpdateProfile,
}: AccountPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [action, setAction] = useState<"idle" | "login" | "profile" | "address" | "default" | "password" | "logout">("idle");
  const [message, setMessage] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [addressMessage, setAddressMessage] = useState("");
  const [addressDraft, setAddressDraft] = useState<NewAddress>({
    label: "",
    recipientName: "",
    lineOne: "",
    lineTwo: "",
    city: "Bakı",
    postalCode: "",
  });
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const [receiptError, setReceiptError] = useState("");
  const [receiptLoading, setReceiptLoading] = useState<number | null>(null);

  useEffect(() => setDisplayName(user?.displayName ?? ""), [user?.displayName]);
  useEffect(() => {
    setReceipt(null);
    setReceiptError("");
  }, [user?.id]);

  const openReceipt = async (publicNumber: number) => {
    setReceiptLoading(publicNumber);
    setReceiptError("");
    try {
      setReceipt(await onRequestReceipt(publicNumber));
    } catch {
      setReceipt(null);
      setReceiptError("Qəbz açılmadı. Yenidən yoxla.");
    } finally {
      setReceiptLoading(null);
    }
  };

  const submitLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setAction("login");
    setMessage("");
    try {
      await onLogin(email, password);
      setPassword("");
    } catch {
      setMessage("Giriş alınmadı. Email və şifrəni yoxla.");
    } finally {
      setAction("idle");
    }
  };

  const submitRegistration = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setMessage("Şifrələr bir-birinə uyğun deyil.");
      return;
    }
    setAction("login");
    setMessage("");
    try {
      await onRegister(displayName, email, password);
      setPassword("");
      setConfirmPassword("");
    } catch {
      setMessage("Qeydiyyat tamamlanmadı. Məlumatları və email ünvanını yoxla.");
    } finally {
      setAction("idle");
    }
  };

  const switchAuthMode = (mode: "login" | "register") => {
    setAuthMode(mode);
    setMessage("");
    setPassword("");
    setConfirmPassword("");
  };

  const submitProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setAction("profile");
    setMessage("");
    try {
      await onUpdateProfile(displayName);
      setMessage("Profil adı yeniləndi.");
    } catch {
      setMessage("Profil adı yenilənmədi. 2–60 simvol istifadə et.");
    } finally {
      setAction("idle");
    }
  };

  const submitLogout = async () => {
    setAction("logout");
    setMessage("");
    try {
      await onLogout();
    } catch {
      setMessage("Çıxış tamamlanmadı. Yenidən yoxla.");
    } finally {
      setAction("idle");
    }
  };

  const submitPasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword !== newPasswordConfirmation) {
      setPasswordMessage("Yeni şifrələr bir-birinə uyğun deyil.");
      return;
    }
    setAction("password");
    setPasswordMessage("");
    try {
      await onChangePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirmation("");
      setPasswordMessage("Şifrə yeniləndi. Bu brauzerdə yeni session açıldı.");
    } catch {
      setPasswordMessage("Şifrə yenilənmədi. Cari şifrəni və yeni şifrə qaydalarını yoxla.");
    } finally {
      setAction("idle");
    }
  };

  const submitAddress = async (event: React.FormEvent) => {
    event.preventDefault();
    setAction("address");
    setAddressMessage("");
    try {
      await onCreateAddress(addressDraft);
      setAddressDraft({ label: "", recipientName: "", lineOne: "", lineTwo: "", city: "Bakı", postalCode: "" });
      setAddressMessage("Yeni çatdırılma ünvanı əlavə edildi.");
    } catch {
      setAddressMessage("Ünvan əlavə edilmədi. Sahələri yoxla.");
    } finally {
      setAction("idle");
    }
  };

  const chooseDefaultAddress = async (addressId: string) => {
    setAction("default");
    setAddressMessage("");
    try {
      await onSetDefaultAddress(addressId);
      setAddressMessage("Əsas çatdırılma ünvanı yeniləndi.");
    } catch {
      setAddressMessage("Əsas ünvan yenilənmədi.");
    } finally {
      setAction("idle");
    }
  };

  if (status === "checking") {
    return (
      <main id="content" className="account-loading" aria-live="polite">
        <div className="account-loading-signal" aria-hidden="true"><i /><i /><i /></div>
        <p>Hesab yoxlanılır</p>
      </main>
    );
  }

  if (status === "guest" || !user) {
    return (
      <main id="content" className="account-page account-page--guest">
        <section className="account-auth-layout">
          <div className="account-auth-copy">
            <a className="account-home-link" href={demoUrl("/")} onClick={(event) => onNavigateHome(event)}>← Ana səhifə</a>
            <p>Şəxsi dinləmə sahəsi</p>
            <h1>{authMode === "login" ? <>Səsin səni<br />tanısın.</> : <>Öz səs<br />sahəni yarat.</>}</h1>
            <p>{authMode === "login"
              ? "Seçimlərini, ünvanlarını və sifariş tarixçəni bir yerdə saxla."
              : "Bir hesab yarat, seçdiyin səs formalarına hər yerdən qayıt."}</p>
            <div className="account-auth-tabs" role="tablist" aria-label="Hesab əməliyyatı">
              <button type="button" role="tab" aria-selected={authMode === "login"} className={authMode === "login" ? "is-active" : ""} onClick={() => switchAuthMode("login")}>Daxil ol</button>
              <button type="button" role="tab" aria-selected={authMode === "register"} className={authMode === "register" ? "is-active" : ""} onClick={() => switchAuthMode("register")}>Qeydiyyat</button>
            </div>
            <form onSubmit={authMode === "login" ? submitLogin : submitRegistration}>
              {authMode === "register" && <label>Ad və soyad<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" minLength={2} maxLength={60} required /></label>}
              <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required /></label>
              <label>Şifrə<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={authMode === "login" ? "current-password" : "new-password"} minLength={authMode === "login" ? 8 : 10} required /></label>
              {authMode === "register" && <label>Şifrəni təkrarla<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={10} required /></label>}
              {authMode === "login" && <a className="account-forgot-link" href={demoUrl("/recover")} onClick={onNavigateRecovery}>Şifrəni unutdun?</a>}
              {message && <p className="account-form-message account-form-message--error" role="alert">{message}</p>}
              <button className="button button--primary" type="submit" disabled={action === "login"}>
                {action === "login" ? "Yoxlanılır" : authMode === "login" ? "Hesaba daxil ol" : "Hesab yarat"}
              </button>
            </form>
            <p className="account-form-message">Demo hesabı seç; real məlumat və şifrə istifadə etmə.</p>
            <div className="account-auth-tabs" aria-label="Demo hesabları">
              <button type="button" disabled={action === "login"} onClick={() => void onLogin("demo@seda.example", "seda-demo")}>Demo müştəri</button>
              <button type="button" disabled={action === "login"} onClick={() => void onLogin("studio@seda.example", "seda-demo")}>Demo Studio</button>
            </div>
          </div>
          <div className="account-signal-stage" aria-hidden="true">
            <SignalField accent="#aaa2ff" />
            <div className="account-orbit"><i /><i /><i /></div>
            <div className="account-monogram"><span>S</span><span>Ə</span><span>D</span><span>A</span></div>
            <p>Bir profil.<br />Bütün dinləmə formaların.</p>
          </div>
        </section>
      </main>
    );
  }

  const primaryAddress = addresses.find((address) => address.isDefault) ?? addresses[0];
  return (
    <main id="content" className="account-page account-page--member">
      <section className="account-member-hero">
        <div>
          <p>Şəxsi sahə</p>
          <h1>Xoş gördük,<br />{user.displayName.split(" ")[0]}.</h1>
        </div>
        <div className="account-member-signal" aria-hidden="true">
          <SignalField accent="#ff765f" />
          <span>{user.displayName.slice(0, 1)}</span>
        </div>
        <p className="account-member-meta"><span>Aktiv profil</span><b>{user.email}</b><small>{user.role === "staff" ? "Studio komandası" : "SƏDA dinləyicisi"}</small></p>
      </section>

      <section className="account-dashboard">
        <div className="account-dashboard-nav" aria-label="Hesab bölmələri">
          {user.role === "customer" && <a href="#warranty">Zəmanət</a>}
          <a className="is-active" href="#profile">Profil</a><a href="#address">Ünvan</a><a href="#orders">Sifarişlər</a>{user.role === "staff" && <a className="account-staff-link" href={demoUrl("/studio")} onClick={onNavigateStaff}>Studio paneli</a>}
        </div>
        <div className="account-dashboard-grid">
          <article id="profile" className="account-profile-panel">
            <p>Profil məlumatı</p>
            <h2>Sənə necə müraciət edək?</h2>
            <form onSubmit={submitProfile}>
              <label>Ad və soyad<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={60} required /></label>
              <label>Email<input value={user.email} disabled /></label>
              {message && <p className="account-form-message" role="status">{message}</p>}
              <button className="button button--primary" type="submit" disabled={action === "profile" || displayName.trim() === user.displayName}>
                {action === "profile" ? "Yadda saxlanır" : "Dəyişikliyi yadda saxla"}
              </button>
            </form>
          </article>

          <article id="address" className="account-address-panel">
            <p>Çatdırılma ünvanları</p>
            <h2>Məkanlarını idarə et.</h2>
            {addresses.length ? (
              <div className="account-address-list">
                {addresses.map((address) => (
                  <section className={address.isDefault ? "is-default" : ""} key={address.id}>
                    <div>
                      <strong>{address.label}</strong>
                      {address.isDefault ? <small>Əsas ünvan</small> : null}
                    </div>
                    <address>
                      <span>{address.recipientName}</span>
                      <span>{address.lineOne}{address.lineTwo ? `, ${address.lineTwo}` : ""}</span>
                      <span>{address.postalCode}, {address.city}</span>
                    </address>
                    {!address.isDefault && (
                      <div className="account-address-actions">
                        <button type="button" disabled={action === "default"} onClick={() => chooseDefaultAddress(address.id)}>Əsas et</button>
                      </div>
                    )}
                  </section>
                ))}
              </div>
            ) : <p className="account-empty-address">Hələ ünvan əlavə edilməyib.</p>}
            {primaryAddress && <p className="account-address-current">Aktiv çatdırılma nöqtəsi: <strong>{primaryAddress.label}</strong></p>}
            <details className="account-address-create">
              <summary>Yeni ünvan əlavə et</summary>
              <form onSubmit={submitAddress}>
                <label>Etiket<input value={addressDraft.label} onChange={(event) => setAddressDraft({ ...addressDraft, label: event.target.value })} minLength={2} maxLength={30} placeholder="İş" required /></label>
                <label>Alıcı<input value={addressDraft.recipientName} onChange={(event) => setAddressDraft({ ...addressDraft, recipientName: event.target.value })} minLength={2} maxLength={60} required /></label>
                <label className="account-address-wide">Ünvan<input value={addressDraft.lineOne} onChange={(event) => setAddressDraft({ ...addressDraft, lineOne: event.target.value })} minLength={4} maxLength={100} required /></label>
                <label className="account-address-wide">Əlavə sətir<input value={addressDraft.lineTwo} onChange={(event) => setAddressDraft({ ...addressDraft, lineTwo: event.target.value })} maxLength={100} /></label>
                <label>Şəhər<input value={addressDraft.city} onChange={(event) => setAddressDraft({ ...addressDraft, city: event.target.value })} minLength={2} maxLength={50} required /></label>
                <label>Poçt indeksi<input value={addressDraft.postalCode} onChange={(event) => setAddressDraft({ ...addressDraft, postalCode: event.target.value })} minLength={3} maxLength={12} required /></label>
                <button className="button button--primary account-address-wide" type="submit" disabled={action === "address"}>{action === "address" ? "Əlavə edilir" : "Ünvanı əlavə et"}</button>
              </form>
            </details>
            {addressMessage && <p className="account-form-message" role="status">{addressMessage}</p>}
          </article>
        </div>
        <section className="account-security-panel" aria-labelledby="account-security-title">
          <div>
            <p>Hesab təhlükəsizliyi</p>
            <h2 id="account-security-title">Girişi nəzarətdə saxla.</h2>
          </div>
          <div className="account-security-content">
            <form className="account-password-form" onSubmit={submitPasswordChange}>
              <div>
                <p>Şifrəni dəyiş</p>
                <span>Cari şifrəni təsdiqlə və ən azı 10 simvolluq yeni şifrə seç.</span>
              </div>
              <label>Cari şifrə<input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} minLength={8} maxLength={128} autoComplete="current-password" required /></label>
              <label>Yeni şifrə<input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={10} maxLength={128} autoComplete="new-password" required /></label>
              <label>Yeni şifrəni təkrarla<input type="password" value={newPasswordConfirmation} onChange={(event) => setNewPasswordConfirmation(event.target.value)} minLength={10} maxLength={128} autoComplete="new-password" required /></label>
              {passwordMessage && <p className="account-form-message" role="status">{passwordMessage}</p>}
              <button className="button button--primary" type="submit" disabled={action === "password"}>{action === "password" ? "Yenilənir" : "Şifrəni yenilə"}</button>
            </form>
            <div className="account-security-history">
              <h3>Son təhlükəsizlik hadisələri</h3>
              {securityEvents.length ? (
                <div className="account-security-events">
                  {securityEvents.map((event) => (
                    <article key={event.id}>
                      <time dateTime={event.occurredAt}>{formatOrderDate(event.occurredAt)}</time>
                      <p>{event.summary}</p>
                    </article>
                  ))}
                </div>
              ) : <p className="account-security-empty">Hələ təhlükəsizlik hadisəsi yoxdur.</p>}
            </div>
          </div>
        </section>
        <section id="orders" className="account-orders-panel">
          <div className="account-orders-heading">
            <div><p>Sifariş tarixçəsi</p><h2>Dinləmə arxivi.</h2></div>
            <span>{String(orders.length).padStart(2, "0")} sifariş</span>
          </div>
          {orders.length ? (
            <div className="account-order-list">
              {orders.map((order) => (
                <article key={order.id}>
                  <div className="account-order-code">
                    <span>{order.status === "placed" ? "Qəbul edildi" : order.status}</span>
                    <b>#{order.publicNumber}</b>
                    <button type="button" onClick={() => openReceipt(order.publicNumber)} disabled={receiptLoading === order.publicNumber}>
                      {receiptLoading === order.publicNumber ? "Açılır" : "Qəbzə bax"}
                    </button>
                  </div>
                  <div className="account-order-products">
                    {order.items.map((item) => <span key={item.productId}>{item.productName}<small>{item.quantity} ədəd</small></span>)}
                  </div>
                  <time dateTime={order.createdAt}>{formatOrderDate(order.createdAt)}</time>
                  <strong>{formatPrice(order.total)}</strong>
                </article>
              ))}
            </div>
          ) : (
            <div className="account-orders-empty"><span>∿</span><p>Hələ sifariş yoxdur. Seçdiyin ilk səs forması burada görünəcək.</p></div>
          )}
          {receiptError && <p className="account-receipt-error" role="alert">{receiptError}</p>}
          {receipt && (
            <article className="account-receipt" aria-live="polite">
              <div className="account-receipt-heading">
                <div><p>Rəsmi qəbz</p><h3>#{receipt.publicNumber}</h3></div>
                <button type="button" onClick={() => setReceipt(null)} aria-label="Qəbzi bağla">Bağla</button>
              </div>
              <div className="account-receipt-meta">
                <span><small>Tarix</small>{formatOrderDate(receipt.createdAt)}</span>
                <span><small>Status</small>{receipt.status}</span>
                <span><small>Alıcı</small>{receipt.recipientName}</span>
                <address>{receipt.lineOne}{receipt.lineTwo ? `, ${receipt.lineTwo}` : ""}<br />{receipt.postalCode}, {receipt.city}</address>
              </div>
              <div className="account-receipt-lines">
                {receipt.items.map((item) => (
                  <span key={item.productId}><b>{item.productName}</b><small>{item.quantity} × {formatPrice(item.unitPrice)}</small></span>
                ))}
              </div>
              <div className="account-receipt-total"><span>Yekun</span><strong>{formatPrice(receipt.total)}</strong></div>
            </article>
          )}
        </section>
        {user.role === "customer" && <WarrantySection key={user.id} />}
        <button className="account-logout" type="button" onClick={submitLogout} disabled={action === "logout"}>
          {action === "logout" ? "Çıxış edilir" : "Hesabdan çıx"}
        </button>
      </section>
    </main>
  );
}
