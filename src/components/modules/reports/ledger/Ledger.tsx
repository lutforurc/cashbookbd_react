import React, { useEffect, useRef, useState } from 'react';
import { ButtonLoading, PrintButton } from '../../../../pages/UiElements/CustomButtons';
import InputDatePicker from '../../../utils/fields/DatePicker';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Loader from '../../../../common/Loader';
import { useDispatch, useSelector } from 'react-redux';
import Table from '../../../utils/others/Table';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import { getLedger } from './ledgerSlice';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import ImagePopup from '../../../utils/others/ImagePopup';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { generateTableData } from '../../../utils/utils-functions/generateTableData';
import { formatDate } from '../../../utils/utils-functions/formatDate';
import { useReactToPrint } from 'react-to-print';
import LedgerPrint from './LedgerPrint';
import InputElement from '../../../utils/fields/InputElement';
import { getCoal4ById } from '../../chartofaccounts/levelfour/coal4Sliders';
import { VoucherPrintRegistry } from '../../vouchers/VoucherPrintRegistry';
import { useVoucherPrint } from '../../vouchers';
import { FiFilter } from 'react-icons/fi';

const Ledger = (user: any) => {
  const dispatch = useDispatch();
  const branchDdlData = useSelector((state) => state.branchDdl);
  const ledgerData = useSelector((state) => state.ledger);
  const coal4 = useSelector((state) => state.coal4);
  const settings = useSelector((state: any) => state.settings);
  const sales = useSelector((s: any) => s.electronicsSales);
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]); // Initialize as an empty array
  const [branchId, setBranchId] = useState<number | null>(null);
  const [ledgerId, setLedgerAccount] = useState<number | null>(null);
  const [selectedLedgerOption, setSelectedLedgerOption] = useState<{ value: any; label: any } | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [branchPad, setBranchPad] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [perPage, setPerPage] = useState<number>(12);
  const [fontSize, setFontSize] = useState<number>(12);
  const [filterOpen, setFilterOpen] = useState(false);
  const voucherRegistryRef = useRef<any>(null);
  const { handleVoucherPrint } = useVoucherPrint(voucherRegistryRef);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    setBranchId(user.user.branch_id);
    setBranchPad(user?.user?.branch_id.toString().padStart(4, '0'));
  }, []);



  useEffect(() => {
    if (ledgerData && !ledgerData.isLoading && !(ledgerData.data?.data)) {
      const tableRows = generateTableData(ledgerData.data);
      setTableData(tableRows);
    } else {
      setTableData([]); // safety fallback
    }
  }, [ledgerData]);



  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setBranchId(val === '' ? null : Number(val));
  };

  const handleStartDate = (e: any) => {
    setStartDate(e);
  };

  const handleEndDate = (e: any) => {
    setEndDate(e);
  };

  const handleActionButtonClick = () => {
    const startD = dayjs(startDate).format('YYYY-MM-DD'); // Adjust format as needed
    const endD = dayjs(endDate).format('YYYY-MM-DD'); // Adjust format as needed
    if (!ledgerId) {
      toast.info('Please select ledger account.');
      return;
    }
    dispatch(
      getLedger({ branchId, ledgerId, startDate: startD, endDate: endD }),
    );
    dispatch(getCoal4ById(Number(ledgerId)));
    setFilterOpen(false);
  };

  const handleResetFilters = () => {
    setLedgerAccount(null);
    setSelectedLedgerOption(null);
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
      const startDate = new Date(Number(year), Number(month) - 1, Number('01'));
      const endDate = new Date(Number(year), Number(month) - 1, Number(day));
      setStartDate(startDate);
      setEndDate(endDate);

      setBranchId(user.user.branch_id);
    }
  }, [branchDdlData?.protectedData]);

  const selectedLedgerOptionHandler = (option: any) => {
    if (!option) {
      setLedgerAccount(null);
      setSelectedLedgerOption(null);
      return;
    }

    setLedgerAccount(option.value);
    setSelectedLedgerOption({
      value: option.value,
      label: option.label,
    });
  };



  const columns = [
    {
      key: 'sl_number',
      header: 'Sl. No',
      width: '100px',
      headerClass: 'items-center text-center',
      cellClass: 'items-center text-center',
      render: (row: any) => (
        <div className="">{row.sl_number ? row.sl_number : ''}</div>
      ),
    },
    {
      key: 'vr_date',
      header: 'Vr Date',
      render: (row: any) => <div className="">{row.vr_date && formatDate(row.vr_date)}</div>,
      width: '80px',
    },
    {
      key: 'vr_no',
      header: 'Vr No',
      width: '100px',
      render: (row: any) => (
        <div
          className="cursor-pointer hover:underline"
          onClick={() =>
            handleVoucherPrint({
              ...row,
              mtm_id: row.mid,
            })
          }
        >
          {row.vr_no}
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Description',
      render: (row: any) => (
        <>
          <p>{row.name}</p>
          <div className="text-sm text-gray-500 lg:max-w-150 break-words whitespace-normal block">
            {row.remarks === '-' ? '' : row.remarks}
          </div>
          {branchId === null && (
            <div
              className={`text-sm font-bold lg:max-w-150 break-words whitespace-normal ${branchColorClass(row.branch_name)}`}
            >
              {row.branch_name}
            </div>
          )}
          {/* {branchId === null && (
            <div className="text-sm dark:text-green-500 text-gray-950 font-bold lg:max-w-150 break-words whitespace-normal">
              {row.branch_name}
            </div>
          )} */}
        </>
      ),
    },
    {
      key: 'credit',
      header: 'Debit',
      width: '120px',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => {
        return (
          <span>{row.debit > 0 ? thousandSeparator(Number(row.debit), 0) : '-'}</span>
        );
      },
    },
    {
      key: 'debit',
      header: 'Credit',
      width: '120px',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => {
        return (
          <span>{row.credit > 0 ? thousandSeparator(Number(row.credit), 0) : '-'}</span>
        );
      },
    },
    {
      key: 'voucher_image',
      header: 'Voucher',
      render: (row: any) => {
        return (
          <ImagePopup
            branchPad={row?.branch_id || ''} // Ensure row is defined before accessing branchPad
            voucher_image={row?.voucher_image || ''} // Ensure voucher_image is defined
            title={row?.remarks || ''} // Ensure title is defined
          />
        );
      },
    },
  ];


  const COLOR_CLASSES = [
    'text-red-700 dark:text-red-400',
    'text-blue-700 dark:text-blue-400',
    'text-emerald-700 dark:text-emerald-400',
    'text-purple-700 dark:text-purple-400',
    'text-amber-700 dark:text-amber-400',
    'text-cyan-700 dark:text-cyan-400',
    'text-pink-700 dark:text-pink-400',
    'text-lime-700 dark:text-lime-400',
  ];

  const hashString = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  };

  const branchColorClass = (name?: string) => {
    if (!name) return 'text-gray-950 dark:text-green-500';
    return COLOR_CLASSES[hashString(name) % COLOR_CLASSES.length];
  };


  const handlePrint = useReactToPrint({
    content: () => {
      if (!printRef.current) {
        return null;
      }
      return printRef.current;
    },
    documentTitle: 'Due Report',
    removeAfterPrint: true,
  });

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

  const branchOptions = settings?.data?.branch?.branch_types_id === 1
    ? [{ id: "", name: "Select All Branch" }, ...(dropdownData ?? [])]
    : [...(dropdownData ?? [])];


  return (
    <div className="">
      <HelmetTitle title={'Ledger'} />
      <div className="py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setFilterOpen((prev) => !prev)}
              className={`inline-flex h-10 w-10 items-center justify-center rounded border text-sm transition ${
                filterOpen
                  ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300'
                  : 'border-blue-500 bg-white text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700'
              }`}
              title="Open filters"
              aria-label="Open filters"
            >
              <FiFilter size={16} />
            </button>

            {filterOpen && (
              <div className="absolute left-0 top-full z-[1000] mt-2 w-[min(92vw,340px)] rounded-md border border-slate-300 bg-white p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-800">
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Select Branch</label>
                    {branchDdlData.isLoading == true ? <Loader /> : ''}
                    <BranchDropdown
                      defaultValue={user?.user?.branch_id}
                      value={branchId == null ? '' : String(branchId)}
                      onChange={handleBranchChange}
                      className="w-full font-medium text-sm p-2"
                      branchDdl={branchOptions}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Select Ledger</label>
                    <DdlMultiline
                      onSelect={selectedLedgerOptionHandler}
                      value={selectedLedgerOption}
                      acType={''}
                      className="h-10"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Start Date</label>
                    <InputDatePicker
                      setCurrentDate={handleStartDate}
                      className="font-medium text-sm w-full h-10"
                      selectedDate={startDate}
                      setSelectedDate={setStartDate}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">End Date</label>
                    <InputDatePicker
                      setCurrentDate={handleEndDate}
                      className="font-medium text-sm w-full h-10"
                      selectedDate={endDate}
                      setSelectedDate={setEndDate}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <ButtonLoading
                      onClick={handleActionButtonClick}
                      buttonLoading={buttonLoading}
                      label="Apply"
                      icon=""
                      className="h-10 px-6"
                    />
                    <ButtonLoading
                      onClick={handleResetFilters}
                      buttonLoading={false}
                      label="Reset"
                      icon=""
                      className="h-10 px-4"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="hidden min-w-[180px] flex-1 text-sm text-slate-600 md:block dark:text-slate-300">
            Use the filter
          </div>

          <div className="ml-auto flex items-end gap-2">
            <InputElement
              id="perPage"
              name="perPage"
              label=""
              value={perPage.toString()}
              onChange={handlePerPageChange}
              type='text'
              className="font-medium text-sm h-10 !w-20 text-center"
            />
            <InputElement
              id="fontSize"
              name="fontSize"
              label=""
              value={fontSize.toString()}
              onChange={handleFontSizeChange}
              type='text'
              className="font-medium text-sm h-10 !w-20 text-center"
            />
            <PrintButton
              onClick={handlePrint}
              label="Print"
              className="h-10 px-6"
              disabled={!Array.isArray(tableData) || tableData.length === 0}
            />
          </div>
        </div>
      </div>
      <div className="overflow-y-auto">
        {ledgerData.isLoading && <Loader />}
        <Table columns={columns} data={tableData || []} />{' '}
        {/* Ensure data is always an array */}

        <div className="hidden">
          <LedgerPrint
            ref={printRef}
            rows={tableData || []}
            startDate={startDate ? dayjs(startDate).format('DD/MM/YYYY') : undefined}
            endDate={endDate ? dayjs(endDate).format('DD/MM/YYYY') : undefined}
            title="Ledger"
            coal4={coal4.coal4ById || undefined}
            rowsPerPage={Number(perPage)}
            fontSize={Number(fontSize)}
            showBranchName={branchId === null}
          />
        </div>
      </div>

      <div className="hidden">
        <VoucherPrintRegistry
          ref={voucherRegistryRef}
          rowsPerPage={Number(perPage)}
          fontSize={Number(fontSize)}
        />
      </div>
    </div>
  );
};

export default Ledger;
