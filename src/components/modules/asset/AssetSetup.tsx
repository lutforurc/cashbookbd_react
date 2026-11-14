import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import {
  FiCheckSquare,
  FiFileText,
  FiList,
  FiPackage,
  FiRepeat,
  FiSettings,
  FiTag,
  FiTool,
  FiTrendingDown,
} from 'react-icons/fi';

import HelmetTitle from '../../utils/others/HelmetTitle';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import { getDdlProtectedBranch } from '../branch/ddlBranchSlider';

import AssetCategoriesTab from './AssetCategoriesTab';
import AssetChartSetupTab from './AssetChartSetupTab';
import AssetItemsTab from './AssetItemsTab';
import AssetCwipTab from './AssetCwipTab';
import AssetDepreciationTab from './AssetDepreciationTab';
import AssetRegisterTab from './AssetRegisterTab';
import AssetScheduleTab from './AssetScheduleTab';
import AssetHandoverTab from './AssetHandoverTab';
import AssetVerificationTab from './AssetVerificationTab';
import { AssetTabContext } from './assetTabActive';

/**
 * Fixed assets — the categories, and the register of the things themselves.
 *
 * ⚠️ SEVEN TABS, TWO SCOPES, and the difference is not cosmetic. A CATEGORY —
 * and the chart of accounts behind it — is the company's: "vehicles at 20%" is
 * one bookkeeping decision, and two branches with two rates for one class of
 * thing is a schedule nobody can foot. An ASSET stands somewhere — it belongs
 * to a branch, and is depreciated into that branch's accounts. So the property
 * chooser above applies to the register and the yearly run but not to Setup or
 * Categories, which is why it is drawn inside this screen rather than inside
 * any one tab.
 *
 * ⚠️ THE DEPENDENCY RUNS THE OTHER WAY FROM THE TAB ORDER: the heads (Setup)
 * exist before a category can be depreciated, and a category exists before an
 * asset can be entered. The tabs are in the order they are USED -- see TABS.
 *
 * ⚠️ A TAB STAYS MOUNTED ONCE IT HAS BEEN OPENED, hidden behind the one on
 * screen. Unmounting it threw its rows away, so every return to a tab drew an
 * empty page and a spinner before the same figures came back. Each tab reads
 * again when it is chosen again (assetTabActive), with what it had still
 * showing until the answer lands.
 *
 * ⚠️ AND THE TAB CHOSEN IS NOT THE TAB SHOWN UNTIL IT HAS ITS FIGURES (owner,
 * 14 Nov 2026). `tab` is what was clicked; `shown` is what is on screen. A tab
 * opened for the first time reads behind the old one, which stays where it is
 * -- dimmed, so it is plainly not the answer -- and the new one is faded in the
 * moment it reports back. Nothing is ever blank in between.
 *
 * ⚠️ DEPRECIATION IS ITS OWN TAB RATHER THAN A BUTTON ON THE REGISTER, because
 * it is a different act: the first two describe what the company owns, and this
 * one writes a voucher into the books. It answers to its own permission for the
 * same reason.
 */

type TabKey =
  | 'setup'
  | 'categories'
  | 'items'
  | 'register'
  | 'cwip'
  | 'depreciation'
  | 'schedule'
  | 'handovers'
  | 'verification';

/**
 * ⚠️ THE ORDER IS THE OWNER'S (14 Nov 2026), and it is the order of the DAY, not
 * of the setting-up: what is bought and what is owned first, then where each
 * thing is and whether it is still there, then the rates, the yearly charge and
 * its schedule, and last the two that are opened rarely -- a thing still being
 * built, and the one-time chart setup.
 */
const TABS: { key: TabKey; label: string; icon: React.ReactNode; hint: string }[] = [
  { key: 'items', label: 'Items', icon: <FiList size={15} />, hint: '' },
  { key: 'register', label: 'Register', icon: <FiPackage size={15} />, hint: '' },
  { key: 'handovers', label: 'Handovers', icon: <FiRepeat size={15} />, hint: '' },
  { key: 'verification', label: 'Verification', icon: <FiCheckSquare size={15} />, hint: '' },
  { key: 'categories', label: 'Categories', icon: <FiTag size={15} />, hint: '' },
  { key: 'depreciation', label: 'Depreciation', icon: <FiTrendingDown size={15} />, hint: '' },
  { key: 'schedule', label: 'Schedule', icon: <FiFileText size={15} />, hint: '' },
  { key: 'cwip', label: 'Under construction', icon: <FiTool size={15} />, hint: '' },
  { key: 'setup', label: 'Setup', icon: <FiSettings size={15} />, hint: '' },
];

const TAB_KEYS = TABS.map((one) => one.key);

/**
 * One help topic per tab. The tabs share a route, so the route map can only
 * name one of them -- each tab has to name its own, or eight of the nine
 * screens open somebody else's help.
 */
const TAB_HELP: Record<TabKey, string> = {
  setup: 'asset-setup',
  categories: 'asset-category',
  items: 'asset-items',
  register: 'asset-register',
  cwip: 'asset-cwip',
  depreciation: 'asset-depreciation',
  schedule: 'asset-schedule',
  handovers: 'asset-handover',
  verification: 'asset-verification',
};

const AssetSetup = ({ user }: any) => {
  const dispatch = useDispatch<any>();
  const branchDdlData = useSelector((state: any) => state.branchDdl);

  /**
   * The tab lives in the address, so a reload comes back to the same place and
   * a link can be sent to somebody. The same reasoning the hotel setup screen
   * gives for its own tabs.
   */
  const [params, setParams] = useSearchParams();

  const asked = params.get('tab') as TabKey | null;
  // With nothing asked for, the first tab -- so the default follows the order.
  const tab: TabKey = asked && TAB_KEYS.includes(asked) ? asked : TAB_KEYS[0];

  // The tabs opened so far on this visit; they stay mounted behind the one on
  // screen. A tab never opened is never mounted, so it costs nothing.
  const [opened, setOpened] = useState<TabKey[]>([tab]);

  useEffect(() => {
    setOpened((seen) => (seen.includes(tab) ? seen : [...seen, tab]));
  }, [tab]);

  // The tabs that have reported a read back, and the one on screen now.
  const [ready, setReady] = useState<TabKey[]>([]);
  const [shown, setShown] = useState<TabKey>(tab);
  // The tab being faded in. Cleared when the animation ends: it leaves a
  // transform on the pane, and a transform would pin every dialog a tab opens
  // to the pane instead of to the window.
  const [entering, setEntering] = useState<TabKey | null>(null);

  const waiting = shown !== tab;

  useEffect(() => {
    if (shown === tab) return;

    const swap = () => {
      setShown(tab);
      setEntering(tab);
    };

    if (ready.includes(tab)) {
      swap();
      return;
    }

    // A tab that never answers must not leave the person on the old one for
    // ever; after this long it is shown as it is, spinner and all.
    const giveUp = window.setTimeout(swap, 8000);

    return () => window.clearTimeout(giveUp);
  }, [tab, shown, ready]);

  const pane = (key: TabKey, body: React.ReactNode) =>
    tab === key || opened.includes(key) ? (
      <AssetTabContext.Provider
        value={{
          active: tab === key,
          loaded: () => setReady((seen) => (seen.includes(key) ? seen : [...seen, key])),
        }}
      >
        <div
          className={
            shown !== key
              ? 'hidden'
              : waiting
                ? 'pointer-events-none opacity-50 transition-opacity duration-200'
                : entering === key
                  ? 'animate-fade-in-up'
                  : ''
          }
          onAnimationEnd={(event) => {
            // Only the pane's own animation: a spinner inside a tab ends too.
            if (event.target === event.currentTarget) setEntering(null);
          }}
        >
          {body}
        </div>
      </AssetTabContext.Provider>
    ) : null;

  const setTab = (next: TabKey) => {
    const at = new URLSearchParams(params);
    at.set('tab', next);
    /*
     * ⚠️ The form is dropped on the way. A tab carries `?form=` for its own
     * entry page, and the tabs share one query string — left in place, leaving
     * a half-typed category by the Register tab would have opened a blank NEW
     * ASSET form, on a tab the person had only meant to look at.
     */
    at.delete('form');
    // replace, not push: flicking between two tabs must not put two entries in
    // the history for one visit.
    setParams(at, { replace: true });
  };

  // From the signed-in user's own branch, which covers almost everybody. The
  // effect below covers an account that has none of its own.
  const [branchId, setBranchId] = useState<number | null>(user?.branch_id ?? null);

  const branches: any[] = branchDdlData?.protectedData?.data ?? [];

  // Named on the printed schedule: a page headed only "Schedule of Fixed
  // Assets" says nothing about which property's assets it is a schedule of.
  const branchName =
    branches.find((one: any) => Number(one.id) === Number(branchId))?.name ?? undefined;

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
  }, [dispatch]);

  useEffect(() => {
    if (branchId || branches.length !== 1) return;

    setBranchId(Number(branches[0].id));
  }, [branches, branchId]);

  return (
    <div>
      <HelmetTitle
        title="Assets"
        helpTopic={TAB_HELP[tab]}
      />

      <h2 className="mb-3 text-center text-xl font-semibold text-black dark:text-white">
        Fixed Assets
      </h2>

      {/* Drawn wherever there is a choice, on EVERY tab (owner, 14 Nov 2026).
          Categories and Setup are the company's and do not read it, and it
          used to be left off them for that reason -- but then the tab row
          jumped up and down as the tabs were walked. It stays put now; what
          is chosen here is simply carried to the tabs that do read it. */}
      {branches.length > 1 ? (
        <div className="mb-3 w-64">
          <label className="text-sm text-black dark:text-white">Property</label>
          <BranchDropdown
            value={branchId ? String(branchId) : ''}
            defaultValue={branchId ? String(branchId) : ''}
            onChange={(e: any) => {
              setBranchId(e.target.value === '' ? null : Number(e.target.value));
            }}
            className="w-full text-sm"
            branchDdl={branches}
          />
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-1 border-b border-stroke dark:border-strokedark">
        {TABS.map((one) => {
          const active = tab === one.key;

          return (
            <button
              key={one.key}
              type="button"
              onClick={() => setTab(one.key)}
              className={`flex items-center gap-2 rounded-t px-4 py-2 text-sm font-medium transition ${
                active
                  ? 'border-b-2 border-primary text-primary dark:border-secondary dark:text-secondary'
                  : 'border-b-2 border-transparent text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              {one.icon}
              {one.label}
              {/* Chosen, still reading: the old tab is on screen meanwhile. */}
              {active && waiting ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : null}
              <span className="hidden text-[0.65rem] text-gray-400 md:inline">{one.hint}</span>
            </button>
          );
        })}
      </div>

      {pane('items', <AssetItemsTab />)}
      {pane('register', <AssetRegisterTab branchId={branchId} />)}
      {pane('handovers', <AssetHandoverTab branchId={branchId} />)}
      {pane('verification', <AssetVerificationTab branchId={branchId} branchName={branchName} />)}
      {pane('categories', <AssetCategoriesTab />)}
      {pane('depreciation', <AssetDepreciationTab branchId={branchId} />)}
      {pane('schedule', <AssetScheduleTab branchId={branchId} branchName={branchName} />)}
      {pane('cwip', <AssetCwipTab branchId={branchId} />)}
      {pane('setup', <AssetChartSetupTab />)}
    </div>
  );
};

export default AssetSetup;
