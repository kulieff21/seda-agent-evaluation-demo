import { useEffect, useMemo, useRef, useState } from "react";
import { demoUrl } from "../demo/navigation";
import { prefersReducedMotion } from "../demo/motion";
import { formatPrice, productGroups, type Product, type ProductGroup } from "../data/products";
import { Icon, Mark, waveform } from "./Icon";

type SortMode = "featured" | "price-asc" | "price-desc";
type CatalogState = "loading" | "ready" | "fallback";
type ProductLinkHandler = (event: React.MouseEvent<HTMLAnchorElement>, product: Product) => void;

type HomePageProps = {
  products: Product[];
  heroProducts: Product[];
  selected: Product;
  catalogState: CatalogState;
  onSelectHero: (id: string) => void;
  onAddToCart: (product: Product, origin?: Element | null) => void;
  onNavigateProduct: ProductLinkHandler;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
};

const TRACK_SECONDS = 7;

/** Sets `--p` (0 → 1) on an element while it travels through the viewport. */
function useScrollProgress<T extends HTMLElement>(start = 0.88, end = 0.3) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (prefersReducedMotion()) {
      element.style.setProperty("--p", "1");
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const bounds = element.getBoundingClientRect();
      const viewport = window.innerHeight;
      const progress = (viewport * start - bounds.top) / (viewport * (start - end) + bounds.height * 0.35);
      element.style.setProperty("--p", Math.min(1, Math.max(0, progress)).toFixed(4));
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [end, start]);
  return ref;
}

function SplitWord({ word, offset }: { word: string; offset: number }) {
  return (
    <span className="split-word" aria-hidden="true">
      {[...word].map((letter, index) => (
        <span className="split-letter" key={index} style={{ "--i": offset + index } as React.CSSProperties}>{letter}</span>
      ))}
    </span>
  );
}

function Hero({ heroProducts, selected, onSelectHero, onNavigateProduct, onPointerMove }: Pick<HomePageProps, "heroProducts" | "selected" | "onSelectHero" | "onNavigateProduct" | "onPointerMove">) {
  const sectionRef = useRef<HTMLElement>(null);
  const [previousId, setPreviousId] = useState<string | null>(null);
  const [userPaused, setUserPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [offscreen, setOffscreen] = useState(false);
  const paused = userPaused || hovering || offscreen;
  const selectedIndex = heroProducts.findIndex((product) => product.id === selected.id);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => setOffscreen(!entry.isIntersecting), { threshold: 0.35 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const select = (id: string) => {
    if (id === selected.id) return;
    setPreviousId(selected.id);
    onSelectHero(id);
  };
  const advance = () => select(heroProducts[(selectedIndex + 1) % heroProducts.length].id);
  const ringText = `SƏDA · ${selected.name} ${selected.model} · ${selected.category} · `;

  return (
    <section ref={sectionRef} id="hero" className={`hero${paused ? " is-paused" : ""}`} aria-label="Önə çıxan məhsul">
      <div className="hero-inner">
        <div className="hero-copy">
          <p className="eyebrow"><span className="live-dot" aria-hidden="true" />Bakıdan şəxsi audio · Kolleksiya 2026</p>
          <h1 className="hero-title">
            <span className="visually-hidden">Səsi seç. Məkanı dəyiş.</span>
            <span className="hero-line"><SplitWord word="Səsi" offset={0} /> <SplitWord word="seç." offset={4} /></span>
            <span className="hero-line hero-line--accent"><SplitWord word="Məkanı" offset={8} /> <SplitWord word="dəyiş." offset={14} /></span>
          </h1>
          <p className="hero-intro">
            Qulaqlıqdan otaq sisteminə qədər səkkiz forma, bir məqsəd:
            musiqi ilə arandakı məsafəni azaltmaq.
          </p>
          <div className="hero-cta">
            <a className="button button--primary magnetic" href={demoUrl(`/products/${selected.id}`)} onClick={(event) => onNavigateProduct(event, selected)}>
              <span className="button-label" key={selected.id}>{selected.name} {selected.model}-i kəşf et</span> <Icon name="arrow" />
            </a>
            <a className="quiet-link" href="#collection">Bütün kolleksiya</a>
          </div>
          <ul className="hero-proof" aria-label="Seçilmiş məhsul xüsusiyyətləri" key={selected.id}>
            {selected.features.map((feature, index) => <li key={feature} style={{ "--i": index } as React.CSSProperties}><Icon name="check" />{feature}</li>)}
          </ul>
        </div>

        <div
          className="hero-stage"
          data-fly
          onPointerMove={onPointerMove}
          onPointerEnter={() => setHovering(true)}
          onPointerLeave={() => setHovering(false)}
        >
          <div className="hero-echo" aria-hidden="true"><i /><i /><i /><i /><i /></div>
          <svg className="hero-ring-text" viewBox="0 0 200 200" aria-hidden="true">
            <defs><path id="hero-ring-path" d="M100,100 m-91,0 a91,91 0 1,1 182,0 a91,91 0 1,1 -182,0" /></defs>
            <text><textPath href="#hero-ring-path" textLength="568" lengthAdjust="spacing">{ringText}{ringText}</textPath></text>
          </svg>
          <div className="hero-aperture">
            {heroProducts.map((product) => (
              <img
                key={product.id}
                className={product.id === selected.id ? "is-active" : product.id === previousId ? "is-previous" : ""}
                src={product.image}
                alt={product.id === selected.id ? product.imageAlt : ""}
                aria-hidden={product.id !== selected.id}
                fetchPriority={product.id === heroProducts[0]?.id ? "high" : "auto"}
                decoding="async"
              />
            ))}
            <span className="hero-aperture-glare" aria-hidden="true" />
          </div>
          <div className="hero-tag" aria-live="polite" key={selected.id}>
            <small>{selected.category}</small>
            <strong>{formatPrice(selected.price)}</strong>
          </div>
          <span className="hero-counter" aria-hidden="true"><b>{String(selectedIndex + 1).padStart(2, "0")}</b>/{String(heroProducts.length).padStart(2, "0")}</span>
        </div>
      </div>

      <div className="hero-tracks" role="group" aria-label="Önə çıxan məhsulu seç">
        <button
          className="hero-play"
          type="button"
          onClick={() => setUserPaused(!userPaused)}
          aria-label={userPaused ? "Avtomatik keçidi davam etdir" : "Avtomatik keçidi dayandır"}
        >
          <Icon name={userPaused ? "play" : "pause"} />
        </button>
        {heroProducts.map((product, index) => (
          <button
            key={product.id}
            className={`hero-track${product.id === selected.id ? " is-active" : ""}`}
            type="button"
            onClick={() => select(product.id)}
            aria-pressed={product.id === selected.id}
            style={{ "--track-accent": product.accent, "--track-seconds": `${TRACK_SECONDS}s` } as React.CSSProperties}
          >
            <span className="hero-track-no">{String(index + 1).padStart(2, "0")}</span>
            <span className="hero-track-thumb"><img src={product.image} alt="" loading="lazy" /></span>
            <span className="hero-track-name"><b>{product.name}</b><small>{product.model} · {product.group}</small></span>
            <span className="hero-track-progress" aria-hidden="true">
              <i onAnimationEnd={(event) => { if (event.animationName === "track-progress") advance(); }} />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function Ticker() {
  const items = ["Bakıda pulsuz çatdırılma", "30 gün evdə sınaq", "2 il zəmanət", "Otağına uyğun pulsuz kalibrasiya", "Satışdan sonra real texniki yardım"];
  const row = (hidden: boolean) => (
    <ul className="ticker-row" aria-hidden={hidden || undefined}>
      {items.map((item) => <li key={item}><i aria-hidden="true" />{item}</li>)}
    </ul>
  );
  return (
    <section className="ticker" aria-label="Alış üstünlükləri">
      <div className="ticker-track">{row(false)}{row(true)}</div>
    </section>
  );
}

const statementText = "Yaxşı səs daha yüksək səs deyil. Qulaqla musiqi arasında qalan hər şeyi azaltmaqdır.";

function Statement() {
  const ref = useScrollProgress<HTMLElement>(0.92, 0.42);
  const words = statementText.split(" ");
  const jitter = waveform("statement", words.length);
  return (
    <section ref={ref} id="philosophy" className="statement" style={{ "--n": words.length } as React.CSSProperties}>
      <div className="statement-side" data-reveal>
        <p className="eyebrow">SƏDA yanaşması</p>
        <div className="statement-meter" aria-hidden="true">
          <span>Səs-küy</span><i><b /></i><span>Aydınlıq</span>
        </div>
      </div>
      <h2 className="statement-text">
        <span className="visually-hidden">{statementText}</span>
        {words.map((word, index) => (
          <span
            aria-hidden="true"
            key={index}
            className={word === "azaltmaqdır." || word === "deyil." ? "is-key" : ""}
            style={{
              "--i": index,
              "--jx": ((jitter[index] % 7) - 3) / 10,
              "--jy": ((jitter[(index + 3) % words.length] % 5) - 2) / 6,
            } as React.CSSProperties}
          >
            {word}{" "}
          </span>
        ))}
      </h2>
    </section>
  );
}

function Collection({ products, catalogState, onAddToCart, onNavigateProduct, onPointerMove }: Pick<HomePageProps, "products" | "catalogState" | "onAddToCart" | "onNavigateProduct" | "onPointerMove">) {
  const [catalogQuery, setCatalogQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<ProductGroup>("Hamısı");
  const [sortMode, setSortMode] = useState<SortMode>("featured");
  const [stationId, setStationId] = useState<string | null>(null);

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

  const station = visibleProducts.find((product) => product.id === stationId) ?? visibleProducts[0];
  const trackCode = (product: Product) => {
    const index = products.findIndex((item) => item.id === product.id);
    return `${index < 4 ? "A" : "B"}${(index % 4) + 1}`;
  };
  const resetFilters = () => { setActiveGroup("Hamısı"); setCatalogQuery(""); };

  return (
    <section id="collection" className="collection">
      <div className="section-head" data-reveal>
        <p className="eyebrow">Kolleksiya 2026 · iki tərəf, səkkiz trek</p>
        <h2>Səkkiz forma.<br /><em>Bir dinləmə dili.</em></h2>
        <p>A tərəfi yanında gəzir, B tərəfi otağında qalır. Sətrin üstünə gəl — dinləmə stendi o formanı göstərsin.</p>
      </div>

      <div className="catalog-toolbar" data-reveal>
        <label className="catalog-search">
          <Icon name="search" />
          <input value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} type="search" placeholder="Məhsul axtar" aria-label="Kataloqda məhsul axtar" />
        </label>
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
        <p><strong>{String(visibleProducts.length).padStart(2, "0")}</strong> məhsul</p>
        <span className={`catalog-sync catalog-sync--${catalogState}`} role="status">
          <i />
          {catalogState === "loading" ? "Kolleksiya yenilənir" : catalogState === "ready" ? "Canlı stok" : "Lokal kataloq"}
        </span>
        {(activeGroup !== "Hamısı" || catalogQuery) && <button type="button" onClick={resetFilters}>Süzgəci sıfırla</button>}
      </div>

      {visibleProducts.length ? (
        <div className="listening-room">
          <ol className="tracklist">
            {visibleProducts.map((product, index) => (
              <li
                key={product.id}
                className={`track-row${station?.id === product.id ? " is-current" : ""}`}
                style={{ "--card-accent": product.accent, "--row": index } as React.CSSProperties}
                onPointerEnter={() => setStationId(product.id)}
                onFocus={() => setStationId(product.id)}
                data-fly
              >
                <a className="track-link" href={demoUrl(`/products/${product.id}`)} onClick={(event) => onNavigateProduct(event, product)} aria-label={`${product.name} ${product.model} məhsuluna bax`}>
                  <span className="track-code">{trackCode(product)}</span>
                  <span className="track-thumb"><img src={product.image} alt={product.imageAlt} loading="lazy" decoding="async" /></span>
                  <span className="track-title">
                    <b>{product.name}</b><i>{product.model}</i>
                    {product.badge && <em>{product.badge}</em>}
                  </span>
                  <span className="track-category">{product.category}</span>
                  <span className="track-wave" aria-hidden="true">
                    {waveform(product.id, 28).map((height, bar) => <i key={bar} style={{ "--h": `${height}%`, "--b": bar } as React.CSSProperties} />)}
                  </span>
                  <span className="track-price">{formatPrice(product.price)}</span>
                </a>
                <button className="track-add" type="button" onClick={(event) => onAddToCart(product, event.currentTarget)} aria-label={`${product.name} məhsulunu səbətə əlavə et`}>
                  <Icon name="plus" />
                </button>
              </li>
            ))}
          </ol>

          {station && (
            <aside className="station" aria-label="Dinləmə stendi" style={{ "--card-accent": station.accent } as React.CSSProperties}>
              <div className="station-frame" onPointerMove={onPointerMove} data-fly>
                <span className="station-spot" aria-hidden="true" />
                {visibleProducts.map((product) => (
                  <img
                    key={product.id}
                    className={product.id === station.id ? "is-active" : ""}
                    src={product.image}
                    alt={product.id === station.id ? product.imageAlt : ""}
                    aria-hidden={product.id !== station.id}
                    loading="lazy"
                    decoding="async"
                  />
                ))}
                <span className="station-code">{trackCode(station)} · {station.group}</span>
                {station.badge && <span className="station-badge">{station.badge}</span>}
                <span className="station-eq" aria-hidden="true"><i /><i /><i /><i /><i /></span>
              </div>
              <div className="station-info" key={station.id}>
                <p>{station.category}</p>
                <h3>{station.name} <span>{station.model}</span></h3>
                <span className="station-desc">{station.description}</span>
                <ul>{station.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
                <div className="station-buy">
                  <strong>{formatPrice(station.price)}</strong>
                  <a className="button button--ghost" href={demoUrl(`/products/${station.id}`)} onClick={(event) => onNavigateProduct(event, station)}>Yaxından bax <Icon name="arrow" /></a>
                  <button className="button button--primary" type="button" onClick={(event) => onAddToCart(station, event.currentTarget.closest(".station")?.querySelector(".station-frame"))}>Səbətə <Icon name="plus" /></button>
                </div>
              </div>
            </aside>
          )}
        </div>
      ) : (
        <div className="catalog-empty">
          <Mark compact />
          <h3>Bu səs hələ kolleksiyada yoxdur.</h3>
          <p>Axtarış sözünü dəyiş və ya bütün kateqoriyalara qayıt.</p>
          <button className="button button--primary" type="button" onClick={resetFilters}>Bütün məhsullar</button>
        </div>
      )}
    </section>
  );
}

const LANES = [
  { key: "noise", label: "Ətraf səs-küy", hint: "Metro, kondisioner, küçə" },
  { key: "anti", label: "Əks-dalğa", hint: "Mikrofon ölçür, tərsini yaradır" },
  { key: "ear", label: "Qulağına çatan", hint: "Musiqi + qalan səs-küy" },
] as const;

function NoiseLab({ accent }: { accent: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strength, setStrength] = useState(0);
  const strengthRef = useRef(0);
  const touchedRef = useRef(false);
  const residual = Math.max(1 - strength / 100, 0.03);
  const decibels = Math.round(20 * Math.log10(residual));

  useEffect(() => { strengthRef.current = strength / 100; }, [strength]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let raf = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || touchedRef.current) return;
      observer.disconnect();
      if (prefersReducedMotion()) { setStrength(86); return; }
      const begin = performance.now();
      const step = (now: number) => {
        if (touchedRef.current) return;
        const t = Math.min(1, (now - begin) / 2600);
        setStrength(Math.round((1 - Math.pow(1 - t, 3)) * 86));
        if (t < 1) raf = window.requestAnimationFrame(step);
      };
      raf = window.requestAnimationFrame(step);
    }, { threshold: 0.45 });
    observer.observe(section);
    return () => { observer.disconnect(); window.cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const reduced = prefersReducedMotion();
    let width = 0;
    let height = 0;
    let raf = 0;
    let visible = true;
    let time = 0.6;
    const styles = getComputedStyle(canvas);

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const noise = (x: number, t: number) =>
      Math.sin(x * 0.031 + t * 2.1) * 0.42
      + Math.sin(x * 0.083 - t * 3.7) * 0.28
      + Math.sin(x * 0.19 + t * 6.3) * 0.18
      + Math.sin(x * 0.47 - t * 9.1) * 0.12;
    const music = (x: number, t: number) => Math.sin(x * 0.022 - t * 1.4) * 0.5 * (0.75 + Math.sin(x * 0.004 + t * 0.3) * 0.25);

    const lane = (index: number, color: string, sample: (x: number) => number, lineWidth: number) => {
      const laneHeight = height / 3;
      const mid = laneHeight * index + laneHeight / 2;
      const amplitude = laneHeight * 0.36;
      context.beginPath();
      for (let x = 0; x <= width; x += 2) {
        const y = mid - sample(x) * amplitude;
        if (x === 0) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.strokeStyle = color;
      context.lineWidth = lineWidth;
      context.lineJoin = "round";
      context.stroke();
      context.beginPath();
      context.moveTo(0, mid);
      context.lineTo(width, mid);
      context.strokeStyle = styles.getPropertyValue("--lab-axis").trim() || "rgba(128,128,128,.2)";
      context.lineWidth = 1;
      context.stroke();
    };

    const draw = () => {
      const s = strengthRef.current;
      const ink = styles.getPropertyValue("--lab-ink").trim() || "#888";
      const warm = styles.getPropertyValue("--lab-warm").trim() || "#ff765f";
      context.clearRect(0, 0, width, height);
      lane(0, ink, (x) => noise(x, time), 1.4);
      lane(1, accent, (x) => -noise(x, time) * s, 1.8);
      lane(2, warm, (x) => music(x, time) + noise(x, time) * (1 - s), 2.2);
    };
    const loop = () => {
      draw();
      time += 0.012;
      if (visible) raf = window.requestAnimationFrame(loop);
    };
    // Resizing clears the bitmap, so repaint the current frame straight away.
    const resizeObserver = new ResizeObserver(() => { resize(); draw(); });
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !reduced) { window.cancelAnimationFrame(raf); raf = window.requestAnimationFrame(loop); }
    });
    resizeObserver.observe(canvas);
    visibility.observe(canvas);
    canvas.addEventListener("redraw", draw);
    resize();
    draw();
    return () => {
      resizeObserver.disconnect();
      visibility.disconnect();
      canvas.removeEventListener("redraw", draw);
      window.cancelAnimationFrame(raf);
    };
  }, [accent]);

  useEffect(() => {
    if (!prefersReducedMotion()) return;
    // Redraw the static frame whenever the slider moves.
    canvasRef.current?.dispatchEvent(new Event("redraw"));
  }, [strength]);

  return (
    <section ref={sectionRef} className="noise-lab" aria-labelledby="noise-lab-title">
      <div className="noise-lab-copy" data-reveal>
        <p className="eyebrow">Dinləmə arxitekturası</p>
        <h2 id="noise-lab-title">Sakitlik də<br /><em>məhsulun bir hissəsidir.</em></h2>
        <p>
          Mikrofonlar ətrafdakı səs-küyü saniyədə minlərlə dəfə ölçür. Prosessor onun tam tərsini yaradır;
          iki dalğa toqquşanda bir-birini söndürür və musiqiyə yer qalır. Sürgünü çək, prosesi öz gözünlə gör.
        </p>
        <label className="noise-lab-control">
          <span>Adaptiv sakitlik <b>{strength}%</b></span>
          <input
            type="range"
            min="0"
            max="100"
            value={strength}
            style={{ "--fill": `${strength}%` } as React.CSSProperties}
            onChange={(event) => { touchedRef.current = true; setStrength(Number(event.target.value)); }}
          />
        </label>
        <dl className="noise-lab-readout">
          <div><dt>Qalan səs-küy</dt><dd>{Math.round(residual * 100)}%</dd></div>
          <div><dt>Səviyyə dəyişməsi</dt><dd>{decibels === 0 ? "0" : `${decibels}`} dB</dd></div>
        </dl>
        <small className="noise-lab-note">Sxematik model: prinsipi göstərir, məhsul ölçməsi deyil.</small>
      </div>
      <div className="noise-lab-scope" data-reveal style={{ "--strength": strength / 100 } as React.CSSProperties}>
        <ul className="noise-lab-lanes" aria-hidden="true">
          {LANES.map((item) => <li key={item.key} className={`lane lane--${item.key}`}><b>{item.label}</b><small>{item.hint}</small></li>)}
        </ul>
        <canvas ref={canvasRef} aria-hidden="true" />
        <span className="noise-lab-sum" aria-hidden="true">+</span>
      </div>
    </section>
  );
}

const MATERIALS = [
  { code: "01", name: "Toxuma", text: "Dəri ilə təmasda nəfəs alır və uzun dinləmədə istiliyi azaldır.", fx: 0.27, fy: 0.6 },
  { code: "02", name: "Metal", text: "Formanı saxlayır, vibrasiyanı idarə edir və sakit toxunuş verir.", fx: 0.77, fy: 0.36 },
  { code: "03", name: "İşıq", text: "Yalnız vəziyyəti göstərir; diqqəti musiqidən almır.", fx: 0.545, fy: 0.565 },
];

function Materials({ product }: { product: Product | undefined }) {
  if (!product) return null;
  return (
    <section className="materials" aria-labelledby="materials-title">
      <div className="section-head section-head--split" data-reveal>
        <div>
          <p className="eyebrow">Yaxından · {product.name} {product.model}</p>
          <h2 id="materials-title">Material da<br /><em>sakit danışır.</em></h2>
        </div>
        <p>Üç detal, eyni fotodan. Kartın üstünə gəl — kadr geri çəkilsin və detalın formada harada olduğunu gör.</p>
      </div>
      <div className="material-grid">
        {MATERIALS.map((material, index) => (
          <article className="material-card" key={material.code} data-reveal style={{ "--fx": material.fx, "--fy": material.fy, "--delay": `${index * 90}ms` } as React.CSSProperties}>
            <div className="material-lens">
              <img src={product.image} alt="" loading="lazy" decoding="async" />
              <span className="material-target" aria-hidden="true" />
            </div>
            <div className="material-copy">
              <span>{material.code} / {material.name}</span>
              <p>{material.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Journal() {
  const entries = [
    ["07 dəq", "Sakit otaq həmişə yaxşı otaq deyil", "Akustika"],
    ["05 dəq", "Qulaqlıqda rahatlıq necə ölçülür?", "Material"],
    ["09 dəq", "Gündəlik dinləmədə spatial audio", "Texnologiya"],
  ];
  return (
    <section id="journal" className="journal">
      <div className="section-head section-head--split" data-reveal>
        <div>
          <p className="eyebrow">SƏDA jurnal</p>
          <h2>Dinləmək üçün<br /><em>qeydlər.</em></h2>
        </div>
        <p>Akustika, material və gündəlik dinləmə haqqında qısa, praktik yazılar.</p>
      </div>
      <div className="journal-list">
        {entries.map(([time, title, category], index) => (
          <a href="#journal" className="journal-row" key={title} data-reveal style={{ "--delay": `${index * 80}ms` } as React.CSSProperties}>
            <span className="journal-no">0{index + 1}</span>
            <span className="journal-cat">{category}</span>
            <h3>{title}</h3>
            <small>{time}</small>
            <span className="journal-arrow"><Icon name="arrowUpRight" /></span>
          </a>
        ))}
      </div>
    </section>
  );
}

type Ripple = { id: number; x: number; y: number };

function EchoCta() {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const counter = useRef(0);
  const emit = (event: React.PointerEvent<HTMLElement>) => {
    if (prefersReducedMotion() || (event.target as Element).closest("a, button")) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const ripple = { id: counter.current += 1, x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    setRipples((current) => [...current.slice(-5), ripple]);
  };
  return (
    <section className="echo-cta" onPointerDown={emit} data-reveal>
      <div className="echo-cta-rings" aria-hidden="true"><i /><i /><i /><i /></div>
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="echo-ripple"
          aria-hidden="true"
          style={{ left: ripple.x, top: ripple.y }}
          onAnimationEnd={() => setRipples((current) => current.filter((item) => item.id !== ripple.id))}
        ><i /><i /><i /></span>
      ))}
      <div className="echo-cta-copy">
        <p className="eyebrow"><span className="live-dot" aria-hidden="true" />30 gün evdə sınaq</p>
        <h2><span>Səsi seç.</span><span>Qalanını azalt.</span></h2>
        <a className="button button--inverse magnetic" href="#collection">Kolleksiyaya bax <Icon name="arrow" /></a>
      </div>
      <p className="echo-cta-hint" aria-hidden="true">Boşluğa toxun — əks-səda yarat</p>
    </section>
  );
}

export function HomePage(props: HomePageProps) {
  const materialProduct = props.products.find((product) => product.id === "m1") ?? props.products[0];
  return (
    <main id="content" className="home">
      <Hero {...props} />
      <Ticker />
      <Statement />
      <Collection {...props} />
      <NoiseLab accent={props.selected.accent} />
      <Materials product={materialProduct} />
      <Journal />
      <EchoCta />
    </main>
  );
}
