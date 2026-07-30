/**
 * useInauguration.ts
 * ---------------------------------------------------------------------------
 * Narrative state machine + presenter shortcuts for the inauguration show.
 *
 * Acts:
 *   gate   -> audio/fullscreen consent screen (browsers require a gesture)
 *   vault  -> draggable AI key + vault lock
 *   boot   -> AI system initialization
 *   reveal -> final department reveal
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { getAudioEngine } from "@/lib/audio-engine";

export type Stage = "gate" | "vault" | "boot" | "reveal";

const ORDER: Stage[] = ["gate", "vault", "boot", "reveal"];

export function useInauguration() {
  const audio = getAudioEngine();

  const [stage, setStage] = useState<Stage>("gate");
  const [volume, setVolumeState] = useState(0.7);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  /** Bumped on reset so heavy child trees remount cleanly (no leaked tweens). */
  const [runId, setRunId] = useState(0);

  const unlockHandler = useRef<(() => void) | null>(null);

  /* ------------------------------------------------------------- audio */
  const setVolume = useCallback(
    (v: number) => {
      setVolumeState(v);
      setMuted(v === 0);
      audio.setMuted(v === 0);
      audio.setVolume(v);
    },
    [audio],
  );

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      audio.setMuted(!m);
      if (!m) audio.cancelSpeech();
      return !m;
    });
  }, [audio]);

  /* -------------------------------------------------------- fullscreen */
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      /* fullscreen can be blocked — the show continues windowed */
    }
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  /* ------------------------------------------------------- transitions */
  const begin = useCallback(async () => {
    await audio.start();
    audio.setVolume(volume);
    await toggleFullscreen();
    setStage("vault");
  }, [audio, toggleFullscreen, volume]);

  const goTo = useCallback(
    (s: Stage) => {
      audio.cancelSpeech();
      setStage(s);
    },
    [audio],
  );

  const skip = useCallback(() => {
    const i = ORDER.indexOf(stage);
    if (stage === "gate") {
      void begin();
      return;
    }
    goTo(ORDER[Math.min(ORDER.length - 1, i + 1)]);
  }, [stage, begin, goTo]);

  const reset = useCallback(() => {
    audio.cancelSpeech();
    audio.setAmbience("idle");
    setRunId((n) => n + 1);
    setStage(audio.ready ? "vault" : "gate");
  }, [audio]);

  /* ---------------------------------------------------------- shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      const k = e.key.toLowerCase();
      if (k === " " || e.code === "Space") {
        e.preventDefault();
        if (stage === "gate") void begin();
        else if (stage === "vault") unlockHandler.current?.();
      } else if (k === "f") {
        void toggleFullscreen();
      } else if (k === "r") {
        reset();
      } else if (k === "d") {
        setDevOpen((o) => !o);
      } else if (k === "m") {
        toggleMute();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, begin, reset, toggleFullscreen, toggleMute]);

  /* ------------------------------------------------------------ cleanup */
  useEffect(() => () => audio.cancelSpeech(), [audio]);

  return {
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
    setDevOpen,
  };
}
