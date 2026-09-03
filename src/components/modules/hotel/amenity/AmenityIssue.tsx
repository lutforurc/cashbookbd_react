import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FiPlus, FiRefreshCcw, FiSave, FiTrash2 } from 'react-icons/fi';
import dayjs from 'dayjs';

import HelmetTitle from '../../../utils/others/HelmetTitle';
import InputElement from '../../../utils/fields/InputElement';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import RequisitionItemsDropdown from '../../../utils/utils-functions/RequisitionItemsDropdown';
import WarehouseDropdown from '../../../utils/utils-functions/WarehouseDropdown';
import Table from '../../../utils/others/Table';
import Loader from '../../../../common/Loader';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import { FIELD_LABEL } from '../../../../theme/fieldStyles';

import httpService from '../../../services/httpService';
import {
  API_HOTEL_AMENITY_KIT_URL,
  API_HOTEL_BOOKING_URL,
  API_HOTEL_BUILDING_URL,
  API_MATERIAL_ISSUE_LIST_URL,
  API_MATERIAL_ISSUE_STORE_URL,
} from '../../../services/apiRoutes';
import { getDdlWarehouse } from '../../warehouse/ddlWarehouseSlider';

/**
 * Issuing what the rooms are made up with -- §39.1.
 *
 * A screen of the hotel's own rather than two fields on the construction form.
 * The two jobs look alike and are not: a site issues cement against a PROJECT
 * and writes a work item on every line; a hotel issues soap against a BUILDING,
 * sometimes for an EVENT, and works its quantities out from the kits. Putting
 * both on one form left a storekeeper on fifteen sites skipping boxes that will
 * never apply to them.
 *
 * ⚠️ IT SAVES AN ORDINARY MATERIAL ISSUE. Same endpoint, same voucher, same
 * stock movement, same reports -- what leaves the store here is indistinguishable
 * from what leaves it on the other screen, and deliberately so. Only the form is
 * different.
 *
 * ⚠️ THE QUANTITIES ARE A SUGGESTION UNTIL SAVED. "Load from kits" fills the
 * lines in with what the nights expected less what has already gone out; every
 * one of them can be changed. Generating the issue outright -- on check-in, or
 * nightly -- would make what went out equal what the kit expected by
 * construction, and the variance report would be a mirror of the kit rather
 * than a check on it (OPEN-3: batch issue is primary).
 *
 * ⚠️ IT ISSUES FROM THE BRANCH THE USER IS SIGNED IN TO, and there is no
 * property chooser for that reason: the server writes the issue and its voucher
 * into the caller's own branch, and a dropdown suggesting otherwise would be a
 * lie the first time somebody used it.
 */

type IssueLine = {
  id: number;
  productId: string;
  productName: string;
  unit: string;
  quantity: string;
};

const today = () => dayjs().format('YYYY-MM-DD');

const AmenityIssue = () => {
  const dispatch = useDispatch<any>();
  const warehouseState = useSelector((s: any) => s.activeWarehouse);
  const warehouseOptions = Array.isArray(warehouseState?.data) ? warehouseState.data : [];
  const settings = useSelector((s: any) => s.settings?.data);

  const [saving, setSaving] = useState(false);
  const [buildingOptions, setBuildingOptions] = useState<{ id: string; name: string }[]>([]);
  const [bookingOptions, setBookingOptions] = useState<{ id: string; name: string }[]>([]);

  const [form, setForm] = useState({
    issueDate: today(),
    warehouseId: '',
    buildingId: '',
    bookingId: '',
    receivedBy: '',
    note: '',
  });

  const [lines, setLines] = useState<IssueLine[]>([]);
  const [line, setLine] = useState({ productId: '', productName: '', unit: '', quantity: '' });

  /**
   * ⚠️ The month so far, ending YESTERDAY. stay_date is the night SLEPT, and
   * tonight has not been -- a range ending today would stock rooms against
   * guests who may still cancel at six o'clock.
   */
  const [from, setFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().subtract(1, 'day').format('YYYY-MM-DD'));
  const [dueNote, setDueNote] = useState('');
  const [loadingDue, setLoadingDue] = useState(false);

  const [issues, setIssues] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const set = (field: string) => (e: any) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const loadList = useCallback(async () => {
    setListLoading(true);

    try {
      const res = await httpService.get(API_MATERIAL_ISSUE_LIST_URL, {
        params: { perPage: 10, branch_id: settings?.branch?.id || undefined },
      });
      const root = res?.data?.data?.data ?? res?.data?.data ?? [];

      setIssues(Array.isArray(root) ? root : root?.data ?? []);
    } catch {
      setIssues([]);
    } finally {
      setListLoading(false);
    }
  }, [settings?.branch?.id]);

  useEffect(() => {
    dispatch(getDdlWarehouse());
    loadList();

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
    // tag is not worth refusing an issue over. They get the screen without the
    // picker rather than an error they cannot act on.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  /**
   * Fill the lines in from what the rooms are still owed.
   *
   * ⚠️ The server answers with expected LESS what has already gone out over
   * those nights, so pressing this twice over the same dates brings back nothing
   * the second time. No flag on the issue, no lock, no extra table -- the
   * subtraction is the guard.
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

      if (!rows.length) {
        toast.info(data.note || 'Nothing is due for those nights.');
        return;
      }

      // ⚠️ Added to what is on the form, never over it. A line somebody typed by
      // hand is a decision; only what is missing is appended.
      const already = new Set(lines.map((row) => String(row.productId)));
      const fresh = rows.filter((row: any) => !already.has(String(row.product_id)));

      if (!fresh.length) {
        toast.info('Every product due is already on the list.');
        return;
      }

      const stamp = Date.now();

      setLines((prev) => [
        ...prev,
        ...fresh.map((row: any, index: number) => ({
          id: stamp + index,
          productId: String(row.product_id),
          productName: row.product_name,
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
    if (!line.productId) {
      toast.error('Pick a product first');
      return;
    }

    if (!Number(line.quantity)) {
      toast.error('How many of them?');
      return;
    }

    if (lines.some((row) => String(row.productId) === String(line.productId))) {
      toast.error('That product is already on the list');
      return;
    }

    setLines((prev) => [...prev, { ...line, id: Date.now() }]);
    setLine({ productId: '', productName: '', unit: '', quantity: '' });
  };

  const reset = () => {
    setForm({
      issueDate: today(),
      warehouseId: '',
      buildingId: '',
      bookingId: '',
      receivedBy: '',
      note: '',
    });
    setLines([]);
    setLine({ productId: '', productName: '', unit: '', quantity: '' });
    setDueNote('');
  };

  const save = async () => {
    // ⚠️ An issue has to say WHERE it went. The server holds the same rule --
    // this is only so the message arrives before the round trip.
    if (!form.buildingId) {
      toast.error('Which building is this going to?');
      return;
    }

    if (!lines.length) {
      toast.error('Nothing to issue yet');
      return;
    }

    setSaving(true);

    try {
      const res = await httpService.post(API_MATERIAL_ISSUE_STORE_URL, {
        issue_date: form.issueDate || null,
        from_warehouse_id: form.warehouseId ? Number(form.warehouseId) : null,
        // No project: a hotel has none, which is why the server asks for a
        // project OR a building rather than for a project.
        project_id: null,
        hotel_building_id: Number(form.buildingId),
        hotel_booking_id: form.bookingId ? Number(form.bookingId) : null,
        received_by: form.receivedBy || null,
        note: form.note || null,
        items: lines.map((row) => ({
          product_id: Number(row.productId),
          quantity: Number(row.quantity),
        })),
      });

      const saved = res?.data?.data?.data ?? res?.data?.data ?? {};

      toast.success(
        `${res?.data?.message || 'Issued'}${saved?.vr_no ? ` — voucher ${saved.vr_no}` : ''}`,
        { autoClose: 6000 },
      );

      reset();
      loadList();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not save the issue');
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      { key: 'issue_no', header: 'Issue No' },
      { key: 'issue_date', header: 'Date' },
      {
        key: 'building_name',
        header: 'Building',
        render: (row: any) =>
          row.building_name || row.project_name || <span className="text-gray-400">—</span>,
      },
      {
        key: 'booking_no',
        header: 'Event',
        render: (row: any) =>
          row.booking_no ? (
            <span className="text-black dark:text-white">{row.booking_no}</span>
          ) : (
            <span className="text-gray-400">—</span>
          ),
      },
      {
        key: 'warehouse_name',
        header: 'Store',
        render: (row: any) => row.warehouse_name || <span className="text-gray-400">—</span>,
      },
      {
        key: 'item_count',
        header: 'Items',
        headerClass: 'text-center',
        cellClass: 'text-center',
      },
      {
        key: 'total_qty',
        header: 'Total qty',
        headerClass: 'text-right',
        cellClass: 'text-right tabular-nums',
        render: (row: any) => Number(row.total_qty ?? 0),
      },
      {
        key: 'vr_no',
        header: 'Voucher',
        render: (row: any) => row.vr_no || <span className="text-gray-400">—</span>,
      },
    ],
    [],
  );

  return (
    <div>
      <HelmetTitle title="Amenity Issue" />

      <p className="mb-3 rounded border border-stroke bg-gray-50 p-2.5 text-xs leading-snug text-gray-600 dark:border-strokedark dark:bg-meta-4/40 dark:text-gray-300">
        Soap, towels, tissue and kitchen material going out of the store to a building — and, where
        it is for one, to an event. It saves an <strong>ordinary material issue</strong>: same
        voucher, same stock movement, same reports as the Material Issue screen. Nothing leaves the
        store until you press Save.
      </p>

      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
        <InputElement
          id="issueDate"
          name="issueDate"
          type="date"
          label="Issue date"
          value={form.issueDate}
          onChange={set('issueDate')}
        />

        <div>
          <label className={`${FIELD_LABEL} text-left text-sm`}>From store</label>
          <WarehouseDropdown
            id="warehouseId"
            name="warehouseId"
            className="p-2"
            warehouseDdl={warehouseOptions}
            onChange={set('warehouseId')}
            defaultValue={form.warehouseId}
          />
        </div>

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
          placeholder="Housekeeper / receiver"
          value={form.receivedBy}
          onChange={set('receivedBy')}
        />

        <InputElement
          id="note"
          name="note"
          label="Note"
          placeholder="Optional"
          value={form.note}
          onChange={set('note')}
        />
      </div>

      {/* ⚠️ It fills the form in; it issues nothing. What comes back is what the
          nights expected LESS what has already gone out, so pressing it twice
          over the same dates brings back nothing the second time. */}
      <div className="mb-3 rounded border border-stroke p-3 dark:border-strokedark">
        <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-4">
          <InputElement
            id="dueFrom"
            name="dueFrom"
            type="date"
            label="Nights from"
            value={from}
            onChange={(e: any) => setFrom(e.target.value)}
          />
          <InputElement
            id="dueTo"
            name="dueTo"
            type="date"
            label="To"
            title="A night counts once it is over, so this ends yesterday by default."
            value={to}
            onChange={(e: any) => setTo(e.target.value)}
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
      </div>

      <div className="mb-3 rounded border border-stroke p-3 dark:border-strokedark">
        <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-12">
          <div className="md:col-span-6">
            <label
              htmlFor="issueProduct"
              className={`${FIELD_LABEL} cursor-help text-left text-sm decoration-dotted underline-offset-2 hover:underline`}
              title="Type three letters to search. Anything can be issued here — a product that is on no kit simply is not counted by the variance report."
            >
              Product
            </label>
            <RequisitionItemsDropdown
              id="issueProduct"
              name="issueProduct"
              onSelect={(option: any) =>
                setLine((prev) => ({
                  ...prev,
                  productId: option?.value ?? '',
                  productName: option?.label ?? '',
                  unit: option?.label_3 ?? '',
                }))
              }
              defaultValue={
                line.productId ? { value: line.productId, label: line.productName } : null
              }
              value={line.productId ? { value: line.productId, label: line.productName } : null}
            />
          </div>

          <div className="md:col-span-3">
            <InputElement
              id="lineQty"
              name="quantity"
              type="number"
              min={0}
              label={`Quantity ${line.unit ? `(${line.unit})` : ''}`}
              placeholder="0"
              value={line.quantity}
              onChange={(e: any) => setLine((prev) => ({ ...prev, quantity: e.target.value }))}
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
                  <th className="py-1 pr-2">Product</th>
                  <th className="py-1 pr-2 text-right">Quantity</th>
                  <th className="w-16 py-1 text-center">Out</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((row) => (
                  <tr key={row.id} className="border-b border-stroke dark:border-strokedark">
                    <td className="py-1 pr-2">{row.productName}</td>
                    <td className="py-1 pr-2 text-right">
                      {/* Editable in place: the loaded quantity is a suggestion,
                          and a screen that made somebody delete a line to change
                          a number would have them accept whatever it offered. */}
                      <input
                        type="number"
                        min={0}
                        value={row.quantity}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((item) =>
                              item.id === row.id ? { ...item, quantity: e.target.value } : item,
                            ),
                          )
                        }
                        className="w-24 rounded border border-stroke bg-transparent px-2 py-1 text-right dark:border-strokedark"
                      />
                      <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                        {row.unit}
                      </span>
                    </td>
                    <td className="py-1 text-center">
                      <button
                        type="button"
                        className="text-rose-600 hover:text-rose-700 dark:text-rose-400"
                        onClick={() => setLines((prev) => prev.filter((i) => i.id !== row.id))}
                        title="Take this line off the issue"
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Nothing on the issue yet — load it from the kits above, or add a product by hand.
          </p>
        )}

        <div className="mt-3 flex gap-2">
          <ButtonLoading
            onClick={save}
            buttonLoading={saving}
            label="Save issue"
            variant="primary"
            icon={<FiSave size={16} />}
          />
          <ButtonLoading onClick={reset} label="Reset" icon={<FiRefreshCcw size={16} />} />
        </div>
      </div>

      <div className="mb-2 text-sm font-semibold text-black dark:text-white">Recent issues</div>

      <div className="relative">
        {listLoading ? <Loader /> : null}
        <Table
          columns={columns}
          data={issues}
          noDataMessage="No issues from this property yet."
        />
      </div>
    </div>
  );
};

export default AmenityIssue;
