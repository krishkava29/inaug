/**
 * FinalReveal.tsx
 * ---------------------------------------------------------------------------
 * The payoff narrative sequence:
 * 1. Initial Department Emblem & Inauguration Unveiling
 * 2. Kinetic Word Sequence: CREATE ➔ BUILD ➔ EXPLORE ➔ IMMERSE
 * 3. Unity Ignite Program Inauguration Card ("From Gamer to Game Development")
 * 4. Warm Welcome Ceremony for Principal, HOD, and Students (Final Static Display)
 */
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import type { AudioEngine } from "@/lib/audio-engine";
import type { ParticleBurstHandle } from "./ParticleBurst";
import departmentEmblem from "@/assets/department-emblem.png";
import collegeCrest from "@/assets/college-crest.png";
import { Sparkles, GraduationCap, UserCheck, Users, Gamepad2, Code2, Cpu, ChevronRight, RotateCcw, Lock } from "lucide-react";

interface Props {
  audio: AudioEngine;
  burstRef: React.RefObject<ParticleBurstHandle | null>;
}

type RevealPhase = "hero" | "words" | "program_card" | "welcome";

const WORD_SEQUENCE = [
  {
    word: "CREATE",
    tagline: "Pioneering breakthrough ideas & algorithmic solutions",
    color: "from-cyan-400 via-blue-500 to-indigo-500",
    badge: "01 // VISION",
    icon: Sparkles,
  },
  {
    word: "BUILD",
    tagline: "Engineering intelligent systems & future-ready infrastructure",
    color: "from-blue-400 via-cyan-400 to-emerald-400",
    badge: "02 // ARCHITECTURE",
    icon: Sparkles,
  },
  {
    word: "EXPLORE",
    tagline: "Pushing boundaries in AI, Deep Learning & Autonomous Systems",
    color: "from-indigo-400 via-purple-500 to-pink-500",
    badge: "03 // INNOVATION",
    icon: Sparkles,
  },
  {
    word: "IMMERSE",
    tagline: "Diving deep into hands-on innovation & skill development",
    color: "from-cyan-300 via-teal-400 to-emerald-400",
    badge: "04 // DOMAIN MASTERY",
    icon: Sparkles,
  },
];

const WELCOME_CARDS = [
  {
    id: "principal",
    title: "Honorable Principal",
    subtitle: "Guru Gobind Singh Polytechnic, Nashik",
    role: "Visionary Leadership",
    icon: GraduationCap,
    image: "/principal.jpg",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    glowColor: "rgba(59, 130, 246, 0.25)",
    message:
      "Extending our heartfelt gratitude and warmest welcome to our Honorable Principal. Thank you for empowering our institution with visionary leadership and fostering a culture of technical excellence.",
  },
  {
    id: "hod",
    title: "Respected Head of Department",
    subtitle: "Department of AI & ML",
    role: "Academic & Technical Direction",
    icon: UserCheck,
    image: "/hod.jpg",
    badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    glowColor: "rgba(6, 182, 212, 0.25)",
    message:
      "A warm welcome to our Head of Department. Under your inspiring guidance, the Department of AI & ML launches this Skill Development Program to shape tomorrow's tech leaders.",
  },
  {
    id: "students",
    title: "Aspiring Students & Innovators",
    subtitle: "Future Engineers & AI Pioneers",
    role: "Heart of the Department",
    icon: Users,
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    glowColor: "rgba(16, 185, 129, 0.25)",
    message:
      "To our passionate students: Welcome to the future! Embrace curiosity, build groundbreaking projects, and lead the era of Artificial Intelligence and Machine Learning.",
  },
];

export function FinalReveal({ audio, burstRef }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<RevealPhase>("hero");
  const [activeWordIndex, setActiveWordIndex] = useState(0);
  const [activeWelcomeTab, setActiveWelcomeTab] = useState<number>(0);
  const [isStaticLocked, setIsStaticLocked] = useState(false);

  /* ------------------------------------------------------------- 1. Hero Phase */
  useEffect(() => {
    if (phase !== "hero") return;
    audio.setAmbience("reveal");

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.call(() => {
        burstRef.current?.burst({ count: 620, power: 1.35 });
        audio.boom(0.9);
        audio.riser(3.4);
      });

      tl.fromTo(".reveal-flash", { opacity: 0.9 }, { opacity: 0, duration: 1.5, ease: "power2.out" }, 0);

      tl.fromTo(
        ".reveal-emblem",
        { opacity: 0, scale: 0.72, filter: "blur(26px)" },
        { opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.6 },
        0.35,
      );

      tl.fromTo(
        ".reveal-ring",
        { scale: 0.5, opacity: 0.7 },
        { scale: 1, opacity: 1, duration: 1.4, stagger: 0.12 },
        0.6,
      );

      tl.fromTo(
        ".reveal-line",
        { opacity: 0, y: 42, filter: "blur(14px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.05, stagger: 0.16 },
        1.15,
      );

      tl.fromTo(
        ".reveal-tagline",
        { opacity: 0, letterSpacing: "0.9em" },
        { opacity: 1, letterSpacing: "0.34em", duration: 1.5 },
        2.1,
      );
      tl.fromTo(".reveal-crest", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.1 }, 2.3);
      tl.fromTo(".reveal-chrome", { opacity: 0 }, { opacity: 1, duration: 1.2 }, 2.5);

      tl.call(
        () => {
          audio.speak("Department of Artificial Intelligence and Machine Learning. Now online.");
          burstRef.current?.burst({ count: 220, power: 0.7 });
          audio.electricity(1.4);
        },
        undefined,
        2.4,
      );

      // Auto transition to CREATE -> BUILD -> EXPLORE -> IMMERSE sequence
      tl.call(
        () => {
          setActiveWordIndex(0);
          setPhase("words");
        },
        undefined,
        5.2,
      );
    }, rootRef);

    return () => ctx.revert();
  }, [phase, audio, burstRef]);

  /* ------------------------------------------- 2. Word Sequence Auto Transition */
  useEffect(() => {
    if (phase !== "words") return;

    audio.boom(0.6);
    burstRef.current?.burst({ count: 180, power: 0.9 });
    const currentWord = WORD_SEQUENCE[activeWordIndex].word;
    audio.speak(currentWord);

    const timer = setTimeout(() => {
      if (activeWordIndex < WORD_SEQUENCE.length - 1) {
        setActiveWordIndex((prev) => prev + 1);
      } else {
        setPhase("program_card");
      }
    }, 2400);

    return () => clearTimeout(timer);
  }, [phase, activeWordIndex, audio, burstRef]);

  /* ------------------------------------------- 3. Program Inauguration Card Phase */
  useEffect(() => {
    if (phase !== "program_card") return;

    audio.riser(2.5);
    burstRef.current?.burst({ count: 450, power: 1.3 });
    audio.speak("Inauguration of Unity Ignite: From Gamer to Game Development. A Skill Development Program.");

    // If sequence has already completed once (statically locked), DO NOT auto-advance!
    if (isStaticLocked) return;

    const timer = setTimeout(() => {
      setPhase("welcome");
    }, 5500);

    return () => clearTimeout(timer);
  }, [phase, audio, burstRef, isStaticLocked]);

  /* ------------------------------------------- 4. Welcome Stage & Static Lock */
  useEffect(() => {
    if (phase === "welcome") {
      audio.riser(2.0);
      audio.speak("Warm welcome to our Principal, Head of Department, and Students.");
      burstRef.current?.burst({ count: 350, power: 1.1 });
      setIsStaticLocked(true);
    }
  }, [phase, audio, burstRef]);

  return (
    <div
      ref={rootRef}
      className="relative z-20 flex min-h-screen w-full flex-col items-center justify-center px-6 py-12 text-center"
    >
      {/* --------------------------------------------------- 1. HERO PHASE */}
      {phase === "hero" && (
        <div className="flex w-full flex-col items-center justify-center">
          <div className="reveal-flash pointer-events-none fixed inset-0 z-30 bg-primary/70 mix-blend-screen" />

          {/* Emblem */}
          <div className="relative mb-8 flex h-[240px] w-[240px] items-center justify-center md:h-[280px] md:w-[280px]">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="reveal-ring absolute rounded-full border border-primary/25"
                style={{
                  inset: `${-i * 24}px`,
                  animation: `spin ${26 + i * 14}s linear infinite ${i % 2 ? "reverse" : "normal"}`,
                  borderStyle: i === 1 ? "dashed" : "solid",
                }}
              />
            ))}
            <div
              className="absolute inset-6 rounded-full"
              style={{ background: "var(--gradient-void)", boxShadow: "var(--shadow-deep)" }}
            />
            <img
              src={departmentEmblem}
              alt="Department Emblem"
              className="reveal-emblem relative h-[190px] w-[190px] object-contain md:h-[230px] md:w-[230px]"
              style={{ filter: "drop-shadow(0 0 46px rgba(90,180,255,0.55))" }}
              loading="eager"
            />
          </div>

          {/* Wordmark */}
          <h1 className="font-display leading-[1.05] tracking-[0.12em] uppercase">
            <span className="reveal-line block text-sm text-muted-foreground md:text-base">
              Department of
            </span>
            <span className="reveal-line text-energy-gradient mt-2 block text-4xl font-black md:text-6xl lg:text-7xl">
              Artificial Intelligence
            </span>
            <span className="reveal-line my-1 block text-2xl text-primary/70 md:text-3xl">&amp;</span>
            <span className="reveal-line text-energy-gradient block text-4xl font-black md:text-6xl lg:text-7xl">
              Machine Learning
            </span>
          </h1>

          <p className="reveal-tagline mt-6 font-body text-xs text-primary/85 uppercase md:text-sm">
            Empowering the Future Through Intelligence
          </p>

          {/* College Crest */}
          <div className="reveal-crest mt-8 flex items-center gap-4">
            <img
              src={collegeCrest}
              alt="College Crest"
              className="h-14 w-14 object-contain opacity-90 md:h-18 md:w-18"
              loading="lazy"
            />
            <div className="text-left">
              <p className="font-display text-[11px] tracking-[0.3em] text-foreground uppercase font-bold">
                Guru Gobind Singh Polytechnic, Nashik
              </p>
              <p className="font-mono text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
                Inauguration Ceremony · Skill Development Program
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------- 2. KINETIC WORD SEQUENCE */}
      {phase === "words" && (
        <div className="flex min-h-[70vh] w-full max-w-5xl flex-col items-center justify-center px-4">
          <div
            key={activeWordIndex}
            className="animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center justify-center"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 font-mono text-xs tracking-[0.3em] text-primary uppercase">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{WORD_SEQUENCE[activeWordIndex].badge}</span>
            </div>

            <h2
              className={`bg-gradient-to-r ${WORD_SEQUENCE[activeWordIndex].color} bg-clip-text text-6xl font-black tracking-widest text-transparent md:text-8xl lg:text-9xl uppercase drop-shadow-[0_0_40px_rgba(90,180,255,0.6)]`}
            >
              {WORD_SEQUENCE[activeWordIndex].word}
            </h2>

            <p className="mt-8 max-w-2xl font-body text-base tracking-[0.15em] text-muted-foreground md:text-xl uppercase">
              {WORD_SEQUENCE[activeWordIndex].tagline}
            </p>

            {/* Sequence Dots */}
            <div className="mt-12 flex gap-3">
              {WORD_SEQUENCE.map((item, idx) => (
                <div
                  key={item.word}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    idx === activeWordIndex
                      ? "w-10 bg-primary shadow-[0_0_12px_rgba(90,180,255,0.8)]"
                      : "w-2 bg-primary/20"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------- 3. PROGRAM INAUGURATION BIG CARD */}
      {phase === "program_card" && (
        <div className="animate-in fade-in zoom-in-95 duration-700 flex w-full max-w-5xl flex-col items-center justify-center px-4 py-6">
          <div className="relative w-full overflow-hidden rounded-3xl border-2 border-cyan-500/40 bg-card/85 p-8 text-center backdrop-blur-2xl shadow-[0_0_100px_rgba(6,182,212,0.35)] md:p-14">
            
            {/* Animated Ambient Glow Spheres in background */}
            <div className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-purple-500/20 blur-3xl" />
            
            {/* Corner Tech Brackets */}
            <div className="pointer-events-none absolute top-4 left-4 h-8 w-8 border-t-2 border-l-2 border-cyan-400/80" />
            <div className="pointer-events-none absolute top-4 right-4 h-8 w-8 border-t-2 border-r-2 border-cyan-400/80" />
            <div className="pointer-events-none absolute bottom-4 left-4 h-8 w-8 border-b-2 border-l-2 border-cyan-400/80" />
            <div className="pointer-events-none absolute bottom-4 right-4 h-8 w-8 border-b-2 border-r-2 border-cyan-400/80" />

            {/* Top Accent Ribbon */}
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-cyan-400/50 bg-cyan-500/15 px-6 py-2 font-mono text-xs tracking-[0.35em] text-cyan-300 uppercase shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <Sparkles className="h-4 w-4 text-cyan-400 animate-pulse" />
              <span>OFFICIAL INAUGURATION ANNOUNCEMENT</span>
            </div>

            <p className="font-mono text-xs md:text-sm tracking-[0.4em] text-primary/80 uppercase font-bold">
              ✦ INAUGURATION OF ✦
            </p>

            {/* Main Program Title */}
            <div className="my-8">
              <h2 className="bg-gradient-to-r from-cyan-300 via-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-5xl font-black tracking-widest text-transparent md:text-7xl lg:text-8xl uppercase drop-shadow-[0_0_50px_rgba(6,182,212,0.65)]">
                UNITY IGNITE
              </h2>
              
              <div className="mt-6 inline-flex items-center gap-4 rounded-3xl border border-primary/40 bg-gradient-to-r from-primary/20 via-cyan-500/10 to-purple-500/20 px-8 py-3.5 shadow-[0_0_30px_rgba(59,130,246,0.25)]">
                <Gamepad2 className="h-6 w-6 text-cyan-400 animate-bounce" />
                <span className="font-display text-xl font-black tracking-widest text-foreground md:text-2xl lg:text-3xl uppercase">
                  "From Gamer to Game Development"
                </span>
                <Code2 className="h-6 w-6 text-purple-400" />
              </div>
            </div>

            {/* Program Badges & Highlights Grid */}
            <div className="my-8 flex flex-wrap justify-center gap-3 md:gap-4">
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/15 px-6 py-2.5 font-mono text-xs md:text-sm tracking-[0.2em] text-emerald-300 uppercase font-bold shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                ⚡ A SKILL DEVELOPMENT PROGRAM
              </div>
              <div className="rounded-2xl border border-purple-500/40 bg-purple-500/15 px-6 py-2.5 font-mono text-xs md:text-sm tracking-[0.2em] text-purple-300 uppercase font-bold shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                🎮 GAME ENGINE &amp; INTERACTIVE MEDIA
              </div>
            </div>

            {/* Organizer Info */}
            <div className="mt-8 border-t border-cyan-500/30 pt-8">
              <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground uppercase font-semibold">
                ORGANIZED BY
              </p>
              <h3 className="mt-2 font-display text-2xl font-black tracking-wider text-foreground md:text-3xl lg:text-4xl uppercase">
                Department of Artificial Intelligence &amp; Machine Learning
              </h3>
              <p className="mt-2 font-mono text-sm tracking-[0.25em] text-cyan-400 uppercase font-bold">
                Guru Gobind Singh Polytechnic, Nashik
              </p>
            </div>

            <button
              onClick={() => {
                audio.hover();
                setPhase("welcome");
              }}
              className="group mt-10 inline-flex items-center gap-3 rounded-full border-2 border-cyan-400/60 bg-gradient-to-r from-cyan-500/30 to-blue-600/30 px-8 py-3.5 font-mono text-xs md:text-sm tracking-wider text-cyan-200 hover:text-white hover:border-cyan-300 hover:bg-cyan-500/40 uppercase transition-all duration-300 shadow-[0_0_30px_rgba(6,182,212,0.4)]"
            >
              <span className="font-bold">Continue to Welcome Honors</span>
              <ChevronRight className="h-5 w-5 text-cyan-400 transition-transform duration-300 group-hover:translate-x-1" />
            </button>

          </div>
        </div>
      )}

      {/* ---------------------------------- 4. WELCOME PHASE & STATIC DISPLAY */}
      {phase === "welcome" && (
        <div className="animate-in fade-in duration-700 flex w-full max-w-5xl flex-col items-center justify-center py-6">
          
          {/* Static Presentation Lock Badge */}
          {isStaticLocked && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1 font-mono text-[10px] tracking-[0.25em] text-emerald-400 uppercase">
              <Lock className="h-3 w-3 text-emerald-400" />
              <span>STATIC PRESENTATION DISPLAY LOCK</span>
            </div>
          )}

          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 font-mono text-[11px] tracking-[0.3em] text-primary uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Guru Gobind Singh Polytechnic, Nashik</span>
          </div>

          <h2 className="font-display text-3xl font-extrabold tracking-wider text-foreground md:text-5xl uppercase">
            A Warm &amp; Grand Welcome
          </h2>

          <p className="mt-2 font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Skill Development Program · Department of AI &amp; ML
          </p>

          {/* Welcome Person Selector Tabs */}
          <div className="mt-8 flex flex-wrap justify-center gap-3 md:gap-4">
            {WELCOME_CARDS.map((card, idx) => {
              const Icon = card.icon;
              const isSelected = activeWelcomeTab === idx;
              return (
                <button
                  key={card.id}
                  onClick={() => {
                    setActiveWelcomeTab(idx);
                    audio.hover();
                  }}
                  className={`flex items-center gap-3 rounded-2xl border px-6 py-3 font-mono text-xs md:text-sm font-semibold tracking-wider transition-all duration-300 uppercase ${
                    isSelected
                      ? "border-primary/80 bg-primary/25 text-foreground shadow-[0_0_25px_rgba(90,180,255,0.4)] scale-105"
                      : "border-border/60 bg-background/50 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  <span>{card.title}</span>
                </button>
              );
            })}
          </div>

          {/* Active Welcome Card Details */}
          <div className="mt-8 w-full max-w-4xl px-2">
            {WELCOME_CARDS.map((card, idx) => {
              if (idx !== activeWelcomeTab) return null;
              const Icon = card.icon;
              return (
                <div
                  key={card.id}
                  className="animate-in fade-in zoom-in-95 duration-500 relative overflow-hidden rounded-3xl border-2 border-primary/40 bg-card/80 p-8 text-left backdrop-blur-xl md:p-12 shadow-2xl"
                  style={{ boxShadow: `0 25px 90px -10px ${card.glowColor}` }}
                >
                  {/* Background Radial Glow Accent */}
                  <div
                    className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-30 blur-3xl"
                    style={{ backgroundColor: card.glowColor }}
                  />

                  <div className="flex flex-col items-center gap-8 text-center md:flex-row md:items-center md:text-left">
                    {"image" in card && card.image ? (
                      <div className="relative shrink-0">
                        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 opacity-70 blur-md" />
                        <div className="relative h-36 w-36 overflow-hidden rounded-3xl border-2 border-primary/60 shadow-[0_0_35px_rgba(90,180,255,0.4)] md:h-44 md:w-44">
                          <img
                            src={card.image as string}
                            alt={card.title}
                            className="h-full w-full object-cover object-top"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-36 w-36 shrink-0 items-center justify-center rounded-3xl border-2 border-primary/40 bg-primary/10 shadow-[0_0_35px_rgba(90,180,255,0.3)] md:h-44 md:w-44">
                        <Icon className="h-16 w-16 text-primary" />
                      </div>
                    )}

                    <div className="flex-1">
                      <span
                        className={`inline-block rounded-full border px-4 py-1 font-mono text-xs tracking-wider uppercase font-semibold ${card.badgeColor}`}
                      >
                        {card.role}
                      </span>
                      <h3 className="mt-3 font-display text-3xl font-black text-foreground md:text-4xl lg:text-5xl uppercase tracking-wide">
                        {card.title}
                      </h3>
                      <p className="mt-1 font-mono text-sm tracking-wider text-primary/80 font-semibold uppercase md:text-base">
                        {card.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 border-t border-border/60 pt-6">
                    <p className="font-body text-lg leading-relaxed text-foreground/95 md:text-xl font-normal">
                      "{card.message}"
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Presenter Actions */}
          <div className="mt-10 flex items-center gap-4">
            <button
              onClick={() => {
                setActiveWordIndex(0);
                setPhase("words");
              }}
              className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-5 py-2 font-mono text-xs tracking-wider text-primary hover:bg-primary/20 uppercase"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Replay Sequence</span>
            </button>
            <button
              onClick={() => setPhase("program_card")}
              className="flex items-center gap-2 rounded-lg border border-border bg-background/50 px-5 py-2 font-mono text-xs tracking-wider text-muted-foreground hover:text-foreground uppercase"
            >
              <span>View Program Card</span>
            </button>
          </div>
        </div>
      )}

      {/* HUD Chrome Corners */}
      <div className="reveal-chrome pointer-events-none fixed inset-6 z-10 hidden md:block">
        <div className="absolute top-0 left-0 h-16 w-16 border-t border-l border-primary/40" />
        <div className="absolute top-0 right-0 h-16 w-16 border-t border-r border-primary/40" />
        <div className="absolute bottom-0 left-0 h-16 w-16 border-b border-l border-primary/40" />
        <div className="absolute right-0 bottom-0 h-16 w-16 border-r border-b border-primary/40" />
        <span className="absolute top-1 left-20 font-mono text-[10px] tracking-[0.3em] text-primary/60 uppercase">
          Guru Gobind Singh Polytechnic · AI &amp; ML
        </span>
        <span className="absolute right-20 bottom-1 font-mono text-[10px] tracking-[0.3em] text-primary/60 uppercase">
          Skill Development Program · Unity Ignite
        </span>
      </div>
    </div>
  );
}

