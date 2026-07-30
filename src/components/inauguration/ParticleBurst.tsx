/**
 * ParticleBurst.tsx
 * ---------------------------------------------------------------------------
 * Imperative full-screen particle explosion + shockwave overlay.
 *
 * Exposed through a ref so GSAP timelines can fire it at exactly the right
 * frame (`burst()`), without React re-renders. The canvas auto-idles (loop
 * stops) when no particles remain, so it costs nothing between detonations.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

export interface ParticleBurstHandle {
  burst: (opts?: { x?: number; y?: number; count?: number; power?: number; hueShift?: number }) => void;
}

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
}

interface Wave {
  x: number;
  y: number;
  r: number;
  max: number;
  life: number;
}

export const ParticleBurst = forwardRef<ParticleBurstHandle, { className?: string }>(
  function ParticleBurst({ className }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particles = useRef<P[]>([]);
    const waves = useRef<Wave[]>([]);
    const running = useRef(false);
    const rafRef = useRef(0);

    useImperativeHandle(ref, () => ({
      burst: ({ x, y, count = 420, power = 1, hueShift = 0 } = {}) => {
        const cx = x ?? window.innerWidth / 2;
        const cy = y ?? window.innerHeight / 2;
        for (let i = 0; i < count; i++) {
          const a = Math.random() * Math.PI * 2;
          // Bias speed distribution so the shell reads as an explosion, not a cloud.
          const speed = (2 + Math.pow(Math.random(), 0.5) * 16) * power;
          particles.current.push({
            x: cx,
            y: cy,
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            life: 0,
            maxLife: 700 + Math.random() * 1400,
            size: 1 + Math.random() * 3.2,
            hue: 195 + Math.random() * 35 + hueShift,
          });
        }
        waves.current.push({
          x: cx,
          y: cy,
          r: 0,
          max: Math.max(window.innerWidth, window.innerHeight) * 1.1,
          life: 0,
        });
        startLoop();
      },
    }));

    const startLoop = () => {
      if (running.current) return;
      running.current = true;
      let last = performance.now();

      const frame = (now: number) => {
        const dt = Math.min(40, now - last);
        last = now;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) {
          running.current = false;
          return;
        }
        const w = window.innerWidth;
        const h = window.innerHeight;
        ctx.clearRect(0, 0, w, h);
        ctx.globalCompositeOperation = "lighter";

        // shockwaves
        waves.current = waves.current.filter((wv) => {
          wv.life += dt;
          wv.r += (wv.max - wv.r) * 0.045;
          const alpha = Math.max(0, 1 - wv.life / 1400);
          if (alpha <= 0) return false;
          ctx.beginPath();
          ctx.arc(wv.x, wv.y, wv.r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(180,235,255,${alpha * 0.5})`;
          ctx.lineWidth = 2 + alpha * 10;
          ctx.stroke();
          return true;
        });

        // particles
        particles.current = particles.current.filter((p) => {
          p.life += dt;
          const k = p.life / p.maxLife;
          if (k >= 1) return false;
          p.x += p.vx * dt * 0.06;
          p.y += p.vy * dt * 0.06;
          p.vx *= 0.985;
          p.vy = p.vy * 0.985 + 0.012 * dt * 0.06; // faint gravity for believability
          const alpha = (1 - k) * (1 - k);
          const r = p.size * (1 - k * 0.4);
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 6);
          g.addColorStop(0, `hsla(${p.hue}, 100%, 88%, ${alpha})`);
          g.addColorStop(0.4, `hsla(${p.hue}, 100%, 66%, ${alpha * 0.45})`);
          g.addColorStop(1, `hsla(${p.hue}, 100%, 55%, 0)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 6, 0, Math.PI * 2);
          ctx.fill();
          return true;
        });

        if (particles.current.length === 0 && waves.current.length === 0) {
          ctx.clearRect(0, 0, w, h);
          running.current = false;
          return;
        }
        rafRef.current = requestAnimationFrame(frame);
      };
      rafRef.current = requestAnimationFrame(frame);
    };

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(window.innerWidth * dpr);
        canvas.height = Math.floor(window.innerHeight * dpr);
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
        ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      resize();
      window.addEventListener("resize", resize);
      return () => {
        window.removeEventListener("resize", resize);
        cancelAnimationFrame(rafRef.current);
        running.current = false;
        particles.current = [];
        waves.current = [];
      };
    }, []);

    return (
      <canvas
        ref={canvasRef}
        aria-hidden
        className={className ?? "pointer-events-none fixed inset-0 z-40"}
      />
    );
  },
);
