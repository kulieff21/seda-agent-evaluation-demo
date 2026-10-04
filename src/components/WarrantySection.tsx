import { demoUrl, navigateDemo } from "../demo/navigation";
import { useEffect, useState } from "react";
import { amendWarranty, approveWarranty, cancelWarranty, fetchWarranty, fetchWarrantyCase, fetchWarrantyReceipt,
  finalizeWarranty, openWarranty, reserveWarranty, type WarrantyCase, type WarrantyList, type WarrantyReceipt } from "../api/warranty";
import { products } from "../data/products";

const labels: Record<string, string> = { open: "Seçim açıqdır", fulfilled: "Əvəzetmə tamamlandı", cancelled: "Ləğv edildi", expired: "Müddəti bitdi",
  available: "Qüvvədədir", consumed: "İstifadə edildi", invalidated: "Ləğv edildi" };
const time = (value: string) => new Date(value).toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit" });

export function WarrantySection({ caseId }: { caseId?: string }) {
  const [list, setList] = useState<WarrantyList | null>(null);
  const [current, setCurrent] = useState<WarrantyCase | null>(null);
  const [receipt, setReceipt] = useState<WarrantyReceipt | null>(null);
  const [selection, setSelection] = useState("");
  const [approvalId, setApprovalId] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function update(value: WarrantyCase) {
    setCurrent(value); setSelection(value.product.id);
    setApprovalId((previous) => value.approvals.some((item) => item.id === previous && item.status === "available")
      ? previous : value.approvals.filter((item) => item.status === "available").at(-1)?.id ?? "");
  }
  useEffect(() => {
    let active = true;
    setBusy(true); setError(""); setCurrent(null); setReceipt(null);
    (caseId ? fetchWarrantyCase(caseId) : fetchWarranty()).then((data) => {
      if (!active) return;
      if (caseId) update(data as WarrantyCase); else setList(data as WarrantyList);
    }).catch((cause: Error) => { if (active) setError(cause.message); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [caseId]);

  async function action(operation: () => Promise<void>, success: string) {
    setBusy(true); setError(""); setMessage("");
    try { await operation(); setMessage(success); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Əməliyyat tamamlanmadı."); }
    finally { setBusy(false); }
  }

  return <section id="warranty" className={`warranty-section${caseId ? " warranty-section--detail" : ""}`} aria-labelledby="warranty-title" aria-busy={busy}>
    <header className="warranty-heading"><div><p>Səsə davam</p><h2 id="warranty-title">{caseId ? "Əvəzetmə müraciəti." : "Zəmanətin yanında."}</h2></div>
      <span>{caseId ? "Seçim · təsdiq · əvəzetmə" : "2 il zəmanət"}</span></header>
    {busy && <p role="status">Məlumatlar yenilənir…</p>}
    {error && <p className="warranty-message" role="alert">{error} <a href={demoUrl("/account#warranty")}>Hesabına qayıt</a></p>}
    {message && <p className="warranty-message" role="status">{message}</p>}
    {!caseId && list && <>
      <p>Uyğun sifarişindən müraciət aç. Ekvivalent model standart zəmanətlə, premium alternativ isə ayrıca təsdiqlə əvəz olunur.</p>
      {!list.items.length && <p>Hazırda əvəzetməyə uyğun sifarişin yoxdur.</p>}
      <div className="warranty-items">{list.items.map((item) => <article key={item.id}>
        <img src={products.find((p) => p.id === item.product.id)?.image} alt="" />
        <div><small>Sifariş #{item.orderNumber}</small><h3>{item.product.name}</h3><a href={demoUrl(`/products/${item.product.id}`)}>Modelə bax ↗</a></div>
        {item.canOpen && <button className="button button--primary" disabled={busy} onClick={() => void action(async () => {
          const opened = await openWarranty(item.id, item.product.id); navigateDemo(opened.supportUrl);
        }, "Müraciət açıldı.")}>Müraciət aç</button>}
      </article>)}</div>
      <div className="warranty-case-list">{list.cases.map((item) => <a key={item.id} href={item.supportUrl}>
        <span>{item.product.name}</span><span>Versiya {item.revision} · {labels[item.status]}</span><b>Müraciətə bax ↗</b>
      </a>)}</div>
    </>}
    {current && <>
      <div className="warranty-summary"><strong>{current.product.name}</strong><span>Versiya {current.revision}</span><span>{labels[current.status]}</span></div>
      <div className="warranty-workflow">
        <article className="warranty-selection"><small>01 / Seçim</small><h3>Dinləməyə necə davam edək?</h3>
          <fieldset disabled={busy || current.status !== "open"}><legend>Əvəzetmə modeli</legend>
            {current.choices.map((choice) => <label key={choice.product.id} className={selection === choice.product.id ? "is-selected" : ""}>
              <input type="radio" name="replacement" value={choice.product.id} checked={selection === choice.product.id} onChange={() => setSelection(choice.product.id)} />
              <img src={products.find((p) => p.id === choice.product.id)?.image} alt="" />
              <span><b>{choice.product.name}</b><small>{choice.coverage === "covered" ? "Standart zəmanətə daxildir" : "Premium · ayrıca təsdiq"}</small></span>
            </label>)}
          </fieldset>
          {current.status === "open" && <button className="button button--primary" disabled={busy || selection === current.product.id}
            onClick={() => void action(async () => update(await amendWarranty(current.id, selection)), "Seçim yeniləndi.")}>Seçimi yenilə</button>}
          <p>Seçimi dəyişdikdə yeni versiya yaranır və əvvəlki rezerv buraxılır.</p>
        </article>
        <article className="warranty-approval"><small>02 / Dəstək təsdiqi</small><h3>Əhatə olunan seçim.</h3>
          <p>Standart zəmanət ekvivalent model üçündür. Təsdiq 30 dəqiqə qüvvədə qalır.</p>
          {current.approvals.length ? <ol>{current.approvals.map((approval) => <li key={approval.id}>
            <b>{approval.product.name}</b><span>Versiya {approval.revision} · {labels[approval.status]}</span><small>Son vaxt: {time(approval.expiresAt)}</small>
          </li>)}</ol> : <p>Hələ təsdiq verilməyib.</p>}
          {current.status === "open" && <button className="button button--primary" disabled={busy}
            onClick={() => void action(async () => update(await approveWarranty(current.id)), "Dəstək təsdiqi alındı.")}>Təsdiq istə</button>}
        </article>
        <article className="warranty-fulfillment"><small>03 / Əvəzetmə</small><h3>Seçimini rezerv et.</h3>
          <p>Rezerv modeli 10 dəqiqə saxlayır. Əvəzetməni tamamlamaq üçün dəstək təsdiqi seç.</p>
          {current.reservation && <p className="warranty-hold">{current.reservation.product.name} · Versiya {current.reservation.revision}<br />Rezervin son vaxtı: {time(current.reservation.expiresAt)}</p>}
          {current.status === "open" && <div className="warranty-actions">
            <button className="button button--primary" disabled={busy || !!current.reservation}
              onClick={() => void action(async () => update(await reserveWarranty(current.id)), "Model rezerv edildi.")}>Rezerv et</button>
            <label>Təsdiq<select value={approvalId} onChange={(event) => setApprovalId(event.target.value)} disabled={busy}>
              <option value="">Təsdiq seç</option>{current.approvals.filter((a) => a.status === "available").map((a) =>
                <option value={a.id} key={a.id}>{a.product.name} · Versiya {a.revision}</option>)}
            </select></label>
            <button className="button button--primary" disabled={busy || !approvalId || !current.reservation}
              onClick={() => void action(async () => {
                await finalizeWarranty(current.id, approvalId, current.reservation!.id);
                update(await fetchWarrantyCase(current.id)); setReceipt(await fetchWarrantyReceipt(current.id));
              }, "Əvəzetmə tamamlandı.")}>Əvəzetməni tamamla</button>
            <button className="warranty-cancel" disabled={busy} onClick={() => void action(async () => update(await cancelWarranty(current.id)), "Müraciət ləğv edildi.")}>Müraciəti ləğv et</button>
          </div>}
          {current.status === "fulfilled" && <button className="button button--primary" disabled={busy}
            onClick={() => void action(async () => setReceipt(await fetchWarrantyReceipt(current.id)), "Qəbz açıldı.")}>Qəbzi aç</button>}
        </article>
      </div>
      {receipt && <article className="warranty-receipt" aria-live="polite"><small>Əvəzetmə qəbzi</small><h3>{receipt.product.name}</h3>
        <p>{receipt.quantity} ədəd · Versiya {receipt.revision} · Zəmanət üzrə əvəzetmə</p><span>{receipt.id}</span>
      </article>}
    </>}
  </section>;
}
