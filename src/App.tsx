import { readState, resetDemo } from "./demo/store";
import { demoUrl, storePathname } from "./demo/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  changePassword,
  fetchAddresses,
  fetchSecurityEvents,
  fetchSession,
  login,
  logout,
  register,
  requestPasswordRecovery,
  resetPassword,
  setDefaultAddress,
  updateProfile,
  type AccountAddress,
  type AccountSecurityEvent,
  type AccountUser,
} from "./api/account";
import { fetchCatalog } from "./api/catalog";
import {
  createAddress,
  fetchCart,
  fetchOrderReceipt,
  fetchOrders,
  placeOrder,
  replaceCart as replaceServerCart,
  type AccountOrder,
  type NewAddress,
} from "./api/commerce";
import { AccountPage } from "./components/AccountPage";
import { CheckoutPage } from "./components/CheckoutPage";
import { RecoveryPage } from "./components/RecoveryPage";
import { SignalField } from "./components/SignalField";
import { ProductDetailPage, ProductNotFound } from "./components/ProductDetailPage";
import { StaffPage } from "./components/StaffPage";
import { SupportPage } from "./components/SupportPage";
import {
  formatPrice,
  productGroups,
  products as localProducts,
  type Product,
  type ProductGroup,
} from "./data/products";
import "./styles.css";

type IconName =
  | "arrow"
  | "bag"
  | "check"
  | "close"
  | "menu"
  | "minus"
  | "moon"
  | "plus"
  | "search"
  | "sun"
  | "user";

type CartLine = { id: string; quantity: number };
type Theme = "light" | "dark";
type SortMode = "featured" | "price-asc" | "price-desc";
type CatalogState = "loading" | "ready" | "fallback";
type StoreRoute =
  | { page: "home" }
  | { page: "account" }
  | { page: "checkout" }
  | { page: "recover" }
  | { page: "resetPassword" }
  | { page: "staff" }
  | { page: "support"; warrantyCaseId?: string }
  | { page: "product"; productId: string };

const heroProductIds = ["m1", "r1", "i1", "s1"];

function readStoreRoute(): StoreRoute {
  if (/^\/account\/?$/.test(storePathname())) return { page: "account" };
  if (/^\/checkout\/?$/.test(storePathname())) return { page: "checkout" };
  if (/^\/recover\/?$/.test(storePathname())) return { page: "recover" };
  if (/^\/reset-password\/?$/.test(storePathname())) return { page: "resetPassword" };
  if (/^\/studio\/?$/.test(storePathname())) return { page: "staff" };
  if (/^\/support\/?$/.test(storePathname())) return { page: "support" };
  const warrantyMatch = storePathname().match(/^\/support\/warranty\/cases\/([a-zA-Z0-9_-]+)\/?$/);
  if (warrantyMatch) return { page: "support", warrantyCaseId: warrantyMatch[1] };
  const match = storePathname().match(/^\/products\/([^/]+)\/?$/);
  return match ? { page: "product", productId: decodeURIComponent(match[1]) } : { page: "home" };
}

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <path d="M5 12h13m-5-5 5 5-5 5" />,
    bag: <><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    close: <><path d="m6 6 12 12" /><path d="M18 6 6 18" /></>,
    menu: <><path d="M4 8h16" /><path d="M4 16h16" /></>,
    minus: <path d="M5 12h14" />,
    moon: <path d="M19 15.4A8 8 0 0 1 8.6 5a7 7 0 1 0 10.4 10.4Z" />,
    plus: <><path d="M5 12h14" /><path d="M12 5v14" /></>,
    search: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></>,
    sun: <><circle cx="12" cy="12" r="3.5" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20c.7-4 3-6 6.5-6s5.8 2 6.5 6" /></>,
  };

  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
        {paths[name]}
      </g>
    </svg>
  );
}

function Mark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand-lockup${compact ? " brand-lockup--compact" : ""}`}>
      <svg className="brand-mark" viewBox="0 0 44 44" aria-hidden="true">
        <path d="M7 22c6.2-9.7 23.8-9.7 30 0" />
        <path d="M11.5 27.5c4.4-6.3 16.6-6.3 21 0" />
        <path d="M16.5 32c2.2-2.7 8.8-2.7 11 0" />
        <circle cx="22" cy="35.2" r="2.25" />
      </svg>
      {!compact && <span className="brand-word">SƏDA</span>}
    </span>
  );
}

function initialTheme(): Theme {
  try {
    const saved = window.localStorage.getItem("seda-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch { /* Use the system theme when storage is unavailable. */ }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [products, setProducts] = useState<Product[]>(localProducts);
  const [catalogState, setCatalogState] = useState<CatalogState>("loading");
  const [accountStatus, setAccountStatus] = useState<"checking" | "guest" | "authenticated">("checking");
  const [accountUser, setAccountUser] = useState<AccountUser | null>(null);
  const [accountAddresses, setAccountAddresses] = useState<AccountAddress[]>([]);
  const [accountSecurityEvents, setAccountSecurityEvents] = useState<AccountSecurityEvent[]>([]);
  const [accountOrders, setAccountOrders] = useState<AccountOrder[]>([]);
  const [selectedId, setSelectedId] = useState(heroProductIds[0]);
  const [cart, setCart] = useState<CartLine[]>(() => readState().cart.map((line) => ({ id: line.productId, quantity: line.quantity })));
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [route, setRoute] = useState<StoreRoute>(readStoreRoute);
  const [query, setQuery] = useState("");
  const [remoteSearchResults, setRemoteSearchResults] = useState<Product[] | null>(null);
  const [searchPending, setSearchPending] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<ProductGroup>("Hamısı");
  const [sortMode, setSortMode] = useState<SortMode>("featured");
  const [notice, setNotice] = useState("");
  const [checkoutRequested, setCheckoutRequested] = useState(false);

  const heroProducts = useMemo(
    () => heroProductIds
      .map((id) => products.find((product) => product.id === id))
      .filter((product): product is Product => Boolean(product)),
    [products],
  );
  const selected = heroProducts.find((product) => product.id === selectedId)
    ?? heroProducts[0]
    ?? localProducts[0];
  const routeProduct = route.page === "product"
    ? products.find((product) => product.id === route.productId)
    : null;
  const relatedProducts = routeProduct
    ? [
      ...products.filter((product) => product.id !== routeProduct.id && product.group === routeProduct.group),
      ...products.filter((product) => product.id !== routeProduct.id && product.group !== routeProduct.group),
    ].slice(0, 3)
    : [];
  const cartCount = cart.reduce((total, line) => total + line.quantity, 0);
  const cartTotal = cart.reduce((total, line) => {
    const product = products.find((item) => item.id === line.id);
    return total + (product?.price ?? 0) * line.quantity;
  }, 0);
  const checkoutLines = cart.flatMap((line) => {
    const product = products.find((item) => item.id === line.id);
    return product ? [{ product, quantity: line.quantity }] : [];
  });

  const localSearchResults = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("az");
    if (!term) return products;
    return products.filter((product) =>
      [product.name, product.model, product.category, product.group, product.description]
        .join(" ")
        .toLocaleLowerCase("az")
        .includes(term),
    );
  }, [products, query]);
  const searchResults = remoteSearchResults ?? localSearchResults;

  const visibleProducts = useMemo(() => {
    const term = catalogQuery.trim().toLocaleLowerCase("az");
    const next = products.filter((product) => {
      const groupMatches = activeGroup === "Hamısı" || product.group === activeGroup;
      const termMatches = !term || [product.name, product.model, product.category, product.description]
        .join(" ")
        .toLocaleLowerCase("az")
        .includes(term);
      return groupMatches && termMatches;
    });
    if (sortMode === "price-asc") return [...next].sort((a, b) => a.price - b.price);
    if (sortMode === "price-desc") return [...next].sort((a, b) => b.price - a.price);
    return next;
  }, [activeGroup, catalogQuery, products, sortMode]);

  useEffect(() => {
    const controller = new AbortController();
    fetchCatalog(controller.signal)
      .then((catalog) => {
        setProducts(catalog);
        setCatalogState("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.warn("Using bundled catalogue fallback.", error);
        setCatalogState("fallback");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (!searchOpen || !term) {
      setRemoteSearchResults(null);
      setSearchPending(false);
      return;
    }

    const controller = new AbortController();
    setSearchPending(true);
    const timer = window.setTimeout(() => {
      fetchCatalog(controller.signal, term)
        .then(setRemoteSearchResults)
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setRemoteSearchResults(null);
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearchPending(false);
        });
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchOpen]);

  useEffect(() => {
    const controller = new AbortController();
    fetchSession(controller.signal)
      .then(async (user) => {
        if (!user) {
          setAccountUser(null);
          setAccountAddresses([]);
          setAccountSecurityEvents([]);
          setAccountOrders([]);
          setAccountStatus("guest");
          return;
        }
        const [addresses, securityEvents, orders, serverCart] = await Promise.all([
          fetchAddresses(),
          fetchSecurityEvents(),
          fetchOrders(),
          fetchCart(),
        ]);
        setAccountUser(user);
        setAccountAddresses(addresses);
        setAccountSecurityEvents(securityEvents);
        setAccountOrders(orders);
        setCart(serverCart.map((item) => ({ id: item.productId, quantity: item.quantity })));
        setAccountStatus("authenticated");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setAccountUser(null);
        setAccountAddresses([]);
        setAccountSecurityEvents([]);
        setAccountOrders([]);
        setAccountStatus("guest");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const updateRoute = () => setRoute(readStoreRoute());
    window.addEventListener("popstate", updateRoute);
    return () => window.removeEventListener("popstate", updateRoute);
  }, []);

  useEffect(() => {
    document.title = routeProduct
      ? `${routeProduct.name} ${routeProduct.model} — SƏDA`
      : route.page === "account"
        ? "Hesab — SƏDA"
      : route.page === "checkout"
        ? "Checkout — SƏDA"
      : route.page === "recover"
        ? "Şifrəni bərpa et — SƏDA"
      : route.page === "resetPassword"
        ? "Yeni şifrə — SƏDA"
      : route.page === "staff"
        ? "Studio — SƏDA"
      : route.page === "support"
        ? "Dəstək — SƏDA"
      : route.page === "product"
        ? "Məhsul tapılmadı — SƏDA"
        : "SƏDA — Şəxsi audio";
  }, [route.page, routeProduct]);

  useEffect(() => {
    document.documentElement.classList.add("js");
    const frame = requestAnimationFrame(() => document.documentElement.classList.add("is-ready"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    document.querySelectorAll("[data-reveal]").forEach((element) => observer.observe(element));
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [route]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { window.localStorage.setItem("seda-theme", theme); } catch { /* Theme still works for this page. */ }
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      theme === "dark" ? "#120f17" : "#f1eee8",
    );
  }, [theme]);

  useEffect(() => {
    const overlayOpen = cartOpen || searchOpen || menuOpen;
    document.body.classList.toggle("overlay-open", overlayOpen);
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setCartOpen(false);
      setSearchOpen(false);
      setMenuOpen(false);
    };
    document.addEventListener("keydown", close);
    return () => {
      document.body.classList.remove("overlay-open");
      document.removeEventListener("keydown", close);
    };
  }, [cartOpen, menuOpen, searchOpen]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const updateCart = (next: CartLine[]) => {
    setCart(next);
    replaceServerCart(next.map((line) => ({ productId: line.id, quantity: line.quantity })))
      .catch(() => setNotice("Səbət yadda saxlanmadı"));
  };

  const addToCart = (product: Product) => {
    const existing = cart.find((line) => line.id === product.id);
    const next = existing
      ? cart.map((line) => line.id === product.id ? { ...line, quantity: line.quantity + 1 } : line)
      : [...cart, { id: product.id, quantity: 1 }];
    updateCart(next);
    setNotice(`${product.name} ${product.model} səbətə əlavə edildi`);
  };

  const changeQuantity = (id: string, difference: number) => {
    updateCart(cart
      .map((line) => line.id === id ? { ...line, quantity: line.quantity + difference } : line)
      .filter((line) => line.quantity > 0));
  };

  const moveSpot = (event: React.PointerEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    event.currentTarget.style.setProperty("--spot-x", `${x}px`);
    event.currentTarget.style.setProperty("--spot-y", `${y}px`);
    event.currentTarget.style.setProperty("--tilt-x", `${((y / bounds.height) - 0.5) * -5}deg`);
    event.currentTarget.style.setProperty("--tilt-y", `${((x / bounds.width) - 0.5) * 6}deg`);
  };

  const selectHeroProduct = (id: string) => {
    setSelectedId(id);
  };

  const openProduct = (product: Product) => {
    window.history.pushState({}, "", demoUrl(`/products/${product.id}`));
    setRoute({ page: "product", productId: product.id });
    setSearchOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const navigateProduct = (event: React.MouseEvent<HTMLAnchorElement>, product: Product) => {
    event.preventDefault();
    openProduct(product);
  };

  const navigateHome = (event: React.MouseEvent<HTMLAnchorElement>, hash = "") => {
    event.preventDefault();
    window.history.pushState({}, "", demoUrl(`/${hash}`));
    setRoute({ page: "home" });
    setMenuOpen(false);
    requestAnimationFrame(() => {
      if (hash) document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
      else window.scrollTo({ top: 0, behavior: "instant" });
    });
  };

  const navigateAccount = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.history.pushState({}, "", demoUrl("/account"));
    setRoute({ page: "account" });
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const navigateRecovery = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.history.pushState({}, "", demoUrl("/recover"));
    setRoute({ page: "recover" });
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const navigateStaff = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.history.pushState({}, "", demoUrl("/studio"));
    setRoute({ page: "staff" });
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const navigateSupport = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.history.pushState({}, "", demoUrl("/support"));
    setRoute({ page: "support" });
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const navigateAccountFromCheckout = (event: React.MouseEvent<HTMLAnchorElement>) => {
    setCheckoutRequested(true);
    navigateAccount(event);
  };

  const navigateCheckout = () => {
    window.history.pushState({}, "", demoUrl("/checkout"));
    setRoute({ page: "checkout" });
    setCartOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const loginAccount = async (email: string, password: string) => {
    const user = await login(email, password);
    const [addresses, securityEvents, orders, serverCart] = await Promise.all([
      fetchAddresses(),
      fetchSecurityEvents(),
      fetchOrders(),
      fetchCart(),
    ]);
    const nextCart = cart.length
      ? cart
      : serverCart.map((item) => ({ id: item.productId, quantity: item.quantity }));
    if (cart.length) {
      await replaceServerCart(cart.map((line) => ({ productId: line.id, quantity: line.quantity })));
    }
    setAccountUser(user);
    setAccountAddresses(addresses);
    setAccountSecurityEvents(securityEvents);
    setAccountOrders(orders);
    setCart(nextCart);
    setAccountStatus("authenticated");
    if (checkoutRequested) {
      setCheckoutRequested(false);
      window.history.pushState({}, "", demoUrl("/checkout"));
      setRoute({ page: "checkout" });
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  };

  const registerAccount = async (displayName: string, email: string, password: string) => {
    const user = await register(displayName, email, password);
    if (cart.length) {
      await replaceServerCart(cart.map((line) => ({ productId: line.id, quantity: line.quantity })));
    }
    setAccountUser(user);
    setAccountAddresses([]);
    setAccountSecurityEvents([]);
    setAccountOrders([]);
    setAccountStatus("authenticated");
    if (checkoutRequested) {
      setCheckoutRequested(false);
      window.history.pushState({}, "", demoUrl("/checkout"));
      setRoute({ page: "checkout" });
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  };

  const logoutAccount = async () => {
    await logout();
    setAccountUser(null);
    setAccountAddresses([]);
    setAccountSecurityEvents([]);
    setAccountOrders([]);
    setCart([]);
    setAccountStatus("guest");
  };

  const updateAccountProfile = async (displayName: string) => {
    const user = await updateProfile(displayName);
    setAccountUser(user);
  };

  const changeAccountPassword = async (currentPassword: string, newPassword: string) => {
    await changePassword(currentPassword, newPassword);
    setAccountSecurityEvents(await fetchSecurityEvents());
  };

  const resetAccountPassword = async (token: string, password: string) => {
    await resetPassword(token, password);
    setAccountUser(null);
    setAccountAddresses([]);
    setAccountSecurityEvents([]);
    setAccountOrders([]);
    setCart([]);
    setAccountStatus("guest");
  };

  const createCheckoutAddress = async (address: NewAddress) => {
    const created = await createAddress(address);
    setAccountAddresses((current) => [...current, created]);
    return created;
  };

  const setAccountDefaultAddress = async (addressId: string) => {
    await setDefaultAddress(addressId);
    const [addresses, securityEvents] = await Promise.all([fetchAddresses(), fetchSecurityEvents()]);
    setAccountAddresses(addresses);
    setAccountSecurityEvents(securityEvents);
  };

  const placeCheckoutOrder = async (addressId: string, couponCode: string) => {
    const order = await placeOrder(
      addressId,
      cart.map((line) => ({ productId: line.id, quantity: line.quantity })),
      couponCode,
    );
    setCart([]);
    setAccountOrders((current) => [order, ...current]);
    return order;
  };

  return (
    <div className="site-shell" style={{ "--active": ["account", "checkout", "recover", "resetPassword", "staff", "support"].includes(route.page) ? "#aaa2ff" : routeProduct?.accent ?? selected.accent } as React.CSSProperties}>
      <a className="skip-link" href="#content">Məzmuna keç</a>

      <div className="service-bar" aria-label="Mağaza üstünlükləri">
        <span>Bakıda pulsuz çatdırılma</span>
        <span>30 gün evdə sınaq</span>
        <span>2 il zəmanət</span>
      </div>

      <header className="site-header">
        <a className="brand" href={demoUrl("/")} onClick={(event) => navigateHome(event)} aria-label="SƏDA ana səhifə"><Mark /></a>
        <nav className="desktop-nav" aria-label="Əsas naviqasiya">
          <a href={demoUrl("/#collection")} onClick={(event) => navigateHome(event, "#collection")}>Mağaza</a>
          <a href={demoUrl("/#philosophy")} onClick={(event) => navigateHome(event, "#philosophy")}>Səs yanaşması</a>
          <a href={demoUrl("/#journal")} onClick={(event) => navigateHome(event, "#journal")}>Jurnal</a>
          <a href={demoUrl("/support")} onClick={navigateSupport}>Dəstək</a>
        </nav>
        <div className="header-actions">
          <button className="header-icon theme-toggle" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "İşıqlı mövzuya keç" : "Qaranlıq mövzuya keç"}>
            <span className="theme-icon theme-icon--sun"><Icon name="sun" /></span>
            <span className="theme-icon theme-icon--moon"><Icon name="moon" /></span>
          </button>
          <button className="header-icon" type="button" onClick={() => setSearchOpen(true)} aria-label="Axtar"><Icon name="search" /></button>
          <a className={`header-icon account-button${accountUser ? " is-authenticated" : ""}`} href={demoUrl("/account")} onClick={navigateAccount} aria-label="Hesab"><Icon name="user" /></a>
          <button className="bag-button" type="button" onClick={() => setCartOpen(true)} aria-label={`Səbət, ${cartCount} məhsul`}>
            <Icon name="bag" />
            <span>Səbət</span>
            <b>{String(cartCount).padStart(2, "0")}</b>
          </button>
          <button className="header-icon menu-button" type="button" onClick={() => setMenuOpen(true)} aria-label="Menyunu aç"><Icon name="menu" /></button>
        </div>
      </header>

      {route.page === "account" ? (
        <AccountPage
          addresses={accountAddresses}
          securityEvents={accountSecurityEvents}
          orders={accountOrders}
          status={accountStatus}
          user={accountUser}
          onLogin={loginAccount}
          onChangePassword={changeAccountPassword}
          onCreateAddress={createCheckoutAddress}
          onLogout={logoutAccount}
          onNavigateHome={navigateHome}
          onNavigateRecovery={navigateRecovery}
          onNavigateStaff={navigateStaff}
          onRegister={registerAccount}
          onRequestReceipt={fetchOrderReceipt}
          onSetDefaultAddress={setAccountDefaultAddress}
          onUpdateProfile={updateAccountProfile}
        />
      ) : route.page === "recover" || route.page === "resetPassword" ? (
        <RecoveryPage
          mode={route.page === "recover" ? "request" : "reset"}
          onNavigateAccount={navigateAccount}
          onNavigateHome={navigateHome}
          onRequest={requestPasswordRecovery}
          onReset={resetAccountPassword}
        />
      ) : route.page === "checkout" ? (
        <CheckoutPage
          addresses={accountAddresses}
          lines={checkoutLines}
          status={accountStatus}
          user={accountUser}
          onCreateAddress={createCheckoutAddress}
          onNavigateAccount={navigateAccountFromCheckout}
          onNavigateHome={navigateHome}
          onPlaceOrder={placeCheckoutOrder}
        />
      ) : route.page === "staff" ? (
        <StaffPage
          accountStatus={accountStatus}
          user={accountUser}
          onNavigateAccount={navigateAccount}
          onNavigateHome={navigateHome}
        />
      ) : route.page === "support" ? (
        <SupportPage onNavigateHome={navigateHome} warrantyCaseId={route.warrantyCaseId} />
      ) : route.page === "product" ? (
        routeProduct ? (
          <ProductDetailPage
            accountUser={accountUser}
            product={routeProduct}
            relatedProducts={relatedProducts}
            onAddToCart={addToCart}
            onNavigateHome={navigateHome}
            onNavigateAccount={navigateAccount}
            onNavigateProduct={navigateProduct}
            onPointerMove={moveSpot}
          />
        ) : <ProductNotFound onNavigateHome={navigateHome} />
      ) : (
      <main id="content">
        <section id="hero" className={`hero hero--${selected.tone}`}>
          <SignalField accent={selected.accent} />
          <div className="hero-grid">
            <div className="hero-copy">
              <p className="hero-kicker"><span /> Bakıdan şəxsi audio</p>
              <h1>Səsi seç.<br />Məkanı dəyiş.</h1>
              <p className="hero-intro">
                Qulaqlıqdan otaq sisteminə qədər hər forma eyni məqsəd üçün qurulur:
                musiqi ilə arandakı məsafəni azaltmaq.
              </p>
              <div className="hero-cta">
                <a className="button button--primary" href={demoUrl(`/products/${selected.id}`)} onClick={(event) => navigateProduct(event, selected)}>
                  {selected.name} {selected.model}-i kəşf et <Icon name="arrow" />
                </a>
                <a className="quiet-link" href="#collection">Bütün kolleksiya</a>
              </div>
              <div className="hero-proof" aria-label="Seçilmiş məhsul xüsusiyyətləri">
                {selected.features.map((feature) => <span key={feature}><Icon name="check" />{feature}</span>)}
              </div>
            </div>

            <div className="hero-product" onPointerMove={moveSpot} aria-live="polite">
              <div className="hero-spotlight" aria-hidden="true" />
              <div className="product-orbit" aria-hidden="true"><i /><i /><i /></div>
              <img key={selected.id} src={selected.image} alt={selected.imageAlt} />
              <div className="hero-product-meta">
                <span>{selected.category}</span>
                <strong>{formatPrice(selected.price)}</strong>
              </div>
              <span className="pointer-hint">İşığı hərəkət etdir</span>
            </div>
          </div>

          <div className="model-switch" aria-label="Önə çıxan məhsulu seç">
            {heroProducts.map((product, index) => (
              <button
                key={product.id}
                className={product.id === selected.id ? "is-active" : ""}
                type="button"
                onClick={() => selectHeroProduct(product.id)}
                aria-pressed={product.id === selected.id}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <img src={product.image} alt="" />
                <span className="model-name"><b>{product.name}</b><small>{product.model}</small></span>
                <i aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>

        <section className="benefit-strip" aria-label="Alış üstünlükləri">
          <article><span>01</span><div><h2>Sına, sonra qərar ver.</h2><p>30 gün ərzində evində dinlə.</p></div></article>
          <article><span>02</span><div><h2>Otağına uyğun qurulum.</h2><p>Bakı daxilində pulsuz kalibrasiya.</p></div></article>
          <article><span>03</span><div><h2>Sakit dəstək.</h2><p>Satışdan sonra real texniki yardım.</p></div></article>
        </section>

        <section id="collection" className="collection">
          <div className="collection-heading" data-reveal>
            <div><p>Kolleksiya 2026</p><h2>Səkkiz forma.<br />Bir dinləmə dili.</h2></div>
            <p>Qulağından bütün otağa qədər eyni material və səs fəlsəfəsi.</p>
          </div>

          <div className="catalog-toolbar" data-reveal>
            <div className="catalog-search">
              <Icon name="search" />
              <input value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} type="search" placeholder="Məhsul axtar" aria-label="Kataloqda məhsul axtar" />
            </div>
            <div className="category-filters" aria-label="Kataloqu kateqoriyaya görə süz">
              {productGroups.map((group) => (
                <button key={group} className={activeGroup === group ? "is-active" : ""} type="button" onClick={() => setActiveGroup(group)} aria-pressed={activeGroup === group}>
                  {group}
                </button>
              ))}
            </div>
            <label className="sort-control">
              <span>Sıra</span>
              <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
                <option value="featured">Seçilmiş</option>
                <option value="price-asc">Qiymət: aşağıdan</option>
                <option value="price-desc">Qiymət: yuxarıdan</option>
              </select>
            </label>
          </div>

          <div className="catalog-meta">
            <p><strong>{visibleProducts.length}</strong> məhsul</p>
            <span className={`catalog-sync catalog-sync--${catalogState}`} role="status">
              <i />
              {catalogState === "loading" ? "Kolleksiya yenilənir" : catalogState === "ready" ? "Canlı stok" : "Lokal kataloq"}
            </span>
            {(activeGroup !== "Hamısı" || catalogQuery) && (
              <button type="button" onClick={() => { setActiveGroup("Hamısı"); setCatalogQuery(""); }}>Süzgəci sıfırla</button>
            )}
          </div>

          <div className="product-grid">
            {visibleProducts.map((product) => (
              <article className="product-card" key={product.id} style={{ "--card-accent": product.accent } as React.CSSProperties}>
                <a className="product-visual" href={demoUrl(`/products/${product.id}`)} onPointerMove={moveSpot} onClick={(event) => navigateProduct(event, product)} aria-label={`${product.name} ${product.model} məhsuluna bax`}>
                  <span className="card-spotlight" aria-hidden="true" />
                  {product.badge && <span className="product-badge">{product.badge}</span>}
                  <img src={product.image} alt={product.imageAlt} />
                  <span className="view-label">Yaxından bax <Icon name="arrow" /></span>
                </a>
                <div className="product-info">
                  <div className="product-title">
                    <p>{product.category}</p>
                    <h3>{product.name} <span>{product.model}</span></h3>
                  </div>
                  <p className="product-description">{product.description}</p>
                  <div className="product-buy">
                    <strong>{formatPrice(product.price)}</strong>
                    <button type="button" onClick={() => addToCart(product)} aria-label={`${product.name} məhsulunu səbətə əlavə et`}><Icon name="plus" /></button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!visibleProducts.length && (
            <div className="catalog-empty">
              <Mark compact />
              <h3>Bu səs hələ kolleksiyada yoxdur.</h3>
              <p>Axtarış sözünü dəyiş və ya bütün kateqoriyalara qayıt.</p>
              <button className="button button--primary" type="button" onClick={() => { setActiveGroup("Hamısı"); setCatalogQuery(""); }}>Bütün məhsullar</button>
            </div>
          )}
        </section>

        <section className="statement" id="philosophy">
          <div className="statement-copy" data-reveal>
            <p>SƏDA yanaşması</p>
            <h2>Yaxşı səs daha yüksək səs deyil. Qulaqla musiqi arasında qalan hər şeyi azaltmaqdır.</h2>
          </div>
          <div className="material-notes" data-reveal>
            <div><span>01 / Toxuma</span><p>Dəri ilə təmasda nəfəs alır və uzun dinləmədə istiliyi azaldır.</p></div>
            <div><span>02 / Metal</span><p>Formanı saxlayır, vibrasiyanı idarə edir və sakit toxunuş verir.</p></div>
            <div><span>03 / İşıq</span><p>Yalnız vəziyyəti göstərir; diqqəti musiqidən almır.</p></div>
          </div>
        </section>

        <section className="architecture" aria-labelledby="architecture-title">
          <div className="architecture-copy" data-reveal>
            <p>Dinləmə arxitekturası</p>
            <h2 id="architecture-title">Sakitlik də məhsulun bir hissəsidir.</h2>
            <p>Mikrofonlar yalnız səs-küyü ölçmür. Hər model qulağın və otağın cavabını oxuyur, sonra musiqiyə lazım olan yeri saxlayır.</p>
            <a href="#journal" className="line-link">Necə işlədiyini oxu <Icon name="arrow" /></a>
          </div>
          <div className="frequency-stage" data-reveal onPointerMove={moveSpot}>
            <div className="frequency-labels"><span>20 Hz</span><span>İnsan səsi</span><span>20 kHz</span></div>
            <div className="frequency-bars" aria-hidden="true">
              {Array.from({ length: 54 }, (_, index) => (
                <i key={index} style={{ "--bar": index, "--bar-height": `${18 + (Math.sin(index * 0.73) + 1) * 25}%` } as React.CSSProperties} />
              ))}
            </div>
            <div className="frequency-cursor" aria-hidden="true" />
            <p>Spektri hərəkət etdir</p>
          </div>
        </section>

        <section id="journal" className="journal">
          <div className="journal-title" data-reveal><p>SƏDA jurnal</p><h2>Dinləmək üçün qeydlər</h2></div>
          <div className="journal-list">
            {[
              ["07 dəq", "Sakit otaq həmişə yaxşı otaq deyil", "Akustika"],
              ["05 dəq", "Qulaqlıqda rahatlıq necə ölçülür?", "Material"],
              ["09 dəq", "Gündəlik dinləmədə spatial audio", "Texnologiya"],
            ].map(([time, title, category], index) => (
              <a href="#journal" className="journal-row" key={title} data-reveal>
                <span>0{index + 1}</span><p>{category}</p><h3>{title}</h3><small>{time}</small><Icon name="arrow" />
              </a>
            ))}
          </div>
        </section>

        <section className="final-cta" data-reveal onPointerMove={moveSpot}>
          <div className="final-cta-glow" aria-hidden="true" />
          <div className="final-cta-orbit" aria-hidden="true"><i /><i /><i /></div>
          <div className="final-cta-spectrum" aria-hidden="true">
            {Array.from({ length: 52 }, (_, index) => (
              <i
                key={index}
                style={{
                  "--cta-bar": index,
                  "--cta-height": `${18 + (Math.sin(index * 0.62) + 1) * 30}%`,
                } as React.CSSProperties}
              />
            ))}
          </div>
          <div className="final-cta-copy">
            <p><span />30 gün evdə sınaq</p>
            <h2><span>Səsi seç.</span><span>Qalanını azalt.</span></h2>
            <a className="button button--inverse" href="#collection">Kolleksiyaya bax <Icon name="arrow" /></a>
          </div>
          <div className="final-cta-status" aria-hidden="true">
            <span>08 forma</span><i /><span>Bir səs dili</span><i /><span>İmleclə dinlə</span>
          </div>
        </section>
      </main>
      )}

      <footer className="site-footer">
        <div className="footer-top">
          <Mark />
          <p>Şəxsi audio üçün sakit formalar.<br />Bakı, Azərbaycan.</p>
          <div className="footer-links"><a href={demoUrl("/#collection")} onClick={(event) => navigateHome(event, "#collection")}>Məhsullar</a><a href={demoUrl("/#journal")} onClick={(event) => navigateHome(event, "#journal")}>Jurnal</a><a href={demoUrl("/support")} onClick={navigateSupport}>Dəstək</a><a href="#stores">Mağazalar</a></div>
        </div>
        <div className="footer-bottom"><span>© 2026 SƏDA</span><span>Təhsil üçün demo · real sifariş yoxdur</span><button type="button" onClick={() => { resetDemo(); window.location.assign(demoUrl("/")); }}>Demonu sıfırla</button><button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Yuxarı</button></div>
      </footer>

      <div className={`mobile-menu ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen}>
        <button className="overlay-close" type="button" onClick={() => setMenuOpen(false)} aria-label="Menyunu bağla"><Icon name="close" /></button>
        <Mark />
        <nav aria-label="Mobil naviqasiya">
          <a href={demoUrl("/#collection")} onClick={(event) => navigateHome(event, "#collection")}>Mağaza <span>01</span></a>
          <a href={demoUrl("/#philosophy")} onClick={(event) => navigateHome(event, "#philosophy")}>Səs yanaşması <span>02</span></a>
          <a href={demoUrl("/#journal")} onClick={(event) => navigateHome(event, "#journal")}>Jurnal <span>03</span></a>
          <a href={demoUrl("/support")} onClick={navigateSupport}>Dəstək <span>04</span></a>
        </nav>
        <button className="mobile-theme" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          <Icon name={theme === "dark" ? "sun" : "moon"} /> {theme === "dark" ? "İşıqlı mövzu" : "Qaranlıq mövzu"}
        </button>
      </div>

      <div className={`search-overlay ${searchOpen ? "is-open" : ""}`} aria-hidden={!searchOpen}>
        <button className="overlay-scrim" type="button" onClick={() => setSearchOpen(false)} aria-label="Axtarışı bağla" />
        <div className="search-panel" role="dialog" aria-modal="true" aria-label="Məhsul axtarışı">
          <div className="search-input-wrap">
            <Icon name="search" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Məhsul və ya kateqoriya axtar" maxLength={80} autoFocus={searchOpen} />
            <button type="button" onClick={() => setSearchOpen(false)} aria-label="Bağla"><Icon name="close" /></button>
          </div>
          <p className="result-count">{searchPending ? "Axtarılır" : `${searchResults.length} nəticə`}</p>
          <div className="search-results">
            {searchResults.map((product) => (
              <button key={product.id} type="button" onClick={() => openProduct(product)}>
                <img src={product.image} alt="" />
                <span><small>{product.category}</small><b>{product.name} {product.model}</b></span>
                <strong>{formatPrice(product.price)}</strong>
              </button>
            ))}
            {!searchResults.length && <p className="empty-state">Bu sözə uyğun məhsul tapılmadı. Model adını yoxla.</p>}
          </div>
        </div>
      </div>

      <aside className={`cart-drawer ${cartOpen ? "is-open" : ""}`} aria-hidden={!cartOpen} aria-label="Səbət">
        <button className="cart-scrim" type="button" onClick={() => setCartOpen(false)} aria-label="Səbəti bağla" />
        <div className="cart-panel">
          <div className="drawer-head">
            <div><p>Sənin seçimin</p><h2>Səbət <span>{cartCount}</span></h2></div>
            <button type="button" onClick={() => setCartOpen(false)} aria-label="Bağla"><Icon name="close" /></button>
          </div>
          <div className="cart-lines">
            {!cart.length && (
              <div className="cart-empty">
                <Mark compact /><h3>Hələ sakitdir.</h3><p>Dinləməyə başlamaq üçün kolleksiyadan bir forma seç.</p>
                <button className="button button--primary" type="button" onClick={() => { setCartOpen(false); document.querySelector("#collection")?.scrollIntoView({ behavior: "smooth" }); }}>Kolleksiyaya bax</button>
              </div>
            )}
            {cart.map((line) => {
              const product = products.find((item) => item.id === line.id)!;
              return (
                <div className="cart-line" key={line.id}>
                  <div className="cart-thumb"><img src={product.image} alt="" /></div>
                  <div className="cart-line-info">
                    <p>{product.category}</p><h3>{product.name} {product.model}</h3><strong>{formatPrice(product.price)}</strong>
                    <div className="quantity-control" aria-label="Miqdar">
                      <button type="button" onClick={() => changeQuantity(product.id, -1)} aria-label="Bir ədəd azalt"><Icon name="minus" /></button>
                      <span>{line.quantity}</span>
                      <button type="button" onClick={() => changeQuantity(product.id, 1)} aria-label="Bir ədəd artır"><Icon name="plus" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {!!cart.length && (
            <div className="cart-summary">
              <div><span>Cəmi</span><strong>{formatPrice(cartTotal)}</strong></div>
              <p>Çatdırılma və kupon checkout zamanı hesablanacaq.</p>
              <a className="button button--coral" href={demoUrl("/checkout")} onClick={(event) => { event.preventDefault(); navigateCheckout(); }}>Sifarişi tamamla <Icon name="arrow" /></a>
            </div>
          )}
        </div>
      </aside>

      <div className={`toast ${notice ? "is-visible" : ""}`} role="status" aria-live="polite"><Icon name="check" />{notice}</div>
    </div>
  );
}
