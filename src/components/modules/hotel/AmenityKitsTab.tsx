import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiTrash2 } from 'react-icons/fi';

import { FIELD_LABEL } from '../../../theme/fieldStyles';
import ActionButtons from '../../utils/fields/ActionButton';
import InputElement from '../../utils/fields/InputElement';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import RequisitionItemsDropdown from '../../utils/utils-functions/RequisitionItemsDropdown';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';

import SetupShell from './SetupShell';
import httpService from '../../services/httpService';
import { API_HOTEL_AMENITY_KIT_URL } from '../../services/apiRoutes';

/**
 * What a room of each kind is made up with -- §4.3.
 *
 * ⚠️ NOTHING HERE ISSUES ANYTHING. Soap, towels and tissue leave the store the
 * way they always have -- by hand, through Material Issue, on one voucher. What
 * is written here is the STANDARD those issues are measured against, and until
 * somebody fills it in the variance report has nothing to compare and says so.
 * The screen has to lead with that, or the first person to open it will expect
 * saving a kit to move stock.
 *
 * ⚠️ PER ROOM AND PER GUEST ARE DIFFERENT NUMBERS, and choosing wrongly is the
 * one mistake this form can make quietly. A tissue box is per ROOM whether one
 * guest sleeps there or four; a towel is per GUEST. Get it backwards on a
 * four-bed dormitory and the expectation is four times what the room receives,
 * for ever, and the variance reads as theft.
 *
 * ⚠️ ONE KIT PER ROOM TYPE, which is why the room type cannot be changed on an
 * existing kit. Every expectation multiplies this list by nights and by guests;
 * two kits for one room type would double the whole column with nothing on
 * screen to show it.
 */

const BASIS_OPTIONS = [
  { id: 'room', name: 'Per room' },
  { id: 'guest', name: 'Per guest' },
];

type KitLine = {
  product_id: number | string;
  product_name: string;
  unit_name?: string | null;
  quantity: string;
  basis: string;
};

const blankLine = (): KitLine => ({
  product_id: '',
  product_name: '',
  unit_name: '',
  quantity: '',
  basis: 'room',
});

const blankKit = () => ({
  id: 0,
  room_type_id: '',
  name: '',
  notes: '',
  status: 1,
});

/** "Soap 2 per guest" -- what a line says in one line of a table. */
const lineWords = (line: any) =>
  `${line.product_name ?? '#' + line.product_id} ${Number(line.quantity)}${
    line.unit_name ? ' ' + line.unit_name : ''
  } ${line.basis === 'guest' ? 'per guest' : 'per room'}`;

const AmenityKitsTab = ({ branchId }: { branchId: number }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const [form, setForm] = useState<any>(null);
  const [lines, setLines] = useState<KitLine[]>([]);
  const [line, setLine] = useState<KitLine>(blankLine());

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await httpService.get(API_HOTEL_AMENITY_KIT_URL, {
        params: { branch_id: branchId },
      });
      const data = res?.data?.data?.data ?? res?.data?.data ?? {};

      setRows(data.rows ?? []);
      setRoomTypes(data.room_types ?? []);
      setNote(data.note ?? '');
    } catch (error: any) {
      setRows([]);
      toast.error(error?.response?.data?.message || 'Could not read the kits');
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (field: string) => (e: any) =>
    setForm((prev: any) => (prev ? { ...prev, [field]: e.target.value } : prev));

  /**
   * ⚠️ A room type that already has a kit is not offered for a NEW one -- the
   * save would replace the kit it has, which is not what "New" reads as. It is
   * still shown when that very kit is being edited, because otherwise the form
   * would open with its own room type missing.
   */
  const roomTypeOptions = useMemo(() => {
    const current = Number(form?.room_type_id ?? 0);

    return [
      // Without this the box would show the first room type while the form
      // still holds nothing, and Save would refuse a choice the user can see.
      { id: '', name: 'Choose a room type' },
      ...roomTypes
        .filter((type: any) => !type.has_kit || type.id === current)
        .map((type: any) => ({
          id: type.id,
          name: `${type.name} — holds ${type.capacity}`,
        })),
    ];
  }, [roomTypes, form?.room_type_id]);

  const openNew = () => {
    setForm(blankKit());
    setLines([]);
    setLine(blankLine());
  };

  const openEdit = (row: any) => {
    setForm({
      id: row.id,
      room_type_id: row.room_type_id,
      name: row.name,
      notes: row.notes ?? '',
      status: row.status,
    });
    setLines(
      (row.items ?? []).map((item: any) => ({
        product_id: item.product_id,
        product_name: item.product_name ?? '#' + item.product_id,
        unit_name: item.unit_name,
        quantity: String(item.quantity),
        basis: item.basis,
      })),
    );
    setLine(blankLine());
  };

  const addLine = () => {
    if (!line.product_id) {
      toast.error('Pick a product first');
      return;
    }

    if (!Number(line.quantity)) {
      toast.error('How many of them?');
      return;
    }

    // One product once. Two lines for the same soap -- one per room, one per
    // guest -- is not a richer standard; it is two expectations added together
    // that nobody can read apart. The server refuses it too.
    if (lines.some((row) => Number(row.product_id) === Number(line.product_id))) {
      toast.error('That product is already on this kit');
      return;
    }

    setLines((prev) => [...prev, { ...line }]);
    setLine(blankLine());
  };

  const save = async () => {
    if (!form?.room_type_id) {
      toast.error('Which room type is this the kit for?');
      return;
    }

    if (!form?.name?.trim()) {
      toast.error('The kit needs a name');
      return;
    }

    setSaving(true);

    try {
      const res = await httpService.post(`${API_HOTEL_AMENITY_KIT_URL}/store`, {
        branch_id: branchId,
        room_type_id: Number(form.room_type_id),
        name: form.name,
        notes: form.notes || null,
        status: Number(form.status ?? 1),
        items: lines.map((row) => ({
          product_id: Number(row.product_id),
          quantity: Number(row.quantity),
          basis: row.basis,
        })),
      });

      toast.success(res?.data?.message || 'Saved');
      setForm(null);
      setLines([]);
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not save the kit');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    try {
      const res = await httpService.post(`${API_HOTEL_AMENITY_KIT_URL}/delete/${id}`, {
        branch_id: branchId,
      });
      toast.success(res?.data?.message || 'Removed');
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not remove it');
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'room_type_name',
        header: 'Room type',
        render: (row: any) => row.room_type_name ?? `#${row.room_type_id}`,
      },
      { key: 'name', header: 'Kit' },
      {
        key: 'items',
        header: 'What goes in',
        render: (row: any) =>
          row.items?.length ? (
            <div className="flex flex-wrap gap-1">
              {row.items.map((item: any) => (
                <span
                  key={item.id}
                  className={`rounded px-1.5 py-0.5 text-xs ${
                    item.basis === 'guest'
                      ? 'bg-sky-100 text-sky-900 dark:bg-sky-500/25 dark:text-sky-50'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-200'
                  }`}
                >
                  {lineWords(item)}
                </span>
              ))}
            </div>
          ) : (
            // Not the same as "expects nothing" -- an empty kit is a standard
            // nobody has written yet, and the report names it rather than
            // reading it as a zero.
            <span className="text-amber-700 dark:text-amber-300">Nothing listed yet</span>
          ),
      },
      {
        key: 'action',
        header: 'Action',
        headerClass: 'text-center w-28',
        cellClass: 'text-center',
        render: (row: any) => (
          <ActionButtons
            row={row}
            showEdit
            handleEdit={openEdit}
            showDelete
            handleDelete={remove}
            showConfirmId={confirmId}
            setShowConfirmId={setConfirmId}
          />
        ),
      },
    ],
    [confirmId],
  );

  return (
    <SetupShell
      noun="Kit"
      note={note}
      formOpen={form !== null}
      editing={!!form?.id}
      onNew={openNew}
      onCancel={() => setForm(null)}
      onSave={save}
      saving={saving}
      form={
        form && (
          <>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
              {/* ⚠️ Shown as a locked field once the kit exists, like the
                  charge type's code. A kit is keyed by its room type; letting
                  it move would replace whatever the other room type already
                  had, and leave this one behind. */}
              {form.id ? (
                <InputElement
                  id="kit_room_type_locked"
                  name="room_type_locked"
                  label="Room type"
                  value={
                    roomTypes.find((type: any) => type.id === Number(form.room_type_id))?.name ??
                    `#${form.room_type_id}`
                  }
                  disabled
                  onChange={() => {}}
                  title="A kit belongs to its room type. Remove it and make another one to move it."
                />
              ) : (
                <DropdownCommon
                  id="kit_room_type"
                  name="room_type_id"
                  label="Room type"
                  data={roomTypeOptions}
                  value={String(form.room_type_id ?? '')}
                  onChange={set('room_type_id')}
                  description="Room types that already have a kit are not listed."
                />
              )}
              <InputElement
                id="kit_name"
                name="name"
                label="Kit name"
                placeholder="Deluxe daily make-up"
                value={form.name}
                onChange={set('name')}
              />
              <InputElement
                id="kit_notes"
                name="notes"
                label="Note"
                placeholder="Optional"
                value={form.notes ?? ''}
                onChange={set('notes')}
              />
              <DropdownCommon
                id="kit_status"
                name="status"
                label="Status"
                data={[
                  { id: 1, name: 'Active' },
                  { id: 0, name: 'Inactive' },
                ]}
                value={String(form.status ?? 1)}
                onChange={set('status')}
              />
            </div>

            <div className="mt-3 border-t border-stroke pt-3 dark:border-strokedark">
              <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-12">
                <div className="md:col-span-5">
                  {/* ⚠️ The one thing worth knowing about this box, and it is
                      not obvious: what a kit NAMES is what the report measures.
                      A product left off it is never counted as an amenity,
                      however much of it leaves the store. */}
                  <label
                    htmlFor="kitProduct"
                    className={`${FIELD_LABEL} cursor-help text-left text-sm decoration-dotted underline-offset-2 hover:underline`}
                    title="Type three letters to search. Only the products a kit names are measured by the variance report — anything else that leaves the store is somebody else's material."
                  >
                    Product
                  </label>
                  <RequisitionItemsDropdown
                    id="kitProduct"
                    name="kitProduct"
                    onSelect={(option: any) =>
                      setLine((prev) => ({
                        ...prev,
                        product_id: option?.value ?? '',
                        product_name: option?.label ?? '',
                        unit_name: option?.label_3 ?? '',
                      }))
                    }
                    defaultValue={
                      line.product_id
                        ? { value: line.product_id, label: line.product_name }
                        : null
                    }
                    value={
                      line.product_id ? { value: line.product_id, label: line.product_name } : null
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <InputElement
                    id="kit_qty"
                    name="quantity"
                    type="number"
                    min={0}
                    label="How many"
                    placeholder="1"
                    value={line.quantity}
                    onChange={(e: any) =>
                      setLine((prev) => ({ ...prev, quantity: e.target.value }))
                    }
                  />
                </div>
                <div className="md:col-span-3">
                  {/* The rule is on the LABEL rather than in a line under the
                      box. It is read once, by the person filling the kit in for
                      the first time, and a sentence that long under every row
                      of a repetitive form is read by nobody after that. */}
                  <label
                    htmlFor="kit_basis"
                    className={`${FIELD_LABEL} cursor-help text-left text-sm decoration-dotted underline-offset-2 hover:underline`}
                    title="Per room counts once however many people are in it. Per guest counts for each person in the room that night."
                  >
                    Counted
                  </label>
                  <DropdownCommon
                    id="kit_basis"
                    name="basis"
                    data={BASIS_OPTIONS}
                    value={line.basis}
                    onChange={(e: any) => setLine((prev) => ({ ...prev, basis: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <ButtonLoading
                    onClick={addLine}
                    label="Add to kit"
                    variant="primary"
                    icon={<FiPlus size={16} />}
                  />
                </div>
              </div>

              {lines.length ? (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-stroke text-left dark:border-strokedark">
                        <th className="py-1 pr-2">Product</th>
                        <th className="py-1 pr-2 text-right">How many</th>
                        <th className="py-1 pr-2">Counted</th>
                        <th className="w-16 py-1 text-center">Out</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((row, index) => (
                        <tr key={`${row.product_id}`} className="border-b border-stroke dark:border-strokedark">
                          <td className="py-1 pr-2">{row.product_name}</td>
                          <td className="py-1 pr-2 text-right">
                            {Number(row.quantity)} {row.unit_name ?? ''}
                          </td>
                          <td className="py-1 pr-2">
                            {row.basis === 'guest' ? 'Per guest' : 'Per room'}
                          </td>
                          <td className="py-1 text-center">
                            <button
                              type="button"
                              className="text-rose-600 hover:text-rose-700 dark:text-rose-400"
                              onClick={() =>
                                setLines((prev) => prev.filter((_, i) => i !== index))
                              }
                              title="Take this line out of the kit"
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
                  {/* Four words on screen, the reason behind them on hover. The
                      distinction matters -- an empty kit is a standard nobody
                      has written yet, not a standard of nothing -- but it is a
                      sentence somebody needs once, and it sat here under every
                      new kit being typed. */}
                  <span
                    className="cursor-help decoration-dotted underline underline-offset-2"
                    title="A kit with no lines expects nothing, and the variance report names it rather than reading it as a zero."
                  >
                    Nothing in the kit yet.
                  </span>
                </p>
              )}
            </div>
          </>
        )
      }
      columns={columns}
      rows={rows}
      loading={loading}
      emptyMessage="No kits yet. A kit is what a room of one type should be made up with — the number the store's issues are measured against."
      page={1}
      totalPages={1}
      onPageChange={() => {}}
    />
  );
};

export default AmenityKitsTab;
