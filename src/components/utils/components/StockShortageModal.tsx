import { FiAlertCircle, FiSave } from 'react-icons/fi';
import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import thousandSeparator from '../utils-functions/thousandSeparator';

export type StockShortageRow = {
  name: string;
  available: number;
  requested: number;
};

export type StockShortage = {
  rows: StockShortageRow[];
  shortages: string[];
  message: string;
  /** The branch refuses such a sale: shown, but with nothing to continue to. */
  blocked?: boolean;
};

type Props = {
  warning: StockShortage | null;
  /** What the operator is about to do: "sell", "transfer". */
  action?: string;
  saving?: boolean;
  onCancel: () => void;
  onContinue: () => void;
};

/**
 * The question a voucher asks before it overdraws the stock.
 *
 * Not a refusal. Goods routinely arrive before the supplier's invoice does, so
 * a branch can genuinely hold what its books have not caught up with -- and the
 * same screen is used by someone who has simply picked the wrong line. Only the
 * person at the keyboard can tell those apart, so they are shown both figures
 * and asked.
 *
 * Each shortage is listed with what is on hand against what is being asked for,
 * coloured apart, because "not enough stock" on its own tells a seller nothing
 * they can act on -- they need to see by how much, and for which product.
 *
 * Lifted out of the Branch Transfer screen when the sales screens came to need
 * the same question, so all of them ask it the same way and it is worded in one
 * place.
 */
const StockShortageModal = ({
  warning,
  action = 'save',
  saving = false,
  onCancel,
  onContinue,
}: Props) => {
  if (!warning) return null;

  const hasRows = warning.rows?.length > 0;
  const hasLines = warning.shortages?.length > 0;
  const blocked = Boolean(warning.blocked);

  // Blocked or merely warned, the figures are shown the same way -- which
  // product, how much is there, how much was asked for. What changes is the
  // sentence under them and whether there is a way forward.
  const closing = blocked
    ? 'This branch does not allow selling below stock.'
    : `You can ${action} anyway.`;

  return (
    <div className="fixed inset-0 z-1001 flex items-center justify-center bg-black/50 px-3 py-6">
      <div className="w-full max-w-lg rounded-sm bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-900/20">
          <FiAlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
          <h3 className="text-base font-semibold text-amber-800 dark:text-amber-100">
            Not Enough Stock
          </h3>
        </div>

        <div className="px-4 py-4 text-sm text-gray-700 dark:text-gray-200">
          {hasRows ? (
            <>
              <p>Not enough stock for</p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-6">
                {warning.rows.map((row, i) => (
                  <li key={i}>
                    <span className="font-medium">{row.name}</span>
                    {' — '}
                    <span className="font-semibold text-danger">
                      Available {thousandSeparator(Number(row.available))}
                    </span>
                    {', '}
                    <span className="font-semibold text-warning">
                      Requested {thousandSeparator(Number(row.requested))}
                    </span>
                    {i === warning.rows.length - 1 ? '.' : ';'}
                  </li>
                ))}
              </ol>
              <p className="mt-3">{closing}</p>
            </>
          ) : hasLines ? (
            <>
              <p>Not enough stock for</p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-6">
                {warning.shortages.map((line, i) => (
                  <li key={i}>
                    {line}
                    {i === warning.shortages.length - 1 ? '.' : ';'}
                  </li>
                ))}
              </ol>
              <p className="mt-3">{closing}</p>
            </>
          ) : (
            <p>{warning.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-[rgb(var(--c-border))] px-4 py-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            onClick={onCancel}
            className="rounded-sm border border-[rgb(var(--c-border))] px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            {blocked ? 'Close' : 'Cancel'}
          </Button>
          {/* A blocked sale is shown the figures and nothing else. Offering a
              way on that would be refused anyway is worse than offering none:
              it reads as a choice, and the operator learns the button lies. */}
          {blocked ? null : (
            <ButtonLoading
              type="button"
              onClick={onContinue}
              buttonLoading={saving}
              label="Continue Save"
              className="whitespace-nowrap px-4 py-2"
              icon={<FiSave className="text-lg ml-2 mr-2" />}
              disabled={saving}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default StockShortageModal;
