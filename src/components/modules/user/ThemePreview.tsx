import React from 'react';
import { FiCheckSquare, FiPrinter, FiTrash2 } from 'react-icons/fi';
import { hexToChannels, PER_MODE_VARS } from '../../../theme/userTheme';
import { THEME_DEFAULTS } from '../../../theme/themeDefaults';

/**
 * What the chosen colours look like, before anybody saves them.
 *
 * The form asks for two colours per row -- one for the light screen, one for
 * the dark -- and a person can only be looking at one of those screens. So the
 * dark values were being chosen blind: type a hex, save, switch mode, look,
 * switch back. This shows both at once.
 *
 * It paints nothing outside itself. CSS variables cascade, so the colours are
 * written as inline style on each panel's own wrapper and reach only what is
 * inside it -- which matters here more than it usually would, because this form
 * is mostly used by an administrator setting up somebody else's account. Their
 * own screen should not turn somebody else's colours while they work.
 *
 * The dark panel carries `class="dark"`, which is what the `dark:` variants in
 * every component below are looking for, so the same markup renders both ways.
 */

type Values = Record<string, string | undefined>;

/**
 * A field's edge, which has no control of its own: it follows the border
 * colour, and ships a step stronger than a card's on a dark screen.
 */
const BORDER_STRONG = { light: '#E1E7EE', dark: '#46505B' };

/**
 * One mode's colours, as CSS variables.
 *
 * Every variable is written, not just the chosen ones. That is the difference
 * between this panel and the page around it: the page gets its dark values from
 * `html.dark` in tokens.css, and a `class="dark"` on a div inside a light page
 * does not reach those -- it switches Tailwind's `dark:` variants and nothing
 * else. So the panel states the whole palette, taking the shipped colour of
 * that mode wherever the user has not chosen one.
 *
 * The list itself is the theme's own, so a colour added there shows up here
 * without a second edit.
 */
const varsFor = (values: Values, mode: 'light' | 'dark'): React.CSSProperties => {
  const style: Record<string, string> = {};

  PER_MODE_VARS.forEach(([name, variable]) => {
    const chosen = values[`theme_${name}_${mode}`];
    const channels = hexToChannels(chosen || THEME_DEFAULTS[name]?.[mode]);
    if (!channels) return;

    style[variable] = channels;

    // And the Tailwind name built on it. `--color-primary: rgb(var(--c-primary))`
    // is declared at :root, and a custom property is substituted where it is
    // declared -- so `bg-primary` inside this panel would keep resolving to the
    // root's blue however the channels are overridden here. Writing the derived
    // name too is what makes a button in the preview take the chosen colour.
    style[variable.replace(/^--c-/, '--color-')] = `rgb(${channels})`;
  });

  const border = values[`theme_border_color_${mode}`];
  const strong = hexToChannels(border) || (hexToChannels(BORDER_STRONG[mode]) as string);
  style['--c-border-strong'] = strong;
  style['--color-border-strong'] = `rgb(${strong})`;

  return style as React.CSSProperties;
};

/** One panel: a corner of the software, painted in one mode's colours. */
const Panel: React.FC<{ mode: 'light' | 'dark'; values: Values }> = ({ mode, values }) => (
  <div
    className={mode === 'dark' ? 'dark' : undefined}
    style={{ ...varsFor(values, mode), backgroundColor: 'rgb(var(--c-page))' }}
  >
    <div className="flex gap-3 p-3">
      {/* the sidebar, with the row you are on */}
      <div className="w-28 shrink-0" style={{ backgroundColor: 'rgb(var(--c-sidebar))' }}>
        <div className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--c-text-muted))]">
          Reports
        </div>
        <div className="relative px-2 py-1 text-xs text-[rgb(var(--c-text))]">Cash Book</div>
        <div className="relative bg-primary/10 px-2 py-1 text-xs font-semibold text-primary before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-primary dark:bg-primary/25 dark:text-[rgb(var(--c-text))]">
          Bank Book
        </div>
        <div className="relative px-2 py-1 text-xs text-[rgb(var(--c-text))]">Profit Loss</div>
      </div>

      {/* the work: a card, a field, the buttons and a table */}
      <div className="min-w-0 flex-1 border border-[rgb(var(--c-border))] p-3" style={{ backgroundColor: 'rgb(var(--c-surface))' }}>
        <p className="text-sm font-semibold text-[rgb(var(--c-text))]">Bank Received</p>
        <p className="mb-2 text-[11px] text-[rgb(var(--c-text-muted))]">
          The quieter line under a heading.
        </p>

        <input
          readOnly
          value="A field"
          className="mb-2 h-[var(--control-height)] w-full rounded-[var(--control-radius)] border border-[rgb(var(--c-border-strong))] px-2 text-xs text-[rgb(var(--c-text))]"
          style={{ backgroundColor: 'rgb(var(--c-surface))' }}
        />

        <div className="mb-2 flex flex-wrap gap-1.5">
          {[
            { label: 'Save', className: 'bg-primary', icon: <FiCheckSquare /> },
            { label: 'Delete', className: 'bg-danger', icon: <FiTrash2 /> },
            { label: 'Approved', className: 'bg-success', icon: null },
            { label: 'Careful', className: 'bg-warning', icon: null },
            { label: 'Print', className: 'bg-meta-5', icon: <FiPrinter /> },
          ].map((b) => (
            <span
              key={b.label}
              className={`inline-flex h-[var(--control-height)] items-center gap-1 rounded-[var(--control-radius)] px-2 text-[11px] font-semibold text-white ${b.className}`}
            >
              {b.icon}
              {b.label}
            </span>
          ))}
        </div>

        <table className="w-full text-[11px]">
          <thead style={{ backgroundColor: 'rgb(var(--c-table-head))' }}>
            <tr className="text-[rgb(var(--c-text))]">
              <th className="border border-[rgb(var(--c-border))] px-1.5 py-1 text-left font-semibold">Description</th>
              <th className="border border-[rgb(var(--c-border))] px-1.5 py-1 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody style={{ backgroundColor: 'rgb(var(--c-table-body))' }}>
            {[['Opening', '12,000'], ['Received', '3,500']].map(([a, b]) => (
              <tr key={a} className="text-[rgb(var(--c-text))]">
                <td className="border border-[rgb(var(--c-border))] px-1.5 py-1">{a}</td>
                <td className="border border-[rgb(var(--c-border))] px-1.5 py-1 text-right">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const ThemePreview: React.FC<{ values: Values }> = ({ values }) => (
  <div className="mt-3">
    <p className="mb-1.5 text-xs text-gray-500 dark:text-gray-400">
      A corner of the software in these colours, both modes at once. Nothing here
      is saved, and nothing outside this box changes.
    </p>
    <div className="grid grid-cols-1 gap-3 overflow-hidden border border-gray-200 md:grid-cols-2 dark:border-gray-700">
      <div>
        <p className="bg-gray-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          Light mode
        </p>
        <Panel mode="light" values={values} />
      </div>
      <div>
        <p className="bg-gray-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          Dark mode
        </p>
        <Panel mode="dark" values={values} />
      </div>
    </div>
  </div>
);

export default ThemePreview;
