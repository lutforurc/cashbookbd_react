import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import {
  FiHome,
  FiLayers,
  FiTag,
  FiGrid,
  FiMap,
  FiDollarSign,
  FiClock,
  FiCheckSquare,
  FiPercent,
  FiPackage,
} from 'react-icons/fi';

import HelmetTitle from '../../utils/others/HelmetTitle';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import { getDdlProtectedBranch } from '../branch/ddlBranchSlider';
import { clearHotelSetup } from './hotelSetupSlice';

import BuildingsTab from './BuildingsTab';
import FloorsTab from './FloorsTab';
import RoomTypesTab from './RoomTypesTab';
import FacilitiesTab from './FacilitiesTab';
import AmenityKitsTab from './AmenityKitsTab';
import ChargeTypesTab from './ChargeTypesTab';
import TaxRatesTab from './TaxRatesTab';
import RoomsTab from './RoomsTab';
import SlotsTab from './SlotsTab';
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

type TabKey =
  | 'buildings'
  | 'floors'
  | 'room-types'
  | 'facilities'
  | 'rooms'
  | 'slots'
  | 'kits'
  | 'layout'
  | 'charges'
  | 'taxes';

const TABS: { key: TabKey; label: string; icon: React.ReactNode; hint: string }[] = [
  { key: 'buildings', label: 'Buildings', icon: <FiHome size={15} />, hint: 'Blocks and zones' },
  { key: 'floors', label: 'Floors', icon: <FiLayers size={15} />, hint: 'Optional' },
  { key: 'room-types', label: 'Room Types', icon: <FiTag size={15} />, hint: 'Deluxe, Dormitory' },
  // Before the rooms, because a room ticks these off a list that has to exist
  // first -- the same reason a floor comes before a room. And after the types,
  // because it is the second half of the same question: what a room IS, then
  // what it offers.
  {
    key: 'facilities',
    label: 'Facilities',
    icon: <FiCheckSquare size={15} />,
    hint: 'AC, Wi-Fi, projector',
  },
  { key: 'rooms', label: 'Rooms & Seats', icon: <FiGrid size={15} />, hint: 'The inventory' },
  // After the inventory, because a sitting is a way of SELLING something that
  // has to exist first -- and only halls and community centres use them.
  { key: 'slots', label: 'Sittings', icon: <FiClock size={15} />, hint: 'How a hall is sold' },
  // After the rooms, because a kit is written against a room TYPE and there is
  // nothing to stock until the property has been described. Before the money
  // tabs, because it is still a fact about the room rather than about the bill.
  //
  // ⚠️ It issues nothing. The kit is the standard an issue is measured against
  // -- see AmenityKitsTab -- and soap goes on leaving the store through Material
  // Issue exactly as before.
  { key: 'kits', label: 'Amenity Kits', icon: <FiPackage size={15} />, hint: 'What a room is made up with' },
  { key: 'layout', label: 'Layout', icon: <FiMap size={15} />, hint: 'The property drawn' },
  // Last, because it is the only tab that is optional: a property that never
  // opens it bills exactly as it would have. See ChargeTypesTab.
  { key: 'charges', label: 'Charges', icon: <FiDollarSign size={15} />, hint: 'What a bill may say' },
  // Beside the charges, because the two are the money half of the setup: what a
  // bill may say, and what is added on top of it. Last of the two because a
  // property has to be able to bill before it can decide what to tax.
  // ⚠️ The service charge only. VAT is the item's -- 15% on an air-conditioned
  // room, 7.5% without, 5% on food -- and is set on Room Types and Charges.
  { key: 'taxes', label: 'Service Charge', icon: <FiPercent size={15} />, hint: 'One rate, the property’s own' },
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
          {/* ⚠️ No branchId, for the same reason the Charges tab has none: the
              tick list is the COMPANY's. A company running two hotels ticks
              "air conditioning" on rooms in both, and a per-property list would
              be two spellings of one word within a season. */}
          {tab === 'facilities' && <FacilitiesTab />}
          {tab === 'rooms' && <RoomsTab branchId={branchId} branchName={branchName} />}
          {tab === 'slots' && <SlotsTab branchId={branchId} />}
          {tab === 'kits' && <AmenityKitsTab branchId={branchId} />}
          {tab === 'layout' && <LayoutTab branchId={branchId} />}
          {/* ⚠️ No branchId. Charge types and the heads they earn into are the
              COMPANY's, not a property's -- one hotel's laundry income and
              another's belong in the same account, and a per-branch list would
              be two answers to one bookkeeping question. */}
          {tab === 'charges' && <ChargeTypesTab />}
          {/* ⚠️ No branchId either, and for a stronger reason than the two
              above: VAT is a rate a COMPANY is registered at. Two properties of
              one company charging different VAT is not a setting, it is a
              return that will not reconcile. */}
          {tab === 'taxes' && <TaxRatesTab />}
        </>
      )}
    </div>
  );
};

export default HotelSetup;
