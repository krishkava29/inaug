/**
 * VaultLock.tsx
 * ---------------------------------------------------------------------------
 * The gigantic futuristic vault lock at the centre of the stage.
 *
 * Pure SVG (crisp on a 4K projector, no texture assets, GPU-cheap) built from
 * layered rings, machined teeth, retracting bolts and a rotating cylinder.
 *
 * The component is intentionally "dumb": it renders state, while the parent
 * orchestrates GSAP timelines against the exposed class hooks:
 *   .vault-root, .vault-ring-outer, .vault-ring-mid, .vault-ring-inner,
 *   .vault-cylinder, .vault-bolt, .vault-core, .vault-energy
 */
import { forwardRef, useMemo } from "react";

export type VaultState = "idle" | "charged" | "unlocking" | "open";

interface Props {
  /** 0..1 — how close the AI key currently is to the keyhole. */
  proximity: number;
  state: VaultState;
  size: number;
}

/** Evenly distributed items around a circle. */
const ring = (count: number) => Array.from({ length: count }, (_, i) => (360 / count) * i);

export const VaultLock = forwardRef<SVGSVGElement, Props>(function VaultLock(
  { proximity, state, size },
  ref,
) {
  const teeth = useMemo(() => ring(48), []);
  const bolts = useMemo(() => ring(8), []);
  const ticks = useMemo(() => ring(120), []);
  const charged = state !== "idle";

  return (
    <svg
      ref={ref}
      className="vault-root pointer-events-none select-none"
      width={size}
      height={size}
      viewBox="0 0 600 600"
      fill="none"
      aria-hidden
      style={{
        // Glow tracks proximity so approach feels analogue, not binary.
        filter: `drop-shadow(0 0 ${18 + proximity * 70}px rgba(90, 180, 255, ${0.18 + proximity * 0.55}))`,
        transition: "filter 220ms ease-out",
      }}
    >
      <defs>
        <radialGradient id="vaultBody" cx="50%" cy="42%" r="62%">
          <stop offset="0%" stopColor="#16233a" />
          <stop offset="55%" stopColor="#0c1526" />
          <stop offset="100%" stopColor="#050a14" />
        </radialGradient>
        <linearGradient id="vaultBezel" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5fa8e6" stopOpacity="0.85" />
          <stop offset="45%" stopColor="#1b3a5e" stopOpacity="0" />
          <stop offset="50%" stopColor="#12233c" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#8fd6ff" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="energyFlow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#bfe9ff" />
          <stop offset="50%" stopColor="#4aa8ff" />
          <stop offset="100%" stopColor="#2f5fd8" />
        </linearGradient>
        <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#dff4ff" stopOpacity="0.95" />
          <stop offset="35%" stopColor="#57b4ff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#1d4fd8" stopOpacity="0" />
        </radialGradient>
        <filter id="vaultSoft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* ---------------------------------------------------- outer housing */}
      <circle cx="300" cy="300" r="292" fill="url(#vaultBody)" />
      <circle
        cx="300"
        cy="300"
        r="292"
        stroke="url(#vaultBezel)"
        strokeWidth="2.5"
        opacity={0.7 + proximity * 0.3}
      />

      {/* Retracting bolts (parent GSAP translates these outward on unlock). */}
      <g className="vault-bolts">
        {bolts.map((a, i) => (
          <g key={a} transform={`rotate(${a} 300 300)`}>
            <rect
              className="vault-bolt"
              x="292"
              y="8"
              width="16"
              height="54"
              rx="4"
              fill="#0f1b2e"
              stroke="rgba(120,200,255,0.45)"
              strokeWidth="1.2"
            />
            <rect
              x="296"
              y="16"
              width="8"
              height="10"
              rx="2"
              fill="#59b6ff"
              opacity={charged ? 0.9 : 0.35}
              style={{ transition: "opacity 400ms ease" }}
            />
            <text
              x="300"
              y="78"
              textAnchor="middle"
              fontSize="9"
              fill="rgba(150,210,255,0.45)"
              fontFamily="var(--font-mono)"
              transform={`rotate(${-a} 300 78)`}
            >
              {String(i + 1).padStart(2, "0")}
            </text>
          </g>
        ))}
      </g>

      {/* ------------------------------------------------- outer index ring */}
      <g className="vault-ring-outer" style={{ transformOrigin: "300px 300px" }}>
        <circle cx="300" cy="300" r="252" stroke="rgba(110,190,255,0.22)" strokeWidth="1" />
        {ticks.map((a, i) => (
          <line
            key={a}
            x1="300"
            y1="238"
            x2="300"
            y2={i % 10 === 0 ? 222 : 231}
            stroke={i % 10 === 0 ? "rgba(160,220,255,0.75)" : "rgba(120,190,255,0.28)"}
            strokeWidth={i % 10 === 0 ? 1.6 : 0.8}
            transform={`rotate(${a} 300 300)`}
          />
        ))}
      </g>

      {/* -------------------------------------------------- machined gear ring */}
      <g className="vault-ring-mid" style={{ transformOrigin: "300px 300px" }}>
        <circle
          cx="300"
          cy="300"
          r="212"
          fill="rgba(9,16,28,0.7)"
          stroke="rgba(120,200,255,0.3)"
          strokeWidth="1.5"
        />
        {teeth.map((a) => (
          <rect
            key={a}
            x="296"
            y="92"
            width="8"
            height="18"
            rx="2"
            fill="rgba(90,170,255,0.35)"
            transform={`rotate(${a} 300 300)`}
          />
        ))}
        {/* Energy arcs that fill as the key approaches. */}
        {[0, 90, 180, 270].map((a) => (
          <path
            key={a}
            className="vault-energy"
            d="M 300 108 A 192 192 0 0 1 435 165"
            stroke="url(#energyFlow)"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            opacity={0.12 + proximity * 0.8}
            transform={`rotate(${a} 300 300)`}
            style={{ transition: "opacity 240ms ease-out" }}
          />
        ))}
      </g>

      {/* --------------------------------------------------- inner data ring */}
      <g className="vault-ring-inner" style={{ transformOrigin: "300px 300px" }}>
        <circle
          cx="300"
          cy="300"
          r="168"
          stroke="rgba(140,210,255,0.35)"
          strokeWidth="1"
          strokeDasharray="3 9"
        />
        <circle
          cx="300"
          cy="300"
          r="150"
          stroke="rgba(90,170,255,0.5)"
          strokeWidth="6"
          strokeDasharray="140 40"
          opacity={0.25 + proximity * 0.6}
          style={{ transition: "opacity 240ms ease-out" }}
        />
      </g>

      {/* ------------------------------------------------------- core plate */}
      <circle cx="300" cy="300" r="128" fill="url(#vaultBody)" stroke="rgba(120,200,255,0.35)" />
      <circle
        className="vault-core"
        cx="300"
        cy="300"
        r="120"
        fill="url(#coreGlow)"
        opacity={0.18 + proximity * 0.7}
        style={{ transition: "opacity 240ms ease-out" }}
      />

      {/* ----------------------------------------------- rotating cylinder */}
      <g className="vault-cylinder" style={{ transformOrigin: "300px 300px" }}>
        <circle
          cx="300"
          cy="300"
          r="96"
          fill="rgba(7,13,24,0.92)"
          stroke="rgba(150,215,255,0.55)"
          strokeWidth="1.5"
        />
        {ring(6).map((a) => (
          <rect
            key={a}
            x="297"
            y="206"
            width="6"
            height="26"
            rx="3"
            fill="rgba(120,200,255,0.5)"
            transform={`rotate(${a} 300 300)`}
          />
        ))}
        {/* Keyhole: circular head + tapered slot, the actual drop target. */}
        <g className="vault-keyhole">
          <circle
            cx="300"
            cy="278"
            r="30"
            fill="#03070f"
            stroke="rgba(160,220,255,0.7)"
            strokeWidth="2"
          />
          <path
            d="M 284 296 L 316 296 L 308 356 Q 300 366 292 356 Z"
            fill="#03070f"
            stroke="rgba(160,220,255,0.7)"
            strokeWidth="2"
          />
          <circle
            cx="300"
            cy="284"
            r="44"
            fill="url(#coreGlow)"
            opacity={proximity * 0.85}
            filter="url(#vaultSoft)"
            style={{ transition: "opacity 200ms ease-out" }}
          />
        </g>
      </g>

      {/* Pulsing containment ring — only visible once charged. */}
      <circle
        cx="300"
        cy="300"
        r="128"
        stroke="rgba(150,220,255,0.5)"
        strokeWidth="1.5"
        fill="none"
        opacity={charged ? 0.6 : 0}
        className="animate-[pulse-ring_3.2s_ease-out_infinite]"
        style={{ transformOrigin: "300px 300px", transition: "opacity 500ms ease" }}
      />
    </svg>
  );
});
