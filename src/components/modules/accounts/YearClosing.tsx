import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiCheck, FiRotateCcw } from 'react-icons/fi';

import HelmetTitle from '../../utils/others/HelmetTitle';
import InputElement from '../../utils/fields/InputElement';
import InputDatePicker from '../../utils/fields/DatePicker';
import DdlMultiline from '../../utils/utils-functions/DdlMultiline';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import Loader from '../../../common/Loader';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { FIELD_LABEL } from '../../../theme/fieldStyles';

import { useDispatch, useSelector } from 'react-redux';
import { getDdlProtectedBranch } from '../branch/ddlBranchSlider';

import httpService from '../../services/httpService';
import { API_YEAR_CLOSING_URL } from '../../services/apiRoutes';
import { money } from '../hotel/setupHelpers';

/**
 * Closing the year.
 *
 * ⚠️ THE HEAVIEST ACT IN THE ACCOUNTS, so it is shown leg by leg before it is
 * done. It empties every income and expense head into capital and settles what
 * the year earned. Nobody should meet its effects for the first time in a report.
 *
 * ⚠️ WHY IT HAS TO BE DONE AT ALL — said on the screen, because the cost of not
 * doing it appears a year late. Income and expense heads tell the story of ONE
 * year; left alone they keep running, and year two's profit and loss carries
 * year one's inside it.
 *
 * ⚠️ WHICH CAPITAL HEAD IS CHOSEN, NEVER GUESSED. Two partners' capital,
 * drawings and a director's loan can all sit in the same group, and a program
 * picking one would be deciding whose money the profit is.
 *
 * ⚠️ AND IT IS UNDOABLE, by a contra voucher rather than a deletion — both
 * entries stay in the books and the year opens again.
 */

const asText = (date: Date | null) => {
  if (!date) return '';

  // Local parts, never toISOString(): the year ends on a calendar day.
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, '0')}`;
};

const asDate = (value?: string | null): Date | null => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

  return parts ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) : null;
};

const onTheDay = (value?: string | null): string => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

  return parts ? `${parts[3]}/${parts[2]}/${parts[1]}` : '';
};

/**
 * The capital heads as dropdown lines, and a search over them.
 *
 * The list is already in hand -- the plan call brings every balance sheet
 * head with it -- so "searching" is a filter, not a round trip; the promise is
 * only because the dropdown's fetcher is written for one. A chart of a few
 * hundred heads is no longer a list to scroll for the one called Capital.
 */
const capitalOptions = (heads: any[]) =>
  heads.map((one: any) => ({ value: String(one.id), label: `${one.name} (${one.group_name})` }));

const searchCapital = (heads: any[]) => {
  const options = capitalOptions(heads);

  return (typed: string) => {
    const q = typed.trim().toLowerCase();

    return Promise.resolve(
      q ? options.filter((option) => option.label.toLowerCase().includes(q)) : options,
    );
  };
};

const YearClosing = ({ user }: any) => {
  const dispatch = useDispatch<any>();
  const branchDdlData = useSelector((state: any) => state.branchDdl);

  const [branchId, setBranchId] = useState<number | null>(user?.branch_id ?? null);
  /**
   * The year end being asked about. EMPTY until the server has answered once:
   * which day a year ends on is the company's own (July for most, January for
   * some), and the screen used to assume the 30th of June -- so a company on
   * a December year opened on a date that was not its year end at all. Sent
   * empty, the server answers with the end of the company's current year, and
   * the box takes that.
   */
  const [yearEnd, setYearEnd] = useState('');
  const [capital, setCapital] = useState('');
  const [note, setNote] = useState('');

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const branches: any[] = branchDdlData?.protectedData?.data ?? [];

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await httpService.get(`${API_YEAR_CLOSING_URL}/plan`, {
        params: {
          year_end: yearEnd || undefined,
          branch_id: branchId || undefined,
          capital_coa4_id: capital || undefined,
        },
      });

      const answer = res?.data?.data?.data ?? res?.data?.data ?? null;

      setData(answer);

      // The first answer names the year end; the box follows it. Only when
      // the box is empty -- a date somebody typed is theirs.
      if (!yearEnd && answer?.plan?.year_end) {
        setYearEnd(String(answer.plan.year_end).slice(0, 10));
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not work the closing out');
    } finally {
      setLoading(false);
    }
  }, [yearEnd, branchId, capital]);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
  }, [dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const close = async () => {
    if (!capital) {
      toast.error('Where does the profit go? Choose the capital head.');
      return;
    }

    setSaving(true);

    try {
      const res = await httpService.post(`${API_YEAR_CLOSING_URL}/run`, {
        year_end: yearEnd,
        capital_coa4_id: capital,
        branch_id: branchId || null,
        note: note || null,
      });

      // Held on screen: it says what the profit was and where it went, which is
      // the thing somebody writes down.
      toast.success(res?.data?.message || 'Closed', { autoClose: 12000 });
      setNote('');
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not close the year', { autoClose: 12000 });
    } finally {
      setSaving(false);
    }
  };

  const undo = async (row: any) => {
    setSaving(true);

    try {
      const res = await httpService.post(`${API_YEAR_CLOSING_URL}/reverse/${row.id}`, {});
      toast.success(res?.data?.message || 'Undone', { autoClose: 10000 });
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not undo it', { autoClose: 12000 });
    } finally {
      setSaving(false);
    }
  };

  const plan = data?.plan;
  const already = data?.already;

  if (loading && !data) return <Loader />;

  return (
    <div>
      <HelmetTitle title="Year Closing" />

      <h2 className="mb-3 text-center text-xl font-semibold text-black dark:text-white">
        Closing the Year
      </h2>

      {/* ⚠️ Why it is done, on the screen. The cost of skipping it does not
          appear until the following year, by which time there are two years of
          entries to unpick. */}
      <p className="mb-3 rounded border border-stroke p-2 text-xs leading-snug text-gray-500 dark:border-strokedark dark:text-gray-400">
        Income and expense heads tell the story of <strong>one</strong> year. Closing empties them
        into capital so the new year starts from nothing — without it, next year&rsquo;s profit and
        loss carries this year&rsquo;s inside it, and the trial balance stops meaning anything.{' '}
        <strong className="text-black dark:text-white">
          The closing voucher is dated the last day of the year and marked as one.
        </strong>{' '}
        The profit and loss for that year leaves it out; the balance sheet takes it in.
        {data?.financial_year?.label ? (
          <>
            {' '}
            This company&rsquo;s year runs{' '}
            <strong className="text-black dark:text-white">{data.financial_year.label}</strong> —
            set on the company screen.
          </>
        ) : null}
      </p>

      {/* ⚠️ THE LOCK, SAID WHERE IT IS SET. Everything dated on or before this
          day is frozen -- no edit, no delete, no un-approval, no new voucher
          -- and the way back is Undo, here. A clerk refused on a voucher
          screen is sent to this sentence by the refusal itself. */}
      {data?.locked_until ? (
        <p className="mb-3 rounded border border-amber-400 bg-amber-50 p-2 text-xs leading-snug text-amber-900 dark:border-amber-400/60 dark:bg-amber-500/15 dark:text-amber-50">
          <strong>Books locked up to {onTheDay(String(data.locked_until))}</strong> for this
          branch. Vouchers dated on or before that day cannot be added, changed, deleted or
          un-approved. To correct one, undo that year&rsquo;s closing below, change the voucher,
          and close the year again.
        </p>
      ) : null}

      <div className="mb-3 flex flex-wrap items-end gap-2">
        {branches.length > 1 ? (
          <div className="w-56">
            <label className="text-sm text-black dark:text-white">Branch</label>
            <BranchDropdown
              value={branchId ? String(branchId) : ''}
              defaultValue={branchId ? String(branchId) : ''}
              onChange={(e: any) => setBranchId(e.target.value === '' ? null : Number(e.target.value))}
              className="w-full text-sm"
              branchDdl={branches}
            />
          </div>
        ) : null}

        <div className="w-44">
          <InputDatePicker
            id="closing_year_end"
            name="year_end"
            label="Year ending"
            selectedDate={asDate(yearEnd)}
            setSelectedDate={(date: Date | null) => setYearEnd(asText(date))}
            setCurrentDate={() => undefined}
            className="w-full"
          />
        </div>

        <div className="w-full sm:w-80">
          <label htmlFor="closing_capital" className={`${FIELD_LABEL} text-sm`}>
            The profit goes to
          </label>
          {/* ⚠️ Keyed on the list's size. The dropdown fills its opening menu
              ONCE, when it mounts -- and this screen mounts it before the plan
              has answered, so it would open empty for good. A new key when the
              heads land mounts it again, over the full list. The plan reloads
              on every pick too, but the list keeps its size and nothing moves. */}
          <DdlMultiline
            key={(data?.capital_heads ?? []).length}
            id="closing_capital"
            name="capital_coa4_id"
            fetchOptions={searchCapital(data?.capital_heads ?? [])}
            defaultOptions
            value={capitalOptions(data?.capital_heads ?? []).find((one) => one.value === capital) ?? null}
            onSelect={(chosen: any) => setCapital(chosen?.value ?? '')}
            placeholder="Choose the capital head"
          />
        </div>

        <div className="w-56">
          <InputElement
            id="closing_note"
            name="note"
            label="Note"
            placeholder="Optional"
            value={note}
            onChange={(e: any) => setNote(e.target.value)}
          />
        </div>
      </div>

      {plan ? (
        <div className="mb-4 rounded border border-stroke p-3 text-sm dark:border-strokedark">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <div className="font-medium text-black dark:text-white">
              The year {onTheDay(plan.year_start)} to {onTheDay(plan.year_end)}
              {/* ⚠️ A period that is not twelve months is said so. It happens
                  once when a company changes its year -- six months from a
                  December year to a July one -- and a closing that quietly
                  covered half a year would be read as a bad year. */}
              {data?.financial_year?.months && Number(data.financial_year.months) !== 12 ? (
                <span className="ml-2 text-xs font-normal text-amber-700 dark:text-amber-300">
                  {data.financial_year.months} months — the year changed
                </span>
              ) : null}
            </div>
            {already ? (
              <span className="text-xs text-success dark:text-emerald-400">
                Closed already — {money(already.profit)} went to capital
              </span>
            ) : null}
          </div>

          <div className="mb-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span>
              earned <strong className="text-black dark:text-white">{money(plan.income_total)}</strong>
            </span>
            <span>
              spent <strong className="text-black dark:text-white">{money(plan.expense_total)}</strong>
            </span>
            <span
              className={
                Number(plan.profit) >= 0
                  ? 'text-success dark:text-emerald-400'
                  : 'text-danger dark:text-red-400'
              }
            >
              {Number(plan.profit) >= 0 ? 'profit' : 'loss'}{' '}
              <strong>{money(Math.abs(Number(plan.profit)))}</strong>
            </span>
            <span>{plan.heads_closed} head(s) would be emptied</span>
          </div>

          {/* Leg by leg. Somebody signing this off reads legs, not a summary. */}
          <div className="max-h-80 overflow-y-auto">
            {(plan.legs ?? []).map((leg: any, index: number) => (
              <div
                key={`${leg.coa4_id}-${index}`}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-stroke py-1 text-xs last:border-0 dark:border-strokedark"
              >
                <span className="text-gray-600 dark:text-gray-300">
                  {leg.head ?? leg.coa4_id}{' '}
                  <span className="text-gray-400">{leg.note ? `· ${leg.note}` : ''}</span>
                </span>
                <span className="font-medium text-black dark:text-white">
                  {Number(leg.debit) ? `Dr ${money(leg.debit)}` : `Cr ${money(leg.credit)}`}
                </span>
              </div>
            ))}
          </div>

          {!plan.legs?.length ? (
            <p className="py-2 text-xs text-gray-500 dark:text-gray-400">
              Nothing stands in the income or expense heads for that year — there is nothing to
              close.
            </p>
          ) : null}

          {/* ⚠️ Only when a capital head is chosen: without one the entry has no
              other side, and a button that refuses when pressed teaches nothing. */}
          {plan.legs?.length && !capital ? (
            <p className="mt-2 rounded border border-amber-400 bg-amber-50 p-2 text-xs leading-snug text-amber-900 dark:border-amber-400/60 dark:bg-amber-500/15 dark:text-amber-50">
              Choose the head the profit goes to. Until then this shows the heads that would be
              emptied, but not where the profit lands.
            </p>
          ) : null}

          <div className="mt-3">
            {!already ? (
              <ButtonLoading
                onClick={close}
                buttonLoading={saving}
                icon={<FiCheck className="h-5 w-5" />}
                label="Close the year"
                variant="primary"
                disabled={!capital || !plan.legs?.length}
              />
            ) : (
              <ButtonLoading
                onClick={() => undo(already)}
                buttonLoading={saving}
                icon={<FiRotateCcw className="h-5 w-5" />}
                label="Undo this closing"
              />
            )}
          </div>
        </div>
      ) : null}

      {/* The years already closed, newest first. */}
      {(data?.history ?? []).length ? (
        <div className="rounded border border-stroke p-3 dark:border-strokedark">
          <div className="mb-2 text-sm font-medium text-black dark:text-white">Years closed</div>
          {(data.history ?? []).map((one: any) => (
            <div
              key={one.id}
              className="flex flex-wrap items-baseline justify-between gap-2 border-b border-stroke py-1 text-xs last:border-0 dark:border-strokedark"
            >
              <span className="text-gray-600 dark:text-gray-300">
                {onTheDay(String(one.year_start).slice(0, 10))} to{' '}
                {onTheDay(String(one.year_end).slice(0, 10))} · earned {money(one.income_total)} ·
                spent {money(one.expense_total)} · {one.heads_closed} head(s)
                {one.note ? <span className="text-gray-400"> · {one.note}</span> : null}
              </span>
              <span className="flex items-center gap-3">
                <span
                  className={
                    Number(one.profit) >= 0
                      ? 'text-success dark:text-emerald-400'
                      : 'text-danger dark:text-red-400'
                  }
                >
                  {money(one.profit)}
                </span>
                <button
                  type="button"
                  onClick={() => setYearEnd(String(one.year_end).slice(0, 10))}
                  className="text-gray-500 underline dark:text-gray-400"
                >
                  open
                </button>
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {data?.note ? (
        <p className="mt-3 text-xs leading-snug text-gray-500 dark:text-gray-400">{data.note}</p>
      ) : null}
    </div>
  );
};

export default YearClosing;
