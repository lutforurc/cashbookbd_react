interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, checked, onChange }) => {
  return (
    <label className="flex items-center gap-1 cursor-pointer select-none">
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-10 h-5 bg-gray-300 rounded-full peer-checked:bg-blue-600 transition-colors"></div>
        <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transform peer-checked:translate-x-5 transition-transform"></div>
      </div>
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
    </label>
  );
};

export default ToggleSwitch;
