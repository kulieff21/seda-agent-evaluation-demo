export type IconName =
  | "arrow"
  | "arrowUpRight"
  | "bag"
  | "check"
  | "close"
  | "menu"
  | "minus"
  | "moon"
  | "pause"
  | "play"
  | "plus"
  | "search"
  | "sun"
  | "user";

const paths: Record<IconName, React.ReactNode> = {
  arrow: <path d="M5 12h13m-5-5 5 5-5 5" />,
  arrowUpRight: <path d="M7 17 17 7m-8 0h8v8" />,
  bag: <><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  close: <><path d="m6 6 12 12" /><path d="M18 6 6 18" /></>,
  menu: <><path d="M4 9h16" /><path d="M4 15h10" /></>,
  minus: <path d="M5 12h14" />,
  moon: <path d="M19 15.4A8 8 0 0 1 8.6 5a7 7 0 1 0 10.4 10.4Z" />,
  pause: <><path d="M9 6v12" /><path d="M15 6v12" /></>,
  play: <path d="M8 5.5v13l10-6.5-10-6.5Z" />,
  plus: <><path d="M5 12h14" /><path d="M12 5v14" /></>,
  search: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></>,
  sun: <><circle cx="12" cy="12" r="3.5" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  user: <><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20c.7-4 3-6 6.5-6s5.8 2 6.5 6" /></>,
};

export function Icon({ name }: { name: IconName }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
        {paths[name]}
      </g>
    </svg>
  );
}

export function Mark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand-lockup${compact ? " brand-lockup--compact" : ""}`}>
      <svg className="brand-mark" viewBox="0 0 44 44" aria-hidden="true">
        <circle className="brand-mark-core" cx="22" cy="22" r="4" />
        <circle className="brand-mark-ring brand-mark-ring--1" cx="22" cy="22" r="10" />
        <circle className="brand-mark-ring brand-mark-ring--2" cx="22" cy="22" r="16" />
        <circle className="brand-mark-ring brand-mark-ring--3" cx="22" cy="22" r="21" />
      </svg>
      {!compact && <span className="brand-word">SƏDA</span>}
    </span>
  );
}

/** Deterministic bar heights so a product always draws the same waveform. */
export function waveform(seed: string, count: number): number[] {
  let state = [...seed].reduce((sum, char) => sum * 31 + char.charCodeAt(0), 7) >>> 0;
  return Array.from({ length: count }, (_, index) => {
    state = (state * 1664525 + 1013904223) >>> 0;
    const noise = state / 0xffffffff;
    const envelope = Math.sin((index / (count - 1)) * Math.PI);
    return Math.round((0.18 + envelope * 0.55 + noise * 0.27) * 100);
  });
}
