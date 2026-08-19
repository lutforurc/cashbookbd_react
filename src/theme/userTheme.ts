import { useEffect, useState } from 'react';

/**
 * The colours and sizes a user picked for themselves.
 *
 * Kept per user rather than per branch, because this is taste rather than
 * policy: two people sharing a branch can want different things, and one of
 * them changing the brand colour should not repaint the other's screen. They
 * live in `user_theme_settings`, one row each, and arrive on the session user.
 *
 * Every colour comes in two, a light value and a dark one, and only the half
 * matching the mode on screen is written. One value could not serve both: the
 * sidebar is white on a light screen and near-black on a dark one, so a single
 * chosen colour would have painted the dark sidebar white.
 *
 * Nothing here paints anything itself. Each value moves a variable the
 * stylesheet is already reading, which is why one colour reaches the buttons,
 * the links, the active menu row and the charts at once.
 */

/** The colours stored once per mode, and the variable each one moves. */
const PER_MODE_VARS: Array<[string, string]> = [
  ['primary_color', '--c-primary'],
  ['secondary_color', '--c-secondary'],
  ['success_color', '--c-success'],
  ['danger_color', '--c-danger'],
  ['warning_color', '--c-warning'],
  // `info` has no token of its own -- the app has always said "a notice" with
  // meta-5 -- so that is what it moves.
  ['info_color', '--c-meta-5'],
  // What words are written in. It has a variable of its own -- see --c-text in
  // tokens.css -- because the token text used to borrow also painted card
  // backgrounds, so recolouring text repainted boxes with it.
  ['text_color', '--c-text'],
  // The quieter half: help text, captions, the line under a field. Separate
  // because darkening the headings rarely means darkening those too.
  ['text_secondary_color', '--c-text-muted'],
  ['sidebar_color', '--c-sidebar'],
  ['header_color', '--c-header'],
  ['page_bg_color', '--c-page'],
];

/**
 * Stored, not yet worn: nothing central draws a card or a table head, so
 * choosing one of these would change nothing. They are listed here so the next
 * person can see they were meant, not forgotten. Text used to be among them
 * until `text-black` and `dark:text-white` were swept onto --c-text.
 */
const NOT_WIRED_YET = ['card_color', 'table_header_color'];

export type UserTheme = Record<string, string | number | null | undefined>;

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
export const hexToChannels = (hex?: string | number | null): string | null => {
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

/** A size the user gave in pixels, or null if they gave nothing usable. */
const px = (value: unknown, min: number, max: number): string | null => {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? `${n}px` : null;
};

/** The chart palette, spread over the eight series variables in order. */
const applyChartPalette = (palette?: string | number | null) => {
  const colours = String(palette || '')
    .split(',')
    .map((c) => hexToChannels(c))
    .filter(Boolean) as string[];

  for (let i = 1; i <= 8; i += 1) {
    setVar(`--c-chart-${i}`, colours[i - 1] ?? null);
  }
};

/**
 * Write the user's choices onto the root element, in the mode given.
 *
 * A missing or unreadable value removes the override rather than writing a
 * blank, which puts the built-in colour back -- so clearing a box on the form
 * and saving really does return that colour to the one the software ships, and
 * switching to a mode the user never set a colour for shows the shipped
 * palette rather than the other mode's choices.
 */
export const applyUserTheme = (theme?: UserTheme | null, dark?: boolean): void => {
  if (typeof document === 'undefined') return;

  const isDark = dark ?? document.documentElement.classList.contains('dark');
  const suffix = isDark ? '_dark' : '_light';

  PER_MODE_VARS.forEach(([name, variable]) => {
    setVar(variable, hexToChannels(theme?.[`theme_${name}${suffix}`]));
  });

  applyChartPalette(theme?.[`theme_chart_palette${suffix}`]);

  // Paper has no dark mode: a report prints on white whichever screen it was
  // ordered from.
  setVar('--c-print-accent', hexToChannels(theme?.theme_print_color));

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
const applyDefaultMode = (mode?: string | number | null) => {
  if (mode !== 'light' && mode !== 'dark') return;
  if (sessionStorage.getItem('user-theme-mode-applied') === '1') return;

  sessionStorage.setItem('user-theme-mode-applied', '1');
  localStorage.setItem('color-theme', JSON.stringify(mode));
  document.documentElement.classList.toggle('dark', mode === 'dark');
};

/**
 * Whether the page is in dark mode, and again whenever that changes.
 *
 * The switch in the header adds and removes a class on <html>; there is no
 * event for it, so the class is watched. Without this the colours would be
 * right until someone flipped the switch and then be a mode behind.
 */
const useIsDarkMode = (): boolean => {
  const read = () =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const [dark, setDark] = useState(read);

  useEffect(() => {
    const observer = new MutationObserver(() => setDark(read()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return dark;
};

/**
 * Keep the page wearing what the signed-in user chose.
 *
 * Call it once, high up, with the user off the session settings. It reapplies
 * when those values change -- which is what makes the Save on the user form
 * show its result without a reload -- and when the mode changes, which is what
 * swaps the light half of their palette for the dark one.
 */
export const useUserTheme = (user?: UserTheme | null): void => {
  const dark = useIsDarkMode();

  // One string rather than thirty dependencies: the effect has to rerun when
  // any of them moves, and listing them all invites the next colour to be
  // forgotten.
  const signature = JSON.stringify(
    [...PER_MODE_VARS.map(([name]) => name), 'chart_palette']
      .flatMap((name) => [`theme_${name}_light`, `theme_${name}_dark`])
      .concat(['theme_print_color', 'theme_control_height', 'theme_control_radius', 'theme_mode'])
      .map((key) => user?.[key] ?? ''),
  );

  useEffect(() => {
    applyUserTheme(user, dark);
    applyDefaultMode(user?.theme_mode);
  }, [signature, dark]);
};

export { NOT_WIRED_YET, PER_MODE_VARS };
