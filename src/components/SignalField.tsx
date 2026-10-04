import { useEffect, useRef } from "react";

type SignalFieldProps = {
  accent: string;
  /** Horizontal origin of the echo, as a fraction of the canvas width. */
  originX?: number;
  /** Vertical origin of the echo, as a fraction of the canvas height. */
  originY?: number;
};

const hexToRgb = (hex: string) => {
  const value = hex.replace("#", "");
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
};

/**
 * Echo field: wavefronts leave a source point, travel outward and fade,
 * the way a single sound reflects through a room. The source follows the pointer.
 */
export function SignalField({ accent, originX = 0.5, originY = 0.5 }: SignalFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef({ x: originX, y: originY, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const rgb = hexToRgb(accent);
    const source = { x: originX, y: originY };
    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let visible = true;
    let last = performance.now();
    let elapsed = 0;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const paint = () => {
      const pointer = pointerRef.current;
      const targetX = pointer.active ? pointer.x : originX;
      const targetY = pointer.active ? pointer.y : originY;
      source.x += (targetX - source.x) * 0.06;
      source.y += (targetY - source.y) * 0.06;

      context.clearRect(0, 0, width, height);
      const cx = width * source.x;
      const cy = height * source.y;
      const reach = Math.hypot(Math.max(cx, width - cx), Math.max(cy, height - cy));

      const glow = context.createRadialGradient(cx, cy, 0, cx, cy, reach * 0.55);
      glow.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, .2)`);
      glow.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, .05)`);
      glow.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      const period = 2600;
      const count = 6;
      for (let index = 0; index < count; index += 1) {
        const phase = ((elapsed / period) + index / count) % 1;
        const radius = 24 + phase * reach;
        const alpha = Math.pow(1 - phase, 1.6) * 0.42;
        context.beginPath();
        context.ellipse(cx, cy, radius * 1.08, radius, -0.08, 0, Math.PI * 2);
        context.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
        context.lineWidth = 1 + (1 - phase) * 0.8;
        context.stroke();
      }

      context.beginPath();
      context.arc(cx, cy, 3.5, 0, Math.PI * 2);
      context.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, .9)`;
      context.fill();
    };

    const draw = (now: number) => {
      elapsed += Math.min(64, now - last);
      last = now;
      paint();
      if (visible) animationFrame = window.requestAnimationFrame(draw);
    };

    const start = () => {
      window.cancelAnimationFrame(animationFrame);
      if (reduced.matches) { paint(); return; }
      last = performance.now();
      animationFrame = window.requestAnimationFrame(draw);
    };

    // Resizing clears the bitmap, so repaint the current frame straight away.
    const resizeObserver = new ResizeObserver(() => {
      resize();
      paint();
    });
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    });
    resizeObserver.observe(canvas);
    visibility.observe(canvas);
    resize();
    if (reduced.matches) elapsed = 900;
    start();

    return () => {
      resizeObserver.disconnect();
      visibility.disconnect();
      window.cancelAnimationFrame(animationFrame);
    };
  }, [accent, originX, originY]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const move = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointerRef.current = {
        x: (event.clientX - bounds.left) / bounds.width,
        y: (event.clientY - bounds.top) / bounds.height,
        active: true,
      };
    };
    const leave = () => { pointerRef.current.active = false; };
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerleave", leave);
    return () => {
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
    };
  }, []);

  return <canvas ref={canvasRef} className="signal-field" aria-hidden="true" />;
}
