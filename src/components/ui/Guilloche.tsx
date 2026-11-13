import { motion, useReducedMotion } from 'framer-motion';

type Ring = { radius: number; amplitude: number; lobes: number; copies: number };

const RINGS: Ring[] = [
  { radius: 92, amplitude: 14, lobes: 18, copies: 6 },
  { radius: 64, amplitude: 10, lobes: 12, copies: 5 },
  { radius: 38, amplitude: 7, lobes: 8, copies: 4 },
];

function ringPath({ radius, amplitude, lobes }: Ring, phase: number): string {
  const steps = 420;
  let d = '';
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * Math.PI * 2;
    const r = radius + amplitude * Math.sin(lobes * t + phase);
    const x = 120 + r * Math.cos(t);
    const y = 120 + r * Math.sin(t);
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return `${d}Z`;
}

const PATHS = RINGS.flatMap((ring, ringIndex) =>
  Array.from({ length: ring.copies }, (_, copy) => ({
    key: `${ringIndex}-${copy}`,
    d: ringPath(ring, (copy / ring.copies) * Math.PI * 2),
    ringIndex,
  })),
);

type GuillocheProps = {
  className?: string;
  draw?: boolean;
  stroke?: string;
};

export function Guilloche({ className = '', draw = false, stroke = 'currentColor' }: GuillocheProps) {
  const reduce = useReducedMotion();
  const animateDraw = draw && !reduce;

  return (
    <svg viewBox="0 0 240 240" fill="none" aria-hidden="true" className={`pointer-events-none ${className}`}>
      {PATHS.map((path, index) => (
        <motion.path
          key={path.key}
          d={path.d}
          stroke={stroke}
          strokeWidth={0.6}
          initial={animateDraw ? { pathLength: 0, opacity: 0 } : false}
          animate={animateDraw ? { pathLength: 1, opacity: 1 } : undefined}
          transition={animateDraw ? { duration: 1.6, delay: 0.1 + index * 0.035 + path.ringIndex * 0.12, ease: [0.22, 1, 0.36, 1] } : undefined}
        />
      ))}
      <circle cx="120" cy="120" r="112" stroke={stroke} strokeWidth={0.6} strokeDasharray="1 3" />
    </svg>
  );
}
