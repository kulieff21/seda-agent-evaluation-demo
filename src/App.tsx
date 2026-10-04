import { readState, resetDemo } from "./demo/store";
import { basePath, demoUrl, navigateDemo, storePathname } from "./demo/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
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
import { HomePage } from "./components/HomePage";
import { Icon, Mark } from "./components/Icon";
import { flyToBag, prefersReducedMotion, withViewTransition } from "./demo/motion";
import { ProductDetailPage, ProductNotFound } from "./components/ProductDetailPage";
import { StaffPage } from "./components/StaffPage";
import { SupportPage } from "./components/SupportPage";
import {
  formatPrice,
  products as localProducts,
  type Product,
} from "./data/products";
import "./styles.css";

type CartLine = { id: string; quantity: number };
type Theme = "light" | "dark";
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
  const [notice, setNotice] = useState("");
  const [checkoutRequested, setCheckoutRequested] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
    const updateRoute = () => withViewTransition(() => setRoute(readStoreRoute()));
    const followInternalLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.hasAttribute("download") || link.target || link.origin !== window.location.origin || !link.pathname.startsWith(basePath) || link.pathname === window.location.pathname) return;
      event.preventDefault();
      navigateDemo(link.href);
      if (link.hash) requestAnimationFrame(() => document.getElementById(link.hash.slice(1))?.scrollIntoView());
    };
    window.addEventListener("popstate", updateRoute);
    document.addEventListener("click", followInternalLink);
    return () => {
      window.removeEventListener("popstate", updateRoute);
      document.removeEventListener("click", followInternalLink);
    };
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
    const watch = () => document.querySelectorAll("[data-reveal]:not(.is-visible)").forEach((element) => observer.observe(element));
    watch();
    const mutations = new MutationObserver(watch);
    mutations.observe(document.getElementById("root") ?? document.body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      mutations.disconnect();
    };
  }, [route]);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    let lastY = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      header.classList.toggle("is-scrolled", y > 12);
      header.classList.toggle("is-hidden", y > 420 && y > lastY + 2);
      if (y < lastY - 2 || y <= 420) header.classList.remove("is-hidden");
      lastY = y;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { window.localStorage.setItem("seda-theme", theme); } catch { /* Theme still works for this page. */ }
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      theme === "dark" ? "#0d0a11" : "#efebe4",
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
    if (searchOpen) requestAnimationFrame(() => searchInputRef.current?.focus());
  }, [searchOpen]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const updateCart = (next: CartLine[]) => {
    setCart(next);
    replaceServerCart(next.map((line) => ({ productId: line.id, quantity: line.quantity })))
      .catch(() => setNotice("Səbət yadda saxlanmadı"));
  };

  const addToCart = (product: Product, origin?: Element | null) => {
    const existing = cart.find((line) => line.id === product.id);
    const next = existing
      ? cart.map((line) => line.id === product.id ? { ...line, quantity: line.quantity + 1 } : line)
      : [...cart, { id: product.id, quantity: 1 }];
    updateCart(next);
    flyToBag(origin);
    setNotice(`${product.name} ${product.model} səbətə əlavə edildi`);
  };

  const changeQuantity = (id: string, difference: number) => {
    updateCart(cart
      .map((line) => line.id === id ? { ...line, quantity: line.quantity + difference } : line)
      .filter((line) => line.quantity > 0));
  };

  const moveSpot = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    event.currentTarget.style.setProperty("--spot-x", `${x}px`);
    event.currentTarget.style.setProperty("--spot-y", `${y}px`);
    event.currentTarget.style.setProperty("--tilt-x", `${((y / bounds.height) - 0.5) * -6}deg`);
    event.currentTarget.style.setProperty("--tilt-y", `${((x / bounds.width) - 0.5) * 8}deg`);
  };

  const toggleTheme = (event: React.MouseEvent<HTMLElement>) => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const apply = () => {
      document.documentElement.dataset.theme = next;
      flushSync(() => setTheme(next));
    };
    const doc = document as Document & { startViewTransition?: (update: () => void) => { ready: Promise<void> } };
    if (!doc.startViewTransition || prefersReducedMotion()) { apply(); return; }
    const x = event.clientX || window.innerWidth - 40;
    const y = event.clientY || 40;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    document.documentElement.dataset.transition = "theme";
    const transition = doc.startViewTransition(apply);
    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 720, easing: "cubic-bezier(.7,0,.2,1)", pseudoElement: "::view-transition-new(root)" },
      ).finished.finally(() => { delete document.documentElement.dataset.transition; });
    }).catch(() => { delete document.documentElement.dataset.transition; });
  };

  const go = (path: string, next: StoreRoute, after?: () => void) =>
    withViewTransition(() => {
      window.history.pushState({}, "", demoUrl(path));
      setRoute(next);
      setMenuOpen(false);
      setSearchOpen(false);
      setCartOpen(false);
      window.scrollTo({ top: 0, behavior: "instant" });
      after?.();
    });

  const openProduct = (product: Product, source?: Element | null) => {
    const frame = source?.closest("[data-fly]");
    const photo = frame?.querySelector<HTMLImageElement>("img.is-active") ?? frame?.querySelector<HTMLImageElement>("img") ?? null;
    if (photo) photo.style.viewTransitionName = "product-photo";
    const transition = go(`/products/${product.id}`, { page: "product", productId: product.id });
    const clear = () => { if (photo) photo.style.viewTransitionName = ""; };
    if (transition) transition.finished.finally(clear); else clear();
  };

  const navigateProduct = (event: React.MouseEvent<HTMLAnchorElement>, product: Product) => {
    event.preventDefault();
    openProduct(product, event.currentTarget);
  };

  const navigateHome = (event: React.MouseEvent<HTMLAnchorElement>, hash = "") => {
    event.preventDefault();
    setMenuOpen(false);
    if (route.page === "home") {
      window.history.pushState({}, "", demoUrl(`/${hash}`));
      if (hash) document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    go(`/${hash}`, { page: "home" }, () => {
      if (hash) document.querySelector(hash)?.scrollIntoView({ behavior: "instant" });
    });
  };

  const navigateAccount = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    go("/account", { page: "account" });
  };

  const navigateRecovery = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    go("/recover", { page: "recover" });
  };

  const navigateStaff = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    go("/studio", { page: "staff" });
  };

  const navigateSupport = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    go("/support", { page: "support" });
  };

  const navigateAccountFromCheckout = (event: React.MouseEvent<HTMLAnchorElement>) => {
    setCheckoutRequested(true);
    navigateAccount(event);
  };

  const navigateCheckout = () => {
    go("/checkout", { page: "checkout" });
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

  const utilityRoute = ["account", "checkout", "recover", "resetPassword", "staff", "support"].includes(route.page);
  const navLinks: Array<[string, string, (event: React.MouseEvent<HTMLAnchorElement>) => void]> = [
    ["Mağaza", "/#collection", (event) => navigateHome(event, "#collection")],
    ["Səs yanaşması", "/#philosophy", (event) => navigateHome(event, "#philosophy")],
    ["Jurnal", "/#journal", (event) => navigateHome(event, "#journal")],
    ["Dəstək", "/support", navigateSupport],
  ];

  return (
    <div
      className={`site-shell site-shell--${route.page}`}
      style={{ "--active": utilityRoute ? "#9d93ff" : routeProduct?.accent ?? selected.accent } as React.CSSProperties}
    >
      <a className="skip-link" href="#content">Məzmuna keç</a>
      <div className="grain" aria-hidden="true" />

      <header className="site-header" ref={headerRef}>
        <a className="brand" href={demoUrl("/")} onClick={(event) => navigateHome(event)} aria-label="SƏDA ana səhifə"><Mark /></a>
        <nav className="desktop-nav" aria-label="Əsas naviqasiya">
          {navLinks.map(([label, path, handler]) => (
            <a key={label} href={demoUrl(path)} onClick={handler} className={path === "/support" && route.page === "support" ? "is-current" : ""}>
              <span className="nav-roll"><span data-text={label}>{label}</span></span>
            </a>
          ))}
        </nav>
        <div className="header-actions">
          <button className="header-icon theme-toggle" type="button" onClick={toggleTheme} aria-label={theme === "dark" ? "İşıqlı mövzuya keç" : "Qaranlıq mövzuya keç"}>
            <span className="theme-icon theme-icon--sun"><Icon name="sun" /></span>
            <span className="theme-icon theme-icon--moon"><Icon name="moon" /></span>
          </button>
          <button className="header-icon" type="button" onClick={() => setSearchOpen(true)} aria-label="Axtar"><Icon name="search" /></button>
          <a className={`header-icon account-button${accountUser ? " is-authenticated" : ""}`} href={demoUrl("/account")} onClick={navigateAccount} aria-label="Hesab"><Icon name="user" /></a>
          <button className="bag-button" type="button" onClick={() => setCartOpen(true)} aria-label={`Səbət, ${cartCount} məhsul`} onAnimationEnd={(event) => event.currentTarget.classList.remove("is-receiving")}>
            <Icon name="bag" />
            <span>Səbət</span>
            <b key={cartCount}>{String(cartCount).padStart(2, "0")}</b>
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
        <HomePage
          products={products}
          heroProducts={heroProducts}
          selected={selected}
          catalogState={catalogState}
          onSelectHero={setSelectedId}
          onAddToCart={addToCart}
          onNavigateProduct={navigateProduct}
          onPointerMove={moveSpot}
        />
      )}

      <footer className="site-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <Mark />
            <p>Şəxsi audio üçün sakit formalar.<br />Bakı, Azərbaycan.</p>
          </div>
          <nav className="footer-links" aria-label="Alt naviqasiya">
            <div>
              <small>Mağaza</small>
              <a href={demoUrl("/#collection")} onClick={(event) => navigateHome(event, "#collection")}>Məhsullar</a>
              <a href={demoUrl("/#philosophy")} onClick={(event) => navigateHome(event, "#philosophy")}>Səs yanaşması</a>
              <a href={demoUrl("/#journal")} onClick={(event) => navigateHome(event, "#journal")}>Jurnal</a>
            </div>
            <div>
              <small>Xidmət</small>
              <a href={demoUrl("/support")} onClick={navigateSupport}>Dəstək</a>
              <a href={demoUrl("/account")} onClick={navigateAccount}>Hesab</a>
              <a href="#stores">Mağazalar</a>
            </div>
          </nav>
        </div>
        <p className="footer-wordmark" aria-hidden="true">
          {[..."SƏDA"].map((letter, index) => <span key={index} style={{ "--i": index } as React.CSSProperties}>{letter}</span>)}
        </p>
        <div className="footer-bottom">
          <span>© 2026 SƏDA</span>
          <span>Təhsil üçün demo · real sifariş yoxdur</span>
          <button type="button" onClick={() => { resetDemo(); window.location.assign(demoUrl("/")); }}>Demonu sıfırla</button>
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Yuxarı ↑</button>
        </div>
      </footer>

      <div className={`mobile-menu ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen} inert={!menuOpen}>
        <div className="mobile-menu-head">
          <Mark />
          <button className="overlay-close" type="button" onClick={() => setMenuOpen(false)} aria-label="Menyunu bağla"><Icon name="close" /></button>
        </div>
        <nav aria-label="Mobil naviqasiya">
          {navLinks.map(([label, path, handler], index) => (
            <a key={label} href={demoUrl(path)} onClick={handler} style={{ "--i": index } as React.CSSProperties}>
              <span>{String(index + 1).padStart(2, "0")}</span>{label}
            </a>
          ))}
        </nav>
        <div className="mobile-menu-foot">
          <button className="mobile-theme" type="button" onClick={toggleTheme}>
            <Icon name={theme === "dark" ? "sun" : "moon"} /> {theme === "dark" ? "İşıqlı mövzu" : "Qaranlıq mövzu"}
          </button>
          <a href={demoUrl("/account")} onClick={(event) => { setMenuOpen(false); navigateAccount(event); }}><Icon name="user" /> Hesab</a>
        </div>
      </div>

      <div className={`search-overlay ${searchOpen ? "is-open" : ""}`} aria-hidden={!searchOpen} inert={!searchOpen}>
        <button className="overlay-scrim" type="button" onClick={() => setSearchOpen(false)} aria-label="Axtarışı bağla" tabIndex={-1} />
        <div className="search-panel" role="dialog" aria-modal="true" aria-label="Məhsul axtarışı">
          <div className="search-input-wrap">
            <Icon name="search" />
            <input ref={searchInputRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Məhsul və ya kateqoriya axtar" maxLength={80} />
            <button type="button" onClick={() => setSearchOpen(false)} aria-label="Bağla"><Icon name="close" /></button>
          </div>
          <p className="result-count">{searchPending ? "Axtarılır…" : `${searchResults.length} nəticə`}</p>
          <div className="search-results">
            {searchResults.map((product, index) => (
              <button key={product.id} type="button" onClick={(event) => openProduct(product, event.currentTarget)} data-fly style={{ "--i": index, "--card-accent": product.accent } as React.CSSProperties}>
                <img src={product.image} alt="" />
                <span><small>{product.category}</small><b>{product.name} {product.model}</b></span>
                <strong>{formatPrice(product.price)}</strong>
                <Icon name="arrow" />
              </button>
            ))}
            {!searchResults.length && <p className="empty-state">Bu sözə uyğun məhsul tapılmadı. Model adını yoxla.</p>}
          </div>
        </div>
      </div>

      <aside className={`cart-drawer ${cartOpen ? "is-open" : ""}`} aria-hidden={!cartOpen} inert={!cartOpen} aria-label="Səbət">
        <button className="cart-scrim" type="button" onClick={() => setCartOpen(false)} aria-label="Səbəti bağla" tabIndex={-1} />
        <div className="cart-panel">
          <div className="drawer-head">
            <div><p>Sənin seçimin</p><h2>Səbət <span>{cartCount}</span></h2></div>
            <button type="button" onClick={() => setCartOpen(false)} aria-label="Bağla"><Icon name="close" /></button>
          </div>
          <div className="cart-lines">
            {!cart.length && (
              <div className="cart-empty">
                <Mark compact /><h3>Hələ sakitdir.</h3><p>Dinləməyə başlamaq üçün kolleksiyadan bir forma seç.</p>
                <button className="button button--primary" type="button" onClick={() => { setCartOpen(false); if (route.page === "home") document.querySelector("#collection")?.scrollIntoView({ behavior: "smooth" }); else go("/#collection", { page: "home" }, () => document.querySelector("#collection")?.scrollIntoView({ behavior: "instant" })); }}>Kolleksiyaya bax</button>
              </div>
            )}
            {cart.map((line, index) => {
              const product = products.find((item) => item.id === line.id);
              if (!product) return null;
              return (
                <div className="cart-line" key={line.id} style={{ "--i": index, "--card-accent": product.accent } as React.CSSProperties}>
                  <div className="cart-thumb"><img src={product.image} alt="" /></div>
                  <div className="cart-line-info">
                    <p>{product.category}</p><h3>{product.name} {product.model}</h3><strong>{formatPrice(product.price)}</strong>
                    <div className="quantity-control" aria-label="Miqdar">
                      <button type="button" onClick={() => changeQuantity(product.id, -1)} aria-label="Bir ədəd azalt"><Icon name="minus" /></button>
                      <span key={line.quantity}>{line.quantity}</span>
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
