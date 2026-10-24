import React, { useEffect, useRef, useState } from 'react';
import { Button, ButtonLoading, PrintButton } from '../../../../pages/UiElements/CustomButtons';
import InputDatePicker from '../../../utils/fields/DatePicker';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Loader from '../../../../common/Loader';
import { useDispatch, useSelector } from 'react-redux';
import { getDueList } from './dueListSlice';
import { FiBook, FiCheckSquare, FiEdit, FiFilter, FiRotateCcw, FiTrash2 } from 'react-icons/fi';
import dayjs from 'dayjs';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import Table, { TableFooterCell } from '../../../utils/others/Table';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import CashBookPrint from '../cashbook/CashBookPrint';
import DueListPrint from './DueListPrint';
import PrintFontInput from '../../../utils/fields/PrintFontInput';
import PrintRowsInput from '../../../utils/fields/PrintRowsInput';
import { useReactToPrint } from 'react-to-print';
import { isBranchSettingOn, isUserFeatureEnabled, settingOn } from '../../../utils/userFeatureSettings';
import { formatMobile, useMobileFormat } from '../../../utils/utils-functions/mobileFormat';
import ToggleSwitch from '../../../utils/utils-functions/ToggleSwitch';
import formatAge from '../../../utils/utils-functions/formatAge';
import DocumentPrint from '../../../utils/print-designer/DocumentPrint';
import type { DocumentData } from '../../../utils/print-designer/DocumentPrint';
import { normalizeTemplate } from '../../../utils/print-designer/printTemplate';
import type { PrintTemplate } from '../../../utils/print-designer/printTemplate';
import httpService from '../../../services/httpService';
import { API_PRINT_TEMPLATE_URL } from '../../../services/apiRoutes';
import { toDueListDocumentData } from './dueListDocumentData';
import { useReportQuery } from '../../../utils/hooks/useReportQuery';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import { ClientType } from '../../../utils/fields/DataConstant';
import { getEmployeesDDL } from '../../hrms/employee/employeeSlice';

/**
 * The classifications Add Customers saves in `cust_party_infos.party_type_id`.
 *
 * ⚠️ The four values are that screen's own constant, read from it rather than
 * copied, so the two screens cannot drift apart. The leading blank entry is
 * this screen's "no filter" -- it is not a classification, and it is the only
 * value the API rows never carry.
 */
const DUE_LIST_TYPE_FILTER = [
  { id: '', name: 'All Types' },
  ...ClientType.filter((entry) => entry.id !== ''),
];

const DueList = (user: any) => {
  const dispatch = useDispatch();
  const branchDdlData = useSelector((state) => state.branchDdl);
  const mobileFormat = useMobileFormat();
  const branchList = useSelector((state) => state.branchList);
  const dueList = useSelector((state) => state.dueList);
  const settings = useSelector((state: any) => state.settings);
  const useFilterMenuEnabled = isUserFeatureEnabled(settings, 'use_filter_parameter');

  // Off means off. The setting arrives as the text '0', which a bare `&&` reads
  // as true -- which is why the mobile number and address were on the report
  // with the branch switch turned off.
  const showAddress = isBranchSettingOn(settings, 'due_list_with_address');

  /**
   * How old the money is, beside how much of it there is.
   *
   * ⚠️ On by default. It was off to begin with, on the reasoning that four more
   * columns make a different table and most visits only want the names and the
   * figures. That was wrong: the first person to open the report after the
   * ageing was built could not find it, and a switch nobody knows to look for
   * is the same as no feature. Whoever wants the shorter table can turn it off,
   * which is the easier thing to discover of the two.
   */
  const [showAgeing, setShowAgeing] = useState(true);

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null); // Define state with type
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);
  const [isSelected, setIsSelected] = useState<number | string>('');
  const [selectedOption, setSelectedOption] = useState<OptionType | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [perPage, setPerPage] = useState<number>(0);
  const [fontSize, setFontSize] = useState<number>(10);
  const [filterOpen, setFilterOpen] = useState(false);
  // The selected classification -- a `cust_party_infos.party_type_id`, or ''
  // for every party.
  const [partyTypeId, setPartyTypeId] = useState<string>('');
  // Whose customers, as List Customers asks it: an hrm_employees id, 'none' for
  // the parties nobody has been given to, or '' for every party.
  const [employeeId, setEmployeeId] = useState<string>('');
  // What the address bar asked for, and whether it has been answered once.
  const query = useReportQuery();
  const answered = useRef(false);


  interface OptionType {
    value: string;
    label: string;
    additionalDetails: string;
  }
  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    setIsSelected(user.user.branch_id);
    setBranchId(user.user.branch_id);
  }, []);

  /**
   * ⚠️ THE CUSTOMERS, AND ONLY THE CUSTOMERS.
   *
   * The API answers `{ records, summary }`. It used to answer one array with a
   * 'Total' row and a 'Balance' row pushed onto it, which this screen then drew
   * as customers -- numbered them, counted them, and footed them along with
   * everybody else. A list owing 78,341 printed 2,35,023: the parties, the
   * Total row and the Balance row, added up.
   *
   * The figures live in `summary` now, and the footer is drawn from there.
   */
  useEffect(() => {
    setTableData(dueList?.data?.records);
  }, [dueList]);

  const dueSummary: { debit: number; credit: number; balance: number; count: number } | null =
    dueList?.data?.summary ?? null;

  /**
   * What the table, the totals and the print all read.
   *
   * ⚠️ These are already the selected classification's rows. The server applied
   * the filter inside the query and computed its totals over the same set, so
   * nothing is cut on the screen -- the figures and the rows beside them cannot
   * disagree about which parties they describe.
   */
  const displayRows = Array.isArray(tableData) ? tableData : [];

  /**
   * ⚠️ THE EMPLOYEE FILTER BELONGS TO THE BRANCH THE REPORT IS FOR, not to the
   * reader's own.
   *
   * This report can be run for another branch, so the switch is read off THAT
   * branch's own row in the dropdown -- the server carries it there now -- and
   * `settings.data.branch` (the reader's branch) is never consulted. Reading the
   * reader's own setting would offer the filter on a branch that has no such
   * column, or hide it on one that does.
   */
  const selectedBranchRow = dropdownData.find(
    (b: any) => String(b?.id) === String(branchId),
  );
  const branchHandlesCustomers = settingOn(selectedBranchRow?.need_customer_handle_by_employee);

  /**
   * ⚠️ THE SAME CONDITION LIST CUSTOMERS USES, and for the same reasons: the
   * branch's switch, and the field stood down on the Supplier classification --
   * it lives on the customer form alone, so a supplier row can never carry one
   * and the picker could only offer choices that all come back empty.
   */
  const handleByEmployeeOn = branchHandlesCustomers && partyTypeId !== '2';

  const employees = useSelector((state: any) => state.employees);

  /**
   * Loaded per branch, and only where the field is offered at all -- the
   * endpoint answers 404 on a branch that runs no HRMS, and a request per visit
   * whose answer is thrown away is noise in a slice four other screens share.
   */
  useEffect(() => {
    if (!handleByEmployeeOn) return;

    dispatch(getEmployeesDDL({ branchId: String(branchId ?? '') }));
  }, [dispatch, handleByEmployeeOn, branchId]);

  /**
   * ⚠️ A HIDDEN FILTER MUST NOT GO ON NARROWING THE REPORT. Moving to a branch
   * that does not ask for the field -- or switching to a classification it does
   * not apply to -- clears the choice, so the next run is the wide one the
   * screen now shows.
   */
  useEffect(() => {
    if (!handleByEmployeeOn && employeeId) setEmployeeId('');
  }, [handleByEmployeeOn, employeeId]);

  // The picker's rows, built exactly as List Customers builds them.
  const employeeFilterData = [
    { id: '', name: 'All Employees' },
    { id: 'none', name: 'No Employee' },
    ...(Array.isArray(employees?.employeeDDL?.data?.data)
      ? employees.employeeDDL.data.data.map((item: any) => ({
          id: item?.id?.toString() ?? '',
          name: item?.name ?? '',
        }))
      : []),
  ];

  // What the print header says it is showing.
  const clientTypeLabel =
    DUE_LIST_TYPE_FILTER.find((entry) => String(entry.id) === String(partyTypeId))?.name ||
    'All Types';

  const employeeLabel = employeeId
    ? employeeFilterData.find((entry) => String(entry.id) === String(employeeId))?.name || employeeId
    : '';

  /* ---------------- the foot of the report ---------------- */

  /**
   * ⚠️ ONE FIGURE, ONE MEANING, ADDED ONCE. Debit is what the parties owe,
   * Credit what they are in front, and Balance is the two netted -- three
   * different questions, and adding any of them together answers none. The four
   * age buckets come off the same rows the table draws, which is what keeps a
   * bucket from disagreeing with the balance printed beside it.
   *
   * Two decimals throughout, through the app's own formatter, so the foot reads
   * exactly like the cells above it.
   */
  const money = (value: number | string | null | undefined) =>
    thousandSeparator(Number(Number(value ?? 0).toFixed(2)));

  const bucketTotal = (label: string) =>
    displayRows.reduce((total, row) => {
      const bucket = (row?.ageing ?? []).find((b: any) => b.label === label);
      return total + Number(bucket?.amount ?? 0);
    }, 0);

  const footerTotals = {
    debit: Number(dueSummary?.debit ?? 0),
    credit: Number(dueSummary?.credit ?? 0),
    balance: Number(dueSummary?.balance ?? 0),
  };

  /**
   * The Grand Total row, laid out on the columns the table is ACTUALLY drawing:
   * the label runs across the ones that carry no figure, and each figure sits
   * under its own heading. The shared Table re-spans these when the reader
   * hides a column, and `showAgeing` decides whether the four buckets are there
   * at all -- so the row cannot slide out from under its headings.
   *
   * ⚠️ A ROW OF CELLS, NOT A LIST OF CELLS. `Table`'s `footerRows` is an array
   * of rows (`TableFooterCell[][]`) because it takes the cells of hidden columns
   * out of each row by walking them from the left. A flat array of cells is
   * walked as if each cell were a row, and `withoutHidden(cell)` then has no
   * `.map` -- which is the crash this shape caused.
   */
  const footerRows: TableFooterCell[][] = displayRows.length
    ? [
        [
          { label: 'Grand Total', colSpan: 4, className: 'text-right' },
          { label: money(footerTotals.debit), className: 'text-right' },
          { label: money(footerTotals.credit), className: 'text-right' },
          ...(showAgeing
            ? [
                // Last Paid has no total: a date is not a sum.
                { label: '' },
                ...['0-30', '31-60', '61-90', '90+'].map((label) => ({
                  label: money(bucketTotal(label)),
                  className: 'text-right',
                })),
              ]
            : []),
        ],
      ]
    : [];

  /**
   * Changing the classification runs the report again on it.
   *
   * A new request rather than a re-sift of what is already in hand, so the
   * totals come back right with the rows and "Supplier & Customer" (3) is its
   * own answer rather than the union of Customer (1) and Supplier (2).
   */
  const handlePartyTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextType = e.target.value;
    setPartyTypeId(nextType);

    /**
     * ⚠️ THE EMPLOYEE CHOICE IS SETTLED HERE, in the same breath as the new
     * classification -- not left to the effect below. Switching to Supplier
     * takes the picker away, and a request sent with the old employee still on
     * it would narrow a list that no longer offers the filter, invisibly.
     */
    const nextEmployee = branchHandlesCustomers && nextType !== '2' ? employeeId : '';
    if (nextEmployee !== employeeId) setEmployeeId(nextEmployee);

    dispatch(
      getDueList({
        branchId,
        endDate: dayjs(endDate).format('YYYY-MM-DD'),
        partyTypeId: nextType,
        employeeId: nextEmployee,
      }),
    );
  };

  /** The same narrowing, by employee -- written down and asked for at once. */
  const handleEmployeeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    setEmployeeId(next);
    dispatch(
      getDueList({
        branchId,
        endDate: dayjs(endDate).format('YYYY-MM-DD'),
        partyTypeId,
        employeeId: next,
      }),
    );
  };


  const handleBranchChange = (e: any) => {
    setBranchId(e.target.value);
  };

  const handleEndDate = (e: any) => {
    setEndDate(e);
  };
  const handleActionButtonClick = (e: any) => {

    const endD = dayjs(endDate).format('YYYY-MM-DD'); // Adjust format as needed
    // The classification and the employee ride along, so applying a branch or
    // end-date change does not quietly drop back to "every party".
    dispatch(getDueList({ branchId, endDate: endD, partyTypeId, employeeId }));
    setFilterOpen(false);
  };

  const handleResetFilters = () => {
    setFilterOpen(false);
  };


  useEffect(() => {
    if (
      branchDdlData?.protectedData?.data &&
      branchDdlData?.protectedData?.transactionDate
    ) {
      setDropdownData(branchDdlData?.protectedData?.data);
      const [day, month, year] =
        branchDdlData?.protectedData?.transactionDate.split('/');
      const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));

      // The address bar wins where it has something to say: a dashboard's
      // ageing card links here with the day and branch it was showing, and
      // the list is run on them rather than left as a question above
      // "No data found". From the menu there is no query, and the branch's
      // transaction date is what a fresh visit means.
      const asOn = query.to ?? query.from ?? parsedDate;
      const branch = query.branch ?? user.user.branch_id;
      setEndDate(asOn);
      setBranchId(branch);

      if (query.asked && !answered.current) {
        answered.current = true;
        dispatch(
          getDueList({
            branchId: branch,
            endDate: dayjs(asOn).format('YYYY-MM-DD'),
            partyTypeId,
            // A fresh visit has no employee chosen; the parameter keeps the one
            // shape for every caller.
            employeeId,
          }),
        );
      }
    } else {
    }
  }, [branchDdlData?.protectedData?.data]);

  /**
   * How recently the money moved, said in colour.
   *
   * ⚠️ The edges are the bucket edges -- 30 and 90 -- and must stay that way.
   * The two columns are read across one row, so a green Last Paid beside a red
   * 90+ balance has to mean "old debt, but they are still paying". If the
   * thresholds drifted apart, the same row would say a party is both current
   * and delinquent, and the reader would have no way to tell which half to
   * believe.
   *
   * Chosen on the day count rather than the years and months, because months
   * cannot be compared without knowing which ones they were.
   */
  const lastPaidTone = (days: number | null | undefined) => {
    if (days === null || days === undefined) return 'text-danger';
    if (days <= 30) return 'text-success';
    if (days <= 90) return 'text-warning';
    return 'text-danger';
  };

  const columns = [
    {
      key: 'sl_number',
      header: 'Sl. No',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'coa4_name',
      header: 'Customer/Supplier',
      render: (row: any) => (
        <>
          <p>{row.coa4_name}</p>
          {showAddress && (
            <>
              <p className="text-sm text-gray-500">{(row.mobile?.length ?? 0) > 10 && <div className="text-xs">{formatMobile(row.mobile, mobileFormat)}</div>}</p>
              <p className="text-sm text-gray-500">{row.manual_address}</p>
            </>
          )}
        </>
      ),
    },
    {
      key: 'ledger_page',
      header: 'Page',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'area_id',
      header: 'Area Code',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => (
        <>
          <p>{row.area_id ? row.area_id : '-'}</p>
        </>
      )
    },
    {
      key: 'debit',
      header: 'Debit',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <>
          <p>{row.debit > 0 ? thousandSeparator(row.debit) : '-'}</p>
        </>
      )
    },
    {
      key: 'credit',
      header: 'Credit',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <>
          <p>{row.credit > 0 ? thousandSeparator(row.credit) : '-'}</p>
        </>
      )
    },

    /**
     * When they last handed money over.
     *
     * Sits before the buckets because it is about the party, not about a
     * bucket, and because the two are read against each other: a debt in 90+
     * whose owner paid last week is a slow account, and the same debt with no
     * payment since January is a different problem needing a different call.
     *
     * ⚠️ Counts RECEIPT vouchers only. A credit also arises from a return, a
     * discount or a journal adjustment, and none of those is the party paying
     * -- printing one here would say somebody paid when nobody did.
     */
    ...(showAgeing
      ? [{
          key: 'last_paid',
          header: 'Last Paid',
          headerClass: 'text-center w-28',
          cellClass: 'text-center w-28',
          render: (row: any) => (
            row.last_paid ? (
              <>
                <p>{dayjs(row.last_paid).format('DD/MM/YYYY')}</p>
                {/* Green against the red of the 90+ column, so the eye can pair
                    them across the row: how old the debt is, and how recently
                    the money moved. The design token, not a raw colour, so it
                    follows the theme like every other coloured figure here. */}
                <p className={`text-xs ${lastPaidTone(row.last_paid_days)}`}>
                  {formatAge(row.last_paid_age)}
                </p>
              </>
            ) : (
              // Said in a word rather than left blank: an empty cell reads as
              // "not known", and never having paid at all is the strongest
              // thing this column has to say -- so it is said in the colour the
              // report uses for trouble, not the grey it uses for asides.
              <p className="text-danger">never</p>
            )
          ),
        }]
      : []),

    /**
     * The four buckets, built from the row's own ageing rather than counted
     * here.
     *
     * ⚠️ They add up to the Debit column beside them, and that is checked on
     * the server for every row -- see ageing_check.php. A bucket total that
     * disagreed with the balance next to it would still look authoritative,
     * and somebody would chase the wrong customer on it.
     *
     * The oldest bucket carries the age of the oldest unpaid item, because
     * "90+" says nothing about whether that is ninety-one days or three years,
     * and the difference decides who is telephoned first. It is said in years
     * and months -- "1y 1m 10d" -- since nobody holds what 400 days means.
     */
    ...(showAgeing
      ? ['0-30', '31-60', '61-90', '90+'].map((label) => ({
          key: `ageing_${label}`,
          header: label === '90+' ? '90+ days' : `${label} d`,
          headerClass: 'text-right',
          cellClass: 'text-right w-24',
          render: (row: any) => {
            const bucket = (row.ageing ?? []).find((b: any) => b.label === label);
            const amount = Number(bucket?.amount ?? 0);

            return (
              <>
                <p className={label === '90+' && amount > 0 ? 'text-danger' : ''}>
                  {amount > 0 ? thousandSeparator(amount) : '-'}
                </p>
                {/* Red like the figure above it: the age is the same warning said a
                    second way, not a footnote to it. Paired with the green under
                    Last Paid, a row reads across in one glance -- old money on the
                    right, recent money in the middle. */}
                {label === '90+' && amount > 0 && row.oldest_days > 90 ? (
                  <p className="text-[0.65rem] text-danger">{formatAge(row.oldest_age)}</p>
                ) : null}
              </>
            );
          },
        }))
      : []),
  ];

  const handlePerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setPerPage(value);
    } else {
      setPerPage(10); // Reset if input is invalid
    }
  };
  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);

    if (!isNaN(value)) {
      setFontSize(value);
    } else {
      setFontSize(10); // Reset if input is invalid
    }
  };

  const printBespoke = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Due Report',
  });

  // The list about to be printed through a saved layout, held with its data
  // and cleared afterwards so a second print cannot go out carrying the
  // first one's rows.
  const [dueDoc, setDueDoc] = useState<{ template: PrintTemplate; data: DocumentData } | null>(null);
  const dueDocRef = useRef<HTMLDivElement>(null);
  const printDueDoc = useReactToPrint({
    contentRef: dueDocRef,
    documentTitle: 'Due Report',
    onAfterPrint: () => setDueDoc(null),
  });

  // Prints once the document is actually on the page: react-to-print copies
  // the DOM the moment it is called, and the short wait is for the letterhead
  // image PadPrinting loads. Same shape as LedgerWithProduct.
  useEffect(() => {
    if (!dueDoc) return undefined;
    const timer = setTimeout(() => printDueDoc(), 250);
    return () => clearTimeout(timer);
  }, [dueDoc]);

  /**
   * Print: the branch's own layout where it has saved one, and the sheet this
   * screen has always printed where it has not. The layout is fetched at the
   * click, and every failure -- none saved, server behind, connection dropped
   * -- falls through to the old paper.
   */
  const handlePrint = async () => {
    const rows = Array.isArray(displayRows) ? displayRows : [];
    let layout: any = null;

    try {
      const response = await httpService.get(`${API_PRINT_TEMPLATE_URL}/due_list`, {
        params: { branch_id: branchId ?? settings?.data?.branch?.id },
      });
      layout = response?.data?.data?.data?.layout ?? null;
    } catch {
      layout = null;
    }

    if (!rows.length || !layout) {
      printBespoke();
      return;
    }

    const template = normalizeTemplate(layout, 'due_list');
    const branch = dropdownData.find((b: any) => String(b?.id) === String(branchId));

    // The two knobs the screen still owns are applied over the layout: Rows
    // and Font. Everything else is the saved layout's.
    setDueDoc({
      template: { ...template, rowsPerPage: Number(perPage), fontSize: Number(fontSize) },
      data: toDueListDocumentData({
        rows,
        endDate,
        showAddress,
        showAgeing,
        mobileFormat,
        branchName: branch?.name,
        clientType: clientTypeLabel,
        // Only where the filter is actually offered -- a paper that names an
        // employee the report was never narrowed by would misdescribe it.
        employee: handleByEmployeeOn ? employeeLabel : '',
        // The foot's figures, from the records only. The layout's own Grand
        // Total row foots the Debit and Credit columns off the rows it is given,
        // which are now customers and nothing else.
        summary: footerTotals,
      }),
    });
  };

  return (
    <div className="">
      <HelmetTitle title={'Due List'} />
      <div className="py-3">
        {selectedOption && (
          <div className="mt-4">
            <p>Selected:</p>
            <p className="font-bold">{selectedOption.label}</p>
          </div>
        )}
        <div className={`gap-3 ${useFilterMenuEnabled ? 'flex flex-wrap items-center' : 'flex flex-wrap items-end'}`}>
          {/*
            ⚠️ `contents` IN THE INLINE ARRANGEMENT, and it is the whole fix.
            The fields used to sit in their own box -- a `min-w-[320px] flex-1`
            wrapper holding a grid -- with the buttons in a second box beside it,
            so the grid wrapped End Date onto a line of its own and the actions
            were forced onto another. With no box of their own the field divs
            become items of the OUTER row and share its one wrapping line with
            the actions, which is the arrangement asked for: fields, then the
            buttons, wrapping together only when there is genuinely no room.
            The popover arrangement keeps its own box, because there the fields
            must stay inside the panel.
          */}
          <div className={useFilterMenuEnabled ? 'relative shrink-0' : 'contents'}>
            {useFilterMenuEnabled && (
              <Button
                type="button"
                onClick={() => setFilterOpen((prev) => !prev)}
                className={`inline-flex w-10 items-center justify-center rounded border text-sm transition ${filterOpen
 ?'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300':'border-blue-500 bg-white text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700'}`}
                title="Open filters"
                aria-label="Open filters"
              >
                <FiFilter size={16} />
              </Button>
            )}

            {(useFilterMenuEnabled ? filterOpen : true) && (
              <div
                className={
                  useFilterMenuEnabled
                    ? 'absolute left-0 top-full z-1000 mt-2 w-[min(92vw,320px)] rounded-md border border-slate-300 bg-white p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-800'
                    : 'contents'
                }
              >
                <div
                  className={
                    useFilterMenuEnabled
                      ? 'space-y-3'
                      // The outer row's own `gap-3` and `items-end` do the work
                      // now; a grid in here was what put End Date on a line by
                      // itself and left a third of the row empty.
                      : 'contents'
                  }
                >
                  {/* ⚠️ Widths only in the inline row -- inside the popover a
                      field is as wide as the panel. Branch is the one that
                      carries a shop's full name, so it gets the room. */}
                  <div className={useFilterMenuEnabled ? undefined : 'w-full sm:w-60 xl:w-64'}>
                    <label className="mb-1 block whitespace-nowrap text-sm font-medium text-slate-700 dark:text-slate-200">Select Branch</label>
                    {branchDdlData.isLoading == true ? <Loader /> : ''}
                    <BranchDropdown
 onChange={handleBranchChange}
 value={branchId == null ? '' : String(branchId)}
 className="w-full font-medium text-sm p-1.5 "
 branchDdl={dropdownData}
                    />
                  </div>

                  <div className={useFilterMenuEnabled ? undefined : 'w-full sm:w-40 xl:w-44'}>
                    <label className="mb-1 block whitespace-nowrap text-sm font-medium text-slate-700 dark:text-slate-200">Client Type</label>
                    <DropdownCommon
 id="party_type_id"
 name="party_type_id"
 value={partyTypeId}
 onChange={handlePartyTypeChange}
 className="font-medium text-sm"
 data={DUE_LIST_TYPE_FILTER}
                    />
                  </div>

                  {/* ⚠️ Only where THIS branch asks for the field -- the branch
                      the report is being run for, not the reader's own. Its
                      value is cleared when it stands down, so a hidden filter
                      can never go on narrowing the report. */}
                  {handleByEmployeeOn && (
                    <div className={useFilterMenuEnabled ? undefined : 'w-full sm:w-52 xl:w-60'}>
                      <label className="mb-1 block whitespace-nowrap text-sm font-medium text-slate-700 dark:text-slate-200">Employee</label>
                      <DropdownCommon
 id="handle_by_employee_id"
 name="handle_by_employee_id"
 value={employeeId}
 onChange={handleEmployeeChange}
 className="font-medium text-sm"
 data={employeeFilterData}
                      />
                    </div>
                  )}

                  <div className={useFilterMenuEnabled ? undefined : 'w-full sm:w-40'}>
                    <label className="mb-1 block whitespace-nowrap text-sm font-medium text-slate-700 dark:text-slate-200">End Date</label>
                    <InputDatePicker
 setCurrentDate={handleEndDate}
 className="w-full font-medium text-sm "
 selectedDate={endDate}
 setSelectedDate={setEndDate}
                    />
                  </div>

                  <div
                    className={`flex gap-2 pt-1 ${useFilterMenuEnabled
                        ? 'justify-end'
                        : 'hidden'
                      }`}
                  >
                    <ButtonLoading
                      onClick={handleActionButtonClick}
                      buttonLoading={buttonLoading}
                      icon={<FiCheckSquare />}
                      label="Apply"
                      className="px-6"
                    />
                    <ButtonLoading
                      onClick={handleResetFilters}
                      buttonLoading={false}
                      icon={<FiRotateCcw />}
                      label="Reset"
                      className="px-4"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div
            className={`${useFilterMenuEnabled
                ? 'hidden min-w-[180px] flex-1 text-sm text-slate-600 md:block dark:text-slate-300'
                : 'hidden'
              }`}
          >
            Use the filter
          </div>

          {/*
            ⚠️ ONE ITEM OF THE ROW, NOT A BAR OF ITS OWN. `w-full` (and the
            `2xl:` overrides that undid it) forced the buttons onto a line under
            the fields at every width but the widest, with the whole right-hand
            side empty above them. As a plain flex item they sit directly after
            End Date and wrap only when the line is genuinely full.

            The cluster is `items-end` for the same reason the row is: none of
            these carries a label above it, so their bottoms line up with the
            fields' inputs rather than riding the top of the row.
          */}
          <div className={`flex flex-wrap items-end gap-2 ${useFilterMenuEnabled ? 'ml-auto' : ''}`}>
            {!useFilterMenuEnabled && (
              <>
                <ButtonLoading
                  onClick={handleActionButtonClick}
                  buttonLoading={buttonLoading}
                  icon={<FiCheckSquare />}
                  label="Apply"
                  className="px-6"
                />
                <ButtonLoading
                  onClick={handleResetFilters}
                  buttonLoading={false}
                  icon={<FiRotateCcw />}
                  label="Reset"
                  className="px-4"
                />
              </>
            )}
            {/* The wrapper carries the padding, because the switch sits in a row
                of fields whose labels stand above them and would otherwise ride
                high against them. */}
            <div className="pb-2">
              <ToggleSwitch
                label="Ageing"
                checked={showAgeing}
                onChange={setShowAgeing}
              />
            </div>
            <PrintRowsInput
 id="perPage"
 name="perPage"
 label="Rows"
 value={perPage.toString()}
 onChange={handlePerPageChange}
 type='text'
 className="font-medium text-sm w-20! text-center"
            />
            <PrintFontInput
 id="fontSize"
 name="fontSize"
 label="Font"
 value={fontSize.toString()}
 onChange={handleFontSizeChange}
 type='text'
 className="font-medium text-sm w-20! text-center"
            />
            <PrintButton
              onClick={handlePrint}
              label="Print"
              className="px-6"
              // ⚠️ NOT WHILE A RUN IS IN FLIGHT. The sheet is built from the
              // rows in state, so printing mid-request would open the dialog on
              // the previous filter's answer.
              disabled={!Array.isArray(displayRows) || displayRows.length === 0 || dueList.isLoading}
            />
          </div>
        </div>
      </div>
      {/* ⚠️ Said on the screen, because the buckets are not a fact about which
          bill was paid -- they are the result of a rule.

          A receipt in this system does not name the invoice it settles, so the
          oldest open debt is taken as the one paid. The same closing balance
          would sit in a different column if payments were applied newest-first,
          and anybody reading these numbers to a customer should know that. */}


      <div className='overflow-y-auto overflow-x-auto'>
        {dueList.isLoading && <Loader />}
        <Table
          // Keyed on the classification so switching it remounts the table on
          // page one -- a reader who was on page 4 of "every party" does not
          // land on page 4 of a shorter list.
          key={partyTypeId}
          columns={columns}
          data={displayRows}
          // ⚠️ ONE foot, drawn by the table itself, so it sits under the columns
          // it foots -- and follows them when the reader hides one. The API used
          // to hand back a 'Total' row and a 'Balance' row as if they were
          // customers; both are gone, and the Balance is stated once, below the
          // table, where nothing can add it up again.
          footerRows={footerRows}
          noDataMessage={partyTypeId ? 'No records for the selected classification.' : undefined}
        />

        {displayRows.length ? (
          <div className="mt-2 flex justify-end gap-4 pr-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <span>Balance (Debit − Credit)</span>
            <span>{money(footerTotals.balance)}</span>
          </div>
        ) : null}

        {/* === Hidden Print Component === */}
        <div className="hidden">
          <DueListPrint
            ref={printRef}
            // ⚠️ THE WHOLE FILTERED SET, not the page -- this report is not
            // paged by the server, and the print reads the same rows the table
            // does. The two knobs above only decide how they are cut into
            // sheets.
            rows={displayRows}
            endDate={endDate ? dayjs(endDate).format('DD/MM/YYYY') : undefined}
            clientType={clientTypeLabel}
            employee={handleByEmployeeOn ? employeeLabel : ''}
            summary={footerTotals}
            title="Due List"
            rowsPerPage={Number(perPage)}
            fontSize={Number(fontSize)}
            showAgeing={showAgeing}
          />

          {/* Mounted only while the designed list is being printed. */}
          {dueDoc ? <DocumentPrint ref={dueDocRef} template={dueDoc.template} data={dueDoc.data} /> : null}
        </div>
      </div>
    </div>
  );
};

export default DueList;

