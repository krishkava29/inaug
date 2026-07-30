/**
 * Route "/" — the inauguration experience.
 *
 * Composition only: the acts are self-contained modules and all narrative
 * state lives in `useInauguration`. Heavy acts are lazy-loaded so the vault
 * paints instantly on the projector machine.
 */
import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy, useCallback, useRef, useState } from "react";
import { AmbientBackground, type BackgroundIntensity } from "@/components/inauguration/AmbientBackground";
import { ParticleBurst, type ParticleBurstHandle } from "@/components/inauguration/ParticleBurst";
import { ControlDock } from "@/components/inauguration/ControlDock";
import { EntryGate } from "@/components/inauguration/EntryGate";
import { UnlockStage, type UnlockStageHandle } from "@/components/inauguration/UnlockStage";
import { useInauguration } from "@/hooks/useInauguration";

// Lazy: neither act is needed until the vault opens.
const BootSequence = lazy(() =>
  import("@/components/inauguration/BootSequence").then((m) => ({ default: m.BootSequence })),
);
const FinalReveal = lazy(() =>
  import("@/components/inauguration/FinalReveal").then((m) => ({ default: m.FinalReveal })),
);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "AI & ML Department Inauguration | Cinematic Unlock Experience",
      },
      {
        name: "description",
        content:
          "An interactive cinematic inauguration for the Department of Artificial Intelligence & Machine Learning: unlock the vault, boot the AI core, reveal the department.",
      },
      { property: "og:title", content: "AI & ML Department Inauguration" },
      {
        property: "og:description",
        content:
          "Drag the AI Key, unlock the vault and initialize the Artificial Intelligence core in this cinematic inauguration experience.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InaugurationPage,
});

const INTENSITY: Record<string, BackgroundIntensity> = {
  gate: "calm",
  vault: "calm",
  boot: "boot",
  reveal: "reveal",
};

function InaugurationPage() {
  const {
    audio,
    stage,
    runId,
    volume,
    muted,
    fullscreen,
    devOpen,
    unlockHandler,
    begin,
    goTo,
    skip,
    reset,
    setVolume,
    toggleMute,
    toggleFullscreen,
  } = useInauguration();

  const shakeRef = useRef<HTMLDivElement>(null);
  const burstRef = useRef<ParticleBurstHandle>(null);
  const unlockStageRef = useRef<UnlockStageHandle>(null);
  const [proximity, setProximity] = useState(0);

  // Wire the spacebar shortcut to the vault's imperative unlock.
  unlockHandler.current = () => unlockStageRef.current?.forceUnlock();

  const handleProximity = useCallback((p: number) => setProximity(p), []);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-background">
      {/* Camera rig: everything inside is shaken during the unlock detonation. */}
      <div ref={shakeRef} className="relative h-full w-full will-change-transform">
        <AmbientBackground intensity={INTENSITY[stage]} surge={stage === "vault" ? proximity : 0} />

        {stage === "gate" && <EntryGate onBegin={begin} />}

        {stage === "vault" && (
          <UnlockStage
            key={`vault-${runId}`}
            ref={unlockStageRef}
            audio={audio}
            burstRef={burstRef}
            shakeTargetRef={shakeRef}
            onProximityChange={handleProximity}
            onUnlocked={() => goTo("boot")}
          />
        )}

        <Suspense fallback={null}>
          {stage === "boot" && (
            <BootSequence key={`boot-${runId}`} audio={audio} onComplete={() => goTo("reveal")} />
          )}
          {stage === "reveal" && (
            <FinalReveal key={`reveal-${runId}`} audio={audio} burstRef={burstRef} />
          )}
        </Suspense>

        <ParticleBurst ref={burstRef} />
      </div>

      {/* Film-grade finishing: vignette + faint scanlines over the whole frame. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[45]"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[46] opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, rgba(180,230,255,0.6) 0px, rgba(180,230,255,0.6) 1px, transparent 1px, transparent 3px)",
        }}
      />

      <ControlDock
        volume={volume}
        muted={muted}
        fullscreen={fullscreen}
        stage={stage}
        devOpen={devOpen}
        onVolume={setVolume}
        onToggleMute={toggleMute}
        onToggleFullscreen={toggleFullscreen}
        onReset={reset}
        onSkip={skip}
        onJump={goTo}
      />
    </main>
  );
}
