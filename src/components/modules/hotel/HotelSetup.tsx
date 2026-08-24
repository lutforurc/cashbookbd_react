import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { FiHome, FiLayers, FiTag, FiGrid, FiMap } from 'react-icons/fi';

import HelmetTitle from '../../utils/others/HelmetTitle';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import { getDdlProtectedBranch } from '../branch/ddlBranchSlider';
import { clearHotelSetup } from './hotelSetupSlice';

import BuildingsTab from './BuildingsTab';
import FloorsTab from './FloorsTab';
import RoomTypesTab from './RoomTypesTab';
import RoomsTab from './RoomsTab';
import LayoutTab from './LayoutTab';

/**
 * Hotel setup -- where the rooms and the beds inside them are described.
 *
 *   property (the branch)
 *    +- building              a block, or a zone on a resort
 *        +- floor  (optional) cottages have none
 *            +- room
 *                +- seat      one bed; the thing a booking actually locks
 *
 * Four tabs rather than four screens, and the order is the order they have to
 * be filled in: a floor needs a building, a room needs both. Setup is one
 * sitting, done once, and sending somebody back to the sidebar between each
 * step of it would be four navigations for one job.
 *
 * The branch chooser at the top is not a filter. In this module the branch IS
 * the property: a company running two hotels keeps two sets of buildings and
 * rooms, and everything below reads and writes against whichever is chosen.
 * That is why it sits above the tabs rather than inside one.
 */

type TabKey = 'buildings' | 'floors' | 'room-types' | 'rooms' | 'layout';

const TABS: { key: TabKey; label: string; icon: React.ReactNode; hint: string }[] = [
  { key: 'buildings', label: 'Buildings', icon: <FiHome size={15} />, hint: 'Blocks and zones' },
  { key: 'floors', label: 'Floors', icon: <FiLayers size={15} />, hint: 'Optional' },
  { key: 'room-types', label: 'Room Types', icon: <FiTag size={15} />, hint: 'Deluxe, Dormitory' },
  { key: 'rooms', label: 'Rooms & Seats', icon: <FiGrid size={15} />, hint: 'The inventory' },
  { key: 'layout', label: 'Layout', icon: <FiMap size={15} />, hint: 'The property drawn' },
];

const TAB_KEYS = TABS.map((t) => t.key);

const HotelSetup = ({ user }: any) => {
  const dispatch = useDispatch<any>();
  const branchDdlData = useSelector((state: any) => state.branchDdl);

  // The tab lives in the URL so that the Layout panel's "Edit this room" can
  // hand over to the Rooms tab with a room already open -- and so a reload, or
  // a link pasted to somebody, comes back to the same place.
  const [params, setParams] = useSearchParams();

  const tab: TabKey = TAB_KEYS.includes(params.get('tab') as TabKey)
    ? (params.get('tab') as TabKey)
    : 'buildings';

  const setTab = (next: TabKey) => {
    // replace, not push: flicking through four tabs must not put four entries
    // in the history for Back to walk out of one at a time.
    setParams(next === 'buildings' ? {} : { tab: next }, { replace: true });
  };
  const [branchId, setBranchId] = useState<number | ''>(user?.branch_id ?? '');

  useEffect(() => {
    dispatch(getDdlProtectedBranch());

    // The tables are emptied on the way out rather than on the way in: a tab
    // switch must not blank the rows a moment before the new ones land.
    return () => {
      dispatch(clearHotelSetup());
    };
  }, [dispatch]);

  const branches = useMemo(
    () => branchDdlData?.protectedData?.data ?? [],
    [branchDdlData?.protectedData?.data],
  );

  const branchName = useMemo(
    () => branches.find((b: any) => String(b.id) === String(branchId))?.name ?? '',
    [branches, branchId],
  );

  return (
    <div>
      <HelmetTitle title="Hotel Setup" />

      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-black dark:text-white">Hotel Setup</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Describe the property once: its buildings, its floors, the kinds of room it has, and
            then the rooms themselves.
          </p>
        </div>

        <div className="w-64">
          <label className="text-sm text-black dark:text-white">Property</label>
          <BranchDropdown
            value={branchId === '' ? '' : String(branchId)}
            defaultValue={branchId === '' ? '' : String(branchId)}
            onChange={(e: any) => setBranchId(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full text-sm"
            branchDdl={branches}
          />
        </div>
      </div>

      {/* The tabs. Their order is the order the tables depend on each other. */}
      <div className="mb-3 flex flex-wrap gap-1 border-b border-stroke dark:border-strokedark">
        {TABS.map((t) => {
          const active = tab === t.key;

          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm transition ${
                active
                  ? 'border-primary font-medium text-primary'
                  : 'border-transparent text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
              {/* <span className="hidden text-xs text-gray-400 sm:inline">· {t.hint}</span> */}
            </button>
          );
        })}
      </div>

      {branchId === '' ? (
        // Not an error and not empty rows -- a property has to be chosen before
        // any of this means anything, and saying so is better than a blank grid
        // that looks like a hotel with nothing in it.
        <div className="rounded border border-stroke p-8 text-center text-sm text-gray-500 dark:border-strokedark dark:text-gray-400">
          Choose a property above to set up its rooms.
        </div>
      ) : (
        <>
          {tab === 'buildings' && <BuildingsTab branchId={branchId} />}
          {tab === 'floors' && <FloorsTab branchId={branchId} />}
          {tab === 'room-types' && <RoomTypesTab branchId={branchId} />}
          {tab === 'rooms' && <RoomsTab branchId={branchId} branchName={branchName} />}
          {tab === 'layout' && <LayoutTab branchId={branchId} />}
        </>
      )}
    </div>
  );
};

export default HotelSetup;
