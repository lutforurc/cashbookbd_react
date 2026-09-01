import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';

import InputElement from '../../utils/fields/InputElement';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import ActionButtons from '../../utils/fields/ActionButton';
import SearchInput from '../../utils/fields/SearchInput';

import SetupShell from './SetupShell';
import { buildingDelete, buildingList, buildingSave } from './hotelSetupSlice';
import { HotelBuilding } from './types';
import { STATUS_OPTIONS, blankBuilding, useDebounced } from './setupHelpers';

/**
 * Buildings, and zones on a resort.
 *
 * A location, never a branch -- a branch carries its own books, so a hotel
 * modelled as two branches would keep two sets of them. Building-wise occupancy
 * and income come out of the reports as a filter instead.
 */
const BuildingsTab = ({ branchId }: { branchId: number }) => {
  const dispatch = useDispatch<any>();
  const { buildings, loading, saving } = useSelector((state: any) => state.hotelSetup);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<HotelBuilding | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const debouncedSearch = useDebounced(search);

  const load = useCallback(() => {
    dispatch(buildingList({ branch_id: branchId, page, per_page: 10, q: debouncedSearch }));
  }, [dispatch, branchId, page, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  // A new property, a new search: whatever page we were on no longer exists.
  useEffect(() => {
    setPage(1);
  }, [branchId, debouncedSearch]);

  const set = (field: keyof HotelBuilding) => (e: any) =>
    setForm((prev) => (prev ? { ...prev, [field]: e.target.value } : prev));

  const handleSave = async () => {
    if (!form) return;

    if (!form.name?.trim()) {
      toast.error('The building needs a name');
      return;
    }

    try {
      const result = await dispatch(buildingSave({ ...form, branch_id: branchId })).unwrap();
      toast.success(result.message);
      // Left open, and emptied: setting up a property means adding several of
      // these in a row, and closing the form after each one would mean four
      // clicks per building instead of one.
      setForm(form.id ? null : blankBuilding());
      load();
    } catch (error: any) {
      toast.error(String(error));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const result = await dispatch(buildingDelete(id)).unwrap();
      toast.success(result.message);
      load();
    } catch (error: any) {
      // The server's own words. "This building holds 12 rooms -- set it
      // inactive instead" is the answer, and replacing it with "delete failed"
      // would throw away the only useful half of it.
      toast.error(String(error));
    }
  };

  const columns = useMemo(
    () => [
      { key: 'serial_no', header: '#', headerClass: 'w-14 text-center', cellClass: 'text-center' },
      { key: 'name', header: 'Building' },
      {
        key: 'code',
        header: 'Short label',
        render: (row: any) => row.code || <span className="text-gray-400">—</span>,
      },
      {
        key: 'floors_count',
        header: 'Floors',
        headerClass: 'text-center',
        cellClass: 'text-center',
        // A resort's cottages have no floors and none is invented for them, so
        // a zero here is a fact rather than something left undone.
        render: (row: any) => row.floors_count ?? 0,
      },
      {
        key: 'rooms_count',
        header: 'Rooms',
        headerClass: 'text-center',
        cellClass: 'text-center',
        render: (row: any) => row.rooms_count ?? 0,
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
            <span className="text-gray-400">Inactive</span>
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
      noun="Building"
      // note="A building here is a location, not a separate set of books. Room numbers repeat between buildings — 101 in the main block and 101 in the annexe are two different rooms, and the screens tell them apart by the short label."
      note=""
      toolbar={
        <SearchInput search={search} setSearchValue={setSearch} className="w-64" />
      }
      formOpen={form !== null}
      editing={!!form?.id}
      onNew={() => setForm(blankBuilding())}
      onCancel={() => setForm(null)}
      onSave={handleSave}
      saving={saving}
      form={
        form && (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <InputElement
              id="name"
              name="name"
              label="Building name"
              placeholder="Main Block"
              value={form.name}
              onChange={set('name')}
            />
            <InputElement
              id="code"
              name="code"
              label="Short label"
              placeholder="MB"
              title="Printed in front of a room number, so that 101 in the annexe reads as ANX / 101."
              value={form.code ?? ''}
              onChange={set('code')}
            />
            <InputElement
              id="address"
              name="address"
              label="Address"
              placeholder="Optional"
              value={form.address ?? ''}
              onChange={set('address')}
            />
            <DropdownCommon
              id="status"
              name="status"
              label="Status"
              data={STATUS_OPTIONS}
              value={String(form.status)}
              onChange={set('status')}
            />
            <div className="md:col-span-4">
              <InputElement
                id="notes"
                name="notes"
                label="Notes"
                placeholder="Optional"
                value={form.notes ?? ''}
                onChange={set('notes')}
              />
            </div>
          </div>
        )
      }
      columns={columns}
      rows={buildings?.data ?? []}
      loading={loading}
      emptyMessage="No buildings yet. Add the first block, then its floors and rooms."
      page={page}
      totalPages={Math.ceil((buildings?.total ?? 0) / (buildings?.per_page || 10))}
      onPageChange={setPage}
    />
  );
};

export default BuildingsTab;
