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

/** Layout, typography and focus. Everything a button has regardless of colour. */
export const BUTTON_BASE = [
  'inline-flex items-center justify-center text-center font-medium',
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
  // So the blue carries the readability instead. blue-400 is a pale blue and
  // white on it is 2.54:1, which is why Apply and Save went faint the moment
  // the pointer touched them and stayed faint after a click, since a clicked
  // button keeps focus. blue-600 is the same blue a shade deeper, and holds
  // the same white at 5.17:1.
  default: [
    'text-white bg-gray-700',
    'hover:bg-blue-600 focus:bg-blue-600 dark:hover:bg-blue-600 dark:focus:bg-blue-600',
  ].join(' '),

  /** The one action a screen is for -- Sign In, Save on a wizard's last step. */
  primary: 'text-white bg-primary hover:bg-primary/90 focus:bg-primary/90',

  /** Something is finished or confirmed. */
  success: 'text-white bg-success hover:bg-success/90 focus:bg-success/90',

  /** Something is removed, cancelled or withdrawn. */
  danger: 'text-white bg-danger hover:bg-danger/90 focus:bg-danger/90',

  /** A quiet action beside a loud one -- Cancel next to Delete. */
  ghost:
    'text-body hover:bg-gray-100 focus:bg-gray-100 dark:text-bodydark dark:hover:bg-meta-4 dark:focus:bg-meta-4',
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
