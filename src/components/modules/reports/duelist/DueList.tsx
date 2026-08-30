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
import Table from '../../../utils/others/Table';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import CashBookPrint from '../cashbook/CashBookPrint';
import DueListPrint from './DueListPrint';
import PrintFontInput from '../../../utils/fields/PrintFontInput';
import PrintRowsInput from '../../../utils/fields/PrintRowsInput';
import { useReactToPrint } from 'react-to-print';
import { isBranchSettingOn, isUserFeatureEnabled } from '../../../utils/userFeatureSettings';
import { formatMobile, useMobileFormat } from '../../../utils/utils-functions/mobileFormat';
import ToggleSwitch from '../../../utils/utils-functions/ToggleSwitch';
import formatAge from '../../../utils/utils-functions/formatAge';



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
  const [fontSize, setFontSize] = useState<number>(12);
  const [filterOpen, setFilterOpen] = useState(false);


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

  useEffect(() => {
    setTableData(dueList?.data?.data?.data);
  }, [dueList]);


  const handleBranchChange = (e: any) => {
    setBranchId(e.target.value);
  };

  const handleEndDate = (e: any) => {
    setEndDate(e);
  };
  const handleActionButtonClick = (e: any) => {

    const endD = dayjs(endDate).format('YYYY-MM-DD'); // Adjust format as needed
    dispatch(getDueList({ branchId, endDate: endD }));
    setTableData(dueList?.data?.data?.data);
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
      setEndDate(parsedDate);
      setBranchId(user.user.branch_id);
    } else {
    }
  }, [branchDdlData?.protectedData?.data]);

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
                <p className="text-[0.65rem] text-success">{formatAge(row.last_paid_age)}</p>
              </>
            ) : (
              // Said in a word rather than left blank: an empty cell reads as
              // "not known", and never having paid at all is the strongest
              // thing this column has to say.
              <p className="text-gray-500">never</p>
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
                {label === '90+' && amount > 0 && row.oldest_days > 90 ? (
                  {/* Red like the figure above it: the age is the same warning
                      said a second way, not a footnote to it. Paired with the
                      green under Last Paid, a row can be read across in one
                      glance -- old money on the right, recent money in the
                      middle. */}
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

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Due Report',
    // onAfterPrint: () => alert('Printed successfully!'),
  });

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
          <div className={useFilterMenuEnabled ? 'relative shrink-0' : 'min-w-[320px] flex-1 md:max-xl:w-full md:max-xl:min-w-0 md:max-xl:flex-none xl:max-[1880px]:w-full xl:max-[1880px]:min-w-0 xl:max-[1880px]:flex-none'}>
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
                    : 'w-full'
                }
              >
                <div
                  className={
                    useFilterMenuEnabled
                      ? 'space-y-3'
                      : 'grid grid-cols-1 items-end gap-3 md:grid-cols-2'
                  }
                >
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Select Branch</label>
                    {branchDdlData.isLoading == true ? <Loader /> : ''}
                    <BranchDropdown
 onChange={handleBranchChange}
 value={branchId == null ? '' : String(branchId)}
 className="w-full font-medium text-sm p-1.5 "
 branchDdl={dropdownData}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">End Date</label>
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

          <div className={`flex flex-wrap items-end gap-2 ${useFilterMenuEnabled ? 'ml-auto' : 'w-full justify-start 2xl:ml-auto 2xl:w-auto 2xl:justify-end'}`}>
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
              disabled={!Array.isArray(tableData) || tableData.length === 0}
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
        <Table columns={columns} data={tableData || []} /> {/* Ensure data is always an array */}

        {/* === Hidden Print Component === */}
        <div className="hidden">
          <DueListPrint
            ref={printRef}
            rows={tableData || []}
            endDate={endDate ? dayjs(endDate).format('DD/MM/YYYY') : undefined}
            title="Due List"
            rowsPerPage={Number(perPage)}
            fontSize={Number(fontSize)}
            showAgeing={showAgeing}
          />
        </div>
      </div>
    </div>
  );
};

export default DueList;

