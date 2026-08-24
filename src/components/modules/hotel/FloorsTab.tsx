import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';

import InputElement from '../../utils/fields/InputElement';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import ActionButtons from '../../utils/fields/ActionButton';

import SetupShell from './SetupShell';
import { buildingDdl, floorDelete, floorList, floorSave } from './hotelSetupSlice';
import { HotelFloor } from './types';
import { STATUS_OPTIONS, blankFloor } from './setupHelpers';

/**
 * Floors within a building. Optional throughout.
 *
 * A resort of scattered cottages never opens this tab, and its rooms carry no
 * floor at all. That is deliberate: a floor invented to fill the gap is a floor
 * the floor-plan grid would then have to draw.
 *
 * The building cannot be changed once a floor exists. Moving one would move
 * every room on it, and those room numbers might already be taken in the
 * destination -- which the database would refuse halfway through the move.
 * Rooms are moved one at a time on the Rooms tab, where a clash is visible.
 */
const FloorsTab = ({ branchId }: { branchId: number }) => {
  const dispatch = useDispatch<any>();
  const { floors, buildingOptions, loading, saving } = useSelector((state: any) => state.hotelSetup);

  const [page, setPage] = useState(1);
  const [buildingFilter, setBuildingFilter] = useState<string>('');
  const [form, setForm] = useState<HotelFloor | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const load = useCallback(() => {
    dispatch(
      floorList({
        branch_id: branchId,
        page,
        per_page: 10,
        building_id: buildingFilter || undefined,
      }),
    );
  }, [dispatch, branchId, page, buildingFilter]);

  useEffect(() => {
    dispatch(buildingDdl({ branch_id: branchId }));
    setBuildingFilter('');
    setPage(1);
  }, [dispatch, branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (field: keyof HotelFloor) => (e: any) =>
    setForm((prev) => (prev ? { ...prev, [field]: e.target.value } : prev));

  const buildingChoices = useMemo(
    () => (buildingOptions ?? []).map((b: any) => ({ id: b.value, name: b.label })),
    [buildingOptions],
  );

  const handleSave = async () => {
    if (!form) return;

    if (!form.building_id) {
      toast.error('Choose which building this floor is in');
      return;
    }

    if (!form.name?.trim()) {
      toast.error('The floor needs a name');
      return;
    }

    try {
      const result = await dispatch(floorSave({ ...form })).unwrap();
      toast.success(result.message);
      // Keeps the building, clears the name: floors are added a stack at a
      // time, and re-choosing the same block for each one is pure friction.
      setForm(form.id ? null : blankFloor(form.building_id));
      load();
    } catch (error: any) {
      toast.error(String(error));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const result = await dispatch(floorDelete(id)).unwrap();
      toast.success(result.message);
      load();
    } catch (error: any) {
      toast.error(String(error));
    }
  };

  const columns = useMemo(
    () => [
      { key: 'serial_no', header: '#', headerClass: 'w-14 text-center', cellClass: 'text-center' },
      {
        key: 'building',
        header: 'Building',
        render: (row: any) => row.building?.name ?? '—',
      },
      { key: 'name', header: 'Floor' },
      {
        key: 'floor_no',
        header: 'Level',
        headerClass: 'text-center',
        cellClass: 'text-center',
        render: (row: any) => row.floor_no ?? 0,
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
            handleEdit={(r: any) => setForm({ ...r, building_id: r.building_id })}
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
      noun="Floor"
      note="Optional. Cottages and single-storey blocks need none — leave this tab empty and the rooms simply carry no floor."
      toolbar={
        <div className="w-56">
          <DropdownCommon
            id="building_filter"
            name="building_filter"
            label="Building"
            data={[{ id: '', name: 'All buildings' }, ...buildingChoices]}
            value={buildingFilter}
            onChange={(e: any) => {
              setBuildingFilter(e.target.value);
              setPage(1);
            }}
          />
        </div>
      }
      formOpen={form !== null}
      editing={!!form?.id}
      onNew={() => setForm(blankFloor(buildingFilter ? Number(buildingFilter) : null))}
      onCancel={() => setForm(null)}
      onSave={handleSave}
      saving={saving}
      form={
        form && (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <DropdownCommon
              id="building_id"
              name="building_id"
              label="Building"
              data={[{ id: '', name: 'Choose a building' }, ...buildingChoices]}
              value={form.building_id ? String(form.building_id) : ''}
              onChange={(e: any) =>
                setForm({ ...form, building_id: e.target.value ? Number(e.target.value) : null })
              }
              // Changing it here would take every room on the floor with it,
              // into numbers that may already be taken over there.
              className={form.id ? 'pointer-events-none opacity-60' : ''}
              description={form.id ? 'A floor cannot be moved between buildings.' : undefined}
            />
            <InputElement
              id="floor_name"
              name="name"
              label="Floor name"
              placeholder="Ground, 1st, Mezzanine"
              value={form.name}
              onChange={set('name')}
            />
            <InputElement
              id="floor_no"
              name="floor_no"
              label="Level"
              type="number"
              placeholder="0"
              title="What it sorts by, and what the floor plan stacks on. Ground is 0, a basement is -1."
              value={String(form.floor_no ?? 0)}
              onChange={set('floor_no')}
            />
            <DropdownCommon
              id="floor_status"
              name="status"
              label="Status"
              data={STATUS_OPTIONS}
              value={String(form.status)}
              onChange={set('status')}
            />
          </div>
        )
      }
      columns={columns}
      rows={floors?.data ?? []}
      loading={loading}
      emptyMessage="No floors. That is a perfectly good answer for cottages and single-storey blocks."
      page={page}
      totalPages={Math.ceil((floors?.total ?? 0) / (floors?.per_page || 10))}
      onPageChange={setPage}
    />
  );
};

export default FloorsTab;
