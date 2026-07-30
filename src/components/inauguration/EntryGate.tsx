/**
 * EntryGate.tsx
 * ---------------------------------------------------------------------------
 * Browsers require a user gesture before audio and fullscreen. Rather than
 * hiding that behind an apologetic banner, the gate is staged as the opening
 * title card of the ceremony.
 */
import { useEffect, useRef } from "react";
import gsap from "gsap";

interface Props {
  onBegin: () => void;
}

export function EntryGate({ onBegin }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".gate-item",
        { opacity: 0, y: 22, filter: "blur(12px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 1.3,
          ease: "power3.out",
          stagger: 0.22,
        },
      );
      gsap.to(".gate-ring", { rotate: 360, duration: 44, ease: "none", repeat: -1 });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative z-20 flex min-h-screen flex-col items-center justify-center px-6 text-center"
    >
      <div className="gate-item relative mb-10 grid h-40 w-40 place-items-center">
        <div className="gate-ring absolute inset-0 rounded-full border border-primary/30 border-t-primary/80" />
        <div className="absolute inset-5 rounded-full border border-dashed border-primary/20" />
        <div
          className="absolute inset-10 rounded-full"
          style={{ background: "var(--gradient-energy)", filter: "blur(18px)", opacity: 0.55 }}
        />
        <span className="relative font-mono text-[10px] tracking-[0.3em] text-primary uppercase">
          AI·ML
        </span>
      </div>

      <p className="gate-item font-mono text-[10px] tracking-[0.5em] text-muted-foreground uppercase">
        Restricted System · Authorization Required
      </p>
      <h1 className="gate-item text-energy-gradient font-display mt-4 text-2xl font-black tracking-[0.16em] uppercase md:text-5xl">
        Artificial Intelligence &amp; Machine Learning
      </h1>
      <p className="gate-item mt-4 max-w-md font-body text-sm text-muted-foreground">
        This experience runs fullscreen with spatial ambient audio. Please raise the house volume
        before initializing.
      </p>

      <button
        onClick={onBegin}
        className="gate-item group relative mt-10 overflow-hidden rounded-full border border-primary/50 px-10 py-4 font-display text-[11px] tracking-[0.42em] text-foreground uppercase transition-colors duration-500 hover:border-primary"
      >
        <span
          className="absolute inset-0 -translate-x-full transition-transform duration-700 ease-out group-hover:translate-x-0"
          style={{ background: "var(--gradient-energy)", opacity: 0.22 }}
        />
        <span className="relative">Initialize Experience</span>
      </button>

      <p className="gate-item mt-6 font-mono text-[10px] tracking-[0.3em] text-muted-foreground/70 uppercase">
        press space to begin
      </p>
    </div>
  );
}
