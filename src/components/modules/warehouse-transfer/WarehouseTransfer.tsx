import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiAlertCircle, FiEdit2, FiPlus, FiRefreshCcw, FiSave, FiTrash2, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import HelmetTitle from '../../utils/others/HelmetTitle'; 
import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons'; 
import InputElement from '../../utils/fields/InputElement';
import RequisitionItemsDropdown from '../../utils/utils-functions/RequisitionItemsDropdown';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown'; 
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { getDdlAllBranch, getDdlProtectedBranch } from '../branch/ddlBranchSlider';
import {
  getBranchTransferDetails,
  storeBranchTransfer,
  updateBranchTransfer,
} from './warehouseTransferSlice';
import ROUTES from '../../services/appRoutes';
import InputDatePicker from '../../utils/fields/DatePicker';
import { trxDateToDate, trxDateToIso } from '../../utils/utils-functions/transactionDate';
import httpService from '../../services/httpService';
import { API_CUSTOMER_MOBILE_CHECK_URL } from '../../services/apiRoutes';
import { formatMobile, useMobileFormat } from '../../utils/utils-functions/mobileFormat';

type ProductOption = {
  value: string;
  label: string;
  label_3?: string;
  label_4?: string;
};

type TransferItem = {
  id: number;
  productId: string;
  productName: string;
  unit: string;
  quantity: string;
  damagedQty: string;
  shortQty: string;
  rate: string;
};

const BranchTransfer = () => {
  const mobileFormat = useMobileFormat();
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const location = useLocation();
  const branchDdl = useSelector((s: any) => s.branchDdl);
  const settings = useSelector((s: any) => s.settings);
  // The Transfer List sends the voucher here to be corrected. Read once into
  // state: the screen has to keep knowing which voucher it is holding after
  // navigation state has served its purpose.
  const editTransferId = (location.state as any)?.editTransferId ?? null;

  // The challan must post on the branch's open transaction date, not today:
  // the books stay on trx_dt until day close advances it. Fall back to today
  // only while settings is still loading.
  const trxDt = settings?.data?.trx_dt;
  const defaultTransferIso = trxDateToIso(trxDt) || dayjs().format('YYYY-MM-DD');
  const defaultTransferDate = trxDateToDate(trxDt) ?? dayjs().toDate();

  const [saveButtonLoading, setSaveButtonLoading] = useState(false);
  // Which voucher is being corrected, and what it is called -- the number is
  // shown, because an operator who has walked away from the screen has to be
  // able to tell an edit of 14-260800001 from a blank challan at a glance.
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [editingVrNo, setEditingVrNo] = useState<string>('');
  const [loadingVoucher, setLoadingVoucher] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    mobile: string;
    items: any[];
    payload: any;
  } | null>(null);
  // A stock shortage no longer blocks: warn with the same confirm modal the
  // customer form uses, and let the operator transfer anyway.
  const [stockWarning, setStockWarning] = useState<{
    rows: { name: string; available: number; requested: number }[];
    shortages: string[];
    message: string;
    payload: any;
  } | null>(null);
  const [transferDate, setTransferDate] = useState<Date | null>(defaultTransferDate);
  // Once the user picks a date, stop overwriting it when settings refreshes.
  const [transferDateTouched, setTransferDateTouched] = useState(false);
  const [isUpdatingLine, setIsUpdatingLine] = useState(false);
  const [editingLineId, setEditingLineId] = useState<number | null>(null);
  const [lineItem, setLineItem] = useState({
    productId: '',
    productName: '',
    unit: '',
    quantity: '',
    damagedQty: '',
    shortQty: '',
    rate: '',
  });
  const [formData, setFormData] = useState({
    transferDate: defaultTransferIso,
    fromBranch: '',
    toBranch: '',
    challanNumber: '',
    receiverName: '',
    receiverMobileNumber: '',
    driverName: '',
    driverMobile: '',
    note: '',
    products: [] as TransferItem[],
  });

  const fromBranchOptions = useMemo(
    () => {
      if (Array.isArray(branchDdl?.protectedData)) {
        return branchDdl.protectedData;
      }
      if (Array.isArray(branchDdl?.protectedData?.data)) {
        return branchDdl.protectedData.data;
      }
      return [];
    },
    [branchDdl?.protectedData],
  );

  const toBranchOptions = useMemo(() => {
    if (Array.isArray(branchDdl?.data)) {
      return branchDdl.data;
    }
    if (Array.isArray(branchDdl?.data?.data)) {
      return branchDdl.data.data;
    }
    return [];
  }, [branchDdl?.data]);

  useEffect(() => {
    // Own company only: a transfer between two companies' branches is not a
    // transfer, and offering one is how it gets posted by mistake.
    dispatch(getDdlProtectedBranch(true));
    dispatch(getDdlAllBranch(true));
  }, [dispatch]);

  useEffect(() => {
    if (!fromBranchOptions.length) return;

    const firstBranchId = String(fromBranchOptions[0]?.id || '');
    if (!firstBranchId) return;

    setFormData((prev) => ({
      ...prev,
      fromBranch: prev.fromBranch || firstBranchId,
    }));
  }, [fromBranchOptions]);

  useEffect(() => {
    if (!toBranchOptions.length || !formData.fromBranch) return;

    // A company with a single branch has nothing else to offer, so show that
    // one on both sides rather than leaving To Branch blank -- an empty
    // dropdown reads as a broken screen, not as "there is nowhere to send it".
    const preferredToBranch =
      toBranchOptions.find(
        (branch: any) => String(branch?.id) !== String(formData.fromBranch),
      ) || toBranchOptions[0];

    if (!preferredToBranch) return;

    setFormData((prev) => ({
      ...prev,
      toBranch:
        prev.toBranch && String(prev.toBranch) !== String(prev.fromBranch)
          ? prev.toBranch
          : String(preferredToBranch.id),
    }));
  }, [toBranchOptions, formData.fromBranch]);

  // The voucher the Transfer List sent here, read back into the form.
  //
  // Everything the challan holds comes off its own details -- the rate
  // included, which this form asks for but the save has never sent: what the
  // goods cost is read from the stock they left on, not from what is typed
  // here. It is loaded so the line reads as it will print.
  useEffect(() => {
    if (!editTransferId) return;

    setLoadingVoucher(true);
    dispatch(getBranchTransferDetails(editTransferId))
      .unwrap()
      .then((payload: any) => {
        const master = payload?.master;
        if (!master) return;

        // A receive is corrected from its own screen; this one raises issues.
        if (Number(master?.transfer_type) !== 1) {
          toast.error('Only an issue can be edited on this screen.');
          navigate(ROUTES.report_branch_transfer_list);
          return;
        }

        const challanIso = master?.challan_date
          ? dayjs(master.challan_date).format('YYYY-MM-DD')
          : '';

        setFormData({
          transferDate: challanIso || defaultTransferIso,
          fromBranch: String(master?.from_branch || ''),
          toBranch: String(master?.to_branch || ''),
          challanNumber: master?.challan_number || '',
          receiverName: master?.receiver_name || '',
          receiverMobileNumber: master?.receiver_mobile_number || '',
          // Falls back to the old single Transport box, which is where a
          // voucher raised before the split kept its driver.
          driverName: master?.driver_name || master?.reference || '',
          driverMobile: master?.driver_mobile || '',
          note: master?.notes || '',
          products: (Array.isArray(payload?.details) ? payload.details : []).map(
            (row: any, index: number) => ({
              id: index + 1,
              productId: String(row?.product_id || ''),
              productName: row?.product_name || '',
              // The details carry no unit; it only ever labelled the Quantity
              // box, and the figure means the same without it.
              unit: '',
              quantity: String(Number(row?.issued_qty ?? row?.stock_out ?? 0)),
              damagedQty: String(Number(row?.damaged_qty ?? 0)),
              shortQty: String(Number(row?.short_qty ?? 0)),
              rate: String(Number(row?.rate ?? 0)),
            }),
          ),
        });

        // The challan brought its own date, so stop the branch's transaction
        // date from writing over it when settings next refreshes.
        setTransferDateTouched(true);
        setTransferDate(challanIso ? dayjs(challanIso).toDate() : defaultTransferDate);
        setEditingId(editTransferId);
        setEditingVrNo(master?.vr_no || '');
      })
      .catch(() => toast.error('Could not load this transfer.'))
      .finally(() => setLoadingVoucher(false));
    // Loaded once, for the voucher the list named.
  }, [dispatch, editTransferId]);

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLineItemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLineItem((prev) => ({ ...prev, [name]: value }));
  };

  const handleTransferDateChange = (date: Date | null) => {
    setTransferDateTouched(true);
    setTransferDate(date);
    setFormData((prev) => ({
      ...prev,
      transferDate: date ? dayjs(date).format('YYYY-MM-DD') : '',
    }));
  };

  // trx_dt can arrive after first render; adopt it until the user picks a date.
  useEffect(() => {
    if (transferDateTouched) return;
    const iso = trxDateToIso(trxDt);
    if (!iso) return;
    setTransferDate(trxDateToDate(trxDt));
    setFormData((prev) => (prev.transferDate === iso ? prev : { ...prev, transferDate: iso }));
  }, [trxDt, transferDateTouched]);

  const handleProductSelect = (option: ProductOption | null) => {
    if (!option) {
      setLineItem((prev) => ({
        ...prev,
        productId: '',
        productName: '',
        unit: '',
        damagedQty: '',
        shortQty: '',
        rate: '',
      }));
      return;
    }
    setLineItem((prev) => ({
      ...prev,
      productId: option.value || '',
      productName: option.label || '',
      unit: option.label_3 || '',
      rate: option.label_4 || prev.rate,
    }));
  };

  const clearLineForm = () => {
    setLineItem({
      productId: '',
      productName: '',
      unit: '',
      quantity: '',
      damagedQty: '',
      shortQty: '',
      rate: '',
    });
    setIsUpdatingLine(false);
    setEditingLineId(null);
  };

  const resetForm = () => {
    setFormData({
      transferDate: defaultTransferIso,
      fromBranch: '',
      toBranch: '',
      challanNumber: '',
      receiverName: '',
      receiverMobileNumber: '',
      driverName: '',
      driverMobile: '',
      note: '',
      products: [],
    });
    setTransferDate(defaultTransferDate);
    setTransferDateTouched(false);
    // An emptied form is a fresh challan, not a correction of the voucher that
    // was on it a moment ago -- otherwise Save would rewrite that voucher with
    // whatever gets typed next.
    setEditingId(null);
    setEditingVrNo('');
    clearLineForm();
  };

  const validateLineItem = () => {
    if (!lineItem.productId) {
      toast.error('Please select product');
      return false;
    }
    if (!lineItem.quantity || Number(lineItem.quantity) <= 0) {
      toast.error('Please enter valid quantity');
      return false;
    }
    if (lineItem.rate === '' || Number(lineItem.rate) < 0) {
      toast.error('Please enter valid rate');
      return false;
    }
    if (lineItem.damagedQty !== '' && Number(lineItem.damagedQty) < 0) {
      toast.error('Damaged qty cannot be negative');
      return false;
    }
    if (lineItem.shortQty !== '' && Number(lineItem.shortQty) < 0) {
      toast.error('Short qty cannot be negative');
      return false;
    }
    return true;
  };

  const handleAddProduct = () => {
    if (!validateLineItem()) return;

    const newItem: TransferItem = {
      id: Date.now(),
      productId: lineItem.productId,
      productName: lineItem.productName,
      unit: lineItem.unit,
      quantity: lineItem.quantity,
      damagedQty: lineItem.damagedQty || '0',
      shortQty: lineItem.shortQty || '0',
      rate: lineItem.rate,
    };

    setFormData((prev) => ({
      ...prev,
      products: [...prev.products, newItem],
    }));
    clearLineForm();
  };

  const handleEditProduct = (lineId: number) => {
    const found = formData.products.find((item) => item.id === lineId);
    if (!found) return;
    setLineItem({
      productId: found.productId,
      productName: found.productName,
      unit: found.unit,
      quantity: found.quantity,
      damagedQty: found.damagedQty || '0',
      shortQty: found.shortQty || '0',
      rate: found.rate,
    });
    setIsUpdatingLine(true);
    setEditingLineId(lineId);
  };

  const handleUpdateProduct = () => {
    if (!validateLineItem() || editingLineId === null) return;

    setFormData((prev) => ({
      ...prev,
      products: prev.products.map((item) =>
        item.id === editingLineId
          ? {
              ...item,
              productId: lineItem.productId,
              productName: lineItem.productName,
              unit: lineItem.unit,
              quantity: lineItem.quantity,
              damagedQty: lineItem.damagedQty || '0',
              shortQty: lineItem.shortQty || '0',
              rate: lineItem.rate,
            }
          : item,
      ),
    }));
    clearLineForm();
  };

  const handleDeleteProduct = (lineId: number) => {
    setFormData((prev) => ({
      ...prev,
      products: prev.products.filter((item) => item.id !== lineId),
    }));
    if (editingLineId === lineId) {
      clearLineForm();
    }
  };

  // Same warning the customer form shows: if the receiver mobile already
  // belongs to a party, let the operator confirm before saving rather than
  // block them. Returns the matching parties.
  const checkDuplicateMobile = async (mobile: string) => {
    const response = await httpService.post(API_CUSTOMER_MOBILE_CHECK_URL, { mobile });
    const payload = response?.data?.data ?? response?.data ?? {};
    return {
      exists: Boolean(payload?.exists),
      items: Array.isArray(payload?.items) ? payload.items : [],
    };
  };

  const performSave = (payload: any, allowNegative = false) => {
    setSaveButtonLoading(true);
    const finalPayload = allowNegative ? { ...payload, allow_negative: true } : payload;
    const editing = editingId;

    const handleResponse = (response: any) => {
      setSaveButtonLoading(false);
      if (response?.success) {
        toast.success(
          response?.message || (editing ? 'Branch transfer updated' : 'Branch transfer saved'),
        );
        resetForm();
        // A corrected voucher is read back where it was opened from: the
        // operator came here to fix one row, not to raise the next challan.
        if (editing) navigate(ROUTES.report_branch_transfer_list);
        return;
      }
      // A shortage is a warning the operator can override, not a hard error.
      if (response?.stock_shortage) {
        setStockWarning({
          rows: Array.isArray(response?.shortage_rows) ? response.shortage_rows : [],
          shortages: Array.isArray(response?.shortages) ? response.shortages : [],
          message: response?.message || 'Not enough stock at the source branch.',
          payload,
        });
        return;
      }
      toast.error(
        response?.message || (editing ? 'Failed to update branch transfer' : 'Failed to save branch transfer'),
      );
    };

    dispatch(
      editing
        ? updateBranchTransfer(editing, finalPayload, handleResponse)
        : storeBranchTransfer(finalPayload, handleResponse),
    );
  };

  const handleSave = async () => {
    if (toBranchOptions.length < 2) {
      toast.error('At least two branches are required for transfer');
      return;
    }
    if (!formData.fromBranch || !formData.toBranch) {
      toast.error('From and To branch are required');
      return;
    }
    if (formData.fromBranch === formData.toBranch) {
      toast.error('From and To branch cannot be same');
      return;
    }
    const receiverMobile = formData.receiverMobileNumber.trim();
    if (receiverMobile && !/^\d+$/.test(receiverMobile)) {
      toast.error('Receiver mobile number must contain digits only');
      return;
    }
    if (receiverMobile && (receiverMobile.length < 6 || receiverMobile.length > 32)) {
      toast.error('Receiver mobile number must be between 6 and 32 digits');
      return;
    }
    if (!formData.products.length) {
      toast.error('Please add at least one product');
      return;
    }

    const payload = {
      to_branch_id: Number(formData.toBranch),
      from_branch_id: formData.fromBranch ? Number(formData.fromBranch) : null,
      challan_number: formData.challanNumber || null,
      challan_date: formData.transferDate || null,
      receiver_name: formData.receiverName || null,
      receiver_mobile_number: receiverMobile || null,
      note: formData.note || null,
      driver_name: formData.driverName || null,
      driver_mobile: formData.driverMobile || null,
      table_data: formData.products.map((item) => ({
        code: Number(item.productId),
        qty: Number(item.quantity),
        damaged_qty: Number(item.damagedQty || 0),
        short_qty: Number(item.shortQty || 0),
      })),
    };

    if (receiverMobile) {
      setSaveButtonLoading(true);
      try {
        const duplicate = await checkDuplicateMobile(receiverMobile);
        setSaveButtonLoading(false);
        if (duplicate.exists) {
          setDuplicateWarning({ mobile: receiverMobile, items: duplicate.items, payload });
          return;
        }
      } catch {
        // A failed check shouldn't stop the transfer — fall through and save.
        setSaveButtonLoading(false);
      }
    }

    performSave(payload);
  };

  const handleDuplicateContinue = () => {
    if (!duplicateWarning) return;
    const pending = duplicateWarning;
    setDuplicateWarning(null);
    performSave(pending.payload);
  };

  const handleDuplicateCancel = () => {
    setDuplicateWarning(null);
  };

  const handleStockContinue = () => {
    if (!stockWarning) return;
    const pending = stockWarning;
    setStockWarning(null);
    performSave(pending.payload, true);
  };

  const handleStockCancel = () => {
    setStockWarning(null);
  };
  return (
    <div>
      <HelmetTitle title={editingId ? 'Edit Branch Issue' : 'Branch Issue'} />

      {/* Says which voucher is on the screen, and offers the way out of it. A
          form that looks exactly like a blank one but saves over an existing
          challan is how the wrong voucher gets rewritten. */}
      {editingId ? (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-sm border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-900/50 dark:bg-amber-900/20">
          <span className="text-sm font-medium text-amber-800 dark:text-amber-100">
            Editing issue {editingVrNo || `#${editingId}`}
            {loadingVoucher ? ' — loading…' : ''}
          </span>
          <Button
            type="button"
            onClick={() => navigate(ROUTES.report_branch_transfer_list)}
            className="inline-flex items-center gap-1 rounded-sm border border-amber-400 px-2 py-1 text-xs font-medium text-amber-800 transition hover:bg-amber-100 dark:text-amber-100 dark:hover:bg-amber-900/40"
          >
            <FiX className="h-3.5 w-3.5" />
            Cancel
          </Button>
        </div>
      ) : null}

      {/* Rows sit closer than they did: at gap-4 the eight fields read as eight
          separate things rather than one form. */}
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 mb-4 md:grid-cols-2">
        {/* First, because it is the first thing decided: which way the stock
            moves. Everything below only describes a transfer already scoped. */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-black dark:text-white">From Branch</label>
            {/* Fixed once the voucher exists: the issue lives in the sending
                branch's book and carries that branch's number, so moving it
                elsewhere is a different voucher, not an edit of this one. */}
            <BranchDropdown
              id="fromBranch"
              name="fromBranch"
              className="p-2"
              branchDdl={fromBranchOptions}
              onChange={handleBranchChange}
              defaultValue={formData.fromBranch}
              value={editingId ? formData.fromBranch : undefined}
              disabled={Boolean(editingId)}
            />
          </div>
          <div>
            <label className="text-black dark:text-white">To Branch</label>
            <BranchDropdown
              id="toBranch"
              name="toBranch"
              className="p-2"
              branchDdl={toBranchOptions}
              onChange={handleBranchChange}
              defaultValue={formData.toBranch}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <InputDatePicker
            id="transferDate"
            name="transferDate"
            label="Challan Date"
            selectedDate={transferDate}
            setSelectedDate={setTransferDate}
            setCurrentDate={handleTransferDateChange}
            className="w-full h-8.5"
          />
          <InputElement
            id="challanNumber"
            name="challanNumber"
            label="Challan Number"
            placeholder="Enter challan number"
            value={formData.challanNumber}
            onChange={handleFormInput}
          />
        </div>
        {/* Paired like the driver below: a name and the number to reach it on
            are one fact about one person, not two fields that happen to adjoin. */}
        <div className="grid grid-cols-2 gap-2">
          <InputElement
            id="receiverName"
            name="receiverName"
            label="Receiver Name"
            placeholder="Enter receiver name"
            value={formData.receiverName}
            onChange={handleFormInput}
          />
          <InputElement
            id="receiverMobileNumber"
            name="receiverMobileNumber"
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            label="Receiver Mobile"
            placeholder="Enter mobile number"
            value={formData.receiverMobileNumber}
            onChange={handleFormInput}
          />
        </div>
        {/* The single Transport box held whatever the clerk chose to write in
            it. Split, so the driver can actually be reached about a consignment
            in transit -- but sharing one column between them, since together
            they are one thing, and spread across a full row they left the last
            field of the form stranded on a row of its own. */}
        <div className="grid grid-cols-2 gap-2">
          <InputElement
            id="driverName"
            name="driverName"
            label="Driver Name"
            placeholder="Enter driver name"
            value={formData.driverName}
            onChange={handleFormInput}
          />
          <InputElement
            id="driverMobile"
            name="driverMobile"
            label="Driver Mobile"
            placeholder="Enter driver mobile"
            value={formData.driverMobile}
            onChange={handleFormInput}
          />
        </div>
        {/* Spans both columns: it is free text about the whole consignment, and
            the last row is its own anyway now that everything else is paired. */}
        <div className="md:col-span-2">
          <InputElement
            id="note"
            name="note"
            label="Note"
            placeholder="Transfer note"
            value={formData.note}
            onChange={handleFormInput}
          />
        </div>

        <div className="md:col-span-2 mt-2 border-t border-gray-200 dark:border-gray-700 pt-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
            <div className="md:col-span-4">
              <label className="text-black dark:text-white">Select Product</label>
              <RequisitionItemsDropdown
                id="transferProduct"
                name="transferProduct"
                // className='h-8'
                onSelect={handleProductSelect}
                defaultValue={
                  lineItem.productId
                    ? { value: lineItem.productId, label: lineItem.productName }
                    : null
                }
                value={
                  lineItem.productId
                    ? { value: lineItem.productId, label: lineItem.productName }
                    : null
                }
              />
            </div>
            <div className="md:col-span-2">
              <InputElement
                id="quantity"
                name="quantity"
                className='h-9.5'
                type="number"
                label={`Quantity ${lineItem.unit ? `(${lineItem.unit})` : ''}`}
                value={lineItem.quantity}
                placeholder="0"
                onChange={handleLineItemChange}
              />
            </div>
            <div className="md:col-span-2">
              <InputElement
                id="damagedQty"
                name="damagedQty"
                className='h-9.5'
                type="number"
                label="Damaged Qty"
                value={lineItem.damagedQty}
                placeholder="0"
                onChange={handleLineItemChange}
              />
            </div>
            <div className="md:col-span-2">
              <InputElement
                id="shortQty"
                name="shortQty"
                className='h-9.5'
                type="number"
                label="Short Qty"
                value={lineItem.shortQty}
                placeholder="0"
                onChange={handleLineItemChange}
              />
            </div>
            <div className="md:col-span-2">
              <InputElement
                id="rate"
                name="rate"
                className='h-9.5'
                type="number"
                label="Rate"
                value={lineItem.rate}
                placeholder="0"
                onChange={handleLineItemChange}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-3">
        {isUpdatingLine ? (
          <ButtonLoading
            onClick={handleUpdateProduct}
            buttonLoading={false}
            label="Update Item"
            className="whitespace-nowrap text-center mr-0 py-2"
            icon={<FiEdit2 className="text-lg ml-2 mr-2" />}
          />
        ) : (
          <ButtonLoading
            onClick={handleAddProduct}
            buttonLoading={false}
            label="Add Item"
            className="whitespace-nowrap text-center mr-0 py-2"
            icon={<FiPlus className="text-lg ml-2 mr-2" />}
          />
        )}
        <ButtonLoading
          onClick={clearLineForm}
          buttonLoading={false}
          label="Clear Item"
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={<FiRefreshCcw className="text-lg ml-2 mr-2" />}
        />
        <ButtonLoading
          onClick={handleSave}
          buttonLoading={saveButtonLoading}
          label={
            saveButtonLoading
              ? editingId
                ? 'Updating...'
                : 'Saving...'
              : editingId
                ? 'Update'
                : 'Save'
          }
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={<FiSave className="text-lg ml-2 mr-2" />}
        />
        <ButtonLoading
          onClick={resetForm}
          buttonLoading={false}
          label="Reset All"
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={<FiRefreshCcw className="text-lg ml-2 mr-2" />}
        />
      </div>

      <div className="mt-3 col-span-2 overflow-x-auto mb-5">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-300 dark:bg-gray-700 dark:text-gray-200">
            <tr>
              <th className="px-2 py-2 text-center">Sl</th>
              <th className="px-2 py-2">Product</th>
              <th className="px-2 py-2 text-right">Qty</th>
              <th className="px-2 py-2 text-right">Damaged Qty</th>
              <th className="px-2 py-2 text-right">Short Qty</th>
              <th className="px-2 py-2 text-right">Rate</th>
              <th className="px-2 py-2 text-right">Amount</th>
              <th className="px-2 py-2 text-center w-20">Action</th>
            </tr>
          </thead>
          <tbody>
            {formData.products.map((row, index) => (
              <tr key={row.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                <td className="px-2 py-2 text-center text-gray-900 dark:text-white">{index + 1}</td>
                <td className="px-2 py-2 text-gray-900 dark:text-white">{row.productName}</td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-white">
                  {thousandSeparator(Number(row.quantity))} {row.unit}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-white">
                  {thousandSeparator(Number(row.damagedQty || 0))}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-white">
                  {thousandSeparator(Number(row.shortQty || 0))}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-white">
                  {thousandSeparator(Number(row.rate))}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-white">
                  {thousandSeparator(Number(row.quantity) * Number(row.rate))}
                </td>
                <td className="px-2 py-2 text-center text-gray-900 dark:text-white">
                  <Button
                    onClick={() => handleDeleteProduct(row.id)}
                    className="text-red-500 ml-2 text-center"
                  >
                    <FiTrash2 className="cursor-pointer text-center" />
                  </Button>
                  <Button
                    onClick={() => handleEditProduct(row.id)}
                    className="text-green-500 ml-2 text-center"
                  >
                    <FiEdit2 className="cursor-pointer text-center" />
                  </Button>
                </td>
              </tr>
            ))}
            {formData.products.length === 0 && (
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                <td colSpan={8} className="px-2 py-3 text-center text-gray-500 dark:text-gray-300">
                  No product added
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {duplicateWarning ? (
        <div className="fixed inset-0 z-1001 flex items-center justify-center bg-black/50 px-3 py-6">
          <div className="w-full max-w-lg rounded-sm bg-white shadow-xl dark:bg-gray-800">
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-900/20">
              <h3 className="text-base font-semibold text-amber-800 dark:text-amber-100">
                Mobile Number Already Exists
              </h3>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-200">
                This mobile number already exists: {duplicateWarning.mobile}
              </p>
            </div>

            <div className="px-4 py-4">
              <p className="text-sm text-gray-700 dark:text-gray-200">
                You can continue and save this transfer with the same receiver mobile, or cancel and change it.
              </p>

              {duplicateWarning.items.length > 0 ? (
                <div className="mt-3 max-h-48 overflow-y-auto rounded-sm border border-gray-200 dark:border-gray-700">
                  {duplicateWarning.items.map((item: any) => (
                    <div
                      key={item?.id ?? item?.coa4_id ?? `${item?.name}-${item?.mobile}`}
                      className="border-b border-gray-100 px-3 py-2 text-sm last:border-b-0 dark:border-gray-700"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {item?.name || '-'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatMobile(item?.mobile, mobileFormat) || '-'}
                        {item?.manual_address ? ` | ${item.manual_address}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 border-t border-gray-200 px-4 py-3 sm:flex-row sm:justify-end dark:border-gray-700">
              <Button
                type="button"
                onClick={handleDuplicateCancel}
                className="rounded-sm border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Cancel
              </Button>
              <ButtonLoading
                type="button"
                onClick={handleDuplicateContinue}
                buttonLoading={saveButtonLoading}
                label="Continue Save"
                className="whitespace-nowrap px-4 py-2"
                icon={<FiSave className="text-lg ml-2 mr-2" />}
                disabled={saveButtonLoading}
              />
            </div>
          </div>
        </div>
      ) : null}

      {stockWarning ? (
        <div className="fixed inset-0 z-1001 flex items-center justify-center bg-black/50 px-3 py-6">
          <div className="w-full max-w-lg rounded-sm bg-white shadow-xl dark:bg-gray-800">
            <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-900/20">
              <FiAlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
              <h3 className="text-base font-semibold text-amber-800 dark:text-amber-100">
                Not Enough Stock
              </h3>
            </div>

            <div className="px-4 py-4 text-sm text-gray-700 dark:text-gray-200">
              {stockWarning.rows.length > 0 ? (
                <>
                  <p>Not enough stock at the source branch for</p>
                  <ol className="mt-1 list-decimal space-y-0.5 pl-6">
                    {stockWarning.rows.map((row, i) => (
                      <li key={i}>
                        <span className="font-medium">{row.name}</span>
                        {' — '}
                        <span className="font-semibold text-danger">
                          Available {thousandSeparator(Number(row.available))}
                        </span>
                        {', '}
                        <span className="font-semibold text-warning">
                          Requested {thousandSeparator(Number(row.requested))}
                        </span>
                        {i === stockWarning.rows.length - 1 ? '.' : ';'}
                      </li>
                    ))}
                  </ol>
                  <p className="mt-3">You can transfer anyway.</p>
                </>
              ) : stockWarning.shortages.length > 0 ? (
                <>
                  <p>Not enough stock at the source branch for</p>
                  <ol className="mt-1 list-decimal space-y-0.5 pl-6">
                    {stockWarning.shortages.map((line, i) => (
                      <li key={i}>
                        {line}
                        {i === stockWarning.shortages.length - 1 ? '.' : ';'}
                      </li>
                    ))}
                  </ol>
                  <p className="mt-3">You can transfer anyway.</p>
                </>
              ) : (
                <p>{stockWarning.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2 border-t border-gray-200 px-4 py-3 sm:flex-row sm:justify-end dark:border-gray-700">
              <Button
                type="button"
                onClick={handleStockCancel}
                className="rounded-sm border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Cancel
              </Button>
              <ButtonLoading
                type="button"
                onClick={handleStockContinue}
                buttonLoading={saveButtonLoading}
                label="Continue Save"
                className="whitespace-nowrap px-4 py-2"
                icon={<FiSave className="text-lg ml-2 mr-2" />}
                disabled={saveButtonLoading}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default BranchTransfer;
