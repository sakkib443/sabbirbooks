"use client";

/**
 * Small confetti that keeps falling inside its parent (22 Oct 2026).
 *
 * Shown while a coupon is applied — so a buyer who arrives with a coupon
 * already on (the landing page's pop-up) sees at once that it is working —
 * and on the order-confirmed screen. The parent must be `relative
 * overflow-hidden`; this fills it and never takes a click. Pure CSS, a fixed
 * set of pieces (no randomness, so server and browser render the same), and
 * still for anyone who has asked their device for reduced motion.
 */

const COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#8b5cf6", "#ef4444"];
const SHAPES = ["50%", "2px", "0"]; // circle, rounded square, square

export default function Celebration({ count = 18, className = "" }: { count?: number; className?: string }) {
  const pieces = Array.from({ length: count }, (_, i) => ({
    left: (i * 37) % 100,
    delay: ((i * 0.53) % 3).toFixed(2),
    duration: (2.6 + ((i * 0.37) % 1.8)).toFixed(2),
    size: 5 + (i % 4) * 2,
    color: COLORS[i % COLORS.length],
    radius: SHAPES[i % SHAPES.length],
    drift: ((i % 5) - 2) * 10,
  }));
  return (
    <span aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <style>{`
        @keyframes mv-confetti-fall {
          0%   { transform: translate3d(0, -12px, 0) rotate(0deg); opacity: 0; }
          10%  { opacity: 1; }
          100% { transform: translate3d(var(--mv-drift), 140px, 0) rotate(540deg); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .mv-confetti-piece { animation: none !important; opacity: 0.6 !important; transform: none !important; }
        }
      `}</style>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="mv-confetti-piece absolute top-0 block"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.radius === "0" ? p.size / 2 : p.size,
              background: p.color,
              borderRadius: p.radius,
              animation: `mv-confetti-fall ${p.duration}s linear ${p.delay}s infinite`,
              "--mv-drift": `${p.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}
