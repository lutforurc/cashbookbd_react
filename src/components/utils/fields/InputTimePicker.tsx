import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiClock, FiX } from 'react-icons/fi';
import { FIELD_BASE, FIELD_LABEL } from '../../../theme/fieldStyles';
import { Button } from '../../../pages/UiElements/CustomButtons';
import { Input } from './FormControls';

/**
 * A time field that opens a palette instead of the browser's own control.
 *
 * `<Input type="time">` is drawn by the browser, so it ignored the theme, sat
 * a different height from the fields beside it, and showed `--:-- --` with a
 * clock glyph nobody could restyle. Next to the date field on the same row --
 * which has been a themed picker all along -- the mismatch was the whole
 * complaint.
 *
 * Three columns rather than one long list. A flat list at one-minute steps is
 * 1,440 rows to scroll past; hour, minute and meridiem is 12 + 60 + 2, so
 * every minute of the day is two clicks away instead of a hunt. The field
 * still accepts typing for anyone quicker with a keyboard.
 *
 * The value in and out is 24-hour `HH:mm`, which is what the API validates
 * (`date_format:H:i`), and onChange hands back an event-shaped object so the
 * ordinary `handleChange(setForm)` call sites need no change.
 */

interface InputTimePickerProps {
  id?: string;
  name: string;
  label?: string;
  /** 24-hour `HH:mm`, or empty. */
  value?: string;
  onChange: (event: { target: { name: string; value: string } }) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

const HOURS = Array.from({ length: 12 }, (_, index) => index + 1);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);
const MERIDIEMS = ['AM', 'PM'] as const;

const pad = (value: number) => String(value).padStart(2, '0');

type Parts = { hour12: number; minute: number; meridiem: 'AM' | 'PM' };

/** `HH:mm` to the three things the palette shows, or null when unset. */
const toParts = (value?: string): Parts | null => {
  const match = /^(\d{1,2}):(\d{2})/.exec((value ?? '').trim());

  if (!match) return null;

  const hour24 = Number(match[1]);
  const minute = Number(match[2]);

  if (!Number.isFinite(hour24) || hour24 > 23 || minute > 59) return null;

  return {
    hour12: hour24 % 12 === 0 ? 12 : hour24 % 12,
    minute,
    meridiem: hour24 < 12 ? 'AM' : 'PM',
  };
};

const toValue = ({ hour12, minute, meridiem }: Parts): string => {
  const hour24 = meridiem === 'AM'
    ? (hour12 === 12 ? 0 : hour12)
    : (hour12 === 12 ? 12 : hour12 + 12);

  return `${pad(hour24)}:${pad(minute)}`;
};

const toDisplay = (value?: string): string => {
  const parts = toParts(value);

  return parts ? `${pad(parts.hour12)}:${pad(parts.minute)} ${parts.meridiem}` : '';
};

/**
 * What someone typed, read generously.
 *
 * `9`, `930`, `9:30`, `09:30 pm` and `9 30 PM` all mean something obvious, and
 * a field that only accepts one of them is a field people stop typing into.
 * Without an am/pm, anything under 8 is read as afternoon -- nobody clocks in
 * at three in the morning, and a shift that does says so with `03:00 AM`.
 */
const parseTyped = (text: string): string | null => {
  const cleaned = text.trim().toLowerCase();

  if (!cleaned) return '';

  const match = /^(\d{1,2})\s*[:.\s]?\s*(\d{2})?\s*(am|pm|a|p)?$/.exec(cleaned);

  if (!match) return null;

  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3]?.[0];

  if (!Number.isFinite(hour) || minute > 59) return null;

  if (meridiem === 'p') {
    hour = hour === 12 ? 12 : hour + 12;
  } else if (meridiem === 'a') {
    hour = hour === 12 ? 0 : hour;
  } else if (hour < 8) {
    hour += 12;
  }

  if (hour > 23) return null;

  return `${pad(hour)}:${pad(minute)}`;
};

const InputTimePicker: React.FC<InputTimePickerProps> = ({
  id,
  name,
  label,
  value = '',
  onChange,
  disabled = false,
  className = '',
  placeholder = '--:-- --',
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState<string | null>(null);

  const parts = useMemo(() => toParts(value), [value]);
  const display = typed ?? toDisplay(value);

  const emit = (next: string) => {
    setTyped(null);
    onChange({ target: { name, value: next } });
  };

  /** A column click only decides its own part; the rest keep what they had. */
  const pick = (patch: Partial<Parts>) => {
    const base: Parts = parts ?? { hour12: 9, minute: 0, meridiem: 'AM' };
    emit(toValue({ ...base, ...patch }));
  };

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);

    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  // Open on 09:00 and the palette shows midnight until you scroll -- so each
  // column jumps to what is already chosen, the way a native control does.
  useEffect(() => {
    if (!open) return;

    columnsRef.current?.querySelectorAll('[data-selected="true"]').forEach((node) => {
      (node as HTMLElement).scrollIntoView({ block: 'center' });
    });
  }, [open, value]);

  const commitTyped = () => {
    if (typed === null) return;

    const parsed = parseTyped(typed);

    // Unreadable input falls back to what was there rather than clearing the
    // field under someone who mistyped one character.
    setTyped(null);

    if (parsed !== null && parsed !== value) {
      onChange({ target: { name, value: parsed } });
    }
  };

  const columnClass = 'max-h-52 w-full overflow-y-auto py-1';
  const optionClass = (selected: boolean) =>
    [
      'block w-full cursor-pointer px-2 py-1 text-center text-sm transition-colors',
      selected
        ? 'bg-primary font-semibold text-white'
        : 'text-black hover:bg-gray-100 dark:text-white dark:hover:bg-meta-4',
    ].join(' ');

  return (
    <div className="w-full" ref={wrapperRef}>
      {label ? (
        <label className={`${FIELD_LABEL} text-sm`} htmlFor={id || name}>
          {label}
        </label>
      ) : null}

      <div className="relative">
        <Input
          id={id || name}
          name={name}
          type="text"
          autoComplete="off"
          disabled={disabled}
          value={display}
          placeholder={placeholder}
          className={`${FIELD_BASE} h-9 w-full px-3 py-1 pr-14 ${className}`}
          onChange={(event) => setTyped(event.target.value)}
          onFocus={() => !disabled && setOpen(true)}
          onBlur={commitTyped}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitTyped();
              setOpen(false);
            }

            if (event.key === 'Escape') {
              setTyped(null);
              setOpen(false);
            }
          }}
        />

        {value && !disabled ? (
          <Button
            type="button"
            title="Clear"
            className="absolute right-8 top-1/2 -translate-y-1/2 text-body hover:text-danger dark:text-bodydark2"
            onClick={() => emit('')}
          >
            <FiX className="h-4 w-4" />
          </Button>
        ) : null}

        <Button
          type="button"
          tabIndex={-1}
          title="Pick a time"
          disabled={disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-body hover:text-primary disabled:cursor-not-allowed dark:text-bodydark2 dark:hover:text-primary"
          onClick={() => setOpen((previous) => !previous)}
        >
          <FiClock className="h-4 w-4" />
        </Button>

        {open && !disabled ? (
          <div className="absolute left-0 top-full z-999 mt-1 w-full min-w-47.5 rounded border border-stroke bg-white shadow-5 dark:border-strokedark dark:bg-boxdark">
            <div ref={columnsRef} className="grid grid-cols-3 divide-x divide-stroke dark:divide-strokedark">
              <div className={columnClass}>
                {HOURS.map((hour) => (
                  <Button
                    key={hour}
                    type="button"
                    data-selected={parts?.hour12 === hour}
                    className={optionClass(parts?.hour12 === hour)}
                    onClick={() => pick({ hour12: hour })}
                  >
                    {pad(hour)}
                  </Button>
                ))}
              </div>

              <div className={columnClass}>
                {MINUTES.map((minute) => (
                  <Button
                    key={minute}
                    type="button"
                    data-selected={parts?.minute === minute}
                    className={optionClass(parts?.minute === minute)}
                    onClick={() => pick({ minute })}
                  >
                    {pad(minute)}
                  </Button>
                ))}
              </div>

              <div className={columnClass}>
                {MERIDIEMS.map((meridiem) => (
                  <Button
                    key={meridiem}
                    type="button"
                    data-selected={parts?.meridiem === meridiem}
                    className={optionClass(parts?.meridiem === meridiem)}
                    onClick={() => pick({ meridiem })}
                  >
                    {meridiem}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex justify-between border-t border-stroke px-2 py-1.5 dark:border-strokedark">
              <Button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => {
                  const now = new Date();
                  emit(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
                  setOpen(false);
                }}
              >
                Now
              </Button>
              <Button
                type="button"
                className="text-xs font-medium text-body hover:underline dark:text-bodydark"
                onClick={() => setOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default InputTimePicker;
