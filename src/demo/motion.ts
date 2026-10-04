import { flushSync } from "react-dom";

type TransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { ready: Promise<void>; finished: Promise<void> };
};

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Runs a React state update inside a View Transition when the browser supports it. */
export function withViewTransition(update: () => void, kind = "route") {
  const doc = document as TransitionDocument;
  if (!doc.startViewTransition || prefersReducedMotion()) {
    update();
    return null;
  }
  document.documentElement.dataset.transition = kind;
  const transition = doc.startViewTransition(() => flushSync(update));
  transition.finished.finally(() => {
    delete document.documentElement.dataset.transition;
  });
  return transition;
}

/** Sends a copy of a product photo from where it was clicked into the bag button. */
export function flyToBag(origin: Element | null | undefined) {
  if (!origin || prefersReducedMotion()) return;
  const source = origin.closest("[data-fly]")?.querySelector("img");
  const target = document.querySelector(".bag-button");
  if (!source || !target) return;
  // A hidden header slides back so the bag is visible; aim at where it will land.
  const header = target.closest<HTMLElement>(".site-header");
  header?.classList.remove("is-hidden");
  const offset = header ? new DOMMatrixReadOnly(getComputedStyle(header).transform).m42 : 0;
  const from = source.getBoundingClientRect();
  const landed = target.getBoundingClientRect();
  const to = { left: landed.left, top: landed.top - offset, width: landed.width, height: landed.height };
  if (!from.width || !to.width) return;
  const size = Math.min(from.width, from.height, 220);
  const clone = source.cloneNode() as HTMLImageElement;
  clone.removeAttribute("srcset");
  clone.alt = "";
  clone.className = "fly-to-bag";
  Object.assign(clone.style, {
    left: `${from.left + from.width / 2 - size / 2}px`,
    top: `${from.top + from.height / 2 - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
  });
  document.body.append(clone);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const animation = clone.animate(
    [
      { transform: "translate(0, 0) scale(1)", opacity: 1, borderRadius: "28%" },
      { transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 90}px) scale(.55)`, opacity: 1, borderRadius: "50%", offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(.08)`, opacity: 0.2, borderRadius: "50%" },
    ],
    { duration: 820, easing: "cubic-bezier(.6,0,.2,1)" },
  );
  animation.finished.finally(() => {
    clone.remove();
    target.classList.remove("is-receiving");
    void (target as HTMLElement).offsetWidth;
    target.classList.add("is-receiving");
  });
}
