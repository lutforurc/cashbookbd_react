import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { FiCheckCircle, FiCheckSquare, FiEdit, FiFilter, FiLogIn, FiRotateCcw } from 'react-icons/fi';
import FilterMenuShell from '../../../utils/components/FilterMenuShell';
import { isUserFeatureEnabled } from '../../../utils/userFeatureSettings';
import httpService from '../../../services/httpService';
import { API_HEAD_OFFICE_CASH_RECEIVED_APPROVE_URL } from '../../../services/apiRoutes';
import { hasAnyPermission } from '../../../Sidebar/permissionUtils';
import ConfirmModal from '../../../utils/components/ConfirmModalProps';
import { hasPermission } from '../../../utils/permissionChecker';
import {
  buildVoucherAutoEditState,
  getVoucherEditTarget,
} from '../../../utils/utils-functions/voucherEditNavigation';

const Ledger = (user: any) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
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
  const useFilterMenuEnabled = isUserFeatureEnabled(settings, 'use_filter_parameter');
  const selectedLedgerName = selectedLedgerOption?.label?.trim() || '';
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [selectedApprovalRow, setSelectedApprovalRow] = useState<any | null>(null);
  const userPermissions = settings?.data?.permissions || [];
  const canApproveCashbook = hasAnyPermission(userPermissions, ['cashbook.approved']);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    setBranchId(user.user.branch_id);
    setBranchPad(user?.user?.branch_id.toString().padStart(4, '0'));
  }, []);



  useEffect(() => {
    if (ledgerData?.isLoading) {
      return;
    }

    if (ledgerData && !(ledgerData.data?.data)) {
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

  const handleApprovePrompt = (row: any) => {
    setSelectedApprovalRow(row);
    setShowApproveConfirm(true);
  };

  const handleApproveClick = async () => {
    const voucherId = Number(
      selectedApprovalRow?.mtm_id ??
      selectedApprovalRow?.mtmId ??
      selectedApprovalRow?.mid ??
      selectedApprovalRow?.id ??
      0,
    );

    if (!voucherId) {
      toast.error('Approval id not found.');
      return;
    }

    try {
      setApprovingId(voucherId);
      const response = await httpService.get(`${API_HEAD_OFFICE_CASH_RECEIVED_APPROVE_URL}/${voucherId}`);
      const result = response?.data;

      if (result === '1' || result?.success) {
        toast.success('Voucher approved successfully.');
        setShowApproveConfirm(false);
        setSelectedApprovalRow(null);
        handleActionButtonClick();
        return;
      }

      if (result === '2') {
        toast.error('Voucher not found.');
        return;
      }

      toast.error(typeof result === 'string' ? result : 'Voucher approval failed.');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Voucher approval failed.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleEditVoucher = (row: any) => {
    const voucherNo = String(row?.vr_no || '').trim();
    const editTarget = getVoucherEditTarget(voucherNo);
    const editState = buildVoucherAutoEditState(voucherNo);

    if (!voucherNo || !editTarget || !editState) {
      toast.error('Edit route not found for this voucher.');
      return;
    }

    navigate(editTarget.route, { state: editState });
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
          <span>{row.debit > 0 ? thousandSeparator(Number(row.debit)) : '-'}</span>
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
          <span>{row.credit > 0 ? thousandSeparator(Number(row.credit)) : '-'}</span>
        );
      },
    },
    {
      key: 'running_balance',
      header: 'Balance',
      width: '140px',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => {
        return (
          <span>
            {row.running_balance === '' || row.running_balance === undefined
              ? '-'
              : thousandSeparator(Number(row.running_balance))}
          </span>
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
    {
      key: 'action',
      header: 'Action',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => {
        const voucherId = Number(
          row?.mtm_id ??
          row?.mtmId ??
          row?.mid ??
          row?.id ??
          0,
        );
        const isApproved = Number(row?.is_approved ?? 0) === 1;
        const canShowApproveAction = canApproveCashbook && !!row?.vr_no && voucherId > 0;
        const canEditVoucher =
          hasPermission(userPermissions, 'sales.edit') ||
          hasPermission(userPermissions, 'cash.received.edit') ||
          hasPermission(userPermissions, 'cash.payment.edit') ||
          hasPermission(userPermissions, 'purchase.edit');

        if (!row?.vr_no) {
          return null;
        }

        return (
          <>
            {canShowApproveAction ? (
              <button
                type="button"
                onClick={() => !isApproved && approvingId !== voucherId && handleApprovePrompt(row)}
                className={`cursor-pointer ${isApproved ? 'cursor-default' : ''}`}
                title={
                  isApproved
                    ? `Approved${row?.approved_by ? ` by ${row.approved_by}` : ''}`
                    : 'Approve voucher'
                }
                disabled={isApproved || approvingId === voucherId}
              >
                {isApproved ? (
                  <FiCheckCircle className="text-green-500 font-bold" />
                ) : (
                  <FiLogIn className={`${approvingId === voucherId ? 'text-amber-500' : 'text-red-500'}`} />
                )}
              </button>
            ) : null}
            {canEditVoucher && !isApproved ? (
              <button
                type="button"
                onClick={() => handleEditVoucher(row)}
                className="text-blue-500 ml-2"
                title="Edit Voucher"
              >
                <FiEdit className="cursor-pointer" />
              </button>
            ) : null}
          </>
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
        <div className={`gap-3 ${useFilterMenuEnabled ? 'flex flex-wrap items-center gap-3' : 'flex flex-col 2xl:flex-row 2xl:items-end'}`}>
          <FilterMenuShell
            enabled={useFilterMenuEnabled}
            isOpen={filterOpen}
            onToggle={() => setFilterOpen((prev) => !prev)}
            menuWidthClassName="w-[min(92vw,340px)]"
            inlineClassName="grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-4"
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Select Branch</label>
              {branchDdlData.isLoading == true ? <Loader /> : ''}
              <BranchDropdown
                defaultValue={user?.user?.branch_id}
                value={branchId == null ? '' : String(branchId)}
                onChange={handleBranchChange}
                className="w-full font-medium text-sm p-2 h-10"
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

            <div className={`flex gap-2 pt-1 ${useFilterMenuEnabled ? 'justify-end md:col-span-2 xl:col-span-4' : 'hidden'}`}>
              <ButtonLoading
                onClick={handleActionButtonClick}
                buttonLoading={buttonLoading}
                label="Apply" 
                className="h-10 px-6"
                icon={<FiCheckSquare />}
              />
              <ButtonLoading
                onClick={handleResetFilters}
                buttonLoading={false}
                label="Reset" 
                icon={<FiRotateCcw />}
                className="h-10 px-4"
              />
            </div>
          </FilterMenuShell>

          {useFilterMenuEnabled ? (
            <div className="ml-auto flex items-end gap-2">
              {selectedLedgerName ? (
                <div className="flex h-10 min-w-[220px] max-w-[320px] items-center rounded border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
                  <span className="truncate" title={selectedLedgerName}>{selectedLedgerName}</span>
                </div>
              ) : null}
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
          ) : (
            <div className="flex flex-wrap items-end justify-between gap-3 2xl:ml-auto 2xl:flex-nowrap">
              <div className="flex flex-wrap items-end gap-2">
                <ButtonLoading
                  onClick={handleActionButtonClick}
                  buttonLoading={buttonLoading}
                  label="Apply"
                  icon={<FiCheckSquare />}
                  className="h-10 px-6"
                />
                <ButtonLoading
                  onClick={handleResetFilters}
                  buttonLoading={false}
                  label="Reset"
                  icon={<FiRotateCcw />}
                  className="h-10 px-4"
                />
              </div>
              <div className="flex flex-wrap items-end gap-2 2xl:flex-nowrap">
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
          )}
        </div>
      </div>
      <div className="overflow-y-auto">
        {ledgerData.isLoading && <Loader />}
        <Table columns={columns} data={tableData || []} />{' '}
        {/* Ensure data is always an array */}

        <ConfirmModal
          show={showApproveConfirm}
          title="Confirm Voucher Approval"
          message={
            <div className="space-y-2">
              <p>Are you sure you want to approve voucher</p>
              <p className="text-lg font-semibold">{selectedApprovalRow?.vr_no || '-'}</p>
            </div>
          }
          confirmLabel="Confirm"
          cancelLabel="Cancel"
          loading={approvingId === Number(selectedApprovalRow?.mtm_id ?? selectedApprovalRow?.mtmId ?? selectedApprovalRow?.mid ?? selectedApprovalRow?.id ?? 0)}
          onCancel={() => {
            if (approvingId) return;
            setShowApproveConfirm(false);
            setSelectedApprovalRow(null);
          }}
          onConfirm={handleApproveClick}
          className="bg-green-600 hover:bg-sky-600"
        />

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
