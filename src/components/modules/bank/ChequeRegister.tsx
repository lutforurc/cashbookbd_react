import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiAlertTriangle, FiPlus, FiSave, FiTrash2, FiX } from 'react-icons/fi';

import HelmetTitle from '../../utils/others/HelmetTitle';
import InputElement from '../../utils/fields/InputElement';
import InputDatePicker from '../../utils/fields/DatePicker';
import SearchInput from '../../utils/fields/SearchInput';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import Table from '../../utils/others/Table';
import Pagination from '../../utils/utils-functions/Pagination';
import Loader from '../../../common/Loader';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';

import httpService from '../../services/httpService';
import { API_CHEQUE_REGISTER_URL } from '../../services/apiRoutes';
import { money } from '../hotel/setupHelpers';

/**
 * The cheque register: which cheque, drawn on which bank, dated when, and what
 * became of it.
 *
 * ⚠️ THE VOUCHER RECORDS THE MONEY; THIS RECORDS THE PAPER. A cheque taken in is
 * entered as an ordinary receipt on the day it is received — and this register
 * hangs beside that voucher answering what no ledger can: is it still in the
 * drawer, has it been banked, has it cleared, did it bounce.
 *
 * ⚠️ BANKING AND CLEARING POST NOTHING. They are facts about a piece of paper.
 * The BOUNCE is the exception, and it has a panel of its own — shown leg by leg
 * before it is written — because money recorded as received never arrived, and
 * until it is put back the customer's account says they have paid.
 *
 * ⚠️ THE DUE LIST IS THE POINT OF THE SCREEN. A post-dated cheque whose day has
 * come and which is still in the drawer is money sitting in somebody's desk; an
 * issued cheque about to be presented is money that must be in the account by
 * Sunday. Neither question is in any ledger, and both sit at the top here.
 */

const asText = (date: Date | null) => {
  if (!date) return '';

  // Local parts, never toISOString(): a cheque is dated a calendar day, and
  // going through UTC moves it a day for half the world.
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, '0')}`;
};

const asDate = (value?: string | null): Date | null => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

  return parts ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) : null;
};

const onTheDay = (value?: string | null): string => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

  return parts ? `${parts[3]}/${parts[2]}/${parts[1]}` : '—';
};

const today = () => asText(new Date());

const STATUS_NAMES: Record<string, string> = {
  in_hand: 'In hand',
  deposited: 'Banked',
  cleared: 'Cleared',
  dishonoured: 'Returned',
  cancelled: 'Cancelled',
};

const DIRECTION_NAMES: Record<string, string> = {
  received: 'Taken in',
  issued: 'Given out',
};

const blank = () => ({
  direction: 'received',
  cheque_no: '',
  bank_name: '',
  branch_name: '',
  cheque_date: today(),
  on_date: today(),
  party_coa4_id: '',
  party_name: '',
  account_coa4_id: '',
  amount: '',
  main_trx_id: '',
  note: '',
});

const ChequeRegister = () => {
  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [direction, setDirection] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(null);

  /** The cheque being put back, and what the reversal would be. */
  const [bouncing, setBouncing] = useState<any>(null);
  const [legs, setLegs] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await httpService.get(API_CHEQUE_REGISTER_URL, {
        params: {
          page,
          per_page: 20,
          q: search || undefined,
          direction: direction || undefined,
          status: status || undefined,
        },
      });

      setData(res?.data?.data?.data ?? res?.data?.data ?? null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not read the register');
    } finally {
      setLoading(false);
    }
  }, [page, search, direction, status]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!form?.cheque_no?.trim() || !form?.amount) {
      toast.error('A cheque needs a number and an amount.');
      return;
    }

    setSaving(true);

    try {
      const res = await httpService.post(`${API_CHEQUE_REGISTER_URL}/store`, {
        ...form,
        id: form.id ?? null,
        party_coa4_id: form.party_coa4_id || null,
        account_coa4_id: form.account_coa4_id || null,
        main_trx_id: form.main_trx_id || null,
      });

      toast.success(res?.data?.message || 'Saved');
      setForm(null);
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not save it', { autoClose: 8000 });
    } finally {
      setSaving(false);
    }
  };

  const mark = async (row: any, next: string) => {
    try {
      const res = await httpService.post(`${API_CHEQUE_REGISTER_URL}/status/${row.id}`, {
        status: next,
        on_date: today(),
      });

      toast.success(res?.data?.message || 'Done');
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not change it', { autoClose: 8000 });
    }
  };

  const remove = async (row: any) => {
    try {
      const res = await httpService.post(`${API_CHEQUE_REGISTER_URL}/delete/${row.id}`, {});
      toast.success(res?.data?.message || 'Removed');
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not remove it', { autoClose: 8000 });
    }
  };

  /**
   * Open the bounce panel and ask what the reversal would be.
   *
   * ⚠️ Asked of the server, not worked out here: the entry is the original
   * voucher turned around leg for leg, and the legs a person agrees to must be
   * the legs that get written.
   */
  const askBounce = async (row: any, over: any = {}) => {
    const asked = { on_date: today(), reason: '', charge: '', charge_coa4_id: '', ...over };

    setBouncing({ ...row, ...asked });

    try {
      const res = await httpService.get(`${API_CHEQUE_REGISTER_URL}/dishonour/plan/${row.id}`, {
        params: {
          charge: asked.charge || 0,
          charge_coa4_id: asked.charge_coa4_id || undefined,
        },
      });

      setLegs((res?.data?.data?.data ?? res?.data?.data)?.legs ?? []);
    } catch (error: any) {
      // Usually: the cheque is not tied to a voucher, so there is nothing to
      // turn around. The server's sentence says exactly that.
      toast.error(error?.response?.data?.message || 'Could not work it out', { autoClose: 10000 });
      setBouncing(null);
    }
  };

  const bounce = async () => {
    setSaving(true);

    try {
      const res = await httpService.post(`${API_CHEQUE_REGISTER_URL}/dishonour/${bouncing.id}`, {
        on_date: bouncing.on_date,
        reason: bouncing.reason || null,
        charge: bouncing.charge || 0,
        charge_coa4_id: bouncing.charge_coa4_id || null,
      });

      toast.success(res?.data?.message || 'Put back', { autoClose: 10000 });
      setBouncing(null);
      setLegs([]);
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not put it back', { autoClose: 10000 });
    } finally {
      setSaving(false);
    }
  };

  const partyOptions = [
    { id: '', name: 'Not a ledger head' },
    ...(data?.party_heads ?? []).map((one: any) => ({
      id: one.id,
      name: `${one.name} (${one.group_name})`,
    })),
  ];

  const bankOptions = [
    { id: '', name: 'Not chosen' },
    ...(data?.bank_heads ?? []).map((one: any) => ({
      id: one.id,
      name: `${one.name} (${one.group_name})`,
    })),
  ];

  const columns = [
    {
      key: 'cheque_no',
      header: 'Cheque',
      render: (row: any) => (
        <div>
          <div className="font-mono text-black dark:text-white">{row.cheque_no}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {row.bank_name}
            {row.branch_name ? `, ${row.branch_name}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'party',
      header: 'Whose',
      render: (row: any) => (
        <div>
          <div className="text-black dark:text-white">{row.party_name || row.party_head}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {DIRECTION_NAMES[row.direction] ?? row.direction}
            {row.vr_no ? ` · ${row.vr_no}` : ' · no voucher named'}
          </div>
        </div>
      ),
    },
    {
      key: 'cheque_date',
      header: 'Dated',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => {
        const due = String(row.cheque_date).slice(0, 10) <= today();
        const open = row.status === 'in_hand' || row.status === 'deposited';

        return (
          <div>
            <div className="text-black dark:text-white">
              {onTheDay(String(row.cheque_date).slice(0, 10))}
            </div>
            {/* ⚠️ The one thing this column is for: a cheque whose day has come
                and which is still in the drawer. */}
            {due && open ? (
              <div className="text-xs text-amber-600 dark:text-amber-400">its day has come</div>
            ) : String(row.cheque_date).slice(0, 10) > today() ? (
              <div className="text-xs text-gray-500 dark:text-gray-400">post-dated</div>
            ) : null}
          </div>
        );
      },
    },
    {
      key: 'amount',
      header: 'Amount',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => money(row.amount),
    },
    {
      key: 'status',
      header: 'Where it stands',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => (
        <span
          className={`text-xs ${
            row.status === 'dishonoured'
              ? 'text-danger dark:text-red-400'
              : row.status === 'cleared'
                ? 'text-success dark:text-emerald-400'
                : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {STATUS_NAMES[row.status] ?? row.status}
          {row.status === 'dishonoured' && row.return_reason ? (
            <div className="text-[0.65rem]">{row.return_reason}</div>
          ) : null}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      headerClass: 'w-56 text-center',
      cellClass: 'text-center',
      render: (row: any) => (
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          {row.status === 'in_hand' ? (
            <button
              type="button"
              onClick={() => mark(row, 'deposited')}
              className="text-gray-500 underline dark:text-gray-400"
            >
              banked
            </button>
          ) : null}

          {row.status === 'in_hand' || row.status === 'deposited' ? (
            <>
              <button
                type="button"
                onClick={() => mark(row, 'cleared')}
                className="text-success underline"
              >
                cleared
              </button>

              {/* ⚠️ Its own button, not a word in a dropdown: this one writes a
                  voucher, and everything beside it writes nothing. */}
              <button
                type="button"
                onClick={() => askBounce(row)}
                className="flex items-center gap-1 text-danger underline"
                title="It bounced — turn the receipt around"
              >
                <FiAlertTriangle size={12} />
                returned
              </button>

              <button
                type="button"
                onClick={() => mark(row, 'cancelled')}
                className="text-gray-400 underline"
              >
                cancelled
              </button>
            </>
          ) : null}

          {row.status !== 'dishonoured' ? (
            <>
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...row,
                    cheque_date: String(row.cheque_date ?? '').slice(0, 10),
                    on_date: String(row.on_date ?? '').slice(0, 10),
                    party_coa4_id: row.party_coa4_id ?? '',
                    account_coa4_id: row.account_coa4_id ?? '',
                    main_trx_id: row.main_trx_id ?? '',
                  })
                }
                className="text-gray-500 underline dark:text-gray-400"
              >
                edit
              </button>
              <button
                type="button"
                onClick={() => remove(row)}
                aria-label="Remove"
                title="Remove"
              >
                <FiTrash2 className="text-red-600" size={14} />
              </button>
            </>
          ) : null}
        </div>
      ),
    },
  ];

  if (loading && !data) return <Loader />;

  const due = data?.due ?? [];

  return (
    <div>
      <HelmetTitle title="Cheque Register" />

      <h2 className="mb-3 text-center text-xl font-semibold text-black dark:text-white">
        Cheque Register
      </h2>

      {/* ⚠️ At the top, in words: what is waiting to be banked and what is about
          to be presented. This is the question the screen is opened with. */}
      {due.length ? (
        <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 rounded border border-amber-400 bg-amber-50 p-2 text-sm text-amber-900 dark:border-amber-400/60 dark:bg-amber-500/15 dark:text-amber-50">
          {due.map((one: any) => (
            <span key={one.direction}>
              {one.direction === 'received'
                ? `${one.count} cheque(s) taken in, ${money(one.total)} — their day has come and they are still with us`
                : `${one.count} cheque(s) given out, ${money(one.total)} — due to be presented`}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mb-2 flex flex-wrap items-end gap-2">
        <SearchInput
          id="cheque_search"
          label="Search"
          search={search}
          setSearchValue={(value: string) => {
            setSearch(value);
            setPage(1);
          }}
          className="w-56"
        />

        <div className="w-40">
          <DropdownCommon
            id="cheque_direction"
            name="direction"
            label="Which way"
            data={[
              { id: '', name: 'Both' },
              { id: 'received', name: 'Taken in' },
              { id: 'issued', name: 'Given out' },
            ]}
            value={direction}
            onChange={(e: any) => {
              setDirection(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="w-44">
          <DropdownCommon
            id="cheque_status"
            name="status"
            label="Where it stands"
            data={[
              { id: '', name: 'All' },
              ...Object.entries(STATUS_NAMES).map(([id, name]) => ({ id, name })),
            ]}
            value={status}
            onChange={(e: any) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <ButtonLoading
          onClick={() => setForm(form ? null : blank())}
          label={form ? 'Close' : 'Write one in'}
          icon={form ? <FiX size={16} /> : <FiPlus size={16} />}
        />
      </div>

      {form ? (
        <div className="mb-4 rounded border border-stroke p-3 dark:border-strokedark">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <DropdownCommon
              id="cheque_form_direction"
              name="direction"
              label="Which way"
              data={[
                { id: 'received', name: 'Taken in' },
                { id: 'issued', name: 'Given out' },
              ]}
              value={form.direction}
              onChange={(e: any) => setForm({ ...form, direction: e.target.value })}
            />
            <InputElement
              id="cheque_form_no"
              name="cheque_no"
              label="Cheque no"
              value={form.cheque_no}
              onChange={(e: any) => setForm({ ...form, cheque_no: e.target.value })}
            />
            <InputElement
              id="cheque_form_bank"
              name="bank_name"
              label="Drawn on"
              placeholder="City Bank"
              value={form.bank_name}
              onChange={(e: any) => setForm({ ...form, bank_name: e.target.value })}
              description={form.direction === 'received' ? 'Their bank.' : 'Ours.'}
            />
            <InputElement
              id="cheque_form_amount"
              name="amount"
              label="Amount"
              type="number"
              min={0}
              value={String(form.amount ?? '')}
              onChange={(e: any) => setForm({ ...form, amount: e.target.value })}
            />
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-4">
            <div>
              <InputDatePicker
                id="cheque_form_date"
                name="cheque_date"
                label="Dated"
                selectedDate={asDate(form.cheque_date)}
                setSelectedDate={(date: Date | null) =>
                  setForm({ ...form, cheque_date: asText(date) })
                }
                setCurrentDate={() => undefined}
                className="w-full"
              />
              <p className="mt-1 text-xs leading-snug text-gray-500 dark:text-gray-400">
                The date written on it. Later than today is post-dated.
              </p>
            </div>

            <InputDatePicker
              id="cheque_form_on"
              name="on_date"
              label={form.direction === 'received' ? 'Taken in on' : 'Given out on'}
              selectedDate={asDate(form.on_date)}
              setSelectedDate={(date: Date | null) => setForm({ ...form, on_date: asText(date) })}
              setCurrentDate={() => undefined}
              className="w-full"
            />

            <DropdownCommon
              id="cheque_form_party"
              name="party_coa4_id"
              label="Whose"
              data={partyOptions}
              value={form.party_coa4_id}
              onChange={(e: any) => setForm({ ...form, party_coa4_id: e.target.value })}
            />

            <InputElement
              id="cheque_form_party_name"
              name="party_name"
              label="Or the name in writing"
              placeholder="Karim Traders"
              value={form.party_name}
              onChange={(e: any) => setForm({ ...form, party_name: e.target.value })}
              description="For somebody with no ledger head."
            />
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-4">
            <DropdownCommon
              id="cheque_form_account"
              name="account_coa4_id"
              label="Our account"
              data={bankOptions}
              value={form.account_coa4_id}
              onChange={(e: any) => setForm({ ...form, account_coa4_id: e.target.value })}
              description="Where it goes in, or is drawn on."
            />

            <div>
              <InputElement
                id="cheque_form_trx"
                name="main_trx_id"
                label="Voucher no (id)"
                type="number"
                value={String(form.main_trx_id ?? '')}
                onChange={(e: any) => setForm({ ...form, main_trx_id: e.target.value })}
              />
              {/* ⚠️ Said plainly, because it is what makes a bounce possible at
                  all: the reversal is that voucher turned around. */}
              <p className="mt-1 text-xs leading-snug text-gray-500 dark:text-gray-400">
                The receipt or payment it was recorded on. Without it a bounce cannot be put back
                automatically.
              </p>
            </div>

            <div className="md:col-span-2">
              <InputElement
                id="cheque_form_note"
                name="note"
                label="Note"
                value={form.note ?? ''}
                onChange={(e: any) => setForm({ ...form, note: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-3">
            <ButtonLoading
              onClick={save}
              buttonLoading={saving}
              icon={<FiSave className="h-5 w-5" />}
              label="Save"
              variant="primary"
            />
          </div>
        </div>
      ) : null}

      {/* ⚠️ SHOWN LEG BY LEG BEFORE IT IS WRITTEN. This is the one act on this
          screen that touches the books. */}
      {bouncing ? (
        <div className="mb-4 rounded border border-stroke p-3 dark:border-strokedark">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <div className="text-sm font-medium text-black dark:text-white">
              Returned unpaid — cheque {bouncing.cheque_no}, {money(bouncing.amount)}
            </div>
            <button
              type="button"
              onClick={() => {
                setBouncing(null);
                setLegs([]);
              }}
              className="text-xs text-gray-500 underline dark:text-gray-400"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <InputDatePicker
              id="bounce_on"
              name="on_date"
              label="Returned on"
              selectedDate={asDate(bouncing.on_date)}
              setSelectedDate={(date: Date | null) =>
                setBouncing({ ...bouncing, on_date: asText(date) })
              }
              setCurrentDate={() => undefined}
              className="w-full"
            />

            <InputElement
              id="bounce_reason"
              name="reason"
              label="What the memo said"
              placeholder="Insufficient funds"
              value={bouncing.reason}
              onChange={(e: any) => setBouncing({ ...bouncing, reason: e.target.value })}
            />

            <InputElement
              id="bounce_charge"
              name="charge"
              label="The bank's charge"
              type="number"
              min={0}
              value={String(bouncing.charge ?? '')}
              onChange={(e: any) => setBouncing({ ...bouncing, charge: e.target.value })}
              onBlur={() => askBounce(bouncing, bouncing)}
              description="Leave empty if there was none."
            />

            <DropdownCommon
              id="bounce_charge_head"
              name="charge_coa4_id"
              label="Charge goes to"
              data={[
                { id: '', name: 'Not chosen' },
                ...(data?.expense_heads ?? []).map((one: any) => ({ id: one.id, name: one.name })),
              ]}
              value={bouncing.charge_coa4_id}
              onChange={(e: any) =>
                askBounce(bouncing, { ...bouncing, charge_coa4_id: e.target.value })
              }
            />
          </div>

          {legs.length ? (
            <div className="mt-3 rounded border border-stroke p-3 text-sm dark:border-strokedark">
              <div className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                The receipt turned around, leg for leg — whatever heads it used.
              </div>

              {legs.map((leg: any, index: number) => (
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
          ) : null}

          <div className="mt-3">
            <ButtonLoading
              onClick={bounce}
              buttonLoading={saving}
              icon={<FiAlertTriangle className="h-5 w-5" />}
              label="Put it back"
              variant="primary"
              disabled={!legs.length}
            />
          </div>
        </div>
      ) : null}

      <p className="mb-2 text-xs leading-snug text-gray-500 dark:text-gray-400">
        Banking a cheque and its clearing are facts about the paper —{' '}
        <strong className="text-black dark:text-white">nothing is posted for them</strong>. A cheque
        marked returned is the exception: its voucher is turned around, so the party owes it again.
      </p>

      <Table
        columns={columns}
        data={data?.rows?.data ?? []}
        noDataMessage="No cheques written in yet."
      />

      {(data?.rows?.last_page ?? 1) > 1 ? (
        <div className="mt-3">
          <Pagination
            currentPage={page}
            totalPages={data.rows.last_page}
            handlePageChange={(next: number) => setPage(next)}
          />
        </div>
      ) : null}
    </div>
  );
};

export default ChequeRegister;
