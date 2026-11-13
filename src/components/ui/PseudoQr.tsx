import { useMemo } from 'react';

const SIZE = 25;

function hash(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 1000) / 1000;
  };
}

function isFinder(x: number, y: number): boolean {
  const inBox = (bx: number, by: number) => x >= bx && x < bx + 7 && y >= by && y < by + 7;
  return inBox(0, 0) || inBox(SIZE - 7, 0) || inBox(0, SIZE - 7);
}

function inQuietOfFinder(x: number, y: number): boolean {
  const near = (bx: number, by: number) => x >= bx - 1 && x <= bx + 7 && y >= by - 1 && y <= by + 7;
  return near(0, 0) || near(SIZE - 7, 0) || near(0, SIZE - 7);
}

export function PseudoQr({ token, className = '' }: { token: string; className?: string }) {
  const cells = useMemo(() => {
    const rand = hash(token);
    const result: { x: number; y: number }[] = [];
    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        if (inQuietOfFinder(x, y)) continue;
        const center = x >= 10 && x <= 14 && y >= 10 && y <= 14;
        if (center) continue;
        if (rand() > 0.52) result.push({ x, y });
      }
    }
    return result;
  }, [token]);

  const finders = [
    [0, 0],
    [SIZE - 7, 0],
    [0, SIZE - 7],
  ];

  return (
    <svg viewBox={`-1 -1 ${SIZE + 2} ${SIZE + 2}`} className={className} role="img" aria-label="QR-код пропуска" shapeRendering="crispEdges">
      <rect x={-1} y={-1} width={SIZE + 2} height={SIZE + 2} fill="#fff" />
      {cells.map(({ x, y }) =>
        isFinder(x, y) ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#0f172a" />,
      )}
      {finders.map(([fx, fy]) => (
        <g key={`${fx}-${fy}`}>
          <rect x={fx} y={fy} width={7} height={7} rx={1.4} fill="#0f172a" />
          <rect x={fx + 1} y={fy + 1} width={5} height={5} rx={0.9} fill="#fff" />
          <rect x={fx + 2} y={fy + 2} width={3} height={3} rx={0.6} fill="#0f172a" />
        </g>
      ))}
      <rect x={10} y={10} width={5} height={5} rx={1.2} fill="#1e3a8a" />
      <path d="M12.5 11.1l1.2 2.4h-2.4z" fill="#fbbf24" />
    </svg>
  );
}
