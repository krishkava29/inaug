import { useEffect, useRef } from "react";
import Dither from "@/components/ui/Dither";

export type BackgroundIntensity = "calm" | "charged" | "boot" | "reveal";

interface Props {
  intensity?: BackgroundIntensity;
  /** 0..1 — extra energy injected during proximity / unlock moments. */
  surge?: number;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  r: number;
  tw: number;
}

interface Hexagon {
  x: number;
  y: number;
  size: number;
  z: number;
  rot: number;
  spin: number;
  phase: number;
}

const STAGE_DITHER_CONFIG: Record<
  BackgroundIntensity,
  {
    waveColor: [number, number, number];
    waveSpeed: number;
    waveFrequency: number;
    waveAmplitude: number;
    colorNum: number;
    pixelSize: number;
  }
> = {
  calm: {
    waveColor: [0.15, 0.45, 0.85],
    waveSpeed: 0.35,
    waveFrequency: 3.5,
    waveAmplitude: 0.4,
    colorNum: 5,
    pixelSize: 2,
  },
  charged: {
    waveColor: [0.2, 0.6, 1.0],
    waveSpeed: 0.55,
    waveFrequency: 4.2,
    waveAmplitude: 0.5,
    colorNum: 6,
    pixelSize: 2,
  },
  boot: {
    waveColor: [0.08, 0.75, 0.9],
    waveSpeed: 0.75,
    waveFrequency: 5.0,
    waveAmplitude: 0.55,
    colorNum: 6,
    pixelSize: 2,
  },
  reveal: {
    waveColor: [0.3, 0.65, 1.0],
    waveSpeed: 0.45,
    waveFrequency: 3.8,
    waveAmplitude: 0.45,
    colorNum: 6,
    pixelSize: 2,
  },
};

export function AmbientBackground({ intensity = "calm", surge = 0, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intensityRef = useRef(intensity);
  const surgeRef = useRef(surge);

  intensityRef.current = intensity;
  surgeRef.current = surge;

  const cfg = STAGE_DITHER_CONFIG[intensity] ?? STAGE_DITHER_CONFIG.calm;
  const effectiveWaveSpeed = cfg.waveSpeed + surge * 0.3;
  const effectiveWaveAmplitude = cfg.waveAmplitude + surge * 0.25;

  /* ------------------------------- Continuously Animating Canvas Overlay */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles: Particle[] = [];
    let hexes: Hexagon[] = [];
    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const build = () => {
      const area = width * height;
      const particleCount = Math.min(180, Math.round(area / 12000));
      particles = Array.from({ length: particleCount }, () => {
        const z = rand(0.3, 1);
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          z,
          vx: rand(-0.3, 0.3) * z,
          vy: rand(-0.6, -0.15) * z,
          r: rand(1.2, 3.2) * z,
          tw: Math.random() * Math.PI * 2,
        };
      });

      const hexCount = Math.min(18, Math.round(area / 100000));
      hexes = Array.from({ length: hexCount }, () => {
        const z = rand(0.3, 0.9);
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          size: rand(40, 110) * z,
          z,
          rot: Math.random() * Math.PI,
          spin: rand(-0.003, 0.003),
          phase: Math.random() * Math.PI * 2,
        };
      });
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };

    const onPointerMove = (e: PointerEvent) => {
      pointer.tx = e.clientX / window.innerWidth;
      pointer.ty = e.clientY / window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    let raf = 0;
    let t = 0;
    let last = performance.now();

    const drawHex = (h: Hexagon, px: number, py: number) => {
      const ox = (px - 0.5) * 60 * h.z;
      const oy = (py - 0.5) * 40 * h.z;
      ctx.save();
      ctx.translate(h.x + ox, h.y + oy + Math.sin(t * 0.0015 + h.phase) * 16 * h.z);
      ctx.rotate(h.rot);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        const x = Math.cos(a) * h.size;
        const y = Math.sin(a) * h.size;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      const a = (0.12 + 0.08 * Math.sin(t * 0.002 + h.phase)) * h.z;
      ctx.strokeStyle = `rgba(140, 220, 255, ${a})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    };

    const frame = (now: number) => {
      const dt = Math.min(40, now - last);
      last = now;
      t += dt;

      pointer.x += (pointer.tx - pointer.x) * 0.06;
      pointer.y += (pointer.ty - pointer.y) * 0.06;

      ctx.clearRect(0, 0, width, height);

      // Moving Light Beams
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 3; i++) {
        const phase = t * 0.0003 * (i + 1) + i * 2.1;
        const cx = width * (0.5 + Math.sin(phase) * 0.42);
        const beam = ctx.createLinearGradient(cx - 200, 0, cx + 200, height);
        beam.addColorStop(0, "rgba(70, 160, 255, 0)");
        beam.addColorStop(0.5, "rgba(90, 200, 255, 0.08)");
        beam.addColorStop(1, "rgba(70, 160, 255, 0)");
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.moveTo(cx - 260, 0);
        ctx.lineTo(cx + 120, 0);
        ctx.lineTo(cx + 420, height);
        ctx.lineTo(cx - 60, height);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Spinning Hexagons
      hexes.forEach((h) => {
        h.rot += h.spin * dt * 0.8;
        drawHex(h, pointer.x, pointer.y);
      });

      // Drifting Particles
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      particles.forEach((p) => {
        p.x += p.vx * dt * 0.1;
        p.y += p.vy * dt * 0.1;
        p.tw += dt * 0.004;

        if (p.y < -20) {
          p.y = height + 20;
          p.x = Math.random() * width;
        }
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;

        const px = p.x + (pointer.x - 0.5) * 60 * p.z;
        const py = p.y + (pointer.y - 0.5) * 40 * p.z;
        const alpha = (0.35 + 0.45 * Math.sin(p.tw)) * p.z;
        const r = p.r * (1 + surgeRef.current * 0.6);

        const g2 = ctx.createRadialGradient(px, py, 0, px, py, r * 4);
        g2.addColorStop(0, `rgba(200, 240, 255, ${alpha})`);
        g2.addColorStop(0.5, `rgba(100, 185, 255, ${alpha * 0.4})`);
        g2.addColorStop(1, "rgba(60, 120, 220, 0)");
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.arc(px, py, r * 4, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  return (
    <div className={className ?? "fixed inset-0 pointer-events-none z-0 overflow-hidden"}>
      {/* 1. Fast-flowing 3D Dither Shader Background */}
      <div className="absolute inset-0 z-0">
        <Dither
          waveColor={cfg.waveColor}
          waveSpeed={effectiveWaveSpeed}
          waveFrequency={cfg.waveFrequency}
          waveAmplitude={effectiveWaveAmplitude}
          colorNum={cfg.colorNum}
          pixelSize={cfg.pixelSize}
          disableAnimation={false}
          enableMouseInteraction={true}
          mouseRadius={0.8}
        />
      </div>

      {/* 2. Continuously Animating Hexagons, Light Beams & Particles Overlay */}
      <canvas ref={canvasRef} className="absolute inset-0 z-[1] pointer-events-none" />

      {/* 3. Dark overlay for optimal UI contrast */}
      <div className="absolute inset-0 z-[2] bg-black/35 backdrop-blur-[1px]" />
    </div>
  );
}
