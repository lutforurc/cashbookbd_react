/**
 * The one place a button's appearance is described.
 *
 * The shared buttons had grown the same way the fields did: ButtonLoading is
 * grey turning blue, ButtonSuccess is a different blue with a different radius,
 * and DeleteButton carries no colour at all -- it relies on every call site
 * passing one, which is why a confirm button once shipped colourless.
 *
 * Screens that wanted something else reached for `!important` to beat the base
 * class. The Sign In button did exactly that: `bg-primary! hover:bg-primary/90!`
 * bolted onto a grey button. A named variant is what it actually wanted.
 *
 * Colour comes from tokens.css underneath -- these are class names, and every
 * colour class resolves to a variable there.
 */
import { FIELD_HEIGHT } from './fieldStyles';


/**
 * How tall a button stands.
 *
 * The field's height, read from the field's own file rather than copied here,
 * because a button and the box beside it are only ever right together. Nothing
 * decided the height before this: `py-2` in thirty-seven places, `py-1.5` in
 * seventeen, `h-10` in a couple of hundred more -- so a Save button and the
 * amount box it sat against were routinely six pixels apart.
 *
 * A button that genuinely has to be shorter -- the ones inside a table row --
 * says so with `!`, which is what ROW_ACTION_BUTTON_CLASS does.
 */
export const BUTTON_HEIGHT = FIELD_HEIGHT;

/** Layout, typography and focus. Everything a button has regardless of colour. */
export const BUTTON_BASE = [
  // semibold, not medium. A light label on a dark fill renders thinner than the
  // same weight does dark-on-light -- the same bleed that makes pure white hard
  // on the eyes in dark mode -- and at 14px that reads as grey rather than
  // white. The extra weight is what makes it look like the colour it is.
  'inline-flex items-center justify-center text-center font-semibold',
  BUTTON_HEIGHT,
  'transition-colors focus:outline-none',
  'disabled:cursor-not-allowed disabled:opacity-60',
].join(' ');

/**
 * What a button is for, said in colour.
 *
 * `default` is the app's workhorse and is deliberately unchanged -- it is what
 * Save, Reload, Search and a few hundred others already look like, and this
 * file is not the place to restyle them.
 */
export const BUTTON_VARIANT = {
  /** The ordinary action: grey until you reach for it. */
  // White label throughout -- dark text on the hover blue was tried and read
  // as a different button, not a pressed one.
  //
  // focus-visible, not focus: a button keeps focus after it is clicked, so with
  // plain focus the blue stayed on Apply until something else was clicked --
  // the button sat in its reached-for colour long after it had been reached
  // for. focus-visible is the keyboard's focus, which is who the highlight is
  // for; a mouse click now leaves the button as it found it.
  //
  // So the blue carries the readability instead. blue-400 is a pale blue and
  // white on it is 2.54:1, which is why Apply and Save went faint the moment
  // the pointer touched them and stayed faint after a click, since a clicked
  // button keeps focus. blue-600 is the same blue a shade deeper, and holds
  // the same white at 5.17:1.
  default: [
    'text-white bg-gray-700',
    'hover:bg-blue-600 focus-visible:bg-blue-600 dark:hover:bg-blue-600 dark:focus-visible:bg-blue-600',
  ].join(' '),

  /** The one action a screen is for -- Sign In, Save on a wizard's last step. */
  primary: 'text-white bg-primary hover:bg-primary/90 focus-visible:bg-primary/90',

  /** Something is finished or confirmed. */
  success: 'text-white bg-success hover:bg-success/90 focus-visible:bg-success/90',

  /** Something is removed, cancelled or withdrawn. */
  danger: 'text-white bg-danger hover:bg-danger/90 focus-visible:bg-danger/90',

  /**
   * Careful -- not wrong yet. Withdrawing an approval, forcing a recount:
   * things worth looking at twice without being told they are dangerous.
   *
   * Screens had been reaching for amber-600 by hand for exactly this, which put
   * the colour outside the palette -- so a user changing their warning colour
   * on the theme form changed every warning in the software except the buttons.
   */
  warning: 'text-white bg-warning hover:bg-warning/90 focus-visible:bg-warning/90',

  /** A quiet action beside a loud one -- Cancel next to Delete. */
  ghost:
    'text-body hover:bg-gray-100 focus-visible:bg-gray-100 dark:text-bodydark dark:hover:bg-meta-4 dark:focus-visible:bg-meta-4',
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANT;

/**
 * The class list for a button.
 *
 * `extra` lands last so a caller can still set a width, a radius or a margin.
 * What it should no longer need to set is the colour -- that is what naming the
 * variant is for.
 */
export const buttonClass = (variant: ButtonVariant = 'default', extra = ''): string =>
  [BUTTON_BASE, BUTTON_VARIANT[variant], extra].filter(Boolean).join(' ');
