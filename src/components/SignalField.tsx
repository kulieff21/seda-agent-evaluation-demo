import { useEffect, useRef } from "react";

type SignalFieldProps = {
  accent: string;
};

const hexToRgb = (hex: string) => {
  const value = hex.replace("#", "");
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
};

export function SignalField({ accent }: SignalFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef({ x: 0.64, y: 0.47, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const rgb = hexToRgb(accent);
    let width = 0;
    let height = 0;
    let frame = 0;
    let animationFrame = 0;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      const pointer = pointerRef.current;
      const centerX = width * (pointer.active ? pointer.x : 0.67);
      const centerY = height * (pointer.active ? pointer.y : 0.48);
      const time = reduced.matches ? 0 : frame * 0.007;
      const radius = Math.min(width, height) * 0.13;

      const glow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 3.4);
      glow.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, .16)`);
      glow.addColorStop(0.42, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, .055)`);
      glow.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      for (let ring = 0; ring < 7; ring += 1) {
        const wave = Math.sin(time * 1.6 + ring * 0.9) * radius * 0.04;
        const ringRadius = radius * (0.9 + ring * 0.58) + wave;
        context.beginPath();
        context.ellipse(centerX, centerY, ringRadius * 1.2, ringRadius, -0.12, 0, Math.PI * 2);
        context.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.17 - ring * 0.018})`;
        context.lineWidth = ring === 0 ? 1.4 : 0.8;
        context.stroke();
      }

      context.beginPath();
      const lineY = height * 0.79;
      const step = Math.max(5, width / 180);
      context.moveTo(0, lineY);
      for (let x = 0; x <= width; x += step) {
        const distance = Math.abs(x - centerX) / width;
        const envelope = Math.max(0, 1 - distance * 3.3);
        const y = lineY + Math.sin(x * 0.047 + time * 6) * envelope * 14;
        context.lineTo(x, y);
      }
      context.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, .38)`;
      context.lineWidth = 1;
      context.stroke();

      frame += 1;
      if (!reduced.matches) animationFrame = window.requestAnimationFrame(draw);
    };

    const observer = new ResizeObserver(() => {
      resize();
      if (reduced.matches) draw();
    });
    observer.observe(canvas);
    resize();
    draw();

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(animationFrame);
    };
  }, [accent]);

  const updatePointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerRef.current = {
      x: (event.clientX - bounds.left) / bounds.width,
      y: (event.clientY - bounds.top) / bounds.height,
      active: true,
    };
  };

  return (
    <canvas
      ref={canvasRef}
      className="signal-field"
      aria-hidden="true"
      onPointerMove={updatePointer}
      onPointerLeave={() => {
        pointerRef.current.active = false;
      }}
    />
  );
}
