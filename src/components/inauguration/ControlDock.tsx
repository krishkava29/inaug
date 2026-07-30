/**
 * ControlDock.tsx
 * ---------------------------------------------------------------------------
 * Presenter controls, deliberately understated so they never compete with the
 * show: volume, mute, fullscreen, reset, skip, and a hidden developer panel
 * (toggled with `D`) for stage-managing a live ceremony.
 */
import { Maximize2, Minimize2, RotateCcw, SkipForward, Volume2, VolumeX } from "lucide-react";
import type { Stage } from "@/hooks/useInauguration";

interface Props {
  volume: number;
  muted: boolean;
  fullscreen: boolean;
  stage: Stage;
  devOpen: boolean;
  onVolume: (v: number) => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onReset: () => void;
  onSkip: () => void;
  onJump: (s: Stage) => void;
}

const STAGES: Stage[] = ["gate", "vault", "boot", "reveal"];

export function ControlDock({
  volume,
  muted,
  fullscreen,
  stage,
  devOpen,
  onVolume,
  onToggleMute,
  onToggleFullscreen,
  onReset,
  onSkip,
  onJump,
}: Props) {
  return (
    <>
      <div className="fixed right-4 bottom-4 z-[60] flex items-center gap-1.5 rounded-full hud-panel px-3 py-2 opacity-45 transition-opacity duration-300 hover:opacity-100">
        <button
          onClick={onToggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
          className="grid h-8 w-8 place-items-center rounded-full text-primary transition-colors hover:bg-primary/15"
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          onChange={(e) => onVolume(Number(e.target.value))}
          aria-label="Volume"
          className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
        />

        <span className="mx-1 h-5 w-px bg-border" />

        <button
          onClick={onSkip}
          aria-label="Skip to next act"
          className="grid h-8 w-8 place-items-center rounded-full text-primary transition-colors hover:bg-primary/15"
        >
          <SkipForward size={16} />
        </button>
        <button
          onClick={onReset}
          aria-label="Reset experience"
          className="grid h-8 w-8 place-items-center rounded-full text-primary transition-colors hover:bg-primary/15"
        >
          <RotateCcw size={16} />
        </button>
        <button
          onClick={onToggleFullscreen}
          aria-label="Toggle fullscreen"
          className="grid h-8 w-8 place-items-center rounded-full text-primary transition-colors hover:bg-primary/15"
        >
          {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      {/* Shortcut legend — fades away once the show starts. */}
      <div
        className={`fixed bottom-5 left-1/2 z-[55] hidden -translate-x-1/2 gap-4 font-mono text-[10px] tracking-[0.22em] text-muted-foreground/70 uppercase transition-opacity duration-700 md:flex ${
          stage === "vault" ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <span>space · unlock</span>
        <span>f · fullscreen</span>
        <span>r · reset</span>
        <span>d · dev</span>
      </div>

      {/* ------------------------------------------------ developer panel */}
      {devOpen && (
        <aside className="fixed top-4 right-4 z-[60] w-64 rounded-lg hud-panel p-4 font-mono text-[11px] text-foreground">
          <p className="mb-3 tracking-[0.28em] text-primary uppercase">Stage Manager</p>
          <p className="mb-2 text-muted-foreground">
            act: <span className="text-primary">{stage}</span>
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {STAGES.map((s) => (
              <button
                key={s}
                onClick={() => onJump(s)}
                className={`rounded border px-2 py-1.5 uppercase transition-colors ${
                  s === stage
                    ? "border-primary/60 bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Press D to hide. Jump acts freely during rehearsal.
          </p>
        </aside>
      )}
    </>
  );
}
