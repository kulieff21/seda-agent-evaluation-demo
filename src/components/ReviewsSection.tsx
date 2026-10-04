import { readState } from "../demo/store";
import { demoUrl } from "../demo/navigation";
import { useEffect, useMemo, useState } from "react";
import type { AccountUser } from "../api/account";
import {
  fetchProductReviews,
  fetchReviewPreview,
  requestReviewPreview,
  submitProductReview,
  type CustomerReview,
  type ProductReview,
  type ReviewPreviewState,
} from "../api/reviews";

type ReviewsSectionProps = {
  productId: string;
  productName: string;
  user: AccountUser | null;
  onNavigateAccount: (event: React.MouseEvent<HTMLAnchorElement>) => void;
};

const previewLabels: Record<ReviewPreviewState, string> = {
  idle: "Başlamağa hazırdır",
  queued: "Yoxlama növbəsindədir",
  running: "Avtomatik yoxlama işləyir",
  complete: "Avtomatik yoxlama tamamlandı",
  failed: "Avtomatik yoxlama tamamlanmadı",
};

const POLL_INTERVAL_MS = 750;
const POLL_WINDOW_MS = 15_000;

function readRememberedReview(userId: string, productId: string): string | null {
  return readState().reviews.find((review) => review.userId === userId && review.productId === productId && review.status === "pending")?.id ?? null;
}

export function ReviewsSection({ productId, productName, user, onNavigateAccount }: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [ownReview, setOwnReview] = useState<CustomerReview | null>(null);
  const [rememberedReviewId, setRememberedReviewId] = useState<string | null>(null);
  const [previewUi, setPreviewUi] = useState<"ready" | "restoring" | "starting" | "polling" | "error" | "timeout">("ready");
  const [pollingReviewId, setPollingReviewId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    setMessage("");
    fetchProductReviews(productId, controller.signal)
      .then((data) => { setReviews(data); setState("ready"); })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState("error");
      });
    return () => controller.abort();
  }, [productId]);

  useEffect(() => {
    setOwnReview(null);
    setRememberedReviewId(null);
    setPollingReviewId(null);
    setPreviewUi("ready");
    if (!user) return;
    const reviewId = readRememberedReview(user.id, productId);
    if (!reviewId) return;
    setRememberedReviewId(reviewId);

    const controller = new AbortController();
    setPreviewUi("restoring");
    fetchReviewPreview(reviewId, controller.signal)
      .then((review) => {
        setOwnReview(review);
        if (review.previewState === "queued" || review.previewState === "running") {
          setPollingReviewId(review.id);
          setPreviewUi("polling");
        } else {
          setPreviewUi("ready");
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setPreviewUi("error");
      });
    return () => controller.abort();
  }, [productId, user]);

  useEffect(() => {
    if (!pollingReviewId) return;
    const controller = new AbortController();
    const deadline = Date.now() + POLL_WINDOW_MS;

    const poll = async () => {
      while (!controller.signal.aborted && Date.now() < deadline) {
        try {
          const review = await fetchReviewPreview(pollingReviewId, controller.signal);
          if (controller.signal.aborted) return;
          setOwnReview(review);
          if (review.previewState === "complete" || review.previewState === "failed") {
            setPreviewUi("ready");
            setPollingReviewId(null);
            return;
          }
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setPreviewUi("error");
          setPollingReviewId(null);
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, POLL_INTERVAL_MS));
      }
      if (!controller.signal.aborted) {
        setPreviewUi("timeout");
        setPollingReviewId(null);
      }
    };

    void poll();
    return () => controller.abort();
  }, [pollingReviewId]);

  const average = useMemo(
    () => reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0,
    [reviews],
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const review = await submitProductReview(productId, { rating, title, body });
      setOwnReview(review);
      setRememberedReviewId(review.id);
      setTitle("");
      setBody("");
      setRating(5);
      setPreviewUi("ready");
      setMessage("Qeydin qəbul edildi. İndi avtomatik ön-yoxlamanı başlada bilərsən.");
    } catch {
      setMessage("Qeyd göndərilmədi. Mətn ölçülərini yoxla və ya bu məhsul üçün əvvəlki qeydini nəzərə al.");
    } finally {
      setSubmitting(false);
    }
  };

  const startPreview = async () => {
    if (!ownReview || previewUi === "starting" || previewUi === "polling") return;
    setPreviewUi("starting");
    setMessage("");
    try {
      const review = await requestReviewPreview(ownReview.id);
      setOwnReview(review);
      if (review.previewState === "queued" || review.previewState === "running") {
        setPollingReviewId(review.id);
        setPreviewUi("polling");
      } else {
        setPreviewUi("ready");
      }
    } catch {
      setPreviewUi("error");
    }
  };

  const refreshPreview = async () => {
    const reviewId = ownReview?.id ?? rememberedReviewId;
    if (!reviewId) return;
    setPreviewUi("restoring");
    try {
      const review = await fetchReviewPreview(reviewId);
      setOwnReview(review);
      if (review.previewState === "queued" || review.previewState === "running") {
        setPollingReviewId(review.id);
        setPreviewUi("polling");
      } else {
        setPreviewUi("ready");
      }
    } catch {
      setPreviewUi("error");
    }
  };

  return (
    <section className="product-reviews" aria-labelledby="reviews-title">
      <div className="reviews-intro">
        <p>Dinləyici qeydləri</p>
        <h2 id="reviews-title">Səs başqasına necə çatdı?</h2>
        <div className="reviews-score" aria-label={`${reviews.length} yayımlanmış qeyd`}>
          <strong>{reviews.length ? average.toFixed(1) : "—"}</strong>
          <span>{"★".repeat(Math.round(average))}{"☆".repeat(5 - Math.round(average))}</span>
          <small>{String(reviews.length).padStart(2, "0")} yayımlanmış qeyd</small>
        </div>
      </div>

      <div className="reviews-body">
        <div className="review-list" aria-live="polite">
          {state === "loading" ? <p className="review-state">Qeydlər yüklənir.</p>
            : state === "error" ? <p className="review-state">Qeydlər hazırda yüklənmədi.</p>
              : reviews.length ? reviews.map((review) => (
                <article key={review.id}>
                  <div><span>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span><time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString("az-AZ")}</time></div>
                  <h3>{review.title}</h3>
                  <p>{review.body}</p>
                  <small>{review.author}</small>
                </article>
              )) : <p className="review-state">Bu forma üçün ilk yayımlanmış qeydi sən yaza bilərsən.</p>}
        </div>

        <div className="review-compose">
          <p>{productName} haqqında qeyd</p>
          {user && (previewUi === "restoring" || previewUi === "error") && !ownReview ? (
            <div className="review-preview-state" aria-live="polite" aria-busy={previewUi === "restoring"}>
              {previewUi === "restoring" ? (
                <><span className="review-preview-pulse" aria-hidden="true"><i /><i /><i /></span><p>Göndərdiyin qeydin vəziyyəti bərpa edilir.</p></>
              ) : (
                <><p role="alert">Qeydin vəziyyəti hazırda alınmadı.</p><button type="button" onClick={() => void refreshPreview()}>Yenidən yoxla</button></>
              )}
            </div>
          ) : user && ownReview ? (
            <div className="review-preview-card" aria-live="polite" aria-busy={previewUi === "starting" || previewUi === "polling"}>
              <div className="review-preview-heading">
                <span className={`is-${ownReview.previewState}`} aria-hidden="true" />
                <div><small>Avtomatik ön-yoxlama</small><strong>{previewLabels[ownReview.previewState]}</strong></div>
              </div>
              <div className="review-preview-copy">
                <h3>{ownReview.title}</h3>
                <p>{ownReview.body}</p>
              </div>
              {message && <p className="review-message" role="status">{message}</p>}
              {ownReview.moderationNote && (
                <aside className="review-moderation-note" aria-label="Studio qeydi">
                  <small>Studio qeydi</small>
                  <p>{ownReview.moderationNote}</p>
                </aside>
              )}
              {previewUi === "timeout" && <p className="review-preview-feedback" role="status">Gözləmə pəncərəsi bitdi. Yoxlama arxa planda davam edə bilər; statusu yenidən oxuya bilərsən.</p>}
              {previewUi === "error" && <p className="review-preview-feedback is-error" role="alert">Yoxlama vəziyyəti alınmadı. Qeyd saxlanılıb.</p>}
              {(previewUi === "starting" || previewUi === "polling") && <p className="review-preview-feedback" role="status">Bu səhifəni açıq saxlamağa ehtiyac yoxdur. Vəziyyət refresh-dən sonra da bərpa olunur.</p>}
              <div className="review-preview-actions">
                {ownReview.previewState === "idle" && previewUi !== "error" && (
                  <button className="button button--primary" type="button" disabled={previewUi === "starting"} onClick={() => void startPreview()}>
                    {previewUi === "starting" ? "Növbəyə əlavə edilir" : "Ön-yoxlamanı başlat"}
                  </button>
                )}
                {(previewUi === "timeout" || previewUi === "error") && (
                  <button className="button button--secondary" type="button" onClick={() => void refreshPreview()}>Statusu yenilə</button>
                )}
              </div>
            </div>
          ) : user ? (
            <form onSubmit={submit}>
              <fieldset><legend>Qiymət</legend>{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" className={value <= rating ? "is-active" : ""} onClick={() => setRating(value)} aria-label={`${value} ulduz`}>★</button>)}</fieldset>
              <label>Qısa başlıq<input value={title} onChange={(event) => setTitle(event.target.value)} minLength={4} maxLength={80} required /></label>
              <label>Dinləmə qeydin<textarea value={body} onChange={(event) => setBody(event.target.value)} minLength={20} maxLength={600} rows={5} required /></label>
              {message && <p className="review-message" role="status">{message}</p>}
              <button className="button button--primary" type="submit" disabled={submitting}>{submitting ? "Göndərilir" : "Qeydi göndər"}</button>
            </form>
          ) : (
            <div className="review-login-note"><span>∿</span><p>Qeyd yazmaq üçün hesabına daxil ol.</p><a href={demoUrl("/account")} onClick={onNavigateAccount}>Hesaba keç</a></div>
          )}
        </div>
      </div>
    </section>
  );
}
