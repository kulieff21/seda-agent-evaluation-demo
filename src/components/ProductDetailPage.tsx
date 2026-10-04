import { demoUrl } from "../demo/navigation";
import type { AccountUser } from "../api/account";
import type { Product } from "../data/products";
import { formatPrice } from "../data/products";
import { ReviewsSection } from "./ReviewsSection";

type ProductLinkHandler = (event: React.MouseEvent<HTMLAnchorElement>, product: Product) => void;

type ProductDetailPageProps = {
  accountUser: AccountUser | null;
  product: Product;
  relatedProducts: Product[];
  onAddToCart: (product: Product) => void;
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
  return (
    <main
      id="content"
      className={`product-page product-page--${product.tone}`}
      style={{ "--product-accent": product.accent } as React.CSSProperties}
    >
      <section className="product-detail-hero">
        <div className="product-detail-topline">
          <a href={demoUrl("/#collection")} onClick={(event) => onNavigateHome(event, "#collection")}>Kolleksiyaya qayıt</a>
          <span>{product.group} / {product.model}</span>
        </div>

        <div className="product-detail-grid">
          <div className="product-detail-copy">
            <p className="product-detail-category">{product.category}</p>
            <h1>{product.name}<span>{product.model}</span></h1>
            <p className="product-detail-lead">{product.detail}</p>

            <ul className="product-detail-features">
              {product.features.map((feature) => <li key={feature}><CheckIcon />{feature}</li>)}
            </ul>

            <div className="product-detail-buy">
              <div><small>Qiymət</small><strong>{formatPrice(product.price)}</strong></div>
              <button className="button button--primary" type="button" onClick={() => onAddToCart(product)}>
                Səbətə əlavə et <PlusIcon />
              </button>
            </div>
            <p className="product-stock"><i />Stokda {product.inventory} ədəd · Bakı daxilində pulsuz çatdırılma</p>
          </div>

          <div className="product-detail-stage" onPointerMove={onPointerMove}>
            <div className="product-detail-spotlight" aria-hidden="true" />
            <div className="product-detail-rings" aria-hidden="true"><i /><i /><i /><i /></div>
            <img src={product.image} alt={product.imageAlt} />
            <span className="product-stage-hint">İşığı hərəkət etdir</span>
            <div className="product-stage-code"><span>SƏDA / {product.model}</span><b>{product.group}</b></div>
          </div>
        </div>
      </section>

      <section className="product-signal-story" aria-label={`${product.name} səs yanaşması`}>
        <div className="product-signal-copy">
          <p>Formanın içində</p>
          <h2>{product.description}</h2>
          <p>{product.detail}</p>
        </div>
        <div className="product-spectrum" aria-hidden="true">
          {Array.from({ length: 44 }, (_, index) => (
            <i
              key={index}
              style={{
                "--detail-bar": index,
                "--detail-height": `${22 + (Math.sin(index * 0.68) + 1) * 27}%`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      </section>

      <section className="product-decisions">
        <div className="product-decisions-heading">
          <p>Üç əsas xüsusiyyət</p>
          <h2>Hər detal dinləməyə xidmət edir.</h2>
        </div>
        <div className="product-decision-grid">
          {product.features.map((feature, index) => (
            <article key={feature}>
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
        <div className="related-products-head">
          <div><p>Kolleksiyada davam et</p><h2>Eyni səs dili,<br />başqa forma.</h2></div>
          <a href={demoUrl("/#collection")} onClick={(event) => onNavigateHome(event, "#collection")}>Bütün kolleksiya <ArrowIcon /></a>
        </div>
        <div className="related-product-grid">
          {relatedProducts.map((related) => (
            <a
              href={demoUrl(`/products/${related.id}`)}
              key={related.id}
              onClick={(event) => onNavigateProduct(event, related)}
              style={{ "--card-accent": related.accent } as React.CSSProperties}
            >
              <span className="related-product-image"><img src={related.image} alt={related.imageAlt} /></span>
              <span className="related-product-meta">
                <small>{related.category}</small>
                <b>{related.name} <i>{related.model}</i></b>
                <strong>{formatPrice(related.price)}</strong>
              </span>
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
