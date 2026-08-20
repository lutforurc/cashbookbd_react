/**
 * The colours the software ships with, written down.
 *
 * These are the values in tokens.css -- the same numbers, in hex rather than
 * channels -- and they are here so the theme form has something to show, and
 * something to put back, without anyone having to know a colour code.
 *
 * A user who never opens this form is unaffected by all of it: an empty column
 * means "unchosen", the stylesheet's own value stands, and these are only ever
 * a starting point.
 *
 * Kept in step with tokens.css by hand. If a shipped colour changes there and
 * not here, the form will offer the old one as its default -- so change both,
 * and the check in the theme probe compares them.
 */

export type ThemeDefault = { light: string; dark: string };

/**
 * Most colours are the same in both modes -- a green that means "paid" means it
 * on either screen. The furniture is where they part: white against near-black.
 */
export const THEME_DEFAULTS: Record<string, ThemeDefault> = {
  primary_color: { light: '#2B5FD9', dark: '#2B5FD9' },
  secondary_color: { light: '#7FBEEA', dark: '#7FBEEA' },
  success_color: { light: '#17804C', dark: '#17804C' },
  danger_color: { light: '#CB3A4C', dark: '#CB3A4C' },
  warning_color: { light: '#F0A000', dark: '#F0A000' },
  info_color: { light: '#2E90E0', dark: '#2E90E0' },

  // Words. Near-black on a light screen; the softened white the dark screen
  // uses, because pure white on black bleeds at the edges.
  text_color: { light: '#1A2029', dark: '#E6EAF0' },

  // The quieter grey under it: help text, captions, the line explaining a field.
  text_secondary_color: { light: '#59636F', dark: '#A3ADB9' },

  // A card, a modal, the list a dropdown opens -- one step nearer than the page.
  card_color: { light: '#FFFFFF', dark: '#212932' },

  // The band across the top of a table.
  table_header_color: { light: '#CBD3DE', dark: '#2F3844' },

  // The rows under the head.
  table_body_color: { light: '#FFFFFF', dark: '#212932' },

  // The line around things. A field's own edge is a step stronger and follows
  // this when it is set -- see userTheme.
  border_color: { light: '#E1E7EE', dark: '#2F3844' },

  sidebar_color: { light: '#FFFFFF', dark: '#212932' },
  header_color: { light: '#FFFFFF', dark: '#212932' },
  page_bg_color: { light: '#F4F7FA', dark: '#171D25' },

  // The eight chart series in order, as one string each -- the same shape the
  // field takes and the column stores.
  chart_palette: {
    light: '#2B5FD9, #12A66E, #E08A0C, #CB3A4C, #7C5CE0, #12A2C4, #D9527E, #6E7885',
    dark: '#5B8DEF, #34D399, #FBBF24, #F87171, #A78BFA, #22D3EE, #F472B6, #9CA3AF',
  },
};

/** Paper has no dark mode, so this one is a single value. */
export const PRINT_COLOR_DEFAULT = '#0B0E12';

/** The sizes, in pixels, as the software ships. */
export const CONTROL_HEIGHT_DEFAULT = '34';
export const CONTROL_RADIUS_DEFAULT = '0';

/**
 * Every field filled in with what the software ships.
 *
 * This is what the "Use default colors" button writes. It exists for the person
 * who does not think in hex: rather than facing empty boxes, they get the
 * working palette in front of them and can nudge one colour at a time, seeing
 * what each does.
 *
 * Saving this is not the same as saving nothing. It records today's palette as
 * that user's own choice, which is exactly what someone wanting to edit from a
 * known starting point means to do; "Clear all" is the other button, and that
 * is the one that hands the colours back to the software.
 */
export const defaultThemeValues = (): Record<string, string> => {
  const values: Record<string, string> = {};

  Object.entries(THEME_DEFAULTS).forEach(([name, pair]) => {
    values[`theme_${name}_light`] = pair.light;
    values[`theme_${name}_dark`] = pair.dark;
  });

  values.theme_print_color = PRINT_COLOR_DEFAULT;
  values.theme_control_height = CONTROL_HEIGHT_DEFAULT;
  values.theme_control_radius = CONTROL_RADIUS_DEFAULT;

  return values;
};

/** Every field emptied -- which hands each colour back to the stylesheet. */
export const clearedThemeValues = (): Record<string, string> => {
  const values: Record<string, string> = {};

  Object.keys(defaultThemeValues()).forEach((key) => {
    values[key] = '';
  });
  values.theme_mode = '';

  return values;
};
