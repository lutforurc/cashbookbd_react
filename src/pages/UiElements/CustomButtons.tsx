import React from 'react';

// Define the props for the Button component
interface ButtonProps {
  id?: string;
  name?: string;
  label: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  buttonLoading?: boolean;
  icon?: React.ReactNode;
  onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void; // ✅ FIXED
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
}) => {
  label = label || '';
  return (
    <button
      id={id}
      name={name}
      type={type}
      onClick={onClick}
      disabled={disabled}
      onKeyDown={onKeyDown}
      className={`text-white bg-gray-700 hover:bg-blue-400 focus:outline-none font-medium text-sm px-5 text-center dark:hover:bg-blue-400 focus:bg-blue-400 inline-flex justify-center items-center ${className}`}
    >
      <span className="flex items-center">
        {buttonLoading ? (
          <>
            <Spinner />
            {label}
          </>
        ) : (
          <>
            {icon}
            {label}
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
  label?: string;  // optional
  onClick?: (() => void) | React.MouseEventHandler<HTMLButtonElement>; // flexible
  className?: string; // optional
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
};


export const PrintButton: React.FC<PrintButtonProps> = ({
  label = '',
  onClick = () => {},
  className = '',
  type = 'button',
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`text-white bg-gray-700 hover:bg-blue-400 focus:outline-none font-medium text-sm px-5 text-center dark:hover:bg-blue-400 focus:bg-blue-400 inline-flex justify-center items-center
                  ${className}`}
    >
      🖨️ {label}
    </button>
  );
};



const Spinner = () => (
  <svg
  className="h-5 w-5 animate-spin text-white mr-2"
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