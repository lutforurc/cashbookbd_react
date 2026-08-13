import { useEffect, useMemo, useState } from 'react';

/**
 * Reading the palette from JavaScript.
 *
 * Most of the app never needs this: a class name resolves through
 * tailwind.config to a variable and the browser does the rest. Two kinds of
 * code cannot take that route.
 *
 * The first is anything that writes a colour into an SVG presentation
 * attribute -- ApexCharts does, for every series it draws. An attribute is not
 * a CSS declaration, so `fill="rgb(var(--c-chart-1))"` resolves to nothing and
 * the series renders black.
 *
 * The second is any library that parses the colour it is given, to lighten it
 * for a gradient or darken it for a hover state. A `var()` string is opaque to
 * that arithmetic.
 *
 * Both need a concrete colour, and both need it again when the theme changes.
 */

/** A token as a CSS value, for anywhere the browser resolves it. */
export const token = (name: string, alpha?: number): string =>
  alpha === undefined
    ? `rgb(var(--c-${name}))`
    : `rgb(var(--c-${name}) / ${alpha})`;

/**
 * A token as a concrete `rgb(...)` string, read from the document.
 *
 * Falls back to mid-grey rather than throwing: a chart drawn in the wrong grey
 * is a smaller problem than a dashboard that fails to render, and the fallback
 * only ever shows if the stylesheet has not loaded.
 */
export const readToken = (name: string, fallback = 'rgb(105, 115, 128)'): string => {
  if (typeof document === 'undefined') return fallback;

  const channels = getComputedStyle(document.documentElement)
    .getPropertyValue(`--c-${name}`)
    .trim();

  if (!channels) return fallback;

  // Commas, not the spaces the tokens are stored with.
  //
  // `rgb(110 155 255)` is valid CSS and the browser draws it correctly, which
  // is why this looked right. But ApexCharts parses the colours it is handed,
  // and its rgb2hex() matches a comma-separated form only:
  //
  //     /^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)/i
  //
  // The space-separated form does not match, so rgb2hex() returns '', and
  // hexToRgba() replaces anything that does not start with '#' by its own
  // #999999. Every area fill in the app was therefore drawn the same grey at a
  // tenth of an opacity -- invisible on a white card and on a dark one alike,
  // whatever colour the palette said. Charts drew, and showed nothing.
  return `rgb(${channels.split(/\s+/).join(', ')})`;
};

/**
 * Concrete colours that follow the theme.
 *
 * A chart that has already drawn itself does not notice the dark class being
 * added, so this watches for it and hands back new values, which is enough to
 * re-render whatever holds them.
 */
export function useThemeTokens<K extends string>(
  names: readonly K[],
): Record<K, string> {
  // The caller almost always passes an array literal, which is a new array on
  // every render; the key is what stops that from restarting the effect.
  const key = names.join(',');

  const read = useMemo(
    () =>
      () =>
        Object.fromEntries(names.map((name) => [name, readToken(name)])) as Record<K, string>,
    [key],
  );

  const [colors, setColors] = useState(read);

  useEffect(() => {
    setColors(read());

    const observer = new MutationObserver(() => setColors(read()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, [read]);

  return colors;
}

/**
 * Whether the dark theme is on, kept current.
 *
 * The charts took this from useLocalStorage('color-theme'), which reads the
 * value once on mount and never hears the toggle -- each component holds its
 * own copy of that state, so flipping the theme somewhere else leaves a chart
 * with the wrong tooltip skin and the wrong gradient until something unrelated
 * re-renders it. The class on <html> is what actually changes, so watch that.
 */
export function useIsDark(): boolean {
  const read = () =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const [isDark, setIsDark] = useState(read);

  useEffect(() => {
    setIsDark(read());

    const observer = new MutationObserver(() => setIsDark(read()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
}

/**
 * The chart series palette, in order.
 *
 * Ordered so the first few are the furthest apart -- a two-series chart takes
 * the first two and gets the strongest separation available.
 */
export const CHART_SERIES = [
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'chart-6',
  'chart-7',
  'chart-8',
] as const;

/** The first `count` series colours, resolved. */
export const chartSeries = (count = CHART_SERIES.length): string[] =>
  CHART_SERIES.slice(0, count).map((name) => readToken(name));
