import { demoUrl } from "../demo/navigation";
import { useEffect, useState } from "react";
import {
  fetchSupportManuals,
  fetchPreviewExample,
  fetchSupportPreview,
  supportManualUrl,
  type SupportManual,
  type SupportPreview,
} from "../api/support";
import { SignalField } from "./SignalField";
import { WarrantySection } from "./WarrantySection";

type SupportPageProps = {
  warrantyCaseId?: string;
  onNavigateHome: (event: React.MouseEvent<HTMLAnchorElement>, hash?: string) => void;
};

export function SupportPage({ onNavigateHome, warrantyCaseId }: SupportPageProps) {
  const [manuals, setManuals] = useState<SupportManual[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [previewUrl, setPreviewUrl] = useState("");
  const [preview, setPreview] = useState<SupportPreview | null>(null);
  const [previewState, setPreviewState] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    if (warrantyCaseId) return;
    const controller = new AbortController();
    fetchSupportManuals(controller.signal)
      .then((data) => {
        setManuals(data);
        setState("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState("error");
      });
    fetchPreviewExample(controller.signal).then(setPreviewUrl).catch(() => setPreviewState("error"));
    return () => controller.abort();
  }, [warrantyCaseId]);

  async function submitPreview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPreviewState("loading");
    setPreview(null);
    try {
      setPreview(await fetchSupportPreview(previewUrl.trim()));
      setPreviewState("idle");
    } catch {
      setPreviewState("error");
    }
  }

  if (warrantyCaseId) return <main id="content" className="support-page warranty-page">
    <a className="warranty-back-link" href={demoUrl("/account#warranty")}>← Zəmanət müraciətlərim</a>
    <WarrantySection key={warrantyCaseId} caseId={warrantyCaseId} />
  </main>;

  return (
    <main id="content" className="support-page">
      <section className="support-hero">
        <div className="support-copy">
          <a className="account-home-link" href={demoUrl("/")} onClick={(event) => onNavigateHome(event)}>← Ana səhifə</a>
          <p>Texniki dəstək</p>
          <h1>Səsi yenidən<br />qur.</h1>
          <span>Məhsul bələdçisini modelə görə seç. Fayllar lokal dəstək arxivindən birbaşa yüklənir.</span>
          <a className="warranty-back-link" href={demoUrl("/account#warranty")}>Zəmanət və əvəzetmə ↗</a>
          <dl className="support-meta">
            <div><dt>Cavab vaxtı</dt><dd>1 iş günü</dd></div>
            <div><dt>Kanal</dt><dd>support@seda.example</dd></div>
            <div><dt>Zəmanət</dt><dd>2 il</dd></div>
          </dl>
        </div>
        <div className="support-signal" aria-hidden="true">
          <SignalField accent="#aaa2ff" />
          <div className="support-rings"><i /><i /><i /></div>
          <div className="support-wave"><i /><i /><i /><i /><i /><i /><i /></div>
          <p>Modeli tap.<br />Bələdçini aç.</p>
        </div>
      </section>

      <section className="support-library" aria-labelledby="support-library-title">
        <div className="support-library-heading">
          <div><p>Manual arxivi</p><h2 id="support-library-title">Modelin üçün<br />qısa yol.</h2></div>
          <span>{state === "ready" ? `${manuals.length} bələdçi` : state === "loading" ? "Arxiv yoxlanılır" : "Arxiv əlçatan deyil"}</span>
        </div>

        {state === "error" ? (
          <div className="support-state" role="alert">İndi bələdçiləri almaq mümkün olmadı. Bir qədər sonra yenidən yoxla.</div>
        ) : (
          <div className="support-manuals" aria-busy={state === "loading"}>
            {state === "loading" && <div className="support-state">Bələdçilər yüklənir.</div>}
            {manuals.map((manual, index) => (
              <article key={manual.filename}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><small>SƏDA {manual.model}</small><h3>{manual.title}</h3><p>{manual.description}</p></div>
                <a href={supportManualUrl(manual.filename)} download={manual.filename}>
                  TXT yüklə <b aria-hidden="true">↓</b>
                </a>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="support-preview" aria-labelledby="support-preview-title">
        <div className="support-preview-inner">
          <div>
            <p>Media arxivi</p>
            <h2 id="support-preview-title">Linkə baxış</h2>
            <span>SƏDA media xidmətindəki bələdçi linkini daxil et və qısa məzmununa bax.</span>
          </div>
          <form onSubmit={submitPreview}>
            <label htmlFor="support-preview-url">Media linki</label>
            <div><input id="support-preview-url" type="url" required value={previewUrl}
              onChange={(event) => setPreviewUrl(event.target.value)} autoComplete="url" />
              <button type="submit" disabled={previewState === "loading"}>Baxış aç</button></div>
            {previewState === "loading" && <small role="status">Link yoxlanılır…</small>}
            {previewState === "error" && <small role="alert">Linkə baxmaq mümkün olmadı. Media ünvanını yoxla.</small>}
          </form>
          {preview && <article aria-live="polite"><small>{preview.status} · {preview.redirects} yönləndirmə</small>
            <p>{preview.body}</p><span>{preview.finalUrl}</span></article>}
        </div>
      </section>
    </main>
  );
}
