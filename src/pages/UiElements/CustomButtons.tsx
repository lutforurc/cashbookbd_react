import React from 'react';
import { FiArrowRightCircle, FiCheck, FiPrinter } from 'react-icons/fi';
import { BUTTON_BASE, BUTTON_VARIANT, ButtonVariant } from '../../theme/buttonStyles';

// Define the props for the Button component
interface ButtonProps {
  id?: string;
  name?: string;
  label?: string | number;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  buttonLoading?: boolean;
  icon?: React.ReactNode;
  onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void; // ✅ FIXED
  /**
   * Drops to the icon alone below xl. For button rows that sit in a half-width
   * column, where the labels stop fitting long before the screen is small.
   */
  responsiveLabel?: boolean;
  /**
   * A button inside a table row has to be shorter than one under a form. The
   * padding and the type size are chosen here rather than passed in through
   * className, because a px- utility handed to a button that already carries
   * one does not win -- tailwind decides that by its own order, not ours.
   */
  size?: 'sm' | 'md';
  /** Tooltip. Falls back to the label when the label itself is hidden. */
  title?: string;
  /**
   * What the button is for, said in colour: the ordinary action, the one the
   * screen exists for, or one that removes something.
   *
   * Left off, it stays the grey-turning-blue button the app is full of. Naming
   * it is what a screen should do instead of overriding the background with
   * `!important`, which is how the Sign In button used to get its brand blue.
   */
  variant?: ButtonVariant;
}
/**
 * One shape for a row of Save / Cancel / Delete buttons inside a table.
 *
 * The height is stated rather than left to the padding, so buttons carrying
 * different labels and icons cannot come out a pixel apart. The width is left
 * to the equal grid tracks they sit in -- pair this with `grid grid-cols-3`,
 * and keep a slot standing where a button is conditional, or the row shifts
 * sideways as that button comes and goes.
 */
export const ROW_ACTION_BUTTON_CLASS = 'h-7 w-full';

// Button component definition

export const ButtonLoading: React.FC<ButtonProps> = ({
  id,
  name,
  label,
  onClick,
  disabled = false,
  className = '',
  type = 'button',
  icon,
  onKeyDown,
  buttonLoading = false,
  responsiveLabel = false,
  size = 'md',
  title,
  variant = 'default',
}) => {
  const safeLabel = typeof label === 'string' || typeof label === 'number' ? String(label) : '';

  const resolvedIcon = icon ? icon : <FiArrowRightCircle className="h-5 w-5" />;
  const hasLabel = safeLabel.trim().length > 0;
  const isSmall = size === 'sm';

  // Without a label on show, the button only has to hold its icon — and the
  // name it lost is worth keeping as a tooltip.
  const paddingClass = isSmall
    ? (responsiveLabel ? 'px-1.5 xl:px-2 py-1' : 'px-2 py-1')
    : (responsiveLabel ? 'px-2 xl:px-5' : 'px-5');
  const textClass = isSmall ? 'text-xs' : 'text-sm';
  const labelClass = responsiveLabel ? 'hidden xl:inline' : '';
  const iconSpacing = hasLabel ? (responsiveLabel ? 'xl:mr-2' : 'mr-2') : '';

  return (
    <button
      id={id}
      name={name}
      type={type}
      onClick={onClick}
      disabled={disabled}
      onKeyDown={onKeyDown}
      title={title ?? (responsiveLabel && hasLabel ? safeLabel : undefined)}
      className={`${BUTTON_BASE} ${BUTTON_VARIANT[variant]} ${textClass} ${paddingClass} ${className}`}
    >
      <span className="flex items-center">
        {buttonLoading ? (
          <>
            <Spinner small={isSmall} />
            {hasLabel ? <span className={labelClass}>{safeLabel}</span> : null}
          </>
        ) : (
          <>
            <span className={`${iconSpacing} inline-flex items-center`}>{resolvedIcon}</span>
            {hasLabel ? <span className={labelClass}>{safeLabel}</span> : null}
          </>
        )}
      </span>
    </button>
  );
};

export const ButtonSuccess: React.FC<ButtonProps> = ({
  label,
  onClick,
  disabled = false,
  className = '',
  type = 'button',
  onKeyDown,
}) => {
  return (
    <>
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        onKeyDown={onKeyDown}
        className={`text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:bg-blue-400 font-medium rounded-lg text-sm px-5 py-1 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 inline-flex items-center ${className}`}
      >
        {label}
      </button>
    </>
  );
};

type PrintButtonProps = {
  label?: string; // optional
  onClick?: (() => void) | React.MouseEventHandler<HTMLButtonElement>; // flexible
  className?: string; // optional
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  /** Passed straight through to ButtonLoading -- see ButtonProps above. */
  size?: 'sm' | 'md';
  responsiveLabel?: boolean;
  title?: string;
};

/**
 * Print, drawn by ButtonLoading rather than beside it.
 *
 * This used to be its own copy of the same markup, and the copy had drifted.
 * The printer icon carried no size, so where every other button showed a 20px
 * icon this one showed a 1em icon that shrank with the type size. The label sat
 * as a bare text node instead of the span its neighbours wrap it in, which puts
 * it in the flex row as an anonymous item and lines it up by different rules.
 * And the size, responsive-label and tooltip behaviour that was added to
 * ButtonLoading never reached here, so Print stayed at full width on a narrow
 * screen while the buttons either side of it collapsed to their icons.
 *
 * Delegating settles all of it at once across the sixty-odd places this is
 * used, and leaves nothing to drift apart again.
 *
 * The opacity is the one thing added rather than inherited: Print is routinely
 * disabled until a report has data, and a cursor change alone left the button
 * looking ready when it was not.
 */
export const PrintButton: React.FC<PrintButtonProps> = ({
  label = '',
  onClick = () => { },
  className = '',
  type = 'button',
  disabled = false,
  size,
  responsiveLabel,
  title,
}) => (
  <ButtonLoading
    label={label}
    onClick={onClick}
    type={type}
    disabled={disabled}
    icon={<FiPrinter className="h-5 w-5" />}
    size={size}
    responsiveLabel={responsiveLabel}
    title={title}
    className={`disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
  />
);

interface DeleteButtonProps {
  label?: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export const DeleteButton: React.FC<DeleteButtonProps> = ({
  label = "Confirm",
  onClick,
  loading = false,
  disabled = false,
  className = "",
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`text-white focus:outline-none font-medium text-sm px-5 h-8 text-center rounded inline-flex items-center justify-center ${className}`}
    >
      <span className="flex items-center">
        {loading ? (
          <>
            <Spinner />
            {label}
          </>
        ) : (
          <>
            <FiCheck className="text-white text-lg mr-2" />
            {label}
          </>
        )}
      </span>
    </button>
  );
};


const Spinner = ({ small = false }: { small?: boolean }) => (
  <svg
    className={`${small ? 'h-3.5 w-3.5' : 'h-5 w-5'} animate-spin text-white mr-2`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-20"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-80"
      fill="currentColor"
      d="M12 2a10 10 0 00-3.95.81l1.5 3.28A6 6 0 0118 12h4a10 10 0 00-10-10z"
    />
  </svg>
);
