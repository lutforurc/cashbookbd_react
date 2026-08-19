import React from 'react';
import {
  SWITCH_KNOB,
  SWITCH_TRACK,
  SWITCH_TRACK_OFF,
  SWITCH_TRACK_ON,
} from '../../../theme/fieldStyles';
import { Input } from './FormControls';

interface ToggleSwitchProps {
  id?: string;
  name?: string;
  checked: boolean;
  /**
   * The native change event, not a boolean.
   *
   * Deliberate: the forms in this app hand one `handleChange` to every field
   * and read `event.target.name`. A switch that reported a bare boolean would
   * be the one control that needed its own handler.
   */
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  labelClassName?: string;
}

/**
 * An on/off switch.
 *
 * A real checkbox underneath, hidden but not removed -- it keeps the keyboard
 * behaviour, the form semantics and the screen-reader announcement that a
 * div-with-onClick would have thrown away. What is drawn is a track and a knob
 * on top of it.
 *
 * Used first for "Remember me", where a bare checkbox rendered as a bright
 * white square that had nothing to do with the theme around it.
 */
const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  id,
  name,
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
  labelClassName = '',
}) => {
  return (
    <label
      htmlFor={id || name}
      className={`inline-flex cursor-pointer select-none items-center gap-2 ${
        disabled ? 'cursor-not-allowed opacity-60' : ''
      } ${className}`}
    >
      <Input
        type="checkbox"
        id={id || name}
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        role="switch"
        aria-checked={checked}
        className="peer sr-only"
      />

      <span className={`${SWITCH_TRACK} ${checked ? SWITCH_TRACK_ON : SWITCH_TRACK_OFF}`}>
        <span className={`${SWITCH_KNOB} ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </span>

      {label ? <span className={labelClassName}>{label}</span> : null}
    </label>
  );
};

export default ToggleSwitch;
