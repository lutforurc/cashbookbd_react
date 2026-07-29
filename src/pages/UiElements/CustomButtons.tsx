import React from 'react';
import { FiArrowRightCircle, FiCheck, FiPrinter } from 'react-icons/fi';

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
}
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
      className={`text-white bg-gray-700 hover:bg-blue-400 focus:outline-none font-medium ${textClass} ${paddingClass} text-center dark:hover:bg-blue-400 focus:bg-blue-400 inline-flex justify-center items-center ${className}`}
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
};

export const PrintButton: React.FC<PrintButtonProps> = ({
  label = '',
  onClick = () => { },
  className = '',
  type = 'button',
  disabled = false,
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`text-white bg-gray-700 hover:bg-blue-400 focus:outline-none font-medium text-sm px-5 text-center dark:hover:bg-blue-400 focus:bg-blue-400 inline-flex justify-center items-center
                  disabled:cursor-not-allowed
                  ${className}`}
    >
      <span className="mr-2 inline-flex items-center"><FiPrinter /></span>
      {label}
    </button>
  );
};

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
