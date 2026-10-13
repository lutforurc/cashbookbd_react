import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { settingOn } from '../userFeatureSettings';

/**
 * The Select Warehouse box on the four Tiles and Sanitary invoice forms.
 *
 * ⚠️ ONLY THE TILES AND SANITARY TRADE, AND ONLY WITH MULTIPLE WAREHOUSE OFF.
 * The branch's Business Type and its Multiple Warehouse switch are read from
 * Edit Branch (the current branch the app already loads) — by the branch's own
 * `is_tiles_and_sanitary` flag rather than a business-type id, which differs
 * from installation to installation. Every other trade, and a tiles branch that
 * keeps several warehouses, goes on showing the box exactly as before.
 *
 * When the box is hidden the branch keeps ONE warehouse: its own godown, its
 * flagged default first and otherwise the oldest it has. `defaultWarehouseId`
 * is that godown, taken from the warehouse list already scoped to the branches
 * this user may see, and never another branch's.
 */
export const useTilesWarehouseField = () => {
  const currentBranch = useSelector((s: any) => s.branchList?.currentBranch);
  const activeWarehouse = useSelector((s: any) => s.activeWarehouse);

  const singleWarehouse =
    Boolean(currentBranch?.is_tiles_and_sanitary) && !settingOn(currentBranch?.have_warehouse);

  const { defaultWarehouseId, branchWarehouseIds } = useMemo(() => {
    const list = Array.isArray(activeWarehouse?.data) ? activeWarehouse.data : [];

    // The branch's OWN godowns. The list is company-wide, so a godown without
    // this branch's id is some other branch's and is left out.
    const mine = list.filter(
      (w: any) => Number(w?.branch_id) === Number(currentBranch?.id),
    );

    const preferred = mine.find((w: any) => Number(w?.is_default) === 1) || mine[0];

    return {
      defaultWarehouseId: preferred ? String(preferred.id) : '',
      branchWarehouseIds: new Set<string>(mine.map((w: any) => String(w.id))),
    };
  }, [activeWarehouse?.data, currentBranch?.id]);

  return {
    showWarehouse: !singleWarehouse,
    singleWarehouse,
    defaultWarehouseId,
    branchWarehouseIds,
  };
};

export default useTilesWarehouseField;
