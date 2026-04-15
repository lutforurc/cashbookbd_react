import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ButtonLoading,
  PrintButton,
} from '../../../../pages/UiElements/CustomButtons';
import InputDatePicker from '../../../utils/fields/DatePicker';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Loader from '../../../../common/Loader';
import { useDispatch, useSelector } from 'react-redux';
import { getCashBook } from './cashBookSlice';
import { FiBook, FiCheckCircle, FiEdit, FiFilter, FiLogIn } from 'react-icons/fi';
import Table from '../../../utils/others/Table';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import dayjs from 'dayjs';
import ImagePopup from '../../../utils/others/ImagePopup';
import thousandSeparator from './../../../utils/utils-functions/thousandSeparator';
import { useReactToPrint } from 'react-to-print';
import InputElement from '../../../utils/fields/InputElement';
import CashBookPrint from './CashBookPrint';
import { useVoucherPrint } from '../../vouchers';
import { VoucherPrintRegistry } from '../../vouchers/VoucherPrintRegistry';
import httpService from '../../../services/httpService';
import { API_HEAD_OFFICE_CASH_RECEIVED_APPROVE_URL } from '../../../services/apiRoutes';
import { toast } from 'react-toastify';
import { hasAnyPermission } from '../../../Sidebar/permissionUtils';
import { hasPermission } from '../../../utils/permissionChecker';
import ConfirmModal from '../../../utils/components/ConfirmModalProps';
import {
  buildVoucherAutoEditState,
  getVoucherEditTarget,
} from '../../../utils/utils-functions/voucherEditNavigation';


const CashBook = (user: any) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const branchDdlData = useSelector((state) => state.branchDdl);
  const cashBookData = useSelector((state) => state.cashBook);
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null); // Define state with type
  const [endDate, setEndDate] = useState<Date | null>(null); // Define state with type
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);
  const [isSelected, setIsSelected] = useState<number | string>('');
  const [perPage, setPerPage] = useState<number>(12);
  const [fontSize, setFontSize] = useState<number>(12);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<OptionType | null>(null);
  const [branchPad, setBranchPad] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [selectedApprovalRow, setSelectedApprovalRow] = useState<any | null>(null);
  const printRef = useRef<HTMLDivElement>(null); 
  const voucherRegistryRef = useRef<any>(null);
  const { handleVoucherPrint } = useVoucherPrint(voucherRegistryRef);
  const userPermissions = useSelector((state: any) => state.settings?.data?.permissions || []);
  const canApproveCashbook = hasAnyPermission(userPermissions, ['cashbook.approved']);

  interface OptionType {
    value: string;
    label: string;
    additionalDetails: string;
  }

  const runCashBook = () => {
    const startD = dayjs(startDate).format('YYYY-MM-DD');
    const endD = dayjs(endDate).format('YYYY-MM-DD');

    dispatch(getCashBook({ branchId, startDate: startD, endDate: endD }));
    setFilterOpen(false);
  };

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    setIsSelected(user.user.branch_id);
    setBranchId(user.user.branch_id);
    setBranchPad(user?.user?.branch_id.toString().padStart(4, '0'));
  }, []);

  useEffect(() => {
    setTableData(cashBookData?.data);
  }, [cashBookData]);

  const handleBranchChange = (e: any) => {
    setBranchId(e.target.value);
  };
  const handleStartDate = (e: any) => {
    setStartDate(e);
  };
  const handleEndDate = (e: any) => {
    setEndDate(e);
  };
  const handleActionButtonClick = () => {
    runCashBook();
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
      setStartDate(parsedDate);
      setEndDate(parsedDate);
      setBranchId(user.user.branch_id);
    } else {
    }
  }, [branchDdlData?.protectedData?.data]);

  const handleApprovePrompt = (row: any) => {
    setSelectedApprovalRow(row);
    setShowApproveConfirm(true);
  };

  const handleApproveClick = async () => {
    const voucherId = Number(selectedApprovalRow?.mtm_id ?? selectedApprovalRow?.mtmId ?? 0);

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
        runCashBook();
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

  const handlePrint = useReactToPrint({
    content: () => {
      if (!printRef.current) {
        // alert("Nothing to print: Ref not ready");
        return null;
      }
      return printRef.current;
    },
    documentTitle: 'Due Report',
    // onAfterPrint: () => alert('Printed successfully!'),
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



  const columns = [
    {
      key: 'sl_number',
      header: 'Sl. No',
      width: '80px',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => <div>{row?.sl_number ? row.sl_number : '-'}</div>,
    },
    {
      key: 'vr_date',
      header: 'Vr Date',
      width: '90px',
      headerClass: 'text-center',
      cellClass: 'text-center !px-1',
    },
    {
      key: 'vr_no',
      header: 'Vr No',
      width: '80px',
      headerClass: 'text-center',
      cellClass: 'text-center !px-2',
      render: (row: any) => (
        <div
          className="cursor-pointer hover:underline"
          onClick={() =>
            handleVoucherPrint({
              ...row,
              mtm_id: row?.mtm_id ?? row?.mtmId ?? row?.mid ?? row?.id,
            })
          }
        >
          {row.vr_no}
        </div>
      ),
    },
    {
      key: 'nam',
      header: 'Description',
      render: (row: any) => (
        <div className="w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-3xl xl:max-w-4xl">
          <div className="truncate">
	            <a href="http://localhost:5173/reports/ledger" target="_blank">
	              <span dangerouslySetInnerHTML={{ __html: row.nam }}></span>
	              {row?.pay_branch_name ? (
	                <p className="text-sm text-fuchsia-600 dark:text-green-500">{row.pay_branch_name}</p>
	              ) : (
	                ''
	              )}
                {/* text-sky-500 */}
	              {row.somity ? (
	                <span className="text-sm"> ({row?.somity?.idfr_code})</span>
	              ) : (
                ''
              )}
              {row.somity && (
                <>
                  <p className="text-sm text-gray-500">
                    {row?.somity?.somity_name && row?.somity?.somity_id
                      ? `${row.somity.somity_name} (${row.somity.somity_id})`
                      : ''}
                  </p>
                  <p className="text-sm text-gray-500">{row?.somity?.mobile}</p>
                </>
              )}
            </a>
          </div>
          <div className="text-sm text-gray-500 break-words whitespace-normal">
            {row?.remarks}
          </div>
        </div>
      ),
    },
    {
      key: 'credit',
      header: 'Received',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <>
          <p className="">
            {row.credit > 0 ? thousandSeparator(row.credit, 0) : '-'}
          </p>
        </>
      ),
    },
    {
      key: 'debit',
      header: 'Payment',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <>
          <p className="">
            {row.debit > 0 ? thousandSeparator(row.debit, 0) : '-'}
          </p>
        </>
      ),
    },
    {
      key: 'voucher_image',
      header: 'Voucher',
      render: (row: any) => {
        return (
          <ImagePopup
            title={row?.remarks || ''}
            branchPad={row?.branchPad || ''}
            voucher_image={row?.voucher_image || ''}
          />
        );
      },
    },
    {
      key: 'action',
      header: 'Action',
      render: (row: any) => {
        const voucherId = Number(row?.mtm_id ?? row?.mtmId ?? 0);
        const isApproved = Number(row?.is_approved ?? 0) === 1;
        const canShowApproveAction = canApproveCashbook && !!row?.vr_no && voucherId > 0;
        return (
          <>
            {row?.vr_no ? (
              <>
                {canShowApproveAction ? (
                  <button
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
                {
                hasPermission(userPermissions, 'sales.edit') || 
                hasPermission(userPermissions, 'cash.received.edit') ||
                hasPermission(userPermissions, 'cash.payment.edit') 
                && (
                  <>
                    <button
                      onClick={() => {}}
                      className="text-blue-500 ml-2"
                    >
                      <FiBook className="cursor-pointer" />
                    </button>
                    <button
                      onClick={() => handleEditVoucher(row)}
                      className="text-blue-500 ml-2"
                    >
                      <FiEdit className="cursor-pointer" />
                    </button>
                  </>
                )}
              </>
            ) : (
              ''
            )}
          </>
        );
      },
    },
  ];


  return (
    <div className="">
      <HelmetTitle title={'Cash Book'} />
      <div className="py-3">
        {selectedOption && (
          <div className="mt-4">
            <p>Selected:</p>
            <p className="font-bold">{selectedOption.label}</p>
          </div>
        )}
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
              <div className="absolute left-0 top-full z-[1000] mt-2 w-[min(92vw,320px)] rounded-md border border-slate-300 bg-white p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-800">
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Select Branch</label>
                    {branchDdlData.isLoading == true ? <Loader /> : ''}
                    <BranchDropdown
                      defaultValue={user?.user?.branch_id}
                      value={branchId == null ? '' : String(branchId)}
                      onChange={handleBranchChange}
                      className="w-full font-medium text-sm p-2"
                      branchDdl={dropdownData}
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
        {cashBookData.isLoading ? <Loader /> : ''}
        <Table columns={columns} data={tableData || []} />

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
          loading={approvingId === Number(selectedApprovalRow?.mtm_id ?? selectedApprovalRow?.mtmId ?? 0)}
          onCancel={() => {
            if (approvingId) return;
            setShowApproveConfirm(false);
            setSelectedApprovalRow(null);
          }}
          onConfirm={handleApproveClick}
          className="bg-green-600 hover:bg-sky-600"
        />

        {/* === Hidden Print Component === */}
        <div className="hidden">
          <CashBookPrint
            ref={printRef}
            rows={tableData || []}
            startDate={startDate ? dayjs(startDate).format('DD/MM/YYYY') : undefined}
            endDate={endDate ? dayjs(endDate).format('DD/MM/YYYY') : undefined}
            title="Cash Book"
            rowsPerPage={Number(perPage)}
            fontSize={Number(fontSize)}
          />

          <VoucherPrintRegistry
            ref={voucherRegistryRef}
            rowsPerPage={Number(perPage)}
            fontSize={Number(fontSize)}
          />
        </div>
      </div>
    </div>
  );
};

export default CashBook;
