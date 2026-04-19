interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  preserveCheckedColorWhenDisabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  label,
  checked,
  onChange,
  disabled = false,
  preserveCheckedColorWhenDisabled = false,
}) => {
  const trackClass = preserveCheckedColorWhenDisabled
    ? 'w-10 h-5 bg-gray-300 rounded-full peer-checked:bg-blue-600 transition-colors'
    : 'w-10 h-5 bg-gray-300 rounded-full peer-checked:bg-blue-600 peer-disabled:bg-gray-400 transition-colors';

  return (
    <label
      className={`inline-flex max-w-full flex-nowrap items-center gap-2 select-none ${disabled ? 'cursor-not-allowed pointer-events-none opacity-80' : 'cursor-pointer'}`}
      aria-disabled={disabled}
    >
      <div className="relative shrink-0">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => {
            if (disabled) return;
            onChange(e.target.checked);
          }}
          className="sr-only peer"
        />
        <div className={trackClass}></div>
        <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transform peer-checked:translate-x-5 transition-transform"></div>
      </div>
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
    </label>
  );
};

export default ToggleSwitch;
