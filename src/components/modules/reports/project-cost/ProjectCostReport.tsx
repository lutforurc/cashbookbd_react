import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import { useReactToPrint } from 'react-to-print';
import { useNavigate } from 'react-router-dom';
import { FiAlertTriangle, FiCheckSquare, FiEdit2, FiLock, FiRotateCcw } from 'react-icons/fi';

import HelmetTitle from '../../../utils/others/HelmetTitle';
import Loader from '../../../../common/Loader';
import Table from '../../../utils/others/Table';
import InputDatePicker from '../../../utils/fields/DatePicker';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import PrintFontInput from '../../../utils/fields/PrintFontInput';
import PrintRowsInput from '../../../utils/fields/PrintRowsInput';
import FilterMenuShell from '../../../utils/components/FilterMenuShell';
import { Button, ButtonLoading, PrintButton } from '../../../../pages/UiElements/CustomButtons';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { isUserFeatureEnabled } from '../../../utils/userFeatureSettings';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import httpService from '../../../services/httpService';
import {
  API_REPORT_PROJECT_BUILDING_DETAIL_URL,
  API_REPORT_PROJECT_SUMMARY_URL,
  API_REPORT_PROJECT_UNTAGGED_URL,
} from '../../../services/apiRoutes';
import routes from '../../../services/appRoutes';
import ProjectCostReportPrint from './ProjectCostReportPrint';

type Section = 'summary' | 'building' | 'untagged';

const SECTIONS: { key: Section; title: string; blurb: string }[] = [
  {
    key: 'summary',
    title: 'Project Summary',
    blurb: 'What each project has cost, and what that is per square foot.',
  },
  {
    key: 'building',
    title: 'Building Detail',
    blurb:
      'Each building by expense head. Direct is what was spent on that building; allocated is its share of costs the whole project carries.',
  },
  {
    key: 'untagged',
    title: 'Expenses Without a Project',
    blurb:
      'Expense lines nobody tagged. They are right in the trial balance and absent from every project figure above.',
  },
];

const URL_FOR: Record<Section, string> = {
  summary: API_REPORT_PROJECT_SUMMARY_URL,
  building: API_REPORT_PROJECT_BUILDING_DETAIL_URL,
  untagged: API_REPORT_PROJECT_UNTAGGED_URL,
};

/** foundData() double-wraps, so the payload sits at data.data.data. */
const payloadOf = (response: any) => response?.data?.data?.data;

const amount = (value: any) => (Number(value) === 0 ? '0.00' : thousandSeparator(Number(value)));

/**
 * What each project and each building has cost.
 *
 * Three reports on one screen because they answer one question between them and
 * share a branch and a date range. Reading them apart is what lets a project
 * look cheap: the summary is only true to the extent that expenses were tagged,
 * and the third tab is the count of what was not.
 */
const ProjectCostReport = ({ user }: any) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const settings = useSelector((state: any) => state.settings);
  const useFilterMenuEnabled = isUserFeatureEnabled(settings, 'use_filter_parameter');

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [section, setSection] = useState<Section>('summary');
  const [rows, setRows] = useState<Record<Section, any[]>>({
    summary: [],
    building: [],
    untagged: [],
  });
  const [integrity, setIntegrity] = useState<any[]>([]);
  const [loaded, setLoaded] = useState<Record<Section, boolean>>({
    summary: false,
    building: false,
    untagged: false,
  });

  const [loading, setLoading] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [perPage, setPerPage] = useState<number>(12);
  const [fontSize, setFontSize] = useState<number>(12);
  const [filterOpen, setFilterOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(getDdlProtectedBranch() as any);
    setBranchId(Number(user?.branch_id) || null);
  }, []);

  useEffect(() => {
    const protectedData = branchDdlData?.protectedData;

    if (protectedData?.data) {
      setDropdownData(protectedData.data);
    }

    // The branch list carries the branch's working date, which is the sensible
    // end of the range â€” the books do not run past it.
    if (protectedData?.transactionDate && !endDate) {
      const parsed = dayjs(protectedData.transactionDate, 'DD/MM/YYYY');

      if (parsed.isValid()) {
        setEndDate(parsed.toDate());
        setStartDate(parsed.startOf('year').toDate());
      }
    }
  }, [branchDdlData?.protectedData?.data, branchDdlData?.protectedData?.transactionDate]);

  const params = () => ({
    branch_id: Number(branchId),
    start_date: startDate ? dayjs(startDate).format('YYYY-MM-DD') : '',
    end_date: endDate ? dayjs(endDate).format('YYYY-MM-DD') : '',
  });

  const load = async (which: Section) => {
    if (!branchId) {
      toast.error('Select a branch first.');
      return;
    }

    setLoading(true);

    try {
      const response = await httpService.get(URL_FOR[which], { params: params() });

      if (!response?.data?.success) {
        toast.error(response?.data?.message || 'Could not load the report.');
        return;
      }

      const data = payloadOf(response);

      setRows((prev) => ({ ...prev, [which]: data?.rows || [] }));
      setLoaded((prev) => ({ ...prev, [which]: true }));

      // Only the two cost reports carry it; the untagged one has no tags to
      // find fault with.
      if (data?.integrity) {
        setIntegrity(data.integrity);
      }
    } catch (error: any) {
      if (!error?.toastReported) {
        toast.error(error?.response?.data?.message || 'Could not load the report.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    setButtonLoading(true);
    // Applying re-asks for the section on screen and marks the others stale, so
    // switching tabs after changing a filter cannot show yesterday's numbers.
    setLoaded({ summary: false, building: false, untagged: false });
    await load(section);
    setButtonLoading(false);
    setFilterOpen(false);
  };

  const handleSection = (next: Section) => {
    setSection(next);

    if (!loaded[next] && branchId) {
      load(next);
    }
  };

  const handleReset = () => setFilterOpen(false);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Project Cost Report',
  });

  const current = rows[section];
  const hasData = current.length > 0;

  const totals = useMemo(() => {
    if (section === 'summary') {
      return {
        direct: current.reduce((s, r) => s + Number(r.direct_cost || 0), 0),
        allocated: current.reduce((s, r) => s + Number(r.common_cost || 0), 0),
        total: current.reduce((s, r) => s + Number(r.total_cost || 0), 0),
      };
    }

    if (section === 'building') {
      return {
        direct: current.reduce((s, r) => s + Number(r.direct_cost || 0), 0),
        allocated: current.reduce((s, r) => s + Number(r.allocated_cost || 0), 0),
        total: current.reduce((s, r) => s + Number(r.total_cost || 0), 0),
      };
    }

    return {
      direct: 0,
      allocated: 0,
      total: current.reduce((s, r) => s + Number(r.amount || 0), 0),
    };
  }, [current, section]);

  const summaryColumns = [
    {
      key: 'project_name',
      header: 'Project',
      cellClass: 'w-64',
      render: (row: any) => <div className="whitespace-normal">{row.project_name}</div>,
    },
    {
      key: 'total_sqft',
      header: 'Area (sqft)',
      headerClass: 'text-right',
      cellClass: 'text-right w-32',
      render: (row: any) => (
        <div>{Number(row.total_sqft) > 0 ? amount(row.total_sqft) : 'not recorded'}</div>
      ),
    },
    {
      key: 'direct_cost',
      header: 'Direct',
      headerClass: 'text-right',
      cellClass: 'text-right w-36',
      render: (row: any) => <div>{amount(row.direct_cost)}</div>,
    },
    {
      key: 'common_cost',
      header: 'Project-wide',
      headerClass: 'text-right',
      cellClass: 'text-right w-36',
      render: (row: any) => <div>{amount(row.common_cost)}</div>,
    },
    {
      key: 'total_cost',
      header: 'Total',
      headerClass: 'text-right',
      cellClass: 'text-right w-36 font-semibold',
      render: (row: any) => <div>{amount(row.total_cost)}</div>,
    },
    {
      key: 'cost_per_sqft',
      header: 'Per sqft',
      headerClass: 'text-right',
      cellClass: 'text-right w-28',
      // Zero cost and no area recorded are different answers, and
      // thousandSeparator renders both as a dash.
      render: (row: any) => (
        <div>{row.cost_per_sqft === null ? 'no area' : amount(row.cost_per_sqft)}</div>
      ),
    },
  ];

  const buildingColumns = [
    {
      key: 'project_name',
      header: 'Project',
      cellClass: 'w-44',
      render: (row: any) => <div className="whitespace-normal">{row.project_name}</div>,
    },
    {
      key: 'building_name',
      header: 'Building',
      cellClass: 'w-52',
      render: (row: any) => (
        <div className="whitespace-normal">
          {row.building_name}
          {Number(row.building_sqft) > 0 ? (
            <span className="block text-xs text-gray-500 dark:text-gray-400">
              {amount(row.building_sqft)} sqft Â· {row.sqft_pct}%
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'head',
      header: 'Head',
      cellClass: 'w-64',
      render: (row: any) => <div className="whitespace-normal">{row.head}</div>,
    },
    {
      key: 'direct_cost',
      header: 'Direct',
      headerClass: 'text-right',
      cellClass: 'text-right w-36',
      render: (row: any) => <div>{amount(row.direct_cost)}</div>,
    },
    {
      key: 'allocated_cost',
      header: 'Allocated',
      headerClass: 'text-right',
      cellClass: 'text-right w-36',
      render: (row: any) => <div>{amount(row.allocated_cost)}</div>,
    },
    {
      key: 'total_cost',
      header: 'Total',
      headerClass: 'text-right',
      cellClass: 'text-right w-36 font-semibold',
      render: (row: any) => <div>{amount(row.total_cost)}</div>,
    },
  ];

  const untaggedColumns = [
    {
      key: 'vr_date',
      header: 'Date',
      cellClass: 'w-32',
      render: (row: any) => <div>{row.vr_date ? dayjs(row.vr_date).format('DD/MM/YYYY') : ''}</div>,
    },
    {
      key: 'vr_no',
      header: 'Voucher',
      cellClass: 'w-36',
      render: (row: any) => <div>{row.vr_no}</div>,
    },
    {
      key: 'head',
      header: 'Head',
      cellClass: 'w-64',
      render: (row: any) => <div className="whitespace-normal">{row.head}</div>,
    },
    {
      key: 'remarks',
      header: 'Remarks',
      cellClass: 'w-80',
      render: (row: any) => <div className="whitespace-normal">{row.remarks}</div>,
    },
    {
      key: 'amount',
      header: 'Amount',
      headerClass: 'text-right',
      cellClass: 'text-right w-36',
      render: (row: any) => <div>{amount(row.amount)}</div>,
    },
    {
      key: 'action',
      header: 'Action',
      headerClass: 'text-center',
      cellClass: 'text-center w-20',
      // The point of this report is to empty it, so the row carries the way to
      // do that: open the voucher on the expense screen and give it a project.
      // An approved voucher cannot be opened at all, so it gets a lock instead
      // of a button that would only lead to a refusal.
      render: (row: any) =>
        Number(row.is_approved) === 1 ? (
          <span
            title="Approved vouchers cannot be edited. Remove the approval first, then tag it."
            className="cursor-help text-amber-600 dark:text-amber-400"
          >
            <FiLock className="mx-auto" />
            <span className="sr-only">Approved â€” locked for editing</span>
          </span>
        ) : (
          <Button
            type="button"
            aria-label={`Tag voucher ${row.vr_no}`}
            title="Open this voucher and give it a project"
            onClick={() =>
              navigate(
                `${routes.real_estate_project_expense}?vr_no=${encodeURIComponent(row.vr_no)}`,
              )
            }
            className="text-blue-600 hover:text-blue-700"
          >
            <FiEdit2 className="mx-auto" />
          </Button>
        ),
    },
  ];

  const columns =
    section === 'summary' ? summaryColumns : section === 'building' ? buildingColumns : untaggedColumns;

  const footerRows =
    hasData && section !== 'untagged'
      ? [
          [
            { label: 'Total', colSpan: section === 'summary' ? 2 : 3, className: 'text-left font-semibold' },
            { label: amount(totals.direct), className: 'text-right font-semibold' },
            { label: amount(totals.allocated), className: 'text-right font-semibold' },
            { label: amount(totals.total), className: 'text-right font-semibold' },
            ...(section === 'summary' ? [{ label: '', className: '' }] : []),
          ],
        ]
      : hasData
        ? [
            [
              { label: 'Total', colSpan: 4, className: 'text-left font-semibold' },
              { label: amount(totals.total), className: 'text-right font-semibold' },
              // The action column takes no total, but the row still has to
              // reach the end of the table.
              { label: '', className: '' },
            ],
          ]
        : undefined;

  const active = SECTIONS.find((s) => s.key === section)!;

  return (
    <>
      <HelmetTitle title="Project Cost" />

      <div className="mx-auto space-y-2">
        <div className="py-3 pl-0 pr-1">
          <div className="flex flex-wrap items-end gap-3">
            <FilterMenuShell
              enabled={useFilterMenuEnabled}
              isOpen={filterOpen}
              onToggle={() => setFilterOpen((p) => !p)}
              menuWidthClassName="w-[min(92vw,340px)]"
              inlineClassName="grid grid-cols-1 items-end gap-3 md:grid-cols-3 xl:grid-cols-4"
            >
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Select Branch
                </label>
                <BranchDropdown
                  branchDdl={dropdownData}
                  onChange={(e) => setBranchId(Number(e.target.value) || null)}
                  defaultValue={String(branchId ?? '')}
                  value={String(branchId ?? '')}
                  className="h-10 w-full p-2 text-sm font-medium"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Start Date
                </label>
                <InputDatePicker
 selectedDate={startDate}
 setSelectedDate={setStartDate}
 setCurrentDate={setStartDate}
 className="w-full text-sm font-medium"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  End Date
                </label>
                <InputDatePicker
 selectedDate={endDate}
 setSelectedDate={setEndDate}
 setCurrentDate={setEndDate}
 className="w-full text-sm font-medium"
                />
              </div>
            </FilterMenuShell>

            <ButtonLoading
              label="Apply"
              onClick={handleApply}
              buttonLoading={buttonLoading}
              className="h-10 px-6"
              icon={<FiCheckSquare />}
            />
            <ButtonLoading
              label="Reset"
              onClick={handleReset}
              buttonLoading={false}
              className="h-10 px-4"
              icon={<FiRotateCcw />}
            />
            <PrintRowsInput
 type="number"
 label=""
 placeholder="Rows"
 className="w-20! text-center"
 value={perPage}
 onChange={(e) => setPerPage(Number(e.target.value) || 12)}
            />
            <PrintFontInput
 type="number"
 label=""
 placeholder="Font"
 className="w-20! text-center"
 value={fontSize}
 onChange={(e) => setFontSize(Number(e.target.value) || 12)}
            />
            <PrintButton label="Print" onClick={handlePrint} className="h-10 px-6" disabled={!hasData} />
          </div>
        </div>

        {/* Three reports, one question. Kept together because reading the
            summary without the third tab is how a project comes to look
            cheaper than it was. */}
        <div className="flex flex-wrap gap-2 px-1">
          {SECTIONS.map((s) => (
            <Button
              key={s.key}
              type="button"
              onClick={() => handleSection(s.key)}
              className={
                'rounded-sm border px-4 py-2 text-sm font-medium transition ' +
                (section === s.key
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : 'border-stroke bg-white text-slate-700 hover:border-blue-400 dark:border-strokedark dark:bg-boxdark dark:text-slate-200')
              }
            >
              {s.title}
              {s.key === 'untagged' && rows.untagged.length > 0 ? (
                <span className="ml-2 rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">
                  {rows.untagged.length}
                </span>
              ) : null}
            </Button>
          ))}
        </div>

        <p className="px-1 text-sm text-slate-500 dark:text-slate-400">{active.blurb}</p>

        {integrity.length > 0 ? (
          <div className="mx-1 rounded-sm border border-amber-400 bg-amber-50 p-4 dark:border-amber-600 dark:bg-amber-950">
            <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-200">
              <FiAlertTriangle />
              {integrity.length} recorded cost{integrity.length > 1 ? 's' : ''} the reports above cannot
              show
            </div>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
              This money was tagged to a project, then the project or building it named was deleted or
              moved. It is missing from every figure on this page.
            </p>
            <ul className="mt-2 space-y-1 text-sm text-amber-900 dark:text-amber-100">
              {integrity.map((p: any) => (
                <li key={p.detail_id}>
                  {p.vr_no} Â· {p.head} Â· {amount(p.amount)} â€” {p.problem}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <Loader />
          </div>
        ) : null}

        {!loading && !hasData ? (
          <div className="rounded-sm border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-default dark:border-slate-700 dark:bg-boxdark">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
              {loaded[section] ? 'Nothing to show' : 'No report loaded yet'}
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {loaded[section]
                ? section === 'untagged'
                  ? 'Every expense in this range carries a project. That is the answer you want here.'
                  : 'No cost has been tagged to a project in this range yet.'
                : 'Select a branch and date range, then click Apply.'}
            </p>
          </div>
        ) : null}

        {!loading && hasData ? (
          <div className="space-y-3 px-1 py-2" style={{ fontSize: `${fontSize}px` }}>
            <Table
              columns={columns}
              data={current}
              perPage={perPage}
              footerRows={footerRows}
              noDataMessage="No data found"
            />
          </div>
        ) : null}
      </div>

      <div className="hidden">
        <ProjectCostReportPrint
          ref={printRef}
          title={active.title}
          section={section}
          rows={current}
          totals={totals}
          startDate={startDate ? dayjs(startDate).format('DD/MM/YYYY') : ''}
          endDate={endDate ? dayjs(endDate).format('DD/MM/YYYY') : ''}
          rowsPerPage={Number(perPage)}
          fontSize={Number(fontSize)}
        />
      </div>
    </>
  );
};

export default ProjectCostReport;
