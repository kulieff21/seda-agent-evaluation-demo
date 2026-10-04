import { demoUrl } from "../demo/navigation";
import { useState } from "react";
import { SignalField } from "./SignalField";

type RecoveryPageProps = {
  mode: "request" | "reset";
  onNavigateAccount: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  onNavigateHome: (event: React.MouseEvent<HTMLAnchorElement>, hash?: string) => void;
  onRequest: (email: string) => Promise<void>;
  onReset: (token: string, password: string) => Promise<void>;
};

export function RecoveryPage({
  mode,
  onNavigateAccount,
  onNavigateHome,
  onRequest,
  onReset,
}: RecoveryPageProps) {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState(() => new URLSearchParams(window.location.search).get("token") ?? "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState<"idle" | "working" | "sent" | "complete">("idle");
  const [error, setError] = useState("");

  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("working");
    setError("");
    try {
      await onRequest(email);
      setStatus("sent");
    } catch {
      setError("Recovery sorğusu göndərilmədi. Bir qədər sonra yenidən yoxla.");
      setStatus("idle");
    }
  };

  const submitReset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmation) {
      setError("Şifrələr bir-birinə uyğun deyil.");
      return;
    }
    setStatus("working");
    setError("");
    try {
      await onReset(token, password);
      setPassword("");
      setConfirmation("");
      setStatus("complete");
    } catch {
      setError("Token etibarsızdır, vaxtı bitib və ya şifrə qaydaya uyğun deyil.");
      setStatus("idle");
    }
  };

  const completed = status === "sent" || status === "complete";
  return (
    <main id="content" className={`recovery-page recovery-page--${mode}`}>
      <section className="recovery-copy">
        <a className="account-home-link" href={demoUrl("/")} onClick={(event) => onNavigateHome(event)}>← Ana səhifə</a>
        {!completed ? (
          <>
            <p>{mode === "request" ? "Hesaba dönüş" : "Yeni giriş siqnalı"}</p>
            <h1>{mode === "request" ? <>Səsini geri<br />çağır.</> : <>Yeni şifrəni<br />qur.</>}</h1>
            <span>{mode === "request"
              ? "Nümunə email ünvanını daxil et və hesab bərpa ekranını sına. Real email göndərilmir."
              : "Demo tokenı ilə yeni şifrə ekranını sına. Daxil etdiyin şifrə saxlanmır."}</span>
            <form onSubmit={mode === "request" ? submitRequest : submitReset}>
              {mode === "request" ? (
                <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
              ) : (
                <>
                  <label>Recovery tokenı<input value={token} onChange={(event) => setToken(event.target.value)} minLength={32} maxLength={128} autoComplete="one-time-code" required /></label>
                  <label>Yeni şifrə<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={10} maxLength={128} autoComplete="new-password" required /></label>
                  <label>Şifrəni təkrarla<input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={10} maxLength={128} autoComplete="new-password" required /></label>
                </>
              )}
              {error && <p className="recovery-error" role="alert">{error}</p>}
              <button className="button button--primary" type="submit" disabled={status === "working"}>
                {status === "working" ? "Yoxlanılır" : mode === "request" ? "Recovery linki yarat" : "Şifrəni yenilə"}
              </button>
            </form>
            <a className="recovery-back" href={demoUrl("/account")} onClick={onNavigateAccount}>Girişə qayıt</a>
          </>
        ) : (
          <div className="recovery-complete" aria-live="polite">
            <p>{mode === "request" ? "Sorğu qəbul edildi" : "Şifrə yeniləndi"}</p>
            <h1>{mode === "request" ? <>Link<br />hazırdır.</> : <>Yenidən<br />xoş gəldin.</>}</h1>
            <span>{mode === "request"
              ? <>Demo bərpa sorğusu qəbul edildi. Real email göndərilmədi.</>
              : "Demo tamamlandı. Yenidən demo hesabını seçə bilərsən; şifrə saxlanmadı."}</span>
            <a className="button button--primary" href={demoUrl("/account")} onClick={onNavigateAccount}>Hesaba daxil ol</a>
            {mode === "request" && <a className="recovery-back" href={demoUrl("/reset-password?token=demo-presentation-reset-00000001")}>Yeni şifrə ekranını sına</a>}
          </div>
        )}
      </section>

      <section className="recovery-signal" aria-hidden="true">
        <SignalField accent={mode === "request" ? "#aaa2ff" : "#ff765f"} />
        <div className="recovery-orbits"><i /><i /><i /><i /></div>
        <div className="recovery-core"><span>{mode === "request" ? "15" : "01"}</span><small>{mode === "request" ? "dəqiqə" : "yeni şifrə"}</small></div>
        <p>Siqnal yalnız bir dəfə<br />geri qayıdır.</p>
      </section>
    </main>
  );
}
