import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { FiEdit2, FiPlus, FiRefreshCcw, FiSave, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import InputElement from '../../utils/fields/InputElement';
import RequisitionItemsDropdown from '../../utils/utils-functions/RequisitionItemsDropdown';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { getDdlAllBranch, getDdlProtectedBranch } from '../branch/ddlBranchSlider';
import { storeBranchReceived } from './warehouseReceivedSlice';
import { getBranchTransferDetails } from '../warehouse-transfer/warehouseTransferSlice';
import InputDatePicker from '../../utils/fields/DatePicker';

type ProductOption = {
  value: string;
  label: string;
  label_3?: string;
  label_4?: string;
};

// "Self" means the stock did not come from another branch — an opening balance
// or a purchase entered straight at the receiving branch. It posts with
// from_branch_id null, which the receive API already accepts.
const SELF_FROM_BRANCH = '';

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

const WarehouseReceived = () => {
  const dispatch = useDispatch<any>();
  const location = useLocation();
  const branchDdl = useSelector((s: any) => s.branchDdl);

  const [saveButtonLoading, setSaveButtonLoading] = useState(false);
  // Set when arriving from the Transfer List "Receive" button: the receive is
  // posted against this issue transfer so the backend can link and close it.
  const [sourceTransferId, setSourceTransferId] = useState<number | null>(null);
  const [receiveDate, setReceiveDate] = useState<Date | null>(dayjs().toDate());
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
    transferDate: dayjs().format('YYYY-MM-DD'),
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

  const toBranchOptions = useMemo(
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

  const fromBranchOptions = useMemo(() => {
    if (Array.isArray(branchDdl?.data)) {
      return branchDdl.data;
    }
    if (Array.isArray(branchDdl?.data?.data)) {
      return branchDdl.data.data;
    }
    return [];
  }, [branchDdl?.data]);

  // Self sits on top of the real branches in the dropdown only — the auto-select
  // below still defaults to a real branch, so a plain transfer is unaffected.
  const fromBranchSelectOptions = useMemo(
    () => [{ id: SELF_FROM_BRANCH, name: 'Self Branch' }, ...fromBranchOptions],
    [fromBranchOptions],
  );

  const isSelfReceive = formData.fromBranch === SELF_FROM_BRANCH;

  useEffect(() => {
    // Own company only, same as the issue form.
    dispatch(getDdlProtectedBranch(true));
    dispatch(getDdlAllBranch(true));
  }, [dispatch]);

  // Arriving from a transfer's "Receive" button: pull that issue's items and
  // pre-fill the form so the receiver only adjusts quantities before saving.
  useEffect(() => {
    const srcId = (location.state as any)?.sourceTransferId;
    if (!srcId) return;

    setSourceTransferId(Number(srcId));
    dispatch(getBranchTransferDetails(srcId))
      .unwrap()
      .then((res: any) => {
        const master = res?.master;
        const details = Array.isArray(res?.details) ? res.details : [];
        if (!master) return;

        setFormData((prev) => ({
          ...prev,
          fromBranch: master.from_branch ? String(master.from_branch) : prev.fromBranch,
          toBranch: master.to_branch ? String(master.to_branch) : prev.toBranch,
          challanNumber: master.challan_number || '',
          receiverName: master.receiver_name || '',
          receiverMobileNumber: master.receiver_mobile_number || '',
          // Carried over from the issue: the same lorry usually arrives, and a
          // challan raised before the split has its driver in `reference`.
          driverName: master.driver_name || master.reference || '',
          driverMobile: master.driver_mobile || '',
          note: master.notes || '',
          products: details.map((d: any, i: number) => ({
            id: Date.now() + i,
            productId: String(d.product_id ?? ''),
            productName: d.product_name || '',
            unit: '',
            // Default to the issued quantity; the receiver trims it for any
            // damage or shortage before saving.
            quantity: String(d.issued_qty ?? d.stock_out ?? 0),
            damagedQty: '0',
            shortQty: '0',
            // Rate is irrelevant to a receive (not sent to the API), but the
            // line editor validates it, so seed 0 to keep quantity edits valid.
            rate: '0',
          })),
        }));
      })
      .catch(() => {
        toast.error('Could not load the transfer to receive.');
      });
    // Runs once for the transfer we navigated in with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  useEffect(() => {
    if (!toBranchOptions.length) return;

    const firstBranchId = String(toBranchOptions[0]?.id || '');
    if (!firstBranchId) return;

    setFormData((prev) => ({
      ...prev,
      toBranch: prev.toBranch || firstBranchId,
    }));
  }, [toBranchOptions]);

  useEffect(() => {
    if (!fromBranchOptions.length || !formData.toBranch) return;

    const preferredFromBranch = fromBranchOptions.find(
      (branch: any) => String(branch?.id) !== String(formData.toBranch),
    );

    if (!preferredFromBranch) return;

    setFormData((prev) => ({
      ...prev,
      fromBranch:
        prev.fromBranch && String(prev.fromBranch) !== String(prev.toBranch)
          ? prev.fromBranch
          : String(preferredFromBranch.id),
    }));
  }, [fromBranchOptions, formData.toBranch]);

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Switching the source to Self detaches the form from any issue transfer it
    // was pre-filled from; there is nothing left to receive against.
    if (name === 'fromBranch' && value === SELF_FROM_BRANCH) {
      setSourceTransferId(null);
    }
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
    setReceiveDate(date);
    setFormData((prev) => ({
      ...prev,
      transferDate: date ? dayjs(date).format('YYYY-MM-DD') : '',
    }));
  };

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
    const today = dayjs();
    setFormData({
      transferDate: today.format('YYYY-MM-DD'),
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
    setReceiveDate(today.toDate());
    setSourceTransferId(null);
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

  const handleSave = () => {
    if (!formData.toBranch) {
      toast.error('Receive branch is required');
      return;
    }
    // A Self receive has no counterpart branch, so none of the two-branch rules
    // below apply to it.
    if (!isSelfReceive) {
      if (fromBranchOptions.length < 2) {
        toast.error('At least two branches are required for receive');
        return;
      }
      if (!formData.fromBranch) {
        toast.error('From and To branch are required');
        return;
      }
      if (formData.fromBranch === formData.toBranch) {
        toast.error('From and To branch cannot be same');
        return;
      }
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

    const payload: any = {
      to_branch_id: Number(formData.toBranch),
      from_branch_id:
        isSelfReceive || !formData.fromBranch ? null : Number(formData.fromBranch),
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

    // Links the receive to its issue transfer so the backend validates against
    // the issued quantities and marks the transfer received.
    if (sourceTransferId) {
      payload.source_transfer_id = sourceTransferId;
    }

    setSaveButtonLoading(true);
    dispatch(
      storeBranchReceived(payload, (response: any) => {
        if (response?.success) {
          toast.success(response?.message || 'Branch receive saved');
          resetForm();
        } else {
          toast.error(response?.message || 'Failed to save branch receive');
        }
        setSaveButtonLoading(false);
      }),
    );
  };
  return (
    <div>
      <HelmetTitle title="Branch Receive" />

      {/* Same spacing as the transfer form it mirrors. */}
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 mb-4 md:grid-cols-2">
        {/* First, as on the transfer form: which way the stock moved is what the
            rest of the entry hangs off. */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">From Branch</label>
            <BranchDropdown
              id="fromBranch"
              name="fromBranch"
              className="p-2"
              branchDdl={fromBranchSelectOptions}
              onChange={handleBranchChange}
              defaultValue={formData.fromBranch}
              value={formData.fromBranch}
            />
          </div>
          <div>
            <label className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">Receive Branch</label>
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
 label="Receive Date"
 selectedDate={receiveDate}
 setSelectedDate={setReceiveDate}
 setCurrentDate={handleTransferDateChange}
 className="w-full "
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
        {/* Split from the old single Transport box, so the driver who brought
            the consignment can be reached about it. Sharing one column: together
            they are one thing, and the transfer form pairs them the same way. */}
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
        {/* Spans both columns, same as the transfer form. */}
        <div className="md:col-span-2">
          <InputElement
            id="note"
            name="note"
            label="Note"
            placeholder="Receive note"
            value={formData.note}
            onChange={handleFormInput}
          />
        </div>

        <div className="md:col-span-2 mt-2 border-t border-gray-200 dark:border-gray-700 pt-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
            <div className="md:col-span-4">
              <label className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">Select Product</label>
              <RequisitionItemsDropdown
 id="receiveProduct"
 name="receiveProduct"
                // className=''
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
 className=''
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
 className=''
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
 className=''
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
 className=''
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
            className="whitespace-nowrap text-center mr-0"
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
          label={saveButtonLoading ? 'Saving...' : 'Save'}
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

      <div className="mt-3 overflow-x-auto mb-5">
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
                <td className="px-2 py-2 text-center text-gray-900 dark:text-[rgb(var(--c-text))]">{index + 1}</td>
                <td className="px-2 py-2 text-gray-900 dark:text-[rgb(var(--c-text))]">{row.productName}</td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {thousandSeparator(Number(row.quantity))} {row.unit}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {thousandSeparator(Number(row.damagedQty || 0))}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {thousandSeparator(Number(row.shortQty || 0))}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {thousandSeparator(Number(row.rate))}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {thousandSeparator(Number(row.quantity) * Number(row.rate))}
                </td>
                <td className="px-2 py-2 text-center text-gray-900 dark:text-[rgb(var(--c-text))]">
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

    </div>
  );
};

export default WarehouseReceived;
