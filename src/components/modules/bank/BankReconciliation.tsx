import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { FiCheck, FiLock, FiPrinter, FiRotateCcw } from 'react-icons/fi';
import { useReactToPrint } from 'react-to-print';

import HelmetTitle from '../../utils/others/HelmetTitle';
import InputElement from '../../utils/fields/InputElement';
import InputDatePicker from '../../utils/fields/DatePicker';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import Loader from '../../../common/Loader';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';

import httpService from '../../services/httpService';
import { API_BANK_RECONCILIATION_URL } from '../../services/apiRoutes';
import { money } from '../hotel/setupHelpers';

import BankReconciliationPrint from './BankReconciliationPrint';

/**
 * Ticking the bank statement off against the books.
 *
 * The whole of it is four figures and one subtraction:
 *
 *      what the books say we have
 *    + cheques we have written that the bank has not yet paid out
 *    − money we have paid in that the bank has not yet credited
 *    = what the bank's statement should say
 *
 * ⚠️ THE DIFFERENCE IS SHOWN, NEVER POSTED. What is left over is nearly always
 * a bank charge or interest the bank knows about and the books do not — and an
 * ordinary voucher is passed for it. A screen that quietly wrote that entry
 * would hide the very thing it exists to reveal, so this one says what the gap
 * is and leaves the writing to a person.
 *
 * ⚠️ A MONTH CANNOT BE CLOSED WHILE IT IS OUT. That is the only refusal here and
 * it is the point of the exercise: a reconciliation that does not reconcile is a
 * piece of paper claiming the books are right when nobody has checked.
 *
 * ⚠️ TICKING IS "AS AT" A DATE, NOT A YES. A cheque cleared in September is
 * still outstanding as far as July's statement is concerned, so July re-read in
 * December shows exactly what it showed when it was signed.
 */

const asText = (date: Date | null) => {
  if (!date) return '';

  // Local parts, never toISOString(): a statement is made up to a calendar day,
  // and going through UTC moves it a day for half the world.
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

/** The last day of the month before this one — the statement usually to hand. */
const lastMonthEnd = () => {
  const now = new Date();

  return asText(new Date(now.getFullYear(), now.getMonth(), 0));
};

const BankReconciliation = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [accountId, setAccountId] = useState('');
  const [upTo, setUpTo] = useState(lastMonthEnd());
  const [balance, setBalance] = useState('');

  const [state, setState] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  /** Only what has not cleared — how the job is actually worked through. */
  const [onlyOpen, setOnlyOpen] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const print = useReactToPrint({ contentRef: printRef, documentTitle: 'Bank reconciliation' });

  const loadAccounts = useCallback(async () => {
    try {
      const res = await httpService.get(`${API_BANK_RECONCILIATION_URL}/accounts`);
      const body = res?.data?.data?.data ?? res?.data?.data ?? {};

      setAccounts(body.accounts ?? []);
      setHistory(body.history ?? []);

      if (!accountId && (body.accounts ?? []).length) {
        setAccountId(String(body.accounts[0].id));
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not read the bank accounts');
    }
    // accountId is deliberately not a dependency: this runs to FIND the first
    // account, and depending on it would re-run the moment it is chosen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    if (!accountId || !upTo) return;

    setLoading(true);

    try {
      const res = await httpService.get(API_BANK_RECONCILIATION_URL, {
        params: {
          coa4_id: accountId,
          statement_date: upTo,
          // Left out entirely until somebody types one, so a saved month brings
          // back the figure it was signed on rather than a zero.
          ...(balance === '' ? {} : { statement_balance: balance }),
        },
      });

      const body = res?.data?.data?.data ?? res?.data?.data ?? null;

      setState(body);

      if (balance === '' && body?.saved?.statement_balance) {
        setBalance(String(body.saved.statement_balance));
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not work the reconciliation out');
    } finally {
      setLoading(false);
    }
  }, [accountId, upTo, balance]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Tick one leg, or let it go.
   *
   * ⚠️ Cleared ON the statement date, not today. The statement is what says the
   * bank showed it, and a tick dated today would put July's cheque into
   * August's outstanding list the moment somebody worked a month late.
   */
  const tick = async (row: any, on: boolean) => {
    // Moved on the screen first and put back if the server refuses: a
    // reconciliation is worked through at reading pace, and a spinner between
    // every cheque and the next would make it slower than the paper.
    const was = state.rows;

    setState({
      ...state,
      rows: state.rows.map((one: any) =>
        one.id === row.id ? { ...one, cleared: on, reconciled_on: on ? upTo : null } : one,
      ),
    });

    try {
      await httpService.post(`${API_BANK_RECONCILIATION_URL}/tick`, {
        ids: [row.id],
        coa4_id: accountId,
        reconciled_on: on ? upTo : null,
      });

      load();
    } catch (error: any) {
      setState({ ...state, rows: was });
      toast.error(error?.response?.data?.message || 'Could not change it', { autoClose: 8000 });
    }
  };

  const close = async () => {
    if (balance === '') {
      toast.error('What does the bank say it holds on that date?');
      return;
    }

    setSaving(true);

    try {
      const res = await httpService.post(`${API_BANK_RECONCILIATION_URL}/close`, {
        coa4_id: accountId,
        statement_date: upTo,
        statement_balance: balance,
      });

      toast.success(res?.data?.message || 'Closed', { autoClose: 8000 });
      loadAccounts();
      load();
    } catch (error: any) {
      // Held on screen: this is the sentence that says what is missing, and it
      // is the reason somebody opened this screen at all.
      toast.error(error?.response?.data?.message || 'Could not close it', { autoClose: 12000 });
    } finally {
      setSaving(false);
    }
  };

  const reopen = async (row: any) => {
    try {
      const res = await httpService.post(`${API_BANK_RECONCILIATION_URL}/reopen/${row.id}`, {});
      toast.success(res?.data?.message || 'Open again', { autoClose: 8000 });
      loadAccounts();
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not re-open it', { autoClose: 10000 });
    }
  };

  const totals = state?.totals ?? {};
  const closed = Boolean(state?.saved?.is_closed);

  const rows = useMemo(
    () => (state?.rows ?? []).filter((one: any) => (onlyOpen ? !one.cleared : true)),
    [state, onlyOpen],
  );

  const accountName = accounts.find((one) => String(one.id) === String(accountId))?.name;

  if (!accounts.length) return <Loader />;

  return (
    <div>
      <HelmetTitle title="Bank Reconciliation" />

      <h2 className="mb-3 text-center text-xl font-semibold text-black dark:text-white">
        Bank Reconciliation
      </h2>

      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div className="w-72">
          <DropdownCommon
            id="recon_account"
            name="coa4_id"
            label="Account"
            data={accounts.map((one: any) => ({
              id: one.id,
              name: `${one.name} (${one.group_name})`,
            }))}
            value={accountId}
            onChange={(e: any) => {
              setAccountId(e.target.value);
              setBalance('');
            }}
          />
        </div>

        <div className="w-44">
          <InputDatePicker
            id="recon_date"
            name="statement_date"
            label="Statement up to"
            selectedDate={asDate(upTo)}
            setSelectedDate={(date: Date | null) => {
              setUpTo(asText(date));
              setBalance('');
            }}
            setCurrentDate={() => undefined}
            className="w-full"
          />
        </div>

        <div className="w-52">
          <InputElement
            id="recon_balance"
            name="statement_balance"
            label="The bank says"
            type="number"
            value={balance}
            onChange={(e: any) => setBalance(e.target.value)}
            description="The closing balance on the statement."
          />
        </div>

        <label className="mb-2 flex items-center gap-2 text-sm text-black dark:text-white">
          <input
            type="checkbox"
            checked={onlyOpen}
            onChange={(e) => setOnlyOpen(e.target.checked)}
          />
          Only what has not cleared
        </label>

        <ButtonLoading onClick={print} label="Print" icon={<FiPrinter size={16} />} />
      </div>

      {/* ⚠️ The statement itself, in the order it is read aloud: the books, what
          the bank has not caught up with, and what the bank should therefore
          say. The difference sits at the foot in words, because it is the line
          the whole screen exists to produce. */}
      <div className="mb-4 rounded border border-stroke p-3 text-sm dark:border-strokedark">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-stroke py-1 dark:border-strokedark">
          <span className="text-gray-600 dark:text-gray-300">What the books say</span>
          <span className="font-medium text-black dark:text-white">
            {money(totals.book_balance ?? 0)}
          </span>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-stroke py-1 dark:border-strokedark">
          <span className="text-gray-600 dark:text-gray-300">
            add — cheques written, not yet presented
          </span>
          <span className="text-black dark:text-white">{money(totals.uncleared_out ?? 0)}</span>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-stroke py-1 dark:border-strokedark">
          <span className="text-gray-600 dark:text-gray-300">
            less — paid in, not yet credited
          </span>
          <span className="text-black dark:text-white">{money(totals.uncleared_in ?? 0)}</span>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-stroke py-1 font-semibold dark:border-strokedark">
          <span className="text-black dark:text-white">so the bank should say</span>
          <span className="text-black dark:text-white">{money(totals.expected_bank ?? 0)}</span>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-2 py-1">
          <span className="text-gray-600 dark:text-gray-300">and the bank says</span>
          <span className="text-black dark:text-white">{money(totals.statement_balance ?? 0)}</span>
        </div>

        <div className="mt-2 text-sm font-semibold">
          {totals.balanced ? (
            <span className="text-success dark:text-emerald-400">
              It agrees{closed ? ' — closed and signed' : ''}
            </span>
          ) : (
            <span className="text-danger dark:text-red-400">
              Out by {money(Math.abs(Number(totals.difference ?? 0)))} — nearly always a bank charge
              or interest nobody has passed a voucher for yet. Write that voucher, or tick the entry
              that has been missed.
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {!closed ? (
            <ButtonLoading
              onClick={close}
              buttonLoading={saving}
              icon={<FiCheck className="h-5 w-5" />}
              label="Close this month"
              variant="primary"
              disabled={!totals.balanced}
            />
          ) : (
            <ButtonLoading
              onClick={() => reopen(state.saved)}
              icon={<FiRotateCcw className="h-5 w-5" />}
              label="Open it again"
            />
          )}
        </div>
      </div>

      {loading && !state ? <Loader /> : null}

      <div className="overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-2 text-left dark:bg-meta-4">
              <th className="px-3 py-2 text-sm font-medium text-black dark:text-white">Date</th>
              <th className="px-3 py-2 text-sm font-medium text-black dark:text-white">Voucher</th>
              <th className="px-3 py-2 text-sm font-medium text-black dark:text-white">What it was</th>
              <th className="px-3 py-2 text-right text-sm font-medium text-black dark:text-white">
                Paid in
              </th>
              <th className="px-3 py-2 text-right text-sm font-medium text-black dark:text-white">
                Paid out
              </th>
              <th className="px-3 py-2 text-center text-sm font-medium text-black dark:text-white">
                On the statement
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row: any) => (
                <tr key={row.id} className="border-b border-stroke dark:border-strokedark">
                  <td className="px-3 py-2 text-sm text-black dark:text-white">
                    {onTheDay(String(row.vr_date).slice(0, 10))}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-500 dark:text-gray-400">
                    {row.vr_no}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">
                    {row.remarks || row.note || '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-black dark:text-white">
                    {Number(row.debit) ? money(row.debit) : ''}
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-black dark:text-white">
                    {Number(row.credit) ? money(row.credit) : ''}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(row.cleared)}
                        onChange={(e) => tick(row, e.target.checked)}
                        disabled={closed}
                      />
                      {/* Closed months show a lock rather than a dead tick, so
                          it is plain that the month is signed, not that the
                          entry cannot be reconciled. */}
                      {closed ? <FiLock size={12} className="text-gray-400" /> : null}
                    </label>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-sm text-gray-500">
                  {onlyOpen
                    ? 'Everything up to this date has cleared.'
                    : 'Nothing on this account up to that date.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* The months already signed, newest first — and the way back into one. */}
      {history.length ? (
        <div className="mt-4 rounded border border-stroke p-3 dark:border-strokedark">
          <div className="mb-2 text-sm font-medium text-black dark:text-white">
            Months already done
          </div>
          {history
            .filter((one: any) => String(one.coa4_id) === String(accountId))
            .map((one: any) => (
              <div
                key={one.id}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-stroke py-1 text-xs last:border-0 dark:border-strokedark"
              >
                <span className="text-gray-600 dark:text-gray-300">
                  {onTheDay(String(one.statement_date).slice(0, 10))} · bank{' '}
                  {money(one.statement_balance)} · books {money(one.book_balance)}
                  {one.note ? <span className="text-gray-400"> · {one.note}</span> : null}
                </span>
                <button
                  type="button"
                  onClick={() => setUpTo(String(one.statement_date).slice(0, 10))}
                  className="text-gray-500 underline dark:text-gray-400"
                >
                  open
                </button>
              </div>
            ))}
        </div>
      ) : null}

      <BankReconciliationPrint
        ref={printRef}
        accountName={accountName}
        upTo={onTheDay(upTo)}
        totals={totals}
        rows={(state?.rows ?? []).filter((one: any) => !one.cleared)}
        closed={closed}
      />
    </div>
  );
};

export default BankReconciliation;
