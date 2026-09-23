import { FiAlertCircle, FiSave } from 'react-icons/fi';
import { Button, ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import { formatDayMonthYear } from '../../../utils/utils-functions/formatDate';

export type ImeiConflict = { imei: string; vr_no: string; vr_date: string };

type Props = {
  conflicts: ImeiConflict[] | null;
  saving?: boolean;
  onCancel: () => void;
  onContinue: () => void;
};

/**
 * The question a Company Scheme sale asks when one of its IMEIs is already on
 * another live scheme invoice -- the brand would be owed for that phone twice.
 *
 * Asked, not refused (owner, 2026-09-23): a phone that came back and went out
 * again is a real second sale. Laid out like StockShortageModal, so the two
 * questions a sale can put read alike.
 */
const CompanySchemeImeiModal = ({ conflicts, saving = false, onCancel, onContinue }: Props) => {
  if (!conflicts?.length) return null;

  return (
    <div className="fixed inset-0 z-1001 flex items-center justify-center bg-black/50 px-3 py-6">
      <div className="w-full max-w-lg rounded-sm bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-900/20">
          <FiAlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
          <h3 className="text-base font-semibold text-amber-800 dark:text-amber-100">IMEI Already Sold</h3>
        </div>

        <div className="px-4 py-4 text-sm text-gray-700 dark:text-gray-200">
          <p>Already on another Company Scheme invoice:</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-6">
            {conflicts.map((c, i) => (
              <li key={`${c.imei}-${c.vr_no}`}>
                <span className="font-medium">{c.imei}</span>
                {' — invoice '}
                <span className="font-semibold text-warning">{c.vr_no}</span>
                {` (${formatDayMonthYear(c.vr_date)})`}
                {i === conflicts.length - 1 ? '.' : ';'}
              </li>
            ))}
          </ol>
          <p className="mt-3">
            Saving again makes the brand owe for the same phone twice. Continue only if it came back and is
            being sold again.
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t border-[rgb(var(--c-border))] px-4 py-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            onClick={onCancel}
            className="rounded-sm border border-[rgb(var(--c-border))] px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Cancel
          </Button>
          <ButtonLoading
            type="button"
            onClick={onContinue}
            buttonLoading={saving}
            label="Continue Save"
            className="whitespace-nowrap px-4 py-2"
            icon={<FiSave className="text-lg ml-2 mr-2" />}
            disabled={saving}
          />
        </div>
      </div>
    </div>
  );
};

export default CompanySchemeImeiModal;
