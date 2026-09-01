import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FiDownload } from 'react-icons/fi';

import InputElement from '../../utils/fields/InputElement';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import ActionButtons from '../../utils/fields/ActionButton';
import SearchInput from '../../utils/fields/SearchInput';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';

import SetupShell from './SetupShell';
import { facilityDelete, facilityList, facilitySave, facilityStandard } from './hotelSetupSlice';
import { HotelFacility } from './types';
import {
  APPLIES_TO_OPTIONS,
  STATUS_OPTIONS,
  blankFacility,
  useDebounced,
} from './setupHelpers';

/**
 * What a room may offer -- the tick list behind the room form.
 *
 * ⚠️ IT IS THE COMPANY'S LIST, NOT A PROPERTY'S, which is why this is the only
 * setup tab that takes no branch. A company running two hotels ticks "air
 * conditioning" on rooms in both; two lists would be two spellings of one word
 * within a season, and "which rooms have AC" would then have two answers.
 *
 * ⚠️ AND EDITING A ROW REACHES EVERY ROOM THAT HAS IT. That is the whole point
 * of a shared list rather than free text on each room -- renaming "Wi-Fi" into
 * "Free Wi-Fi" is one edit and a hundred rooms -- but it is also why the server
 * says the room count back in the message. Somebody who thought they were
 * fixing a typo on one screen has just changed what the property offers.
 *
 * The rows are a COPY of the standard list, not a share of it. Every other
 * vocabulary in this module ships rows a tenant overrides by writing their own;
 * that pattern is wrong here, because a room points at a facility by id and an
 * override would hand back a new one -- leaving every room already ticked
 * quietly showing the old wording. See HotelFacility, in the API.
 */
const FacilitiesTab = () => {
  const dispatch = useDispatch<any>();
  const { facilities, loading, saving } = useSelector((state: any) => state.hotelSetup);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<HotelFacility | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const debouncedSearch = useDebounced(search);

  const load = useCallback(() => {
    dispatch(facilityList({ page, per_page: 10, q: debouncedSearch }));
  }, [dispatch, page, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (field: keyof HotelFacility) => (e: any) =>
    setForm((prev) => (prev ? { ...prev, [field]: e.target.value } : prev));

  const handleSave = async () => {
    if (!form) return;

    if (!form.name?.trim()) {
      toast.error('The facility needs a name — it is what the tick box says');
      return;
    }

    try {
      const result = await dispatch(
        facilitySave({ ...form, sort_order: Number(form.sort_order) || 0 }),
      ).unwrap();

      // The server counts the rooms this wording now reaches, and that sentence
      // is the whole answer on an edit. Left up longer for the same reason.
      toast.success(result.message, { autoClose: 6000 });
      setForm(form.id ? null : blankFacility());
      load();
    } catch (error: any) {
      toast.error(String(error));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const result = await dispatch(facilityDelete(id)).unwrap();
      toast.success(result.message);
      load();
    } catch (error: any) {
      // The server's own sentence names how many rooms still offer it, and
      // points at "inactive" instead. A replacement here would say only that
      // the delete failed.
      toast.error(String(error), { autoClose: 6000 });
    }
  };

  /**
   * The standard list, in one press.
   *
   * A company whose property was set up after the patch that seeds these ran
   * starts with an empty tick box, and typing twenty-two rows by hand to say a
   * room has air conditioning is not a step anybody finishes. It adds what is
   * missing and touches nothing that is there, so pressing it twice is safe and
   * a row somebody has renamed keeps its wording.
   */
  const addStandard = async () => {
    try {
      const result = await dispatch(facilityStandard({})).unwrap();
      toast.success(result.message);
      setPage(1);
      load();
    } catch (error: any) {
      toast.error(String(error));
    }
  };

  const columns = useMemo(
    () => [
      { key: 'serial_no', header: '#', headerClass: 'w-14 text-center', cellClass: 'text-center' },
      {
        key: 'name',
        header: 'Facility',
        render: (row: any) => (
          <div>
            <div className="font-medium text-black dark:text-white">{row.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{row.code}</div>
          </div>
        ),
      },
      {
        key: 'applies_to',
        header: 'Offered on',
        render: (row: any) =>
          APPLIES_TO_OPTIONS.find((o) => o.id === row.applies_to)?.name ?? row.applies_to,
      },
      {
        key: 'rooms_count',
        header: 'Rooms',
        headerClass: 'text-center',
        cellClass: 'text-center',
        // What makes removing one a decision rather than a click.
        render: (row: any) => row.rooms_count ?? 0,
      },
      {
        key: 'sort_order',
        header: 'Order',
        headerClass: 'text-center',
        cellClass: 'text-center',
        render: (row: any) => row.sort_order ?? 0,
      },
      {
        key: 'status',
        header: 'Status',
        headerClass: 'text-center',
        cellClass: 'text-center',
        render: (row: any) =>
          Number(row.status) === 1 ? (
            <span className="text-success">Active</span>
          ) : (
            // ⚠️ Inactive does NOT take it off the rooms that have it. It stops
            // being offered on new ones, and a tile that quietly dropped
            // "Balcony" would describe a different room from the one the guest
            // is standing in.
            <span className="text-gray-400" title="Kept on the rooms that have it; not offered on new ones">
              Inactive
            </span>
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
            handleEdit={(r: any) => setForm({ ...r })}
            showDelete
            handleDelete={handleDelete}
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
      noun="Facility"
      // note="What a room offers, as a tick list — so 'AC' is one facility across the property rather than three spellings of it. Editing a row here changes the wording on every room that has it."
      note=""
      toolbar={
        <>
          <SearchInput search={search} setSearchValue={setSearch} className="w-56" />
          {/* Offered always rather than only on an empty list: a property that
              has added its own rows may still want the ones it skipped, and a
              button that appears and disappears is one nobody learns. */}
          <ButtonLoading
            onClick={addStandard}
            buttonLoading={saving}
            label="Add the standard list"
            icon={<FiDownload size={16} />}
          />
        </>
      }
      formOpen={form !== null}
      editing={!!form?.id}
      onNew={() => setForm(blankFacility())}
      onCancel={() => setForm(null)}
      onSave={handleSave}
      saving={saving}
      form={
        form && (
          <>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
              <InputElement
                id="facility_name"
                name="name"
                label="Facility"
                placeholder="Air conditioning"
                title="What the tick box says, and what the bill prints where a property asks for it."
                value={form.name}
                onChange={set('name')}
              />

              <InputElement
                id="facility_code"
                name="code"
                label="Short code"
                placeholder="Made from the name"
                title="A key, not a label. Left empty it is made from the name — and it is what 'Add the standard list' matches on, so a row you have renamed is not added again."
                value={form.code ?? ''}
                onChange={set('code')}
              />

              {/* A projector is not a bedroom facility and a wardrobe is not a
                  hall one. A form offering all of both is a list nobody reads
                  to the end, so the room form asks this before drawing them. */}
              <DropdownCommon
                id="facility_applies_to"
                name="applies_to"
                label="Offered on"
                data={APPLIES_TO_OPTIONS}
                value={form.applies_to}
                onChange={set('applies_to')}
                description="Which kind of thing it may be ticked on."
              />

              <DropdownCommon
                id="facility_status"
                name="status"
                label="Status"
                data={STATUS_OPTIONS}
                value={String(form.status)}
                onChange={set('status')}
                description="Inactive keeps it on the rooms that have it."
              />
            </div>

            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-4">
              <InputElement
                id="facility_sort_order"
                name="sort_order"
                label="Order"
                type="number"
                min={0}
                title="Where it sits in the tick list. Tens leave room for one added between two later."
                value={String(form.sort_order ?? 0)}
                onChange={set('sort_order')}
              />
            </div>

            {form.id && Number(form.rooms_count ?? 0) > 0 ? (
              <p className="mt-2 text-xs leading-snug text-warning">
                {form.rooms_count} room(s) offer this. Renaming it changes the wording on all of
                them — and on their bills.
              </p>
            ) : null}
          </>
        )
      }
      columns={columns}
      rows={facilities?.data ?? []}
      loading={loading}
      emptyMessage="No facilities yet. Press “Add the standard list” for the usual twenty-two, then edit them to suit the property."
      page={page}
      totalPages={Math.ceil((facilities?.total ?? 0) / (facilities?.per_page || 10))}
      onPageChange={setPage}
    />
  );
};

export default FacilitiesTab;
