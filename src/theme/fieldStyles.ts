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
/**
 * How tall a field stands.
 *
 * One number, because the screens had thirteen: h-10 in a hundred and sixty
 * places, h-9 in ninety-eight, h-8.5 in seventy-two, and a tail of h-[2.1rem],
 * h-[2.20rem], h-[2.4rem] chosen a screen at a time. Two fields side by side
 * were routinely a few pixels apart, and there was nowhere to say what a field
 * should measure.
 *
 * h-10 because it is what most of them already were, and what the toolbar
 * buttons beside them are -- so a filter row lines up without anyone arranging
 * it. A field that genuinely needs another size asks for one through `size`.
 */
export const FIELD_HEIGHT = 'h-10';

const FIELD_SURFACE = [
  // `form-input rounded-xs` stood here and rendered nothing: the forms plugin is
  // not installed (`plugins: []`), and `rounded-xs` is a Tailwind v4 name in a
  // v3.4 project -- neither emits a single rule. Fields have therefore always
  // been square, and `rounded-none` is that, said out loud. A caller asking for
  // `rounded-sm` still wins, because tailwind emits the radii in that order.
  'rounded-none border outline-none transition',
  'bg-white text-gray-700 placeholder-gray-400',
  'dark:bg-boxdark dark:border-gray-600 dark:text-white dark:placeholder-gray-500',
  'focus:outline-none focus:border-blue-500 dark:focus:border-blue-400',
  'disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500',
  'dark:disabled:bg-form-input dark:disabled:text-bodydark2',
].join(' ');

/**
 * A single-line field: the surface, standing at the one height.
 *
 * The height lives here rather than at the call sites because the call sites
 * had thirteen opinions between them. Everything that draws a one-line field
 * reads this -- InputElement through fieldClass, and the screens that reach for
 * FIELD_BASE or FIELD_SELECT directly -- so they all come out level.
 */
export const FIELD_BASE = `${FIELD_SURFACE} ${FIELD_HEIGHT}`;

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
  xs: 'h-8! px-2 py-0.5 text-xs',
  sm: 'h-8.5! px-3 py-1 text-sm',
  md: 'h-9.5! px-3 py-1',
  lg: 'h-10! px-3 py-2',
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
  [FIELD_BASE, size ? FIELD_SIZE[size] : FIELD_PADDING, extra]
    .filter(Boolean)
    .join(' ');

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
export const FIELD_TEXTAREA = `${FIELD_SURFACE} leading-relaxed`;

/**
 * A native select.
 *
 * Padding is absent for the same reason it is absent from the textarea: the
 * fifty-odd selects in the app each state their own, and one baked in here
 * would quietly win. `appearance-none` is absent too -- it hides the arrow the
 * browser draws, which is the right thing only for the handful of screens that
 * draw their own. Those ask for FIELD_SELECT_ARROW.
 *
 * The dark background is worth more here than it looks. A select left on
 * `dark:bg-transparent` -- which several were -- drops its option list back to
 * the browser default, so the list opens white while the closed field is dark.
 */
export const FIELD_SELECT = `${FIELD_BASE} cursor-pointer`;

/** A select whose native arrow is hidden because the screen overlays its own. */
export const FIELD_SELECT_ARROW = `${FIELD_SELECT} appearance-none pr-8`;

/**
 * An option inside a select.
 *
 * The browser draws the open list itself and does not always inherit the
 * select's background, so the dark colour has to be stated on the option too.
 * Screens had been repeating `dark:bg-boxdark` by hand for exactly this.
 */
export const FIELD_OPTION = 'dark:bg-boxdark dark:text-white';

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

/**
 * The button the browser draws inside a file input, which `file:` restyles.
 *
 * Separate from the box around it because the two are wanted apart: a picker
 * sitting beside a photo preview wants the button and no box, while one on its
 * own line wants both. PhotoInput already had this button in brand blue and it
 * reads better than a grey one, so that is the version kept.
 */
export const FIELD_FILE_BUTTON = [
  'cursor-pointer file:cursor-pointer',
  'file:mr-3 file:rounded-xs file:border-0 file:bg-primary',
  'file:px-3 file:py-1 file:text-sm file:text-white',
  // `file:hover:`, not `hover:file:` -- the second order compiles to nothing.
  'file:hover:bg-primary/90',
].join(' ');

/** A file picker on its own line: the button, in the same box as a text field. */
export const FIELD_FILE = `${FIELD_BASE} px-3 py-1.5 ${FIELD_FILE_BUTTON}`;

/** The label above a field. */
export const FIELD_LABEL = 'text-black dark:text-white';

/** The line under a field explaining what it is for. */
export const FIELD_HELP = 'mt-0.5 text-xs leading-snug text-gray-500 dark:text-gray-400';

/**
 * The tooltip a field can carry.
 *
 * Look only -- no position. The bubble is drawn into the body and placed by
 * InputElement from the field's measured position on screen, so that a field
 * inside a strip that scrolls (a toolbar, say) does not earn the strip a
 * scrollbar the moment the bubble hangs past its edge.
 *
 * Only InputElement offers one today, but it is described here so a second
 * component adding one does not invent a different bubble.
 */
export const FIELD_TOOLTIP = [
  'pointer-events-none w-max max-w-xs rounded-lg border bg-white',
  // Deep enough to read as a drawn edge rather than the ghost of one, and the
  // same weight in both themes -- a hairline that shows on white disappears on
  // a dark panel, which is how a bubble ends up looking borderless there.
  'border-slate-400 dark:border-slate-500',
  'px-3.5 py-2.5 text-sm font-medium leading-snug text-slate-700 shadow-lg',
  'dark:bg-slate-900 dark:text-slate-100',
].join(' ');

/**
 * The little arrow tying the bubble to the field it explains.
 *
 * A square turned on its corner, with the two edges that show given the
 * bubble's own border -- so it reads as one shape with the bubble rather than
 * a diamond parked beside it.
 */
const FIELD_TOOLTIP_CARET = [
  'absolute h-2.5 w-2.5 rotate-45 bg-white border-slate-400',
  'dark:bg-slate-900 dark:border-slate-500',
].join(' ');

/** Pointing up, for a bubble beneath the field. */
export const FIELD_TOOLTIP_CARET_UP = `${FIELD_TOOLTIP_CARET} top-[-6px] left-1/2 ml-[-5px] border-l border-t`;

/** Pointing right, for a bubble to the left of the field. */
export const FIELD_TOOLTIP_CARET_RIGHT = `${FIELD_TOOLTIP_CARET} right-[-6px] top-1/2 mt-[-5px] border-r border-t`;
