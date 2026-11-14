import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FiDollarSign, FiFileText, FiRefreshCcw, FiSave } from 'react-icons/fi';
import { FaUniversity } from 'react-icons/fa';

import HelmetTitle from '../../utils/others/HelmetTitle';
import InputElement from '../../utils/fields/InputElement';
import ToggleSwitch from '../../utils/fields/ToggleSwitch';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { hasPermission } from '../../utils/permissionChecker';
import { FIELD_HEIGHT, FIELD_LABEL } from '../../../theme/fieldStyles';
import httpService from '../../services/httpService';
import { API_PURCHASE_ADVANCE_URL } from '../../services/apiRoutes';
import PurchaseAdvanceLedger from './PurchaseAdvanceLedger';

/**
 * Purchase Advance -- money handed to a member of staff to buy goods with.
 *
 * ⚠️ NOT A LOAN. A salary loan is on the Employee Loan screen and is recovered
 * by the salary run; nothing on this screen reaches it, and the salary run
 * never reads what is entered here.
 *
 * Three things happen to an advance, and only two of them here:
 *
 *   given     here -- "Give advance"
 *   spent     on the purchase screen (Hotel -> Accounts Transaction,
 *             "Advance"), where the goods are entered as a purchase
 *   squared   here -- "Settle": what is left comes back, or, where the bills
 *             ran past the advance, the difference is paid to the employee
 *
 * ⚠️ THE BALANCE DECIDES WHICH WAY "SETTLE" GOES; the screen does not ask.
 * Above zero he holds the company's money and hands it back; below zero the
 * company owes him and pays.
 *
 * ⚠️ NO DATE AND NO EDIT. The server books every entry on the branch's
 * transaction date. One put down wrong is deleted with Voucher Delete -- the
 * balance follows by itself -- and entered again.
 */

type Staff = {
  id: number;
  name: string;
  designation?: string | null;
  balance: number;
  last_advance?: string | null;
  last_movement?: string | null;
};


const GIVE = 'give';
const SETTLE = 'settle';
const CASH = 'cash';
const BANK = 'bank';


const money = (value: number) => thousandSeparator(Number(value) || 0);
const day = (value?: string | null) => (value ? String(value).slice(0, 10).split('-').reverse().join('/') : '-');

const daysSince = (value?: string | null, today?: string | null) => {
  if (!value || !today) return null;
  const from = new Date(String(value).slice(0, 10)).getTime();
  const to = new Date(String(today).slice(0, 10)).getTime();
  return Number.isFinite(from) && Number.isFinite(to) ? Math.max(0, Math.round((to - from) / 86400000)) : null;
};

const PurchaseAdvance = () => {
  const permissions = useSelector((s: any) => s.settings?.data?.permissions ?? []);
  const canEnter = hasPermission(permissions, 'purchase.advance.create');

  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [banks, setBanks] = useState<{ id: number; name: string }[]>([]);
  const [summary, setSummary] = useState({ held: 0, owed: 0, date: '' });
  const [check, setCheck] = useState<{ head: number; rows: number; agrees: boolean } | null>(null);
  const [showAll, setShowAll] = useState(false);

  const [action, setAction] = useState<typeof GIVE | typeof SETTLE>(GIVE);
  const [employeeId, setEmployeeId] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<typeof CASH | typeof BANK>(CASH);
  const [bankAccount, setBankAccount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // The employee whose ledger is open below the list, and a counter bumped
  // after every save so an open ledger reads again.
  const [ledgerOf, setLedgerOf] = useState<Staff | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await httpService.get(`${API_PURCHASE_ADVANCE_URL}/list`);
      const body = res?.data;

      if (!body?.success) {
        toast.error(body?.message || 'Could not read the purchase advances.');
        return;
      }

      const data = body?.data?.data ?? {};

      setStaff((data.employees ?? []).map((one: any) => ({ ...one, balance: Number(one.balance) || 0 })));
      setBanks(data.banks ?? []);
      setSummary({ held: Number(data.held) || 0, owed: Number(data.owed) || 0, date: data.date || '' });
      setCheck(data.check ?? null);
    } catch (error: any) {
      if (!error?.toastReported) {
        toast.error(error?.response?.data?.message || 'Could not read the purchase advances.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const chosen = useMemo(() => staff.find((one) => String(one.id) === employeeId) ?? null, [staff, employeeId]);
  const held = chosen?.balance ?? 0;

  // Settling starts at the whole of what stands between them; it may be lowered.
  useEffect(() => {
    if (action === SETTLE) setAmount(held !== 0 ? String(Math.abs(held)) : '');
  }, [action, held]);

  const save = async () => {
    if (!employeeId) return toast.error('Choose the employee.');
    if (!(Number(amount) > 0)) return toast.error('How much? Enter an amount.');
    if (mode === BANK && !bankAccount) return toast.error('Which bank account?');

    if (action === SETTLE) {
      if (held === 0) return toast.error(`${chosen?.name} holds nothing and is owed nothing.`);
      if (Number(amount) > Math.abs(held)) {
        return toast.error(
          held > 0
            ? `He holds ${money(held)}; no more than that can be taken back.`
            : `He is owed ${money(Math.abs(held))}; no more than that can be paid.`,
        );
      }
    }

    setSaving(true);

    try {
      const res = await httpService.post(`${API_PURCHASE_ADVANCE_URL}/${action === GIVE ? 'give' : 'settle'}`, {
        employee_id: Number(employeeId),
        amount: Number(amount),
        mode,
        bank_account: mode === BANK ? Number(bankAccount) : null,
        note: note.trim() || null,
      });

      // A refusal rides HTTP 200 with success:false.
      const body = res?.data;

      if (!body?.success) {
        toast.error(body?.message || 'The server refused that.');
        return;
      }

      toast.success(`Voucher ${body?.data?.data?.vr_no} saved`);
      setAmount('');
      setNote('');
      await load();
      setSavedCount((n) => n + 1);
    } catch (error: any) {
      if (!error?.toastReported) {
        toast.error(error?.response?.data?.message || error?.message || 'Could not save');
      }
    } finally {
      setSaving(false);
    }
  };

  const listed = showAll ? staff : staff.filter((one) => one.balance !== 0);
  const cell = 'px-2 py-2 text-gray-900 dark:text-[rgb(var(--c-text))]';
  const pick = (value: string, current: string) =>
    `${FIELD_HEIGHT} inline-flex items-center justify-center gap-2 text-sm font-medium ${
      value === current
        ? 'bg-primary text-white'
        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-meta-4'
    }`;

  // What "Settle" will do, said before the button is pressed.
  const settleSays =
    !chosen || held === 0
      ? 'Choose an employee who holds an advance, or is owed for a bill.'
      : held > 0
        ? `${chosen.name} holds ${money(held)}. What he hands back is received into ${mode === BANK ? 'the bank' : 'cash'}.`
        : `The bills ran ${money(Math.abs(held))} past the advance. What is paid to ${chosen.name} leaves ${mode === BANK ? 'the bank' : 'cash'}.`;

  return (
    <div>
      <HelmetTitle title="Purchase Advance" />
      <div className='mb-2'></div>
      

      {check && !check.agrees ? (
        <div className="mb-3 rounded border border-danger bg-danger/10 px-3 py-2 text-sm text-black dark:text-white">
          The Employee Purchase Advance head stands at <strong>{money(check.head)}</strong> in the ledger, but the
          employees' accounts add up to <strong>{money(check.rows)}</strong>. Something was posted to the head from
          another screen, with no employee named. Find it in the head's ledger and delete it.
        </div>
      ) : null}

      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded border border-stroke p-3 dark:border-strokedark">
          <div className="text-xs text-gray-500 dark:text-gray-400">In employees' hands</div>
          <div className="text-lg font-semibold text-black dark:text-white">{money(summary.held)}</div>
        </div>
        <div className="rounded border border-stroke p-3 dark:border-strokedark">
          <div className="text-xs text-gray-500 dark:text-gray-400">Owed to employees</div>
          <div className="text-lg font-semibold text-black dark:text-white">{money(summary.owed)}</div>
        </div>
        <div className="rounded border border-stroke p-3 dark:border-strokedark">
          <div className="text-xs text-gray-500 dark:text-gray-400">Entries are dated</div>
          <div className="text-lg font-semibold text-black dark:text-white">{day(summary.date)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {canEnter ? (
          <div className="rounded border border-stroke p-3 dark:border-strokedark">
            <div
              role="radiogroup"
              aria-label="What to enter"
              className="mb-3 grid grid-cols-2 overflow-hidden rounded border border-stroke dark:border-strokedark"
            >
              <button type="button" role="radio" aria-checked={action === GIVE} onClick={() => { setAction(GIVE); setAmount(''); }} className={pick(GIVE, action)}>
                Give advance
              </button>
              <button type="button" role="radio" aria-checked={action === SETTLE} onClick={() => setAction(SETTLE)} className={pick(SETTLE, action)}>
                Settle
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <DropdownCommon
                id="advanceEmployee"
                name="advanceEmployee"
                label="Employee *"
                data={[
                  { id: '', name: 'Select the employee' },
                  ...staff.map((one) => ({
                    id: one.id,
                    name: one.balance !== 0 ? `${one.name} — ${one.balance > 0 ? 'holds' : 'is owed'} ${money(Math.abs(one.balance))}` : one.name,
                  })),
                ]}
                value={employeeId}
                onChange={(e: any) => setEmployeeId(e.target.value)}
              />

              <p className="text-xs leading-snug text-gray-500 dark:text-gray-400">
                {action === SETTLE
                  ? settleSays
                  : chosen && held > 0
                    ? `${chosen.name} already holds ${money(held)} that has not been accounted for.`
                    : 'Money handed over to buy goods with. It is not a loan and is never taken from salary.'}
              </p>

              <InputElement
                id="advanceAmount"
                name="advanceAmount"
                type="number"
                label={action === GIVE ? 'Amount (Tk.) *' : held < 0 ? 'Pay him (Tk.) *' : 'Receive back (Tk.) *'}
                value={amount}
                onChange={(e: any) => setAmount(e.target.value)}
              />

              <div
                role="radiogroup"
                aria-label="Cash or bank"
                className="grid grid-cols-2 overflow-hidden rounded border border-stroke dark:border-strokedark"
              >
                <button type="button" role="radio" aria-checked={mode === CASH} onClick={() => setMode(CASH)} className={pick(CASH, mode)}>
                  <FiDollarSign size={16} /> Cash
                </button>
                <button type="button" role="radio" aria-checked={mode === BANK} onClick={() => setMode(BANK)} className={pick(BANK, mode)}>
                  <FaUniversity size={15} /> Bank
                </button>
              </div>

              {mode === BANK ? (
                <DropdownCommon
                  id="advanceBank"
                  name="advanceBank"
                  label="Bank Account *"
                  data={[{ id: '', name: 'Select a bank account' }, ...banks]}
                  value={bankAccount}
                  onChange={(e: any) => setBankAccount(e.target.value)}
                />
              ) : null}

              <InputElement
                id="advanceNote"
                name="advanceNote"
                label="Note"
                placeholder="Optional"
                value={note}
                onChange={(e: any) => setNote(e.target.value)}
              />

              <ButtonLoading
                onClick={save}
                buttonLoading={saving}
                disabled={saving}
                label={action === GIVE ? 'Give advance' : held < 0 ? 'Pay the difference' : 'Receive back'}
                className="whitespace-nowrap text-center mr-0 py-2"
                icon={<FiSave className="text-lg" />}
              />
            </div>
          </div>
        ) : null}

        <div className={canEnter ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <ToggleSwitch
              id="showEveryEmployee"
              name="showEveryEmployee"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              label="Show every employee"
              labelClassName={FIELD_LABEL}
            />
            <ButtonLoading
              onClick={load}
              buttonLoading={loading}
              label="Refresh"
              className="whitespace-nowrap text-center mr-0 py-2"
              icon={<FiRefreshCcw className="text-lg" />}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
              <thead className="bg-[rgb(var(--c-table-head))] text-xs uppercase text-gray-700 dark:text-gray-200">
                <tr>
                  <th className="px-2 py-2 text-center">Sl</th>
                  <th className="px-2 py-2">Employee</th>
                  <th className="px-2 py-2 text-right">Balance</th>
                  <th className="px-2 py-2">Last advance</th>
                  <th className="px-2 py-2 text-right">Days open</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {listed.map((one, index) => {
                  const open = one.balance !== 0 ? daysSince(one.last_advance || one.last_movement, summary.date) : null;

                  return (
                    <tr key={one.id} className="border-b bg-[rgb(var(--c-table-body))] dark:border-gray-700">
                      <td className={`${cell} text-center`}>{index + 1}</td>
                      <td className={cell}>
                        {one.name}
                        {one.designation ? <span className="ml-1 text-xs text-gray-500">({one.designation})</span> : null}
                      </td>
                      <td className={`px-2 py-2 text-right font-semibold ${one.balance < 0 ? 'text-danger' : 'text-gray-900 dark:text-[rgb(var(--c-text))]'}`}>
                        {one.balance === 0 ? '-' : money(Math.abs(one.balance))}
                        {one.balance < 0 ? <span className="ml-1 text-xs font-normal">owed to him</span> : null}
                      </td>
                      <td className={cell}>{day(one.last_advance)}</td>
                      <td className={`${cell} text-right`}>{open === null ? '-' : open}</td>
                      <td className="px-2 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setLedgerOf(one)}
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <FiFileText size={15} /> Ledger
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!listed.length ? (
                  <tr className="border-b bg-[rgb(var(--c-table-body))] dark:border-gray-700">
                    <td colSpan={6} className="px-2 py-3 text-center text-gray-500 dark:text-gray-300">
                      {loading ? 'Loading...' : 'Nobody holds an advance, and nobody is owed for a bill.'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {ledgerOf ? (
            <PurchaseAdvanceLedger
              key={ledgerOf.id}
              employee={ledgerOf}
              today={summary.date}
              refreshKey={savedCount}
              onClose={() => setLedgerOf(null)}
            />
          ) : null}
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        অগ্রিমের টাকায় কেনা পণ্য এখানে নয়, ক্রয়ের স্ক্রিনে এন্ট্রি হয় (Hotel → Accounts Transaction, Payment-এ "Advance")।
        এটা বেতনের লোন নয়; বেতন থেকে কাটা হয় না।
      </p>
    </div>
  );
};

export default PurchaseAdvance;
