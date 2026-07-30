/**
 * UnlockStage.tsx
 * ---------------------------------------------------------------------------
 * Act I — the vault. Owns:
 *   - pointer-driven dragging of the AI Key (and ONLY the key)
 *   - continuous proximity detection between key tip and keyhole
 *   - magnetic snap, automatic rotation, failure return
 *   - the full cinematic unlock timeline (servos, bolts, shake, energy, flash)
 *
 * Layer stack (important for transform isolation):
 *   keyWrap   -> GSAP translate (drag / snap)
 *   keyFloat  -> CSS idle float (never touched by GSAP)
 *   keySvg    -> GSAP rotation around the key tip
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import gsap from "gsap";
import { AIKey } from "./AIKey";
import { VaultLock, type VaultState } from "./VaultLock";
import type { ParticleBurstHandle } from "./ParticleBurst";
import type { AudioEngine } from "@/lib/audio-engine";

export interface UnlockStageHandle {
  /** Programmatic unlock (spacebar / dev panel). */
  forceUnlock: () => void;
}

interface Props {
  audio: AudioEngine;
  burstRef: React.RefObject<ParticleBurstHandle | null>;
  /** Element that receives the camera shake (usually the whole stage). */
  shakeTargetRef: React.RefObject<HTMLDivElement | null>;
  onProximityChange: (p: number) => void;
  onUnlocked: () => void;
}

/** Distance (px) at which the lock starts reacting / accepts the key. */
const DETECT_RADIUS = 320;
const SNAP_RADIUS = 150;

export const UnlockStage = forwardRef<UnlockStageHandle, Props>(function UnlockStage(
  { audio, burstRef, shakeTargetRef, onProximityChange, onUnlocked },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const lockSvgRef = useRef<SVGSVGElement>(null);
  const keySvgRef = useRef<SVGSVGElement>(null);
  const keyWrapRef = useRef<HTMLDivElement>(null);
  const energyRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);

  const [proximity, setProximity] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [vaultState, setVaultState] = useState<VaultState>("idle");
  const [lockSize, setLockSize] = useState(520);

  // Mutable drag bookkeeping — refs so the pointer loop never re-renders.
  const dragState = useRef({ active: false, startX: 0, startY: 0, x: 0, y: 0 });
  const proximityRef = useRef(0);
  const lastTick = useRef(0);
  const busy = useRef(false); // true once the unlock timeline is running
  const onUnlockedRef = useRef(onUnlocked);
  const onProximityRef = useRef(onProximityChange);
  onUnlockedRef.current = onUnlocked;
  onProximityRef.current = onProximityChange;

  /* --------------------------------------------------------- responsive size */
  useEffect(() => {
    const measure = () =>
      setLockSize(Math.max(300, Math.min(620, Math.min(window.innerWidth * 0.72, window.innerHeight * 0.66))));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  /* ------------------------------------------------------------ geometry */

  /** Screen-space centre of the keyhole. */
  const keyholeCenter = useCallback(() => {
    const r = lockSvgRef.current?.getBoundingClientRect();
    if (!r) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    // Keyhole sits at (300, 300) in the 600x600 viewBox.
    return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.5 };
  }, []);

  /** Screen-space position of the key's leading tip. */
  const keyTip = useCallback(() => {
    const r = keySvgRef.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    return { x: r.left + r.width * 0.94, y: r.top + r.height * 0.5 };
  }, []);

  const updateProximity = useCallback(() => {
    const tip = keyTip();
    const hole = keyholeCenter();
    const d = Math.hypot(tip.x - hole.x, tip.y - hole.y);
    const p = Math.max(0, Math.min(1, 1 - d / DETECT_RADIUS));
    proximityRef.current = p;
    setProximity(p);
    onProximityRef.current(p);

    // Audio reacts continuously, not as a binary switch.
    const now = performance.now();
    if (p > 0.25 && now - lastTick.current > 240 - p * 150) {
      lastTick.current = now;
      audio.proximityTick(p);
    }
    return d;
  }, [audio, keyTip, keyholeCenter]);

  /* --------------------------------------------------------- drag handling */

  const onPointerDown = (e: React.PointerEvent) => {
    if (busy.current) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragState.current.active = true;
    dragState.current.startX = e.clientX - dragState.current.x;
    dragState.current.startY = e.clientY - dragState.current.y;
    setDragging(true);
    audio.hover();
    gsap.to(keySvgRef.current, { scale: 1.06, duration: 0.35, ease: "power3.out" });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current.active) return;
    dragState.current.x = e.clientX - dragState.current.startX;
    dragState.current.y = e.clientY - dragState.current.startY;
    gsap.set(keyWrapRef.current, { x: dragState.current.x, y: dragState.current.y });
    const d = updateProximity();
    setVaultState(d < DETECT_RADIUS * 0.75 ? "charged" : "idle");
    audio.setAmbience(d < DETECT_RADIUS * 0.75 ? "charged" : "idle");
  };

  const releaseKey = () => {
    dragState.current.active = false;
    setDragging(false);
    gsap.to(keySvgRef.current, { scale: 1, duration: 0.4, ease: "power3.out" });

    const tip = keyTip();
    const hole = keyholeCenter();
    const d = Math.hypot(tip.x - hole.x, tip.y - hole.y);

    if (d <= SNAP_RADIUS) {
      runUnlock();
    } else {
      // Failure: animate home with a soft elastic settle.
      audio.failure();
      audio.setAmbience("idle");
      setVaultState("idle");
      gsap.to(keyWrapRef.current, {
        x: 0,
        y: 0,
        duration: 1.1,
        ease: "elastic.out(0.55, 0.6)",
        onUpdate: updateProximity,
        onComplete: () => {
          dragState.current.x = 0;
          dragState.current.y = 0;
          proximityRef.current = 0;
          setProximity(0);
          onProximityRef.current(0);
        },
      });
    }
  };

  const onPointerUp = () => {
    if (!dragState.current.active || busy.current) return;
    releaseKey();
  };

  /* --------------------------------------------------- the unlock timeline */

  const runUnlock = useCallback(() => {
    if (busy.current) return;
    busy.current = true;
    setVaultState("unlocking");
    audio.setAmbience("charged");

    const hole = keyholeCenter();
    const tip = keyTip();
    const dx = hole.x - tip.x;
    const dy = hole.y - tip.y;

    const tl = gsap.timeline({
      onComplete: () => onUnlockedRef.current(),
    });

    // 1 — magnetic snap into alignment.
    tl.to(keyWrapRef.current, {
      x: `+=${dx}`,
      y: `+=${dy}`,
      duration: 0.45,
      ease: "power4.out",
      onStart: () => {
        audio.magneticSnap();
        setProximity(1);
        onProximityRef.current(1);
      },
    });
    tl.to(keySvgRef.current, { scale: 1.02, duration: 0.18, yoyo: true, repeat: 1 }, "<");

    // 2 — key inserts, then rotates automatically (user never rotates it).
    tl.to(
      keySvgRef.current,
      {
        rotate: 90,
        transformOrigin: "94% 50%",
        duration: 1.25,
        ease: "power3.inOut",
        onStart: () => {
          audio.servo(1.3);
          audio.electricity(1.2);
        },
      },
      "+=0.25",
    );

    // Cylinder follows the key exactly — mechanical cause and effect.
    tl.to(
      ".vault-cylinder",
      { rotate: 90, duration: 1.25, ease: "power3.inOut", transformOrigin: "300px 300px" },
      "<",
    );
    tl.to(".vault-ring-mid", { rotate: -32, duration: 1.6, ease: "power2.inOut" }, "<");
    tl.to(".vault-ring-outer", { rotate: 46, duration: 1.9, ease: "power2.inOut" }, "<");

    // 3 — bolts retract, heavy metal.
    tl.call(() => audio.metalUnlock());
    tl.to(".vault-bolt", {
      y: -34,
      duration: 0.55,
      ease: "power4.out",
      stagger: { each: 0.05, from: "random" },
    });
    tl.to(".vault-ring-inner", { rotate: -120, scale: 1.06, duration: 1.1, ease: "power2.inOut" }, "<");

    // 4 — key dissolves into the core.
    tl.to(keySvgRef.current, { opacity: 0, scale: 0.7, duration: 0.7, ease: "power2.in" }, "<0.2");

    // 5 — massive camera shake.
    tl.call(() => {
      audio.boom(0.95);
      burstRef.current?.burst({ count: 520, power: 1.25, x: hole.x, y: hole.y });
    });
    const shake = shakeTargetRef.current;
    if (shake) {
      const shakeTl = gsap.timeline();
      for (let i = 0; i < 22; i++) {
        const decay = 1 - i / 22;
        shakeTl.to(shake, {
          x: gsap.utils.random(-26, 26) * decay,
          y: gsap.utils.random(-20, 20) * decay,
          rotation: gsap.utils.random(-0.7, 0.7) * decay,
          scale: 1 + 0.02 * decay,
          duration: 0.05,
          ease: "none",
        });
      }
      shakeTl.to(shake, { x: 0, y: 0, rotation: 0, scale: 1, duration: 0.4, ease: "power2.out" });
      tl.add(shakeTl, "<");
    }

    // 6 — blue energy floods the screen.
    tl.fromTo(
      energyRef.current,
      { opacity: 0, scale: 0.15 },
      { opacity: 1, scale: 3.4, duration: 1.3, ease: "power2.out" },
      "<",
    );
    tl.to(".vault-root", { scale: 1.35, opacity: 0, duration: 1.1, ease: "power2.in" }, "<0.25");

    // 7 — screen flash and hand-off to the boot sequence.
    tl.fromTo(
      flashRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.18, ease: "power2.in" },
      "<0.55",
    );
    tl.to(flashRef.current, { opacity: 0, duration: 0.9, ease: "power2.out" });
    tl.to(energyRef.current, { opacity: 0, duration: 0.6 }, "<");

    return tl;
  }, [audio, burstRef, keyTip, keyholeCenter, shakeTargetRef]);

  useImperativeHandle(ref, () => ({ forceUnlock: () => runUnlock() }), [runUnlock]);

  /* ------------------------------------------------------------- entrance */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".vault-root",
        { opacity: 0, scale: 0.82, filter: "blur(18px)" },
        { opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.8, ease: "power3.out" },
      );
      gsap.fromTo(
        ".stage-copy",
        { opacity: 0, y: 24, filter: "blur(10px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.3, ease: "power3.out", stagger: 0.18, delay: 0.5 },
      );
      gsap.fromTo(
        ".key-dock",
        { opacity: 0, x: -60 },
        { opacity: 1, x: 0, duration: 1.4, ease: "power3.out", delay: 1 },
      );
      // Idle breathing of the whole lock — nothing on screen is ever static.
      gsap.to(".vault-root", {
        scale: 1.012,
        duration: 5.5,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: 1.8,
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="relative z-20 min-h-screen w-full">
      {/* -------------------------------------------------------- title */}
      <header className="stage-copy pointer-events-none absolute inset-x-0 top-[7vh] z-20 text-center">
        <p className="font-mono text-[10px] tracking-[0.5em] text-primary/70 uppercase">
          Inauguration Protocol · Secure Vault
        </p>
        <h1 className="text-energy-gradient font-display mt-3 text-xl font-black tracking-[0.18em] uppercase md:text-4xl">
          Artificial Intelligence &amp; Machine Learning
        </h1>
        <div className="mx-auto mt-4 h-px w-40 bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
      </header>

      {/* --------------------------------------------------------- vault */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <VaultLock ref={lockSvgRef} proximity={proximity} state={vaultState} size={lockSize} />
      </div>

      {/* --------------------------------------------- energy flood + flash */}
      <div
        ref={energyRef}
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 z-30 h-[70vmax] w-[70vmax] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0"
        style={{
          background:
            "radial-gradient(circle, rgba(200,240,255,0.95) 0%, rgba(70,160,255,0.55) 28%, rgba(30,70,200,0.25) 55%, rgba(0,0,0,0) 72%)",
          mixBlendMode: "screen",
        }}
      />
      <div ref={flashRef} aria-hidden className="pointer-events-none fixed inset-0 z-50 bg-white opacity-0" />

      {/* ----------------------------------------------------- the AI key */}
      <div
        ref={keyWrapRef}
        className="key-dock absolute bottom-[12vh] left-[4vw] z-30 touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerEnter={() => !dragging && audio.hover()}
        role="button"
        tabIndex={0}
        aria-label="AI Key — drag to the vault keyhole to unlock"
        style={{ cursor: dragging ? "grabbing" : "grab" }}
      >
        <div className="animate-[float_7s_ease-in-out_infinite] will-change-transform">
          <AIKey ref={keySvgRef} charge={proximity} dragging={dragging} width={280} />
        </div>
      </div>

      {/* ------------------------------------------------------ instruction */}
      <footer className="stage-copy pointer-events-none absolute inset-x-0 bottom-[6vh] z-20 text-center">
        <p className="font-body text-sm tracking-[0.34em] text-foreground/80 uppercase md:text-base">
          Drag the AI Key to Unlock
        </p>
        <p className="mt-2 font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
          {proximity > 0.55
            ? "key signature detected · release to engage"
            : "awaiting authorization key"}
        </p>
      </footer>
    </div>
  );
});
