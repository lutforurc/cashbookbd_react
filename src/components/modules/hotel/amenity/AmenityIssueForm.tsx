import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiPlus, FiRefreshCcw, FiSave, FiTrash2 } from 'react-icons/fi';
import dayjs from 'dayjs';

import HelmetTitle from '../../../utils/others/HelmetTitle';
import InputElement from '../../../utils/fields/InputElement';
import InputDatePicker from '../../../utils/fields/DatePicker';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import { FIELD_LABEL } from '../../../../theme/fieldStyles';

import httpService from '../../../services/httpService';
import {
  API_HOTEL_AMENITY_KIT_URL,
  API_HOTEL_BOOKING_URL,
  API_HOTEL_BUILDING_URL,
  API_HOTEL_ITEM_STOCK_URL,
} from '../../../services/apiRoutes';
import routes from '../../../services/appRoutes';
import ExpenseItemSelect, { ExpenseItem } from './ExpenseItemSelect';

/**
 * Taking expense items out of the hotel's store -- and the two entries that keep
 * its count honest: the opening, and a count adjustment.
 *
 *   ?kind=issue    (default) what went to a building, perhaps for an event
 *   ?kind=opening  what was on the shelf on day one
 *   ?kind=adjust   what a count found -- the difference from the book is saved
 *
 * ⚠️ THE ITEMS ARE ASSETS → ITEMS OF KIND EXPENSE, not the shop's products. They
 * were charged to their expense head the day they were bought, so nothing here
 * moves money; it moves the QUANTITY the Stock Balance reads.
 *
 * ⚠️ THE QUANTITIES FROM THE KITS ARE A SUGGESTION UNTIL SAVED. "Load from kits"
 * fills the lines in with what the nights expected less what has already gone
 * out; every one of them can be changed. Generating the issue outright would make
 * what went out equal what the kit expected by construction, and the variance
 * report would be a mirror of the kit rather than a check on it.
 *
 * ⚠️ AN ISSUE MAY TAKE AN ITEM BELOW NOUGHT. The kitchen does not stop because a
 * purchase is not entered yet; the save says which items went negative.
 */

type Kind = 'issue' | 'opening' | 'adjust';

const TITLES: Record<Kind, string> = {
  issue: 'New Amenity Issue',
  opening: 'Opening Stock',
  adjust: 'Count Adjustment',
};

/**
 * The date boxes speak Date objects, the form and the API 'YYYY-MM-DD' strings
 * -- translated here, through dayjs rather than new Date(), which reads a bare
 * date as UTC and can hand back yesterday.
 */
const asDate = (value: string) => (value ? dayjs(value).toDate() : null);
const asText = (date: Date | null) => (date ? dayjs(date).format('YYYY-MM-DD') : '');
const today = () => dayjs().format('YYYY-MM-DD');

type Line = {
  key: number;
  itemId: number;
  itemName: string;
  unit: string;
  /** issue / opening: how many. adjust: what the count found. */
  quantity: string;
};

const AmenityIssueForm = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const kind: Kind = (['issue', 'opening', 'adjust'].includes(params.get('kind') ?? '')
    ? params.get('kind')
    : 'issue') as Kind;
  const isIssue = kind === 'issue';
  const isAdjust = kind === 'adjust';

  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [buildingOptions, setBuildingOptions] = useState<{ id: string; name: string }[]>([]);
  const [bookingOptions, setBookingOptions] = useState<{ id: string; name: string }[]>([]);

  const [form, setForm] = useState({
    date: today(),
    buildingId: '',
    bookingId: '',
    receivedBy: '',
    note: '',
  });

  const [lines, setLines] = useState<Line[]>([]);
  const [pick, setPick] = useState<ExpenseItem | null>(null);
  const [qty, setQty] = useState('');

  /**
   * ⚠️ The month so far, ending YESTERDAY. stay_date is the night SLEPT, and
   * tonight has not been -- a range ending today would stock rooms against
   * guests who may still cancel at six o'clock.
   */
  const [from, setFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().subtract(1, 'day').format('YYYY-MM-DD'));
  const [dueNote, setDueNote] = useState('');
  const [settled, setSettled] = useState<any[]>([]);
  const [loadingDue, setLoadingDue] = useState(false);

  const set = (field: string) => (e: any) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  /**
   * The items with what is on hand ON THE ENTRY'S DATE -- an adjustment dated
   * last Friday is measured against last Friday's book, and the server does the
   * same.
   */
  const loadItems = useCallback(async (asOf: string) => {
    try {
      const res = await httpService.get(`${API_HOTEL_ITEM_STOCK_URL}/items`, { params: { as_of: asOf } });
      const list = res?.data?.data?.data ?? res?.data?.data ?? [];
      setItems(Array.isArray(list) ? list : []);
    } catch (error: any) {
      setItems([]);
      toast.error(error?.response?.data?.message || 'Could not read the items');
    }
  }, []);

  useEffect(() => {
    loadItems(form.date);
  }, [form.date, loadItems]);

  useEffect(() => {
    if (!isIssue) return;

    httpService
      .get(`${API_HOTEL_BUILDING_URL}/ddl`)
      .then((res: any) => {
        const list = res?.data?.data?.data ?? res?.data?.data ?? [];
        setBuildingOptions([
          { id: '', name: 'Select a building' },
          ...(Array.isArray(list) ? list : []).map((b: any) => ({
            id: String(b.id ?? b.value),
            name: b.name ?? b.label,
          })),
        ]);
      })
      .catch(() => setBuildingOptions([{ id: '', name: 'Select a building' }]));

    // ⚠️ Swallowed into an empty list on purpose. This list answers to
    // hotel.booking.view, which a storekeeper may well not hold, and an OPTIONAL
    // tag is not worth refusing an issue over.
    httpService
      .get(API_HOTEL_BOOKING_URL, { params: { per_page: 50, kind: 'all' } })
      .then((res: any) => {
        const root = res?.data?.data?.data ?? res?.data?.data ?? [];
        const list = Array.isArray(root) ? root : root?.data ?? [];

        setBookingOptions([
          { id: '', name: 'Not for one event' },
          ...list.map((b: any) => ({
            id: String(b.id),
            name: `${b.booking_no}${b.booker_name ? ' — ' + b.booker_name : ''}`,
          })),
        ]);
      })
      .catch(() => setBookingOptions([{ id: '', name: 'Not for one event' }]));
  }, [isIssue]);

  const onHand = useMemo(() => {
    const map: Record<number, number> = {};
    items.forEach((item) => {
      map[item.id] = Number(item.on_hand ?? 0);
    });
    return map;
  }, [items]);

  /**
   * Fill the lines in from what the rooms are still owed.
   *
   * ⚠️ The server answers with expected LESS what has already gone out over
   * those nights, so pressing this twice over the same dates brings back nothing
   * the second time.
   */
  const loadFromKits = async () => {
    setLoadingDue(true);

    try {
      const res = await httpService.get(`${API_HOTEL_AMENITY_KIT_URL}/due`, {
        params: { from, to, building_id: form.buildingId || undefined },
      });

      const data = res?.data?.data?.data ?? res?.data?.data ?? {};
      const rows = Array.isArray(data.rows) ? data.rows : [];

      setDueNote(data.note ?? '');
      setSettled(Array.isArray(data.settled) ? data.settled : []);

      if (!rows.length) {
        toast.info(data.note || 'Nothing is due for those nights.');
        return;
      }

      // ⚠️ Added to what is on the form, never over it. A line somebody typed by
      // hand is a decision; only what is missing is appended.
      const already = new Set(lines.map((row) => row.itemId));
      const fresh = rows.filter((row: any) => !already.has(Number(row.item_id)));

      if (!fresh.length) {
        toast.info('Every item due is already on the list.');
        return;
      }

      const stamp = Date.now();

      setLines((prev) => [
        ...prev,
        ...fresh.map((row: any, index: number) => ({
          key: stamp + index,
          itemId: Number(row.item_id),
          itemName: row.item_name,
          unit: row.unit_name || '',
          quantity: String(row.due),
        })),
      ]);

      setForm((prev) => ({ ...prev, note: prev.note || `Room make-up ${from} to ${to}` }));
      toast.success(`${fresh.length} line(s) loaded. Change any quantity before saving.`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not work out what is due');
    } finally {
      setLoadingDue(false);
    }
  };

  const addLine = () => {
    if (!pick) {
      toast.error('Pick an item first');
      return;
    }

    // An adjustment may find nought; anything else needs a quantity.
    if (isAdjust ? qty === '' || Number(qty) < 0 : !Number(qty)) {
      toast.error(isAdjust ? 'How many did the count find?' : 'How many of them?');
      return;
    }

    if (lines.some((row) => row.itemId === pick.id)) {
      toast.error('That item is already on the list');
      return;
    }

    setLines((prev) => [
      ...prev,
      { key: Date.now(), itemId: pick.id, itemName: pick.name, unit: pick.unit_name ?? '', quantity: qty },
    ]);
    setPick(null);
    setQty('');
  };

  const reset = () => {
    setForm({ date: today(), buildingId: '', bookingId: '', receivedBy: '', note: '' });
    setLines([]);
    setPick(null);
    setQty('');
    setDueNote('');
    setSettled([]);
  };

  const save = async () => {
    // ⚠️ An issue has to say WHERE it went. The server holds the same rule --
    // this is only so the message arrives before the round trip.
    if (isIssue && !form.buildingId) {
      toast.error('Which building is this going to?');
      return;
    }

    if (!lines.length) {
      toast.error('Nothing on the list yet');
      return;
    }

    setSaving(true);

    try {
      const res = await httpService.post(`${API_HOTEL_ITEM_STOCK_URL}/store`, {
        kind,
        move_date: form.date || null,
        hotel_building_id: isIssue && form.buildingId ? Number(form.buildingId) : null,
        hotel_booking_id: isIssue && form.bookingId ? Number(form.bookingId) : null,
        received_by: isIssue ? form.receivedBy || null : null,
        note: form.note || null,
        lines: lines.map((row) =>
          isAdjust
            ? { item_id: row.itemId, counted: Number(row.quantity) }
            : { item_id: row.itemId, quantity: Number(row.quantity) },
        ),
      });

      // ⚠️ A refusal rides HTTP 200 with success:false.
      const body = res?.data;

      if (!body?.success) {
        toast.error(body?.message || 'The server refused that.');
        return;
      }

      const negative = body?.data?.data?.negative ?? [];

      if (negative.length) {
        toast.warn(body.message, { autoClose: 9000 });
      } else {
        toast.success(body.message || 'Saved');
      }

      reset();
      navigate(routes.hotel_amenity_issue);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not save it');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <HelmetTitle title={TITLES[kind]} />

      {/* The page's name is HelmetTitle's to show. */}
      <div className="mb-3">
        <ButtonLoading
          onClick={() => navigate(routes.hotel_amenity_issue)}
          label="Back to the list"
          icon={<FiArrowLeft size={16} />}
        />
      </div>

      <p className="mb-3 rounded border border-stroke bg-gray-50 p-2.5 text-xs leading-snug text-gray-600 dark:border-strokedark dark:bg-meta-4/40 dark:text-gray-300">
        {isIssue ? (
          <>
            Nothing leaves the store until you press <strong>Save</strong>. Quantities loaded from
            the kits are a suggestion — change any of them first.
          </>
        ) : isAdjust ? (
          <>
            Enter what the count <strong>found</strong>. The difference from the book is saved; an
            item whose count matches the book is left alone.
          </>
        ) : (
          <>
            What was on the shelf on the day the store started being counted. One opening per
            item — a later difference is a count adjustment.
          </>
        )}{' '}
        Quantities only — the cost was charged to the expense head when the item was bought.
      </p>

      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
        <InputDatePicker
          id="moveDate"
          name="moveDate"
          label="Date"
          selectedDate={asDate(form.date)}
          setSelectedDate={(date: Date | null) => setForm((prev) => ({ ...prev, date: asText(date) }))}
          setCurrentDate={(date: Date | null) => setForm((prev) => ({ ...prev, date: asText(date) }))}
          className="w-full"
        />

        {isIssue ? (
          <>
            <DropdownCommon
              id="buildingId"
              name="buildingId"
              label="Building"
              data={buildingOptions}
              value={form.buildingId}
              onChange={set('buildingId')}
              description="Housekeeping and the store follow the building, not the floor."
            />

            <DropdownCommon
              id="bookingId"
              name="bookingId"
              label="For which booking / event"
              data={bookingOptions}
              value={form.bookingId}
              onChange={set('bookingId')}
              description="Leave blank for the rooms' own make-up, staff meals and general use. Naming the event is what makes its material cost readable afterwards — and it cannot be added later."
            />

            <InputElement
              id="receivedBy"
              name="receivedBy"
              label="Received by"
              placeholder="Housekeeper / cook"
              value={form.receivedBy}
              onChange={set('receivedBy')}
            />
          </>
        ) : null}

        <InputElement
          id="note"
          name="note"
          label="Note"
          placeholder="Optional"
          value={form.note}
          onChange={set('note')}
        />
      </div>

      {/* ⚠️ It fills the form in; it issues nothing. */}
      {isIssue ? (
        <div className="mb-3 rounded border border-stroke p-3 dark:border-strokedark">
          <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-4">
            <InputDatePicker
              id="dueFrom"
              name="dueFrom"
              label="Nights from"
              selectedDate={asDate(from)}
              setSelectedDate={(date: Date | null) => setFrom(asText(date))}
              setCurrentDate={(date: Date | null) => setFrom(asText(date))}
              className="w-full"
            />
            <InputDatePicker
              id="dueTo"
              name="dueTo"
              label="To"
              selectedDate={asDate(to)}
              setSelectedDate={(date: Date | null) => setTo(asText(date))}
              setCurrentDate={(date: Date | null) => setTo(asText(date))}
              className="w-full"
            />
            <ButtonLoading
              onClick={loadFromKits}
              buttonLoading={loadingDue}
              label="Load from amenity kits"
              variant="primary"
              icon={<FiPlus size={16} />}
            />
          </div>

          <p className="mt-2 text-xs leading-snug text-gray-500 dark:text-gray-400">
            {dueNote ||
              'Works the quantities out from the kits — rooms sold on those nights, less what has already been issued against them. Every quantity can be changed before saving.'}
          </p>

          {/* ⚠️ Why a kit of three filled only two lines in. */}
          {settled.length ? (
            <p className="mt-2 text-xs leading-snug text-amber-700 dark:text-amber-300">
              Nothing due on{' '}
              {settled
                .map(
                  (row: any) =>
                    `${row.item_name} (${Number(row.expected)} expected, ${Number(row.issued)} already issued${
                      row.unit_name ? ' ' + row.unit_name : ''
                    })`,
                )
                .join('; ')}
              .
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mb-3 rounded border border-stroke p-3 dark:border-strokedark">
        <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-12">
          <div className="md:col-span-6">
            <label htmlFor="stockItem" className={`${FIELD_LABEL} text-left text-sm`}>
              Item
            </label>
            <ExpenseItemSelect
              id="stockItem"
              items={items}
              value={pick?.id ?? null}
              onSelect={setPick}
              showOnHand
            />
            {pick ? (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                On hand: {onHand[pick.id] ?? 0} {pick.unit_name ?? ''}
              </p>
            ) : null}
          </div>

          <div className="md:col-span-3">
            <InputElement
              id="lineQty"
              name="quantity"
              type="number"
              min={0}
              label={`${isAdjust ? 'Counted' : 'Quantity'}${pick?.unit_name ? ` (${pick.unit_name})` : ''}`}
              placeholder="0"
              value={qty}
              onChange={(e: any) => setQty(e.target.value)}
            />
          </div>

          <div className="md:col-span-3">
            <ButtonLoading onClick={addLine} label="Add item" icon={<FiPlus size={16} />} />
          </div>
        </div>

        {lines.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stroke text-left dark:border-strokedark">
                  <th className="py-1 pr-2">Item</th>
                  <th className="py-1 pr-2 text-right">On hand</th>
                  <th className="py-1 pr-2 text-right">{isAdjust ? 'Counted' : 'Quantity'}</th>
                  {isAdjust ? <th className="py-1 pr-2 text-right">Difference</th> : null}
                  <th className="w-16 py-1 text-center">Out</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((row) => {
                  const book = onHand[row.itemId] ?? 0;
                  const diff = Math.round((Number(row.quantity) - book) * 1000) / 1000;

                  return (
                    <tr key={row.key} className="border-b border-stroke dark:border-strokedark">
                      <td className="py-1 pr-2">{row.itemName}</td>
                      <td className="py-1 pr-2 text-right tabular-nums text-gray-500 dark:text-gray-400">
                        {book} {row.unit}
                      </td>
                      <td className="py-1 pr-2 text-right">
                        {/* Editable in place: a loaded quantity is a suggestion. */}
                        <input
                          type="number"
                          min={0}
                          value={row.quantity}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((item) =>
                                item.key === row.key ? { ...item, quantity: e.target.value } : item,
                              ),
                            )
                          }
                          className="w-24 rounded border border-stroke bg-transparent px-2 py-1 text-right dark:border-strokedark"
                        />
                        <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">{row.unit}</span>
                      </td>
                      {isAdjust ? (
                        <td
                          className={`py-1 pr-2 text-right tabular-nums ${
                            diff < 0 ? 'text-rose-600' : diff > 0 ? 'text-emerald-700' : 'text-gray-400'
                          }`}
                        >
                          {diff > 0 ? '+' : ''}
                          {diff}
                        </td>
                      ) : null}
                      <td className="py-1 text-center">
                        <button
                          type="button"
                          className="text-rose-600 hover:text-rose-700 dark:text-rose-400"
                          onClick={() => setLines((prev) => prev.filter((i) => i.key !== row.key))}
                          title="Take this line off"
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {isIssue
              ? 'Nothing on the issue yet — load it from the kits above, or add an item by hand.'
              : 'Nothing on the list yet — add an item above.'}
          </p>
        )}

        <div className="mt-3 flex gap-2">
          <ButtonLoading
            onClick={save}
            buttonLoading={saving}
            label="Save"
            variant="primary"
            icon={<FiSave size={16} />}
          />
          <ButtonLoading onClick={reset} label="Reset" icon={<FiRefreshCcw size={16} />} />
        </div>
      </div>
    </div>
  );
};

export default AmenityIssueForm;
