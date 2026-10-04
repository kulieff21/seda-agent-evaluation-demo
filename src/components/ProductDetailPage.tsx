import { demoUrl } from "../demo/navigation";
import type { AccountUser } from "../api/account";
import type { Product } from "../data/products";
import { formatPrice } from "../data/products";
import { waveform } from "./Icon";
import { ReviewsSection } from "./ReviewsSection";

type ProductLinkHandler = (event: React.MouseEvent<HTMLAnchorElement>, product: Product) => void;

type ProductDetailPageProps = {
  accountUser: AccountUser | null;
  product: Product;
  relatedProducts: Product[];
  onAddToCart: (product: Product, origin?: Element | null) => void;
  onNavigateHome: (event: React.MouseEvent<HTMLAnchorElement>, hash?: string) => void;
  onNavigateAccount: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  onNavigateProduct: ProductLinkHandler;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
};

function ArrowIcon() {
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h13m-5-5 5 5-5 5" /></svg>;
}

function PlusIcon() {
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M12 5v14" /></svg>;
}

function CheckIcon() {
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>;
}

export function ProductDetailPage({
  accountUser,
  product,
  relatedProducts,
  onAddToCart,
  onNavigateHome,
  onNavigateAccount,
  onNavigateProduct,
  onPointerMove,
}: ProductDetailPageProps) {
  const stockLevel = Math.min(100, Math.round((product.inventory / 32) * 100));
  return (
    <main
      id="content"
      className={`product-page product-page--${product.tone}`}
      style={{ "--product-accent": product.accent } as React.CSSProperties}
    >
      <section className="product-detail-hero">
        <div className="product-detail-topline">
          <a href={demoUrl("/#collection")} onClick={(event) => onNavigateHome(event, "#collection")}><span aria-hidden="true">←</span> Kolleksiya</a>
          <span>{product.group} / {product.category} / <b>{product.model}</b></span>
        </div>

        <div className="product-detail-grid">
          <div className="product-detail-stage" onPointerMove={onPointerMove} data-fly>
            <div className="product-detail-echo" aria-hidden="true"><i /><i /><i /><i /></div>
            <div className="product-detail-photo">
              <img src={product.image} alt={product.imageAlt} />
              <span className="product-detail-spotlight" aria-hidden="true" />
            </div>
            <div className="product-stage-code"><span>SƏDA / {product.model}</span><b>{product.group}</b></div>
            {product.badge && <span className="product-stage-badge">{product.badge}</span>}
          </div>

          <div className="product-detail-copy">
            <p className="eyebrow">{product.category}</p>
            <h1><span className="product-detail-name">{product.name}</span><span className="product-detail-model">{product.model}</span></h1>
            <p className="product-detail-lead">{product.detail}</p>

            <ul className="product-detail-features">
              {product.features.map((feature, index) => <li key={feature} style={{ "--i": index } as React.CSSProperties}><CheckIcon />{feature}</li>)}
            </ul>

            <div className="product-detail-buy">
              <div><small>Qiymət</small><strong>{formatPrice(product.price)}</strong></div>
              <button className="button button--primary" type="button" onClick={(event) => onAddToCart(product, event.currentTarget.closest("main")?.querySelector(".product-detail-stage"))}>
                Səbətə əlavə et <PlusIcon />
              </button>
            </div>
            <div className="product-stock">
              <p><i />Stokda {product.inventory} ədəd</p>
              <span className="product-stock-meter" aria-hidden="true"><b style={{ width: `${stockLevel}%` }} /></span>
              <small>Bakı daxilində pulsuz çatdırılma · 30 gün evdə sınaq · 2 il zəmanət</small>
            </div>
          </div>
        </div>
      </section>

      <section className="product-signal-story" aria-label={`${product.name} səs yanaşması`}>
        <div className="product-signal-copy" data-reveal>
          <p className="eyebrow">Formanın içində</p>
          <h2>{product.description}</h2>
        </div>
        <div className="product-spectrum" aria-hidden="true" data-reveal>
          {waveform(product.id, 64).map((height, index) => (
            <i key={index} style={{ "--detail-bar": index, "--detail-height": `${height}%` } as React.CSSProperties} />
          ))}
          <span className="product-spectrum-labels"><small>20 Hz</small><small>{product.name} {product.model}</small><small>20 kHz</small></span>
        </div>
      </section>

      <section className="product-decisions">
        <div className="section-head section-head--split" data-reveal>
          <div>
            <p className="eyebrow">Üç əsas xüsusiyyət</p>
            <h2>Hər detal<br /><em>dinləməyə xidmət edir.</em></h2>
          </div>
          <p>{product.detail}</p>
        </div>
        <div className="product-decision-grid">
          {product.features.map((feature, index) => (
            <article key={feature} data-reveal style={{ "--delay": `${index * 90}ms` } as React.CSSProperties}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{feature}</h3>
              <p>{[
                "Gündəlik istifadədə müdaxilə etmədən işləyən, sakit və ölçülü texnologiya.",
                "Uzun dinləmə seansları üçün enerji, rahatlıq və material balansı.",
                "Səs səhnəsini məhsulun formasına uyğun qoruyan dəqiq akustik quruluş.",
              ][index]}</p>
            </article>
          ))}
        </div>
      </section>

      <ReviewsSection
        productId={product.id}
        productName={`${product.name} ${product.model}`}
        user={accountUser}
        onNavigateAccount={onNavigateAccount}
      />

      <section className="related-products">
        <div className="section-head section-head--split" data-reveal>
          <div><p className="eyebrow">Kolleksiyada davam et</p><h2>Eyni səs dili,<br /><em>başqa forma.</em></h2></div>
          <a className="line-link" href={demoUrl("/#collection")} onClick={(event) => onNavigateHome(event, "#collection")}>Bütün kolleksiya <ArrowIcon /></a>
        </div>
        <div className="related-product-grid">
          {relatedProducts.map((related, index) => (
            <a
              href={demoUrl(`/products/${related.id}`)}
              key={related.id}
              onClick={(event) => onNavigateProduct(event, related)}
              style={{ "--card-accent": related.accent, "--delay": `${index * 90}ms` } as React.CSSProperties}
              data-fly
              data-reveal
            >
              <span className="related-product-image"><img src={related.image} alt={related.imageAlt} loading="lazy" /></span>
              <span className="related-product-meta">
                <small>{related.category}</small>
                <b>{related.name} <i>{related.model}</i></b>
                <strong>{formatPrice(related.price)}</strong>
              </span>
              <span className="related-product-arrow" aria-hidden="true"><ArrowIcon /></span>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}

export function ProductNotFound({ onNavigateHome }: Pick<ProductDetailPageProps, "onNavigateHome">) {
  return (
    <main id="content" className="product-not-found">
      <p>Məhsul tapılmadı</p>
      <h1>Bu forma kolleksiyada yoxdur.</h1>
      <a className="button button--primary" href={demoUrl("/#collection")} onClick={(event) => onNavigateHome(event, "#collection")}>
        Kolleksiyaya qayıt <ArrowIcon />
      </a>
    </main>
  );
}
