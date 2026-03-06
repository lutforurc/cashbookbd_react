import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiEdit2, FiPlus, FiRefreshCcw, FiSave, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import HelmetTitle from '../../utils/others/HelmetTitle'; 
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons'; 
import InputElement from '../../utils/fields/InputElement';
import RequisitionItemsDropdown from '../../utils/utils-functions/RequisitionItemsDropdown';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown'; 
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { getDdlAllBranch, getDdlProtectedBranch } from '../branch/ddlBranchSlider';
import { storeBranchReceived } from './warehouseReceivedSlice';
import ReceiveList from './ReceiveList';
import InputDatePicker from '../../utils/fields/DatePicker';

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

const WarehouseReceived = () => {
  const dispatch = useDispatch<any>();
  const branchDdl = useSelector((s: any) => s.branchDdl);

  const [saveButtonLoading, setSaveButtonLoading] = useState(false);
  const [listRefreshKey, setListRefreshKey] = useState(0);
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
    transport: '',
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

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    dispatch(getDdlAllBranch());
  }, [dispatch]);

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
      transport: '',
      note: '',
      products: [],
    });
    setReceiveDate(today.toDate());
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
    if (fromBranchOptions.length < 2) {
      toast.error('At least two branches are required for receive');
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
      transport: formData.transport || null,
      table_data: formData.products.map((item) => ({
        code: Number(item.productId),
        qty: Number(item.quantity),
        damaged_qty: Number(item.damagedQty || 0),
        short_qty: Number(item.shortQty || 0),
      })),
    };

    setSaveButtonLoading(true);
    dispatch(
      storeBranchReceived(payload, (response: any) => {
        if (response?.success) {
          toast.success(response?.message || 'Branch receive saved');
          resetForm();
          setListRefreshKey((prev) => prev + 1);
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 mb-4">
        <InputDatePicker
          id="transferDate"
          name="transferDate"
          label="Receive Date"
          selectedDate={receiveDate}
          setSelectedDate={setReceiveDate}
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
        <InputElement
          id="transport"
          name="transport"
          label="Transport"
          placeholder="Enter transport"
          value={formData.transport}
          onChange={handleFormInput}
        />
        <InputElement
          id="note"
          name="note"
          label="Note"
          placeholder="Receive note"
          value={formData.note}
          onChange={handleFormInput}
        />
        <div>
          <label className="text-black dark:text-white">From Branch</label>
          <BranchDropdown
            id="fromBranch"
            name="fromBranch"
            className="p-2"
            branchDdl={fromBranchOptions}
            onChange={handleBranchChange}
            defaultValue={formData.fromBranch}
          />
        </div>
        <div>
          <label className="text-black dark:text-white">Receive Branch</label>
          <BranchDropdown
            id="toBranch"
            name="toBranch"
            className="p-2"
            branchDdl={toBranchOptions}
            onChange={handleBranchChange}
            defaultValue={formData.toBranch}
          />
        </div>

        <div className="md:col-span-2 mt-2 border-t border-gray-200 dark:border-gray-700 pt-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
            <div className="md:col-span-4">
              <label className="text-black dark:text-white">Select Product</label>
              <RequisitionItemsDropdown
                id="receiveProduct"
                name="receiveProduct"
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
            className="whitespace-nowrap text-center mr-0"
            icon={<FiEdit2 className="text-white text-lg ml-2 mr-2" />}
          />
        ) : (
          <ButtonLoading
            onClick={handleAddProduct}
            buttonLoading={false}
            label="Add Item"
            className="whitespace-nowrap text-center mr-0 py-2"
            icon={<FiPlus className="text-white text-lg ml-2 mr-2" />}
          />
        )}
        <ButtonLoading
          onClick={clearLineForm}
          buttonLoading={false}
          label="Clear Item"
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={<FiRefreshCcw className="text-white text-lg ml-2 mr-2" />}
        />
        <ButtonLoading
          onClick={handleSave}
          buttonLoading={saveButtonLoading}
          label={saveButtonLoading ? 'Saving...' : 'Save'}
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={<FiSave className="text-white text-lg ml-2 mr-2" />}
        />
        <ButtonLoading
          onClick={resetForm}
          buttonLoading={false}
          label="Reset All"
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={<FiRefreshCcw className="text-white text-lg ml-2 mr-2" />}
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
                  {thousandSeparator(Number(row.quantity), 2)} {row.unit}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-white">
                  {thousandSeparator(Number(row.damagedQty || 0), 2)}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-white">
                  {thousandSeparator(Number(row.shortQty || 0), 2)}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-white">
                  {thousandSeparator(Number(row.rate), 2)}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-white">
                  {thousandSeparator(Number(row.quantity) * Number(row.rate), 2)}
                </td>
                <td className="px-2 py-2 text-center text-gray-900 dark:text-white">
                  <button
                    onClick={() => handleDeleteProduct(row.id)}
                    className="text-red-500 ml-2 text-center"
                  >
                    <FiTrash2 className="cursor-pointer text-center" />
                  </button>
                  <button
                    onClick={() => handleEditProduct(row.id)}
                    className="text-green-500 ml-2 text-center"
                  >
                    <FiEdit2 className="cursor-pointer text-center" />
                  </button>
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

      <ReceiveList refreshKey={listRefreshKey} />
    </div>
  );
};

export default WarehouseReceived;
