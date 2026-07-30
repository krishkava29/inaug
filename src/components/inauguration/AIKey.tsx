/**
 * AIKey.tsx
 * ---------------------------------------------------------------------------
 * The draggable "AI Key" — deliberately NOT metallic.
 *
 * Look: transparent crystal shell, blue plasma suspended inside, etched
 * circuit traces, refraction highlights and a slow internal energy flow.
 * All SVG + CSS so it stays razor sharp at projector resolutions.
 *
 * Rendering only — drag/physics live in UnlockStage so the key can stay a
 * pure, memo-friendly visual.
 */
import { forwardRef } from "react";

interface Props {
  /** 0..1 proximity to the keyhole, drives internal charge. */
  charge: number;
  dragging: boolean;
  width?: number;
}

export const AIKey = forwardRef<SVGSVGElement, Props>(function AIKey(
  { charge, dragging, width = 260 },
  ref,
) {
  return (
    <svg
      ref={ref}
      width={width}
      height={width * 0.42}
      viewBox="0 0 520 220"
      fill="none"
      aria-hidden
      className="ai-key-svg block"
      style={{
        filter: `drop-shadow(0 0 ${14 + charge * 40}px rgba(110,195,255,${0.35 + charge * 0.5})) drop-shadow(0 18px 34px rgba(0,0,0,0.55))`,
        transition: "filter 200ms ease-out",
      }}
    >
      <defs>
        {/* Crystal body: cool glass with internal depth, never chrome. */}
        <linearGradient id="crystalBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#bfe8ff" stopOpacity="0.42" />
          <stop offset="35%" stopColor="#5aa9ff" stopOpacity="0.20" />
          <stop offset="70%" stopColor="#9fdcff" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#dff6ff" stopOpacity="0.50" />
        </linearGradient>
        <linearGradient id="crystalEdge" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#e8f9ff" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#7cc8ff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#eaf9ff" stopOpacity="0.9" />
        </linearGradient>
        <radialGradient id="plasma" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="30%" stopColor="#7fd0ff" stopOpacity="0.85" />
          <stop offset="75%" stopColor="#2f7fe8" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#1b3fb0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="energyVein" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#5ad0ff" stopOpacity="0" />
          <stop offset="45%" stopColor="#d8f4ff" stopOpacity="1" />
          <stop offset="100%" stopColor="#5ad0ff" stopOpacity="0" />
        </linearGradient>
        <filter id="keyBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <clipPath id="keyClip">
          <path d="M 118 110 m -78 0 a 78 78 0 1 0 156 0 a 78 78 0 1 0 -156 0 M 190 88 L 470 88 L 486 110 L 470 132 L 190 132 Z" />
        </clipPath>
      </defs>

      {/* ------------------------------------------------- crystal bow (head) */}
      <g>
        <circle cx="118" cy="110" r="80" fill="url(#crystalBody)" />
        <circle cx="118" cy="110" r="80" stroke="url(#crystalEdge)" strokeWidth="2.4" fill="none" />
        <circle cx="118" cy="110" r="62" stroke="rgba(200,240,255,0.35)" strokeWidth="1" fill="none" />

        {/* Suspended plasma core */}
        <circle
          cx="118"
          cy="110"
          r={30 + charge * 12}
          fill="url(#plasma)"
          filter="url(#keyBlur)"
          opacity={0.75 + charge * 0.25}
          style={{ transition: "r 220ms ease-out, opacity 220ms ease-out" }}
        />
        <circle cx="118" cy="110" r="16" fill="#eaf9ff" opacity={0.85} />

        {/* Orbiting energy rings inside the crystal */}
        <g className="animate-[spin_14s_linear_infinite]" style={{ transformOrigin: "118px 110px" }}>
          <ellipse
            cx="118"
            cy="110"
            rx="52"
            ry="20"
            stroke="rgba(180,235,255,0.55)"
            strokeWidth="1.4"
            fill="none"
          />
        </g>
        <g
          className="animate-[spin-reverse_9s_linear_infinite]"
          style={{ transformOrigin: "118px 110px" }}
        >
          <ellipse
            cx="118"
            cy="110"
            rx="20"
            ry="52"
            stroke="rgba(150,215,255,0.45)"
            strokeWidth="1.2"
            fill="none"
          />
        </g>

        {/* Etched circuit traces on the crystal face */}
        <g stroke="rgba(180,235,255,0.55)" strokeWidth="1.1" fill="none">
          <path d="M 60 76 L 84 76 L 96 64" />
          <path d="M 54 120 L 78 120 L 90 132 L 90 152" />
          <path d="M 176 92 L 152 92 L 140 80" />
          <path d="M 182 132 L 158 132 L 146 144" />
        </g>
        {[
          [60, 76],
          [90, 152],
          [176, 92],
          [182, 132],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" fill="#bfeaff" opacity="0.9" />
        ))}
      </g>

      {/* -------------------------------------------------------- crystal shaft */}
      <g>
        <path
          d="M 190 88 L 470 88 L 486 110 L 470 132 L 190 132 Z"
          fill="url(#crystalBody)"
          stroke="url(#crystalEdge)"
          strokeWidth="2"
        />
        {/* internal energy vein, animated by CSS dash flow */}
        <path
          d="M 200 110 L 476 110"
          stroke="url(#energyVein)"
          strokeWidth={4 + charge * 3}
          strokeLinecap="round"
          opacity={0.7 + charge * 0.3}
        />
        {/* circuit ladder inside the shaft */}
        <g clipPath="url(#keyClip)" stroke="rgba(190,240,255,0.4)" strokeWidth="1">
          {Array.from({ length: 12 }, (_, i) => (
            <line key={i} x1={210 + i * 22} y1="94" x2={210 + i * 22} y2="126" />
          ))}
        </g>
        {/* key bit / teeth — crystal, not metal */}
        <path
          d="M 386 132 L 386 162 L 404 162 L 404 132 Z M 424 132 L 424 172 L 444 172 L 444 132 Z"
          fill="url(#crystalBody)"
          stroke="url(#crystalEdge)"
          strokeWidth="1.8"
        />
        <circle cx="486" cy="110" r={5 + charge * 3} fill="#eaf9ff" opacity="0.95" />
      </g>

      {/* Specular sweep — subtle, reads as glass rather than a glow blob */}
      <path
        d="M 200 92 L 300 92 L 250 128 L 200 128 Z"
        fill="rgba(255,255,255,0.16)"
        opacity={dragging ? 0.5 : 0.28}
        style={{ transition: "opacity 300ms ease" }}
      />
    </svg>
  );
});
