/**
 * The one place a form field's appearance is described.
 *
 * The app already routes almost every field through a shared component --
 * InputElement, DropdownCommon, InputDatePicker and a few siblings account for
 * some nine hundred call sites. What those components did not share was how
 * they looked: five of them, five different borders, three different dark
 * backgrounds, and padding that ranged from `p-1` to `py-2`. A password box
 * sat beside a text box in a visibly different grey.
 *
 * They all read from here now, so a change to the field look is a change to
 * this file. Colour still comes from tokens.css underneath -- these are class
 * names, and every colour class resolves to a variable there.
 */

/**
 * Border, background, text, focus and disabled — everything except size.
 *
 * These are InputElement's classes, because it carries the most call sites by
 * far; the other components adopt them, which is the point. The one addition is
 * the disabled state: fields could be disabled before and looked exactly like
 * live ones.
 */
export const FIELD_BASE = [
  'form-input rounded-xs border outline-none transition',
  'bg-white text-gray-700 placeholder-gray-400',
  'dark:bg-boxdark dark:border-gray-600 dark:text-white dark:placeholder-gray-500',
  'focus:outline-none focus:border-blue-500 dark:focus:border-blue-400',
  'disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500',
  'dark:disabled:bg-form-input dark:disabled:text-bodydark2',
].join(' ');

/** The default box: what a field measures when nobody asks for a size. */
export const FIELD_PADDING = 'px-3 py-1';

/**
 * Named heights.
 *
 * Call sites had been reaching for `h-8.5`, `h-9`, `h-9.5` and `h-10` in
 * roughly equal numbers -- four heights for the same kind of field, chosen a
 * screen at a time. These are those four, named, so a screen asks for a size
 * rather than a measurement.
 *
 * Nothing is applied unless asked for: the default stays exactly what the app
 * rendered before this file existed.
 */
export const FIELD_SIZE = {
  xs: 'h-8 px-2 py-0.5 text-xs',
  sm: 'h-8.5 px-3 py-1 text-sm',
  md: 'h-9.5 px-3 py-1',
  lg: 'h-10 px-3 py-2',
} as const;

export type FieldSize = keyof typeof FIELD_SIZE;

/**
 * The class list for a field.
 *
 * `extra` lands last so a caller can still override -- a width, an alignment,
 * an occasional `!important`. What it should no longer need to override is the
 * border, the background or the focus ring.
 */
export const fieldClass = (size?: FieldSize, extra = ''): string =>
  [FIELD_BASE, size ? FIELD_SIZE[size] : FIELD_PADDING, extra].filter(Boolean).join(' ');

/**
 * A field that sits inside a table cell, where a white box on every row would
 * turn the grid into a wall of boxes. A deliberate difference, so it is named
 * here rather than being one more component's private opinion.
 */
export const FIELD_TRANSPARENT = 'bg-transparent dark:bg-transparent';

/**
 * The kinds that are not text boxes.
 *
 * A checkbox, a file picker and a colour swatch have nothing to gain from
 * looking like a text field, but they still need somewhere central to be
 * described -- otherwise the next one written gets its own opinion, which is
 * how the six text components ended up with six different borders.
 */

/**
 * Multi-line text: the same box, with room to breathe.
 *
 * Padding is deliberately absent. Tailwind resolves competing utilities by
 * their order in the stylesheet, not their order in the class attribute, so a
 * padding baked in here would silently beat the `py-1` a caller wrote — and
 * every textarea in the app already states its own.
 */
export const FIELD_TEXTAREA = `${FIELD_BASE} leading-relaxed`;

/**
 * A native select. Same box, plus room on the right for the arrow the browser
 * draws and the chevron some screens overlay on top of it.
 */
export const FIELD_SELECT = `${FIELD_BASE} px-3 py-1 pr-8 appearance-none`;

/** A tick box. Sized to the text beside it rather than to a form row. */
export const FIELD_CHECKBOX = [
  'h-4 w-4 shrink-0 cursor-pointer rounded-xs',
  'border border-gray-300 bg-white text-primary',
  'dark:border-gray-600 dark:bg-boxdark',
  'focus:outline-none focus:ring-1 focus:ring-blue-500',
  'disabled:cursor-not-allowed disabled:opacity-60',
].join(' ');

/**
 * A switch: the track it slides along and the knob that slides.
 *
 * Described here rather than inside the component for the same reason as
 * everything else in this file -- the next switch someone writes should be able
 * to look like this one without copying it.
 *
 * The track carries the state colour and the focus ring (driven by the hidden
 * checkbox beside it); the knob only moves.
 */
export const SWITCH_TRACK = [
  'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full',
  'transition-colors duration-200',
  'peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500/40',
  'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',
].join(' ');

export const SWITCH_TRACK_ON = 'bg-primary';
export const SWITCH_TRACK_OFF = 'bg-gray-300 dark:bg-gray-600';

export const SWITCH_KNOB = [
  'pointer-events-none absolute left-0.5 h-4 w-4 rounded-full bg-white shadow-sm',
  'transition-transform duration-200',
].join(' ');

/** A file picker, whose button the browser draws and `file:` restyles. */
export const FIELD_FILE = [
  FIELD_BASE,
  'px-3 py-1.5 cursor-pointer',
  'file:mr-3 file:rounded-xs file:border file:border-gray-300 file:bg-gray-100',
  'file:px-2.5 file:py-1 file:text-sm file:text-gray-700 file:cursor-pointer',
  'dark:file:border-gray-600 dark:file:bg-form-input dark:file:text-white',
].join(' ');

/** The label above a field. */
export const FIELD_LABEL = 'text-black dark:text-white';

/** The line under a field explaining what it is for. */
export const FIELD_HELP = 'mt-0.5 text-xs leading-snug text-gray-500 dark:text-gray-400';

/**
 * The tooltip a field can carry.
 *
 * Only InputElement offers one today, but it is described here so a second
 * component adding one does not invent a different bubble.
 */
export const FIELD_TOOLTIP = [
  'pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max max-w-56 -translate-x-1/2',
  'rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700',
  'opacity-0 shadow-lg transition-opacity duration-150',
  'group-hover:opacity-100 group-focus-within:opacity-100',
  'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
].join(' ');
