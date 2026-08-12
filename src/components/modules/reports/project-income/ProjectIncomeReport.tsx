import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import { useReactToPrint } from 'react-to-print';
import { useNavigate } from 'react-router-dom';
import { FiCheckSquare, FiEdit2, FiRotateCcw } from 'react-icons/fi';

import HelmetTitle from '../../../utils/others/HelmetTitle';
import Loader from '../../../../common/Loader';
import Table from '../../../utils/others/Table';
import InputDatePicker from '../../../utils/fields/DatePicker';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import InputElement from '../../../utils/fields/InputElement';
import FilterMenuShell from '../../../utils/components/FilterMenuShell';
import { ButtonLoading, PrintButton } from '../../../../pages/UiElements/CustomButtons';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { isUserFeatureEnabled } from '../../../utils/userFeatureSettings';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import httpService from '../../../services/httpService';
import {
  API_REPORT_PROJECT_INCOME_DETAIL_URL,
  API_REPORT_PROJECT_INCOME_SUMMARY_URL,
  API_REPORT_PROJECT_INCOME_UNTAGGED_URL,
} from '../../../services/apiRoutes';
import routes from '../../../services/appRoutes';
import ProjectIncomeReportPrint from './ProjectIncomeReportPrint';

type Section = 'summary' | 'detail' | 'untagged';

const SECTIONS: { key: Section; title: string; blurb: string }[] = [
  {
    key: 'summary',
    title: 'Project Summary',
    blurb: 'What each project has earned. Building is income a building earned; project-wide is income no single building did.',
  },
  {
    key: 'detail',
    title: 'Income Detail',
    blurb:
      'Every earning by project, building and head. Project-wide income is left where it is rather than split across buildings by area — rent on a hoarding is not owed to a flat in proportion to its floor space.',
  },
  {
    key: 'untagged',
    title: 'Income Without a Project',
    blurb:
      'Income lines carrying no project. Branch income that never had one belongs here; a unit sale does not — it tags itself, so one showing up is a sale whose unit could not be traced to a live building.',
  },
];

const URL_FOR: Record<Section, string> = {
  summary: API_REPORT_PROJECT_INCOME_SUMMARY_URL,
  detail: API_REPORT_PROJECT_INCOME_DETAIL_URL,
  untagged: API_REPORT_PROJECT_INCOME_UNTAGGED_URL,
};

/** foundData() double-wraps, so the payload sits at data.data.data. */
const payloadOf = (response: any) => response?.data?.data?.data;

const amount = (value: any) => (Number(value) === 0 ? '0.00' : thousandSeparator(Number(value)));

/**
 * What each project has earned.
 *
 * A report of its own rather than columns on the cost one. That report answers
 * cost per square foot and every figure on it is something spent; hanging
 * earnings off the same rows would leave nobody sure which of the two a given
 * number belonged to.
 *
 * Income reaches it from two places. Unit sales tag themselves -- the sale
 * screen works the project and building out from the unit -- so a flat sold
 * appears here without a second entry. The Project Income screen covers the
 * rest: rent on unsold space, scrap and surplus material, forfeited booking
 * money, service charges recovered from buyers.
 *
 * It follows the SALE, not the cash. A unit sale books its whole contract value
 * as income on the day the flat is sold, while the money arrives over months of
 * installments, so what a project shows here is what it has sold rather than
 * what it has collected. For the collected figure, read the installment and due
 * reports -- that is their question.
 */
const ProjectIncomeReport = ({ user }: any) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const settings = useSelector((state: any) => state.settings);
  const unitSaleState = useSelector((state: any) => state.unitSale);
  const useFilterMenuEnabled = isUserFeatureEnabled(settings, 'use_filter_parameter');

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [section, setSection] = useState<Section>('summary');
  const [rows, setRows] = useState<Record<Section, any[]>>({
    summary: [],
    detail: [],
    untagged: [],
  });
  const [loaded, setLoaded] = useState<Record<Section, boolean>>({
    summary: false,
    detail: false,
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
    // end of the range — the books do not run past it.
    if (protectedData?.transactionDate && !endDate) {
      const parsed = dayjs(protectedData.transactionDate, 'DD/MM/YYYY');

      if (parsed.isValid()) {
        setEndDate(parsed.toDate());
        setStartDate(parsed.startOf('year').toDate());
      }
    }
  }, [branchDdlData?.protectedData?.data, branchDdlData?.protectedData?.transactionDate]);

  // Invalidate and reload all sections when a unit sale is updated, since updating
  // a sale affects summary, detail (moving it to a project), and untagged sections.
  useEffect(() => {
    if (unitSaleState?.reportInvalidationTimestamp > 0 && branchId && loaded[section]) {
      // Mark all sections as stale
      setLoaded((prev) => ({ ...prev, summary: false, detail: false, untagged: false }));
      // Trigger reload of current section
      (async () => {
        try {
          const response = await httpService.get(URL_FOR[section], { params: params() });
          if (response?.data?.success) {
            const data = payloadOf(response);
            setRows((prev) => ({ ...prev, [section]: data?.rows || [] }));
            setLoaded((prev) => ({ ...prev, [section]: true }));
          }
        } catch (error) {
          // Error already logged by httpService
        }
      })();
    }
  }, [unitSaleState?.reportInvalidationTimestamp]);

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
    setLoaded({ summary: false, detail: false, untagged: false });
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
    content: () => printRef.current,
    documentTitle: 'Project Income Report',
    removeAfterPrint: true,
  });

  const current = rows[section];
  const hasData = current.length > 0;

  const totals = useMemo(() => {
    if (section === 'summary') {
      return {
        direct: current.reduce((s, r) => s + Number(r.direct_income || 0), 0),
        common: current.reduce((s, r) => s + Number(r.common_income || 0), 0),
        total: current.reduce((s, r) => s + Number(r.total_income || 0), 0),
      };
    }

    return {
      direct: 0,
      common: 0,
      total: current.reduce((s, r) => s + Number(r.amount || 0), 0),
    };
  }, [current, section]);

  const summaryColumns = [
    {
      key: 'project_name',
      header: 'Project',
      cellClass: 'w-72',
      render: (row: any) => <div className="whitespace-normal">{row.project_name}</div>,
    },
    {
      key: 'direct_income',
      header: 'Building',
      headerClass: 'text-right',
      cellClass: 'text-right w-40',
      render: (row: any) => <div>{amount(row.direct_income)}</div>,
    },
    {
      key: 'common_income',
      header: 'Project-wide',
      headerClass: 'text-right',
      cellClass: 'text-right w-40',
      render: (row: any) => <div>{amount(row.common_income)}</div>,
    },
    {
      key: 'total_income',
      header: 'Total',
      headerClass: 'text-right',
      cellClass: 'text-right w-40 font-semibold',
      render: (row: any) => <div>{amount(row.total_income)}</div>,
    },
  ];

  const detailColumns = [
    {
      key: 'project_name',
      header: 'Project',
      cellClass: 'w-52',
      render: (row: any) => <div className="whitespace-normal">{row.project_name}</div>,
    },
    {
      key: 'building_name',
      header: 'Building',
      cellClass: 'w-52',
      // A row with no building is income the whole project earned, which is a
      // different thing from a missing name and has to read that way.
      render: (row: any) => (
        <div className="whitespace-normal">
          {row.building_name || (
            <span className="text-gray-500 dark:text-gray-400">Whole project</span>
          )}
        </div>
      ),
    },
    {
      key: 'head_name',
      header: 'Head',
      cellClass: 'w-64',
      render: (row: any) => <div className="whitespace-normal">{row.head_name}</div>,
    },
    {
      key: 'amount',
      header: 'Amount',
      headerClass: 'text-right',
      cellClass: 'text-right w-40 font-semibold',
      render: (row: any) => <div>{amount(row.amount)}</div>,
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
      key: 'head_name',
      header: 'Head',
      cellClass: 'w-64',
      render: (row: any) => <div className="whitespace-normal">{row.head_name}</div>,
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
      // Opens the voucher on the income screen so a project can be given to it.
      // Only receipts raised there can be corrected this way; a unit sale
      // receipt will be refused by the API, which is the right answer -- it is
      // not this screen's voucher to edit.
      render: (row: any) => (
        <button
          type="button"
          aria-label={`Tag voucher ${row.vr_no}`}
          title="Open this voucher and give it a project"
          onClick={() =>
            navigate(`${routes.real_estate_project_income}?vr_no=${encodeURIComponent(row.vr_no)}`)
          }
          className="text-blue-600 hover:text-blue-700"
        >
          <FiEdit2 className="mx-auto" />
        </button>
      ),
    },
  ];

  const columns =
    section === 'summary' ? summaryColumns : section === 'detail' ? detailColumns : untaggedColumns;

  const footerRows = !hasData
    ? undefined
    : section === 'summary'
      ? [
          [
            { label: 'Total', className: 'text-left font-semibold' },
            { label: amount(totals.direct), className: 'text-right font-semibold' },
            { label: amount(totals.common), className: 'text-right font-semibold' },
            { label: amount(totals.total), className: 'text-right font-semibold' },
          ],
        ]
      : section === 'detail'
        ? [
            [
              { label: 'Total', colSpan: 3, className: 'text-left font-semibold' },
              { label: amount(totals.total), className: 'text-right font-semibold' },
            ],
          ]
        : [
            [
              { label: 'Total', colSpan: 4, className: 'text-left font-semibold' },
              { label: amount(totals.total), className: 'text-right font-semibold' },
              // The action column takes no total, but the row still has to
              // reach the end of the table.
              { label: '', className: '' },
            ],
          ];

  const active = SECTIONS.find((s) => s.key === section)!;

  return (
    <>
      <HelmetTitle title="Project Income Report" />

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
                  className="h-10 w-full text-sm font-medium"
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
                  className="h-10 w-full text-sm font-medium"
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
            <InputElement
              type="number"
              label=""
              placeholder="Rows"
              className="h-10 !w-20 text-center"
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value) || 12)}
            />
            <InputElement
              type="number"
              label=""
              placeholder="Font"
              className="h-10 !w-20 text-center"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value) || 12)}
            />
            <PrintButton label="Print" onClick={handlePrint} className="h-10 px-6" disabled={!hasData} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 px-1">
          {SECTIONS.map((s) => (
            <button
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
                <span className="ml-2 rounded-full bg-slate-600 px-2 py-0.5 text-xs text-white">
                  {rows.untagged.length}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <p className="px-1 text-sm text-slate-500 dark:text-slate-400">{active.blurb}</p>

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
                  ? 'Every income line in this range carries a project.'
                  : 'No income has been tagged to a project in this range yet.'
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
        <ProjectIncomeReportPrint
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

export default ProjectIncomeReport;
