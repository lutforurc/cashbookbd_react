import { useEffect } from 'react';

/**
 * The colours and sizes a user picked for themselves.
 *
 * Kept per user rather than per branch, because this is taste rather than
 * policy: two people sharing a branch can want different things, and one of
 * them changing the brand colour should not repaint the other's screen. They
 * live in `user_theme_settings`, one row each, and arrive on the session user.
 *
 * Nothing here paints anything itself. Every value moves a variable the
 * stylesheet is already reading, which is why one colour reaches the buttons,
 * the links, the active menu row and the charts at once.
 */
export type UserTheme = {
  theme_primary_color?: string | null;
  theme_secondary_color?: string | null;
  theme_success_color?: string | null;
  theme_danger_color?: string | null;
  theme_warning_color?: string | null;
  theme_info_color?: string | null;
  theme_sidebar_color?: string | null;
  theme_header_color?: string | null;
  theme_page_bg_color?: string | null;
  theme_print_color?: string | null;
  /** Stored, not yet worn: cards and tables are still described screen by screen. */
  theme_card_color?: string | null;
  theme_table_header_color?: string | null;
  theme_text_color?: string | null;
  /** The chart series in order, as comma-separated hex. */
  theme_chart_palette?: string | null;
  theme_mode?: string | null;
  theme_control_height?: string | number | null;
  theme_control_radius?: string | number | null;
};

/**
 * `#2B5FD9` -> `43 95 217`.
 *
 * tokens.css holds channels rather than colours, which is what lets
 * `bg-primary/10` keep working -- Tailwind writes the alpha in itself. A hex
 * value handed straight to the variable would break every one of those.
 *
 * Returns null for anything that is not a six or three digit hex, so a stray
 * value in the database leaves the built-in colour standing rather than
 * blanking the screen.
 */
export const hexToChannels = (hex?: string | null): string | null => {
  if (!hex) return null;
  const v = String(hex).trim().replace(/^#/, '');
  const full = v.length === 3 ? v.split('').map((c) => c + c).join('') : v;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

const setVar = (name: string, value: string | null) => {
  const root = document.documentElement;
  if (value) root.style.setProperty(name, value);
  else root.style.removeProperty(name);
};

/**
 * Which chosen colour moves which variable.
 *
 * `info` has no token of its own -- the app has always said "a notice" with
 * meta-5 -- so that is what it moves. The three at the end have no entry
 * because nothing central draws a card, a table head or body text yet; they
 * are stored against the day those are brought together, and until then
 * choosing one changes nothing. Better an empty column than a control that
 * lies about what it does.
 */
const COLOR_VARS: Array<[keyof UserTheme, string]> = [
  ['theme_primary_color', '--c-primary'],
  ['theme_secondary_color', '--c-secondary'],
  ['theme_success_color', '--c-success'],
  ['theme_danger_color', '--c-danger'],
  ['theme_warning_color', '--c-warning'],
  ['theme_info_color', '--c-meta-5'],
  ['theme_sidebar_color', '--c-sidebar'],
  ['theme_header_color', '--c-header'],
  ['theme_page_bg_color', '--c-whiten'],
  ['theme_print_color', '--c-print-accent'],
];

/** The chart palette, spread over the eight series variables in order. */
const applyChartPalette = (palette?: string | null) => {
  const colours = String(palette || '')
    .split(',')
    .map((c) => hexToChannels(c))
    .filter(Boolean) as string[];

  for (let i = 1; i <= 8; i += 1) {
    setVar(`--c-chart-${i}`, colours[i - 1] ?? null);
  }
};

/** A size the user gave in pixels, or null if they gave nothing usable. */
const px = (value: unknown, min: number, max: number): string | null => {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? `${n}px` : null;
};

/**
 * Write the user's choices onto the root element.
 *
 * A missing or unreadable value removes the override rather than writing a
 * blank, which puts the built-in colour back -- so clearing a box on the form
 * and saving really does return that colour to the one the software ships.
 */
export const applyUserTheme = (theme?: UserTheme | null): void => {
  if (typeof document === 'undefined') return;

  COLOR_VARS.forEach(([field, variable]) => {
    setVar(variable, hexToChannels(theme?.[field] as string | undefined));
  });

  applyChartPalette(theme?.theme_chart_palette);

  // Nothing below 24px holds a 14px label, and past 56 a form row stops
  // reading as one. The radius is capped where a 34px box turns into a pill.
  setVar('--control-height', px(theme?.theme_control_height, 24, 56));
  setVar('--control-radius', px(theme?.theme_control_radius, 0, 20));
};

/**
 * The mode is applied once a session, not on every render.
 *
 * It is the mode this user *opens* in -- so switching to dark from the header
 * has to survive the next screen, and the next reload of that screen, without
 * this dragging it back. sessionStorage is exactly that memory: gone when the
 * browser tab is, which is when "opens in" starts meaning something again.
 */
const applyDefaultMode = (mode?: string | null) => {
  if (mode !== 'light' && mode !== 'dark') return;
  if (sessionStorage.getItem('user-theme-mode-applied') === '1') return;

  sessionStorage.setItem('user-theme-mode-applied', '1');
  localStorage.setItem('color-theme', JSON.stringify(mode));
  document.documentElement.classList.toggle('dark', mode === 'dark');
};

/**
 * Keep the page wearing what the signed-in user chose.
 *
 * Call it once, high up, with the user off the session settings. It reapplies
 * whenever those values change -- which is what makes the Save on the user form
 * show its result without a reload.
 */
export const useUserTheme = (user?: UserTheme | null): void => {
  // One string rather than seventeen dependencies: the effect has to rerun when
  // any of them moves, and listing them all invites the next colour to be
  // forgotten.
  const signature = JSON.stringify([
    ...COLOR_VARS.map(([field]) => user?.[field] ?? ''),
    user?.theme_chart_palette ?? '',
    user?.theme_control_height ?? '',
    user?.theme_control_radius ?? '',
    user?.theme_mode ?? '',
  ]);

  useEffect(() => {
    applyUserTheme(user);
    applyDefaultMode(user?.theme_mode);
  }, [signature]);
};
