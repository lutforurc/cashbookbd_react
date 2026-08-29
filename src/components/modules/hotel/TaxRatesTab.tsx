import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiSave, FiTrash2, FiX } from 'react-icons/fi';

import ActionButtons from '../../utils/fields/ActionButton';
import InputElement from '../../utils/fields/InputElement';
import InputDatePicker from '../../utils/fields/DatePicker';
import Table from '../../utils/others/Table';
import Loader from '../../../common/Loader';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';

import httpService from '../../services/httpService';
import { API_HOTEL_TAX_RATE_URL } from '../../services/apiRoutes';

/**
 * The service charge — one figure for the property.
 *
 * ⚠️ VAT IS NOT SET HERE (client, 2026-08-29). One hotel charges three rates at
 * once — 15% on an air-conditioned room, 7.5% on one without, 5% on food — so
 * the rate belongs to the ITEM and is typed on the Room Types and Charges
 * screens. What is left here is the service charge, which is not a tax at all:
 * it is the hotel's own takings, so it does not vary by what was sold.
 *
 *     a line:  base → service charge → VAT on base PLUS service charge
 *     the bill: the lines added up → gross → discount off it → net
 *
 * ⚠️ VAT falls on the service charge too. 100 of rent with a 5 service charge is
 * taxed on 105 — the client's own example.
 *
 * ⚠️ A HISTORY, NOT A SETTING. Rates move — hotel rates in Bangladesh have
 * changed more than once, sometimes mid-year — so a new rate is a new ROW with
 * its own start date and the old one is closed the day before. Editing the
 * figure in place would silently restate what old bills were made at.
 *
 * ⚠️ AND NOTHING HERE REACHES A BILL ALREADY MADE. Every folio line copies the
 * rate it was billed at onto itself and is read back from that for ever. This
 * screen answers "what should the NEXT line be billed at".
 *
 * ⚠️ THE RATE SHIPS AT ZERO, deliberately. A guessed figure prints wrong bills
 * silently; a zero prints a visible zero that somebody asks about. Until the
 * property has said, zero is the only honest number — and the empty state says
 * so rather than looking unfinished.
 */

const asText = (date: Date | null) => {
  if (!date) return '';

  // Local parts, never toISOString(): a rate starts on a calendar date, and
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

const percent = (value: any) => `${Number(value ?? 0).toFixed(2)}%`;

const TAX_NAMES: Record<string, string> = {
  service_charge: 'Service charge',
};

const blank = () => ({
  service_charge_rate: '',
  effective_from: asText(new Date()),
  notes: '',
});

const TaxRatesTab = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [current, setCurrent] = useState<any>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await httpService.get(API_HOTEL_TAX_RATE_URL);
      const data = res?.data?.data?.data ?? res?.data?.data ?? {};

      setRows(data.rows ?? []);
      setCurrent(data.current ?? null);
      setNote(data.note ?? '');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not read the rates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    // ⚠️ Empty is not zero here. A form sent with the box left blank would set
    // the service charge to nothing, which is a real answer somebody has to give
    // on purpose — so it is typed rather than defaulted.
    if (form?.service_charge_rate === '') {
      toast.error('Give the rate. Nought is an answer, but it has to be typed.');
      return;
    }

    if (!form?.effective_from) {
      toast.error('Say which day the new rates start.');
      return;
    }

    setSaving(true);

    try {
      const res = await httpService.post(`${API_HOTEL_TAX_RATE_URL}/store`, {
        service_charge_rate: form.service_charge_rate,
        effective_from: form.effective_from,
        notes: form.notes || null,
      });

      toast.success(res?.data?.message || 'Saved');
      setForm(null);
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not save the rates');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: any) => {
    setSaving(true);

    try {
      const res = await httpService.post(`${API_HOTEL_TAX_RATE_URL}/delete/${row.id}`, {});
      toast.success(res?.data?.message || 'Removed');
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not remove it');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'tax_type',
      header: 'Charge',
      render: (row: any) => (
        <div>
          <div className="text-black dark:text-white">
            {TAX_NAMES[row.tax_type] ?? row.tax_type}
          </div>
          {row.notes ? (
            <div className="text-xs text-gray-500 dark:text-gray-400">{row.notes}</div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'rate',
      header: 'Rate',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <span className="text-black dark:text-white">{percent(row.rate)}</span>
      ),
    },
    {
      key: 'effective_from',
      header: 'From',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => onTheDay(row.effective_from),
    },
    {
      key: 'effective_to',
      header: 'Until',
      headerClass: 'text-center',
      cellClass: 'text-center',
      // A rate with no end is the one still running. Said in words rather than
      // left as a dash, which in a column of dates reads as missing data.
      render: (row: any) =>
        row.effective_to ? (
          onTheDay(row.effective_to)
        ) : (
          <span className="text-xs text-gray-500 dark:text-gray-400">still in force</span>
        ),
    },
    {
      key: 'in_force',
      header: 'Today',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) =>
        row.in_force ? (
          <span className="inline-flex h-5.5 items-center rounded border border-teal-400 bg-teal-100 px-2 text-[0.65rem] font-semibold leading-none text-teal-900 dark:border-teal-400/60 dark:bg-teal-500/25 dark:text-teal-50">
            in use
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
    {
      key: 'is_shipped',
      header: 'Set by',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) =>
        row.is_shipped ? (
          <span
            className="text-xs text-gray-500 dark:text-gray-400"
            title="Ships with the system at nought, so a property that has set nothing bills no tax rather than a guessed one."
          >
            shipped
          </span>
        ) : (
          <span className="text-xs text-gray-500 dark:text-gray-400">this property</span>
        ),
    },
    {
      key: 'actions',
      header: 'Action',
      headerClass: 'w-28 text-center',
      cellClass: 'text-center',
      render: (row: any) => {
        // Only a rate of this property's own that has not started yet. One
        // already in force has had bills made under it, and a rate table that
        // forgets those cannot explain them.
        const removable = !row.is_shipped && !row.in_force && !row.effective_to;

        return (
          <div className="flex items-center justify-center gap-2">
            {/* ⚠️ Opens the form; it does NOT edit this row in place. A rate in
                force has bills made under it and never changes -- what "edit"
                means here is "carry these figures into a new rate from a new
                day", which is the only honest way to change one. A shipped row
                opened this way writes THIS property's own rates and leaves the
                shipped nought where it is, for every other tenant. */}
            <ActionButtons
              row={row}
              showEdit
              handleEdit={(one: any) =>
                setForm({
                  // The pair as it stands today, with the row that was pressed
                  // showing its own figure -- a form that opened blank would
                  // read as "set both from nothing" when only one is in
                  // question.
                  service_charge_rate: Number(one.rate),

                  // ⚠️ Today for anything already in force, and for a shipped
                  // row. Reusing its own start date would rewrite the rate old
                  // bills were made at. A future rate this property set and has
                  // not used yet is the one case that may be corrected on its
                  // own date.
                  effective_from:
                    !one.is_shipped && !one.in_force && !one.effective_to
                      ? String(one.effective_from ?? '').slice(0, 10)
                      : asText(new Date()),

                  notes: one.is_shipped ? '' : one.notes ?? '',
                })
              }
            />

            {removable ? (
              <button
                type="button"
                onClick={() => remove(row)}
                aria-label="Remove this rate"
                title="Remove — it has not been used on a bill yet"
                className="btn btn-sm btn-outline flex h-5 w-5 cursor-pointer items-center justify-center"
              >
                <FiTrash2 className="text-lg text-red-600" />
              </button>
            ) : null}
          </div>
        );
      },
    },
  ];

  if (loading && !rows.length) return <Loader />;

  return (
    <div>
      {note ? (
        <p className="mb-3 rounded border border-stroke p-2.5 text-xs leading-snug text-gray-600 dark:border-strokedark dark:text-gray-300">
          {note}
        </p>
      ) : null}

      {/* What a bill made today would be taxed at, worked out by the same
          lookup the bill itself uses. Read off the list it would be a guess:
          this property's rows and the shipped ones sit in it together, and
          which of them wins on a given day is a rule, not the top row. */}
      {current ? (
        <div className="mb-3 flex flex-wrap items-center gap-4 rounded border border-stroke p-2.5 text-sm dark:border-strokedark">
          <span className="text-gray-500 dark:text-gray-400">A bill made today:</span>
          <span className="text-black dark:text-white">
            Service charge <strong>{percent(current.service_charge)}</strong>
          </span>
          {!Number(current.service_charge) ? (
            <span className="text-xs text-amber-700 dark:text-amber-300">
              At nought — no service charge on a bill. Press <strong>Set new rates</strong> to set
              one.
            </span>
          ) : null}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            VAT is the item&rsquo;s — set it on <strong>Room Types</strong> and{' '}
            <strong>Charges</strong>.
          </span>
        </div>
      ) : null}

      <div className="mb-2">
        <ButtonLoading
          onClick={() => setForm(form ? null : blank())}
          label={form ? 'Close' : 'Set new rates'}
          icon={form ? <FiX size={16} /> : <FiPlus size={16} />}
        />
      </div>

      {form ? (
        <div className="mb-4 rounded border border-stroke p-3 dark:border-strokedark">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <InputElement
              id="tax_service_charge_rate"
              name="service_charge_rate"
              label="Service charge %"
              type="number"
              min={0}
              max={100}
              value={String(form.service_charge_rate ?? '')}
              onChange={(e: any) => setForm({ ...form, service_charge_rate: e.target.value })}
              description="The hotel’s own takings — income, not a tax."
            />
            <div>
              <InputDatePicker
                id="tax_effective_from"
                name="effective_from"
                label="From"
                selectedDate={asDate(form.effective_from)}
                setSelectedDate={(date: Date | null) =>
                  setForm({ ...form, effective_from: asText(date) })
                }
                setCurrentDate={() => undefined}
                className="w-full"
              />
              <p className="mt-1 text-xs leading-snug text-gray-500 dark:text-gray-400">
                Bills made before this day keep the rates they were made at.
              </p>
            </div>
            <InputElement
              id="tax_notes"
              name="notes"
              label="Note"
              placeholder="SRO 2026-08, per the consultant"
              value={form.notes ?? ''}
              onChange={(e: any) => setForm({ ...form, notes: e.target.value })}
              description="Where the figure came from, for whoever reads this next year."
            />
          </div>

          <p className="mt-2 text-xs leading-snug text-gray-500 dark:text-gray-400">
            VAT falls on the service charge as well as on the room: 100 of rent with a 5 service
            charge is taxed on <strong>105</strong>. Each item is taxed at its own rate — 15% on
            an air-conditioned room, 7.5% without, 5% on food.
          </p>

          {/* The one thing somebody looking at a row of "shipped 0.00%" needs
              told: those two are the server's, shared by every property, and
              saving here writes this property's own pair over the top of them
              rather than changing them for anybody else. */}
          <p className="mt-1 text-xs leading-snug text-gray-500 dark:text-gray-400">
            Saving writes <strong>this property&rsquo;s own rate</strong> from the day given. The
            one that ships at nought stays where it is — nothing changes for any other property,
            and no line already billed is touched.
          </p>

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

      <Table
        columns={columns}
        data={rows}
        noDataMessage="No rates on file. Two ship at nought, so bills carry no tax until somebody sets them."
      />
    </div>
  );
};

export default TaxRatesTab;
