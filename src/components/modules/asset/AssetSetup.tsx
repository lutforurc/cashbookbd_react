import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import {
  FiCheckSquare,
  FiFileText,
  FiPackage,
  FiRepeat,
  FiTag,
  FiTool,
  FiTrendingDown,
} from 'react-icons/fi';

import HelmetTitle from '../../utils/others/HelmetTitle';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import { getDdlProtectedBranch } from '../branch/ddlBranchSlider';

import AssetCategoriesTab from './AssetCategoriesTab';
import AssetCwipTab from './AssetCwipTab';
import AssetDepreciationTab from './AssetDepreciationTab';
import AssetRegisterTab from './AssetRegisterTab';
import AssetScheduleTab from './AssetScheduleTab';
import AssetHandoverTab from './AssetHandoverTab';
import AssetVerificationTab from './AssetVerificationTab';

/**
 * Fixed assets — the categories, and the register of the things themselves.
 *
 * ⚠️ SIX TABS, TWO SCOPES, and the difference is not cosmetic. A CATEGORY is the
 * company's: "vehicles at 20%" is one bookkeeping decision, and two branches
 * with two rates for one class of thing is a schedule nobody can foot. An ASSET
 * stands somewhere — it belongs to a branch, and is depreciated into that
 * branch's accounts. So the property chooser above applies to the register and
 * the yearly run but not to the categories, which is why it is drawn inside this
 * screen rather than inside any one tab.
 *
 * ⚠️ CATEGORIES COME FIRST because an asset cannot be entered without one — the
 * rate it wears out at comes from there. The tab order is the order of the job.
 *
 * ⚠️ DEPRECIATION IS A THIRD TAB RATHER THAN A BUTTON ON THE REGISTER, because
 * it is a different act: the first two describe what the company owns, and this
 * one writes a voucher into the books. It answers to its own permission for the
 * same reason.
 */

type TabKey =
  | 'categories'
  | 'register'
  | 'cwip'
  | 'depreciation'
  | 'schedule'
  | 'handovers'
  | 'verification';

const TABS: { key: TabKey; label: string; icon: React.ReactNode; hint: string }[] = [
  { key: 'categories', label: 'Categories', icon: <FiTag size={15} />, hint: 'Rates and heads' },
  { key: 'register', label: 'Register', icon: <FiPackage size={15} />, hint: 'What the company owns' },
  // ⚠️ Between the register and the charge, because that is where it sits in
  // life: a thing being built is not in the register yet and is not depreciated
  // yet. The day it is finished it joins the first and starts answering to the
  // second.
  {
    key: 'cwip',
    label: 'Under construction',
    icon: <FiTool size={15} />,
    hint: 'Not an asset yet',
  },
  // Last, because it cannot be done until the other two are: an asset needs a
  // category to take its rate from, and a category needs its ledger heads.
  {
    key: 'depreciation',
    label: 'Depreciation',
    icon: <FiTrendingDown size={15} />,
    hint: 'The yearly charge',
  },
  // ⚠️ The paper an auditor asks for first, and the only place the register
  // and the ledger can be seen agreeing. Last because it reads what the other
  // three wrote.
  {
    key: 'schedule',
    label: 'Schedule',
    icon: <FiFileText size={15} />,
    hint: 'The year-end note',
  },
  // ⚠️ Beside the count rather than beside the register, because the two are
  // the same kind of work: both are about where a thing physically is, both are
  // done by whoever walks the building, and both answer to the register's
  // permission rather than the one that writes vouchers. Putting it here also
  // leaves Depreciation and Schedule next to each other, which is one job read
  // in two parts.
  {
    key: 'handovers',
    label: 'Handovers',
    icon: <FiRepeat size={15} />,
    hint: 'Who has what',
  },
  // ⚠️ Counting is not accounting, which is why it sits at the end and answers
  // to the register's permission rather than the one that writes vouchers.
  // Whoever walks round the building with a phone is not the person who posts
  // the depreciation, and requiring that permission would put the count in the
  // hands of the one person too busy to do it.
  {
    key: 'verification',
    label: 'Verification',
    icon: <FiCheckSquare size={15} />,
    hint: 'Is it still there',
  },
];

const TAB_KEYS = TABS.map((one) => one.key);

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
  const tab: TabKey = asked && TAB_KEYS.includes(asked) ? asked : 'categories';

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
      <HelmetTitle title="Assets" />

      <h2 className="mb-3 text-center text-xl font-semibold text-black dark:text-white">
        Fixed Assets
      </h2>

      {/* Drawn only where there is a choice, and only on the register: a
          category belongs to the company, so a property chooser above it would
          be asking a question that has no effect. */}
      {tab !== 'categories' && branches.length > 1 ? (
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
              <span className="hidden text-[0.65rem] text-gray-400 md:inline">{one.hint}</span>
            </button>
          );
        })}
      </div>

      {tab === 'categories' ? <AssetCategoriesTab /> : null}
      {tab === 'register' ? <AssetRegisterTab branchId={branchId} /> : null}
      {tab === 'cwip' ? <AssetCwipTab branchId={branchId} /> : null}
      {tab === 'depreciation' ? <AssetDepreciationTab branchId={branchId} /> : null}
      {tab === 'schedule' ? (
        <AssetScheduleTab branchId={branchId} branchName={branchName} />
      ) : null}
      {tab === 'handovers' ? <AssetHandoverTab branchId={branchId} /> : null}
      {tab === 'verification' ? (
        <AssetVerificationTab branchId={branchId} branchName={branchName} />
      ) : null}
    </div>
  );
};

export default AssetSetup;
