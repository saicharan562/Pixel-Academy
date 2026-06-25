import { useId } from 'react';

/**
 * Hand-rolled SVG sparkline (no chart dependency). Renders a smooth area + line
 * with a soft gradient fill. Purely decorative → aria-hidden.
 */
export function Sparkline({
  data, width = 120, height = 36, className, tone = 'accent',
}: { data: number[]; width?: number; height?: number; className?: string; tone?: 'accent' | 'success' | 'danger' }) {
  const id = useId();
  if (data.length < 2) return <svg width={width} height={height} className={className} aria-hidden />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;
  const stepX = (width - pad * 2) / (data.length - 1);
  const points = data.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (height - pad * 2) * (1 - (v - min) / range);
    return [x, y] as const;
  });

  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${points[points.length - 1][0].toFixed(1)},${height} L${points[0][0].toFixed(1)},${height} Z`;
  const stroke = `hsl(var(--${tone === 'accent' ? 'accent' : tone}))`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${id})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
