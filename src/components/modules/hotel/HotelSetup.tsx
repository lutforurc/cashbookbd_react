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
 * Five tabs rather than five screens, and the first four are ordered by what
 * depends on what: a floor needs a building, a room needs both. Setup is one
 * sitting, done once, and sending somebody back to the sidebar between each
 * step of it would be four navigations for one job.
 *
 * The fifth, Layout, is the drawing rather than a step -- so it sits last in
 * the row, where the sequence ends, but it is the one that OPENS. After the
 * property has been described once, the screen is opened to look at it.
 *
 * The branch chooser at the top is not a filter. In this module the branch IS
 * the property: a company running two hotels keeps two sets of buildings and
 * rooms, and everything below reads and writes against whichever is chosen.
 * That is why it sits above the tabs rather than inside one.
 *
 * It is drawn only where there is more than one property. A dropdown holding a
 * single option is a question with one answer -- but the answer is still needed,
 * so a lone property is selected rather than merely assumed.
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

  /**
   * Layout is what opens.
   *
   * The tabs are still ordered by what depends on what -- a floor needs a
   * building, a room needs both -- but that is the order of a job done once.
   * Afterwards the screen is opened to look at the property, not to describe it
   * again, so the drawing is the sensible thing to land on.
   *
   * It is a safe landing even on a property with nothing in it: the grid has an
   * empty state that says so and points at the Buildings tab, which is a better
   * first screen than an empty table.
   */
  const DEFAULT_TAB: TabKey = 'layout';

  const tab: TabKey = TAB_KEYS.includes(params.get('tab') as TabKey)
    ? (params.get('tab') as TabKey)
    : DEFAULT_TAB;

  const setTab = (next: TabKey) => {
    // The default tab carries no query string -- a bare /hotel/setup is it, so
    // the URL only says anything when it has something to add.
    //
    // replace, not push: flicking through five tabs must not put five entries
    // in the history for Back to walk out of one at a time.
    setParams(next === DEFAULT_TAB ? {} : { tab: next }, { replace: true });
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

  /**
   * A company with one property is not asked which one.
   *
   * The chooser only earns its place when there is a choice; a dropdown holding
   * a single option is a question with one answer, and it takes up the room and
   * the reading time of a real one.
   */
  const choosable = branches.length > 1;

  /**
   * Hiding the chooser does not excuse the screen from choosing.
   *
   * branchId starts from the signed-in user's own branch, which covers almost
   * everybody -- but an account without one (a platform administrator looking
   * at a tenant) would land on '' with the chooser gone, and every tab below
   * would sit waiting for a selection the screen no longer offers. So when
   * there is exactly one property, it is taken.
   */
  useEffect(() => {
    if (branchId === '' && branches.length === 1) {
      setBranchId(Number(branches[0].id));
    }
  }, [branchId, branches]);

  return (
    <div>
      <HelmetTitle title="Hotel Setup" />

      {/* Drawn only where there is a choice to make. The whole row goes with it
          rather than just the field -- an empty row still carries its own
          margin, and would leave a gap above the tabs that reads as a mistake. */}
      {choosable ? (
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
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
      ) : null}

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
        //
        // Which sentence depends on whether there is in fact anything above to
        // choose from: with the chooser hidden, "choose a property above" sends
        // the reader looking for a field that is not there.
        <div className="rounded border border-stroke p-8 text-center text-sm text-gray-500 dark:border-strokedark dark:text-gray-400">
          {choosable
            ? 'Choose a property above to set up its rooms.'
            : 'No property is available for this account to set up.'}
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
