import React, { useId } from 'react';

interface SparklineProps {
  values: number[];
  /** Stroke colour. Pass a CSS colour, not a Tailwind class. */
  stroke?: string;
  className?: string;
  ariaLabel?: string;
}

const VIEW_W = 100;
const VIEW_H = 28;
const PAD = 3;

/**
 * A trend shape, not a chart: no axes, no grid, no labels.
 *
 * It sits inside a stat tile to answer "which way is this going" in the space a
 * chart title alone would take. Anything that needs a readable value belongs in
 * a real chart instead.
 *
 * Drawn as inline SVG rather than through the charting library because a tile
 * renders six of these and each library instance carries its own config,
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

  const x = (i: number) =>
    PAD + (i * (VIEW_W - PAD * 2)) / (series.length - 1);

  // A flat series has no span to scale against; park it on the centre line
  // rather than dividing by zero and drawing nothing.
  const y = (v: number) =>
    span === 0
      ? VIEW_H / 2
      : VIEW_H - PAD - ((v - min) / span) * (VIEW_H - PAD * 2);

  const points = series.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const area = `${PAD},${VIEW_H} ${points} ${VIEW_W - PAD},${VIEW_H}`;

  const lastX = x(series.length - 1);
  const lastY = y(series[series.length - 1]);

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

      <polygon points={area} fill={`url(#${gradientId})`} />

      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* The latest point is the one the reader is actually looking for. */}
      <circle cx={lastX} cy={lastY} r="2.5" fill={stroke} />
    </svg>
  );
};

export default Sparkline;
