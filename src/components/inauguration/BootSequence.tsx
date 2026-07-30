/**
 * BootSequence.tsx
 * ---------------------------------------------------------------------------
 * The "AI SYSTEM INITIALIZATION" act.
 *
 * A terminal log, six subsystem modules with independent progress bars and
 * animated percentages, plus a synchronized master progress readout. Timing is
 * driven by one GSAP timeline so audio, text and bars stay locked together.
 */
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import type { AudioEngine } from "@/lib/audio-engine";

export interface BootModule {
  id: string;
  label: string;
  detail: string;
}

export const BOOT_MODULES: BootModule[] = [
  { id: "neural", label: "Neural Engine", detail: "tensor cores · 48 layers" },
  { id: "vision", label: "Vision Module", detail: "convolutional pipeline" },
  { id: "nlp", label: "NLP Engine", detail: "transformer stack v4" },
  { id: "data", label: "Data Intelligence", detail: "streaming analytics" },
  { id: "innovation", label: "Innovation Hub", detail: "project registry" },
  { id: "research", label: "Research Core", detail: "knowledge graph" },
];

const LOG_LINES = [
  "> secure channel established",
  "> verifying cryptographic key signature ....... OK",
  "> authorization level : DEPARTMENT ADMIN",
  "> mounting /core/intelligence",
  "> allocating 65,536 tensor units",
  "> calibrating inference latency",
  "> synchronising research clusters",
  "> integrity check ....... PASSED",
];

interface Props {
  audio: AudioEngine;
  /** Per-module load duration in seconds. */
  moduleDuration?: number;
  onComplete: () => void;
}

export function BootSequence({ audio, moduleDuration = 1.15, onComplete }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState<number[]>(() => BOOT_MODULES.map(() => 0));
  const [logs, setLogs] = useState<string[]>([]);
  const [master, setMaster] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    audio.setAmbience("boot");
    audio.speak("Authorization accepted. Initializing Artificial Intelligence core. Please stand by.");

    const ctx = gsap.context(() => {
      // Entrance
      gsap.fromTo(
        ".boot-panel",
        { opacity: 0, y: 26, filter: "blur(12px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9, ease: "power3.out", stagger: 0.12 },
      );

      const tl = gsap.timeline({
        delay: 0.5,
        onComplete: () => onCompleteRef.current(),
      });

      // Terminal log lines, typed in with soft data ticks.
      LOG_LINES.forEach((line, i) => {
        tl.call(
          () => {
            setLogs((l) => [...l, line]);
            audio.dataTick();
          },
          undefined,
          i * 0.22,
        );
      });

      // Module loaders — slightly overlapped so it feels parallelised.
      BOOT_MODULES.forEach((mod, i) => {
        const state = { v: 0 };
        tl.to(
          state,
          {
            v: 100,
            duration: moduleDuration,
            ease: "power2.inOut",
            onUpdate: () => {
              setProgress((p) => {
                const next = [...p];
                next[i] = state.v;
                return next;
              });
            },
            onStart: () => {
              setLogs((l) => [...l, `> loading ${mod.label.toLowerCase()} ...`]);
              audio.dataTick();
            },
            onComplete: () => {
              audio.moduleComplete(i);
              setLogs((l) => [...l, `> ${mod.label} ....... ONLINE`]);
            },
          },
          1.4 + i * (moduleDuration * 0.72),
        );
      });

      // Master percentage tracks the whole sequence.
      const m = { v: 0 };
      tl.to(
        m,
        {
          v: 100,
          duration: 1.4 + BOOT_MODULES.length * (moduleDuration * 0.72),
          ease: "none",
          onUpdate: () => setMaster(m.v),
        },
        0.2,
      );

      tl.call(() => {
        audio.riser(2.6);
        setLogs((l) => [...l, "> ALL SYSTEMS NOMINAL — RELEASING CORE"]);
      });
      tl.to(".boot-panel", { opacity: 0, filter: "blur(14px)", duration: 0.8, ease: "power2.in" }, "+=0.9");
    }, rootRef);

    return () => ctx.revert();
  }, [audio, moduleDuration]);

  return (
    <div
      ref={rootRef}
      className="relative z-20 flex min-h-screen w-full items-center justify-center px-6 py-10"
    >
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.05fr_1fr]">
        {/* ------------------------------------------------------- terminal */}
        <section className="boot-panel hud-panel relative overflow-hidden rounded-lg p-6">
          <header className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
            <span className="font-mono text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
              system console
            </span>
            <span className="font-mono text-[11px] text-primary">SECURE · AES-512</span>
          </header>
          <div className="h-[320px] overflow-hidden font-mono text-[12.5px] leading-relaxed text-primary/85 md:h-[380px]">
            {logs.slice(-18).map((l, i) => (
              <p key={`${l}-${i}`} className="animate-[fade-in_.3s_ease-out]">
                {l}
              </p>
            ))}
            <span className="inline-block h-4 w-2 translate-y-[3px] bg-primary animate-[flicker_1.2s_steps(2)_infinite]" />
          </div>
          {/* scanline sweep */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 animate-[scan_6s_ease-in-out_infinite] bg-gradient-to-b from-transparent via-primary/10 to-transparent" />
        </section>

        {/* -------------------------------------------------------- modules */}
        <section className="boot-panel hud-panel rounded-lg p-6">
          <header className="mb-5 flex items-baseline justify-between">
            <h2 className="font-display text-sm tracking-[0.32em] text-foreground uppercase">
              AI System Initialization
            </h2>
            <span className="font-mono text-2xl text-primary tabular-nums">
              {master.toFixed(0).padStart(3, "0")}%
            </span>
          </header>

          <ul className="space-y-4">
            {BOOT_MODULES.map((mod, i) => {
              const v = progress[i];
              const done = v >= 99.5;
              return (
                <li key={mod.id}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-4">
                    <span className="font-body text-[15px] tracking-wide text-foreground">
                      Loading {mod.label}...
                    </span>
                    <span
                      className={`font-mono text-xs tabular-nums ${done ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {done ? "ONLINE" : `${v.toFixed(0).padStart(2, "0")}%`}
                    </span>
                  </div>
                  <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${v}%`,
                        background: "var(--gradient-energy)",
                        boxShadow: "var(--shadow-energy)",
                      }}
                    />
                  </div>
                  <p className="mt-1 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                    {mod.detail}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
