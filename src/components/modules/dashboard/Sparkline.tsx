import React, { useId } from 'react';

interface SparklineProps {
  values: number[];
  /** Stroke colour. Pass a CSS colour, not a Tailwind class. */
  stroke?: string;
  className?: string;
  ariaLabel?: string;
}

interface Point {
  x: number;
  y: number;
}

const VIEW_W = 100;
const VIEW_H = 28;
const PAD = 3;

/**
 * Smooth path through every point, using a monotone cubic spline.
 *
 * Monotone rather than the more common Catmull-Rom: these series are spiky —
 * a quiet week then one large day — and Catmull-Rom overshoots around a spike,
 * which in a box this short means the curve leaves the viewBox and gets clipped
 * flat. Monotone interpolation stays inside the data's own range, so a peak
 * never draws higher than the value that made it.
 */
const smoothPath = (points: Point[]): string => {
  const n = points.length;

  if (n < 2) return '';

  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    slopes.push(dx === 0 ? 0 : (points[i + 1].y - points[i].y) / dx);
  }

  // Tangent at each point, damped where the curve changes direction so it
  // cannot bulge past the neighbouring values.
  const tangents: number[] = new Array(n);
  tangents[0] = slopes[0];
  tangents[n - 1] = slopes[n - 2];

  for (let i = 1; i < n - 1; i++) {
    const prev = slopes[i - 1];
    const next = slopes[i];

    if (prev * next <= 0) {
      tangents[i] = 0;
      continue;
    }

    const average = (prev + next) / 2;
    const limit = 3 * Math.min(Math.abs(prev), Math.abs(next));
    tangents[i] = Math.sign(average) * Math.min(Math.abs(average), limit);
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const c1x = points[i].x + dx / 3;
    const c1y = points[i].y + (tangents[i] * dx) / 3;
    const c2x = points[i + 1].x - dx / 3;
    const c2y = points[i + 1].y - (tangents[i + 1] * dx) / 3;

    path += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${points[i + 1].x} ${points[i + 1].y}`;
  }

  return path;
};

/**
 * A trend shape, not a chart: no axes, no grid, no labels.
 *
 * It sits inside a card row to answer "which way is this going" in the space a
 * chart title alone would take. Anything that needs a readable value belongs in
 * a real chart instead.
 *
 * Drawn as inline SVG rather than through the charting library because a card
 * renders several of these and each library instance carries its own config,
 * resize observer and DOM.
 */
const Sparkline: React.FC<SparklineProps> = ({
  values,
  stroke = 'currentColor',
  className = '',
  ariaLabel,
}) => {
  const gradientId = useId();
  const series = (values || []).map((v) => Number(v) || 0);

  if (series.length < 2) {
    return <div className={className} aria-hidden="true" />;
  }

  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min;

  const points: Point[] = series.map((v, i) => ({
    x: PAD + (i * (VIEW_W - PAD * 2)) / (series.length - 1),
    // A flat series has no span to scale against; park it on the centre line
    // rather than dividing by zero and drawing nothing.
    y:
      span === 0
        ? VIEW_H / 2
        : VIEW_H - PAD - ((v - min) / span) * (VIEW_H - PAD * 2),
  }));

  const line = smoothPath(points);
  const last = points[points.length - 1];
  const area = `${line} L ${last.x} ${VIEW_H} L ${points[0].x} ${VIEW_H} Z`;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="none"
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      style={{ color: stroke }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={area} fill={`url(#${gradientId})`} stroke="none" />

      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* The latest point is the one the reader is actually looking for. */}
      <circle cx={last.x} cy={last.y} r="2.5" fill={stroke} />
    </svg>
  );
};

export default Sparkline;
