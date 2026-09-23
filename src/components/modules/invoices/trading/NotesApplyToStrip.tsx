import React from 'react';
import { FiColumns, FiCopy, FiShoppingCart, FiTag } from 'react-icons/fi';
import { Button } from '../../../../pages/UiElements/CustomButtons';
import { useTooltip } from '../../../utils/others/useTooltip';

export type NotesApplyTo = 'purchase' | 'sales' | 'both' | 'separate';

interface Choice {
  value: NotesApplyTo;
  label: string;
  icon: React.ReactNode;
  hint: string;
}

const CHOICES: Choice[] = [
  { value: 'both', label: 'Both', icon: <FiCopy className="h-3 w-3" />, hint: 'the same note on the Purchase and the Sales voucher' },
  { value: 'purchase', label: 'Purchase', icon: <FiShoppingCart className="h-3 w-3" />, hint: 'the note on the Purchase voucher only' },
  { value: 'sales', label: 'Sales', icon: <FiTag className="h-3 w-3" />, hint: 'the note on the Sales voucher only' },
  { value: 'separate', label: 'Separate', icon: <FiColumns className="h-3 w-3" />, hint: 'a different note on each voucher, entered in a popup' },
];

/**
 * Below 270px of column the four words do not fit beside "Notes", so the
 * button shows its icon and says its name in the app's own tooltip. The
 * strip's cell must be a `@container` for the switch to happen.
 */
const StripButton: React.FC<{ choice: Choice; active: boolean; onPick: (value: NotesApplyTo) => void }> = ({
  choice,
  active,
  onPick,
}) => {
  const { anchorProps, tooltip } = useTooltip<HTMLButtonElement>(
    <>
      <span className="font-semibold">{choice.label}</span> — {choice.hint}
    </>,
  );

  return (
    <>
      <Button
        type="button"
        {...anchorProps}
        onClick={() => onPick(choice.value)}
        aria-label={choice.label}
        aria-pressed={active}
        // h-full!, because this strip is 20px and a button stands at the
        // shared control height unless it says otherwise.
        className={`h-full! shrink-0 whitespace-nowrap px-1.5 transition ${
          active
            ? 'bg-blue-600 text-white'
            : 'text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-700'
        }`}
      >
        <span className="inline-flex items-center @min-[270px]:hidden">{choice.icon}</span>
        <span className="hidden @min-[270px]:inline">{choice.label}</span>
      </Button>
      {tooltip}
    </>
  );
};

/**
 * Where the Combined Invoice's note goes: both vouchers, one of them, or a
 * different note on each.
 */
const NotesApplyToStrip: React.FC<{ value: NotesApplyTo; onChange: (value: NotesApplyTo) => void }> = ({
  value,
  onChange,
}) => (
  <div className="inline-flex h-5 shrink-0 overflow-hidden rounded border border-slate-500 bg-slate-100 text-[10px] font-semibold leading-none dark:border-slate-600 dark:bg-slate-800">
    {CHOICES.map((choice) => (
      <StripButton key={choice.value} choice={choice} active={value === choice.value} onPick={onChange} />
    ))}
  </div>
);

export default NotesApplyToStrip;
