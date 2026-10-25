import React, { useEffect, useState } from 'react';
import InputElement from '../../../utils/fields/InputElement';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import { Button, ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import {
  FiEdit,
  FiEdit2,
  FiHome,
  FiPlus,
  FiRefreshCcw,
  FiRefreshCw,
  FiSave,
  FiTrash2,
} from 'react-icons/fi';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { useDispatch, useSelector } from 'react-redux';
import Loader from '../../../../common/Loader';
import { toast } from 'react-toastify';
import { toastRefusal } from '../../../utils/refusalToast';
import {
  editCashPayment,
  storeCashPayment,
  updateCashPayment,
} from './cashPaymentSlice';
import { handleInputKeyDown } from '../../../utils/utils-functions/handleKeyDown';
import useCtrlS from '../../../utils/hooks/useCtrlS';
import { useNavigate } from 'react-router-dom';
import httpService from '../../../services/httpService';
import {
  API_CASH_RECEIVED_SUGGESTIONS_URL,
  API_TILES_PREVIOUS_BALANCE_URL,
} from '../../../services/apiRoutes';
import useVoucherAutoEditSearch from '../../../utils/hooks/useVoucherAutoEditSearch';
import TrackedProductField from '../../product-tracking/TrackedProductField';
import { useTrackedProducts } from '../../product-tracking/useTrackedProducts';

/**
 * Cash Payment for the Tiles and Sanitary trade (`business_type` "Tiles and
 * Sanitary"). A copy of the General screen -- same slice, same URLs -- carrying
 * the three things its Cash Received twin carries (TilesCashReceived):
 *
 *   1. Previous Balance -- the party's balance as at the branch's own day, signed
 *      the way the ledger signs it: a supplier we owe stands NEGATIVE. Shown,
 *      and used to prefill Amount with what is owed. Hand-editable.
 *   2. Discount (Tk.) -- what the supplier let off at payment. The server raises
 *      its own journal for it (supplier debited, Purchase Discount 40 credited);
 *      this screen only states the figure.
 *   3. Manual Voucher Number -- the shop's own number, beside the system's.
 *
 * The server reads the last two from the FIRST payload row only (`$raw_data[0]`)
 * -- they belong to the voucher, not to a row -- so they are injected there.
 */

const normalizeSuggestionItems = (items: any) =>
  Array.isArray(items)
    ? items
      .map((item: any) => String(item ?? '').trim())
      .filter((item: string, index: number, arr: string[]) => item && arr.indexOf(item) === index)
    : [];

interface PaymentItem {
  id: string | number;
  mtmId: string;
  account: string;
  accountName: string;
  remarks: string;
  amount: string | number;
  purchaseOrderNumber?: string; // Add this line
  purchaseOrderText?: string; // Add this line
  currentProduct?: { [key: string]: any } | null; // Allow null
  // এই row-এর টাকা কোন tracked Product-এর বিপরীতে। legacy transaction
  // table-এ যায় না — শুধু transaction_product_maps-এ যায়।
  // `currentProduct` (account suggestion) থেকে সম্পূর্ণ আলাদা জিনিস।
  trackedProductId?: number | null;
  // Voucher-level, not row-level -- the server reads them off row 0. Optional
  // so the rows the server sends back (which carry them) and the rows this
  // screen builds can share one type.
  discount?: number;
  manual_voucher_no?: string;
}

const initialPaymentItem: PaymentItem = {
  id: '',
  mtmId: '',
  account: '',
  accountName: '',
  remarks: '',
  amount: '',
  currentProduct: undefined, // Use undefined instead of null
  trackedProductId: null,
};

const TilesCashPayment = () => {
  const dispatch = useDispatch();
  const cashPayment = useSelector((state: any) => state.cashPayment);
  const [formData, setFormData] = useState<PaymentItem>(initialPaymentItem);
  // এই Company-তে কোনো Product tracked না থাকলে খালি তালিকা আসে এবং
  // dropdown render-ই হয় না — form তখন হুবহু আগের মতো।
  const { products: trackedProducts } = useTrackedProducts('payment', undefined, false, formData.account);

  const [tableData, setTableData] = useState<PaymentItem[]>([]);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateId, setUpdateId] = useState<any>(null);
  const [search, setSearch] = useState(''); // State to store the search value
  const [isUpdateButton, setIsUpdateButton] = useState(false);
  const [saveButtonLoading, setSaveButtonLoading] = useState(false);
  const [remarkSuggestions, setRemarkSuggestions] = useState<string[]>([]);
  const [previousBalance, setPreviousBalance] = useState(0);
  const [discount, setDiscount] = useState('');
  const [manualVoucherNo, setManualVoucherNo] = useState('');
  const navigate = useNavigate();
  const totalAmount = tableData.reduce(
    (sum, row) => sum + Number(row.amount),
    0,
  );

  // The two voucher-level figures ride on the first row only, which is the one
  // the server reads. ⚠️ Both are sent on every save and update, empty ones
  // included: the server reads an ABSENT key as "leave it alone", so a discount
  // struck out here could never be retired without this.
  const withTilesExtras = (rows: PaymentItem[]): PaymentItem[] =>
    rows.map((row, index) =>
      index === 0
        ? {
          ...row,
          discount: Number(discount) || 0,
          manual_voucher_no: manualVoucherNo,
        }
        : row,
    );

  const resetTilesExtras = () => {
    setPreviousBalance(0);
    setDiscount('');
    setManualVoucherNo('');
  };

  const loadPreviousBalance = async (account: string | number) => {
    if (!account) {
      return;
    }
    try {
      // ⚠️ `allow_negative` -- the balance WITH its sign. One party, one
      // balance: debit minus credit, so a supplier we owe reads NEGATIVE here,
      // exactly as on their ledger and on the purchase screen.
      const response = await httpService.get(API_TILES_PREVIOUS_BALANCE_URL, {
        params: { account, allow_negative: 1 },
      });
      const balance = Number(response?.data?.data?.data?.balance ?? 0);
      setPreviousBalance(balance);
      // What we owe is the negative figure, so that is what gets prefilled --
      // turned positive, because what is paid is never a negative amount. A
      // party who owes US (positive) is not someone to pay: nothing prefilled.
      setFormData((prev) => ({
        ...prev,
        amount: balance < 0 ? -balance : '',
      }));
    } catch (error) {
      setPreviousBalance(0);
    }
  };

  const selectedLedgerOptionHandler = (option: any) => {
    const key = 'account'; // Set the desired key dynamically
    const accountName = 'accountName'; // Set the desired key dynamically
    setFormData((prev) => ({
      ...prev,
      [key]: option.value,
      [accountName]: option.label,
    }));
    void loadPreviousBalance(option.value);
  };


  const handleCashPaymentSave = async () => {
    setSaveButtonLoading(true);
    if (tableData.length === 0) {
      toast.error('Please add some transactions.');
      setSaveButtonLoading(false);
      return;
    }
    // Update the tableData with the selected purchaseOrderNumber from formData
    const updatedTableData = tableData.map((row) => {
      // Update only rows related to the current formData if necessary
      if (row.id === formData.id) {
        return {
          ...row,

          remarks: formData.remarks, // Optionally sync other fields
          amount: formData.amount, // Optionally sync other fields
        };
      }
      return row; // Keep other rows unchanged
    });


    // Update the state with the modified data
    setTableData(updatedTableData);

    // Dispatch the updated data to your store or API
    try {
      const result: any = await dispatch(storeCashPayment(withTilesExtras(updatedTableData)) as any);
      // ⚠️ A refusal is SAID. The server answers success:false with a sentence
      // -- a closed year (§42), no Purchase Discount head -- and the clerk has
      // to read it here, not find an empty table and try again.
      if (result && result.success === false) {
        toastRefusal(result.message);
      } else if (result?.success) {
        resetTilesExtras();
      }
    } catch (error) {
      setSaveButtonLoading(false);
      console.error('Error saving transactions:', error);
    } finally {
      setSaveButtonLoading(false);
    }
  };

  useEffect(() => {
    toast.success(cashPayment.data);
    setFormData({
      id: formData.id,
      mtmId: '',
      account: formData.account,
      accountName: formData.accountName,
      remarks: '',
      amount: '',
      currentProduct: null,
    }); // Reset form data
    setTableData([]); // Clear the table
  }, [cashPayment.data]);

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  useEffect(() => {
    const fetchRemarkSuggestions = async () => {
      const trimmedQuery = formData.remarks.trim();
      if (!trimmedQuery) {
        setRemarkSuggestions([]);
        return;
      }

      try {
        const response = await httpService.get(API_CASH_RECEIVED_SUGGESTIONS_URL, {
          params: {
            field: 'remarks',
            q: trimmedQuery,
          },
        });
        setRemarkSuggestions(normalizeSuggestionItems(response?.data?.data?.data));
      } catch (error) {
        setRemarkSuggestions([]);
      }
    };

    const remarkTimer = window.setTimeout(() => {
      void fetchRemarkSuggestions();
    }, 250);

    return () => {
      window.clearTimeout(remarkTimer);
    };
  }, [formData.remarks]);

  const handleRemarksKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') {
      return;
    }

    if (remarkSuggestions.length > 0) {
      e.preventDefault();
      const [matchedRemark] = remarkSuggestions;
      setFormData((prevState) => ({
        ...prevState,
        remarks: matchedRemark,
      }));
    }

    handleInputKeyDown(e, 'amount');
  };

  const handleAdd = () => {
    // const validationMessages = validateForm(formData, validationMessage);
    // if (validationMessages) {
    //     toast.error(validationMessages);
    //     return;
    // }
    if (formData.account && formData.amount) {
      const { id, ...restFormData } = formData;
      setTableData([
        ...tableData,
        {
          id: Date.now(),
          ...restFormData,
          amount: Number(formData.amount),
          currentProduct: formData.currentProduct || undefined,
        },
      ]);
      setFormData({
        id: formData.id,
        mtmId: '',
        account: formData.account,
        accountName: formData.accountName,
        remarks: '',
        amount: '',
        currentProduct: null,
        trackedProductId: null,
      }); // Reset form
    }
  };

  const handleDelete = (id: number) => {
    setTableData(tableData.filter((row) => row.id !== id));
  };

  const paymentEditItem = (productId: number) => {

    const productIndex = tableData.findIndex((item) => item.id === productId);
    if (productIndex === -1) {
      return;
    }

    const product = tableData[productIndex];


    // Safely update formData
    setFormData((prevState) => ({
      ...prevState,
      id: product?.id || prevState.id || 0,
      mtmId: product?.mtmId || prevState.mtmId || '',
      account: product?.account || prevState.account || '',
      accountName: product?.accountName || prevState.accountName || '',
      remarks: product?.remarks || prevState.remarks || '',
      amount: product?.amount?.toString() || prevState.amount || '',
      currentProduct: product
        ? { ...product, index: productIndex }
        : prevState.currentProduct || null,
      trackedProductId: product?.trackedProductId ?? null,
    }));

    setIsUpdating(true);
    setIsUpdating(true);
    setUpdateId(productIndex);
  };

  const editPaymentVoucher = () => {
    if (updateId === null || updateId === undefined) {
      console.error('No product selected for update.');
      return;
    }

    let paymentVoucher = formData;

    let paymentItem: PaymentItem = {
      id: paymentVoucher.id || Date.now(), // Keep the original ID if it exists, otherwise generate a new one
      mtmId: paymentVoucher.mtmId || '',
      account: paymentVoucher.account || '',
      accountName: paymentVoucher.accountName || '',
      remarks: paymentVoucher.remarks || '',
      amount: Number(paymentVoucher.amount) || 0,
      trackedProductId: paymentVoucher.trackedProductId ?? null,
    };

    // Update the specific item in the array
    const updatedTableData = tableData.map((item, index) =>
      index === updateId ? paymentItem : item,
    );

    setTableData(updatedTableData); // Update the state with the modified array
    setIsUpdating(false); // Exit update mode
    setFormData(initialPaymentItem); // Reset form data
  };

  const searchTransaction = (searchValue?: string) => {
    const invoiceNo = typeof searchValue === 'string' ? searchValue.trim() : search.trim();

    if (invoiceNo === '') {
      toast.error('Please enter a search value.');
      return;
    }
    try {
      // Dispatch the search action
      dispatch(
        editCashPayment({ invoiceNo }, (message: string) => {
          if (message) {
            toast.error(message);
          }
        }),
      );

      setIsUpdating(false);
      // if (sales.isEdit === true) {
      //     setIsUpdateButton(true);
      // }
    } catch (error) {
      console.error('Error searching invoice:', error);
    }
  };

  useVoucherAutoEditSearch({
    setSearch,
    triggerSearch: searchTransaction,
  });

  useEffect(() => {
    setFormData((prevState) => ({
      ...prevState, // Retain previous state properties
    }));
    // setTableData((prevState) => ({
    //     ...prevState, // Retain previous state properties
    // }));
    // setTableData(cashPayment.data);
    if (Array.isArray(cashPayment.data)) {
      setTableData(cashPayment.data); // Update tableData only if it's an array
      setIsUpdateButton(true);
      // The voucher's own two figures come back on every row; take them from
      // the first, the same row the server reads them from on the way in.
      // ⚠️ Only when there ARE rows: a successful update answers with an empty
      // list, and reading a figure off that would wipe what is on screen.
      if (cashPayment.data.length > 0) {
        const first = cashPayment.data[0];
        setManualVoucherNo(first?.manual_voucher_no ?? '');
        setDiscount(Number(first?.discount) > 0 ? String(first?.discount) : '');
      }
    }
  }, [cashPayment.isEdit]);

  // The update answered yes: the voucher is done, so its figures leave the form.
  useEffect(() => {
    if (cashPayment.isUpdated) {
      resetTilesExtras();
    }
  }, [cashPayment.isUpdated]);

  const handleInvoiceUpdate = async () => {
    try {
      setButtonLoading(true);

      // ⚠️ No "updated successfully" toast of our own: the server's sentence
      // is the answer either way -- "Voucher No. … Updated Successfully", or a
      // refusal (the discount journal is already approved, no Purchase
      // Discount head). A fixed success toast beside a refusal says both.
      await dispatch(
        updateCashPayment(withTilesExtras(tableData), (message: string) => {
          if (message) toast.info(message);
        }),
      );

      // Reset UI state
      setIsUpdateButton(false);
      setIsUpdating(false);
    } catch (error) {
      console.error("Error updating invoice:", error);
      toast.error("Failed to update invoice.");
    } finally {
      setButtonLoading(false);
    }
  };

  const handleHome = () => {
    navigate('/dashboard');
  }
  useEffect(() => {
    if (cashPayment.isEdit) {
      setIsUpdateButton(true);
    } else {
      setIsUpdateButton(false);
    }
  }, [cashPayment.isEdit]);

  useCtrlS(handleCashPaymentSave);

  // The arithmetic the desk does in its head. A payment and its discount both
  // DEBIT the supplier, so both move a negative balance back towards nought:
  // owed 10,000 (−10,000), paid 9,500, let off 500 → 0.
  const discountValue = Number(discount) || 0;
  const amountValue = Number(formData.amount) || 0;
  const currentBalance = previousBalance + amountValue + discountValue;

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
        <HelmetTitle title="Cash Payment" screen="cash-payment.tiles" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-2">
        <div className="col-span-1">
          <div className="grid grid-cols-1 gap-y-2">
            <div className="">
              <label htmlFor="">Select Account</label>
              <DdlMultiline
                id="account"
                name="account"
                onSelect={selectedLedgerOptionHandler}
                defaultValue={
                  formData.account
                    ? {
                      value: formData.account,
                      label: formData.accountName, //productData.accountName
                    }
                    : null
                }
                value={
                  formData.account
                    ? {
                      value: formData.account,
                      label: formData.accountName, //productData.accountName
                    }
                    : null
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const nextElement = document.getElementById('remarks');
                    if (nextElement) {
                      nextElement.focus();
                    }
                  }
                }}
                acType={''}
                className=""
              />
            </div>

            {/* What the party stands at, as at the branch's own day, signed the
                way their ledger is: a supplier we owe is negative. Shown once it
                is anything at all -- `!== 0`, never `> 0`, or a party in either
                direction could vanish and read as owing nothing. */}
            {previousBalance !== 0 ? (
              <div className="flex items-center justify-between border border-gray-300 px-2 py-1 text-sm dark:border-gray-600">
                <span>Previous Balance</span>
                <span className="font-semibold">
                  {thousandSeparator(previousBalance)}
                </span>
              </div>
            ) : null}

            <InputElement
              id="remarks"
              value={formData.remarks}
              name="remarks"
              placeholder={'Enter Remarks'}
              label={'Enter Remarks'}
              className={''}
              list="tiles-cash-payment-remark-suggestions"
              autoComplete="off"
              onChange={handleOnChange}
              onKeyDown={handleRemarksKeyDown}
            />
            <datalist id="tiles-cash-payment-remark-suggestions">
              {remarkSuggestions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <InputElement
              id="amount"
              value={String(formData.amount)}
              name="amount"
              type="number"
              placeholder={'Enter Amount'}
              label={'Amount (Tk.)'}
              className={''}
              onChange={handleOnChange}
              onKeyDown={(e) => handleInputKeyDown(e, 'discount')}
            />
            <div>
              <InputElement
                id="discount"
                value={discount}
                name="discount"
                type="number"
                placeholder="Enter Discount"
                label="Discount (Tk.)"
                className=""
                onChange={(e) => setDiscount(e.target.value)}
                onKeyDown={(e) => handleInputKeyDown(e, 'manual_voucher_no')}
              />
              {previousBalance !== 0 ? (
                <div className="mt-0.5 text-xs text-gray-600 dark:text-gray-300">
                  <div>Current Balance = Previous Balance + Amount (Tk.) + Discount (Tk.)</div>
                  <div>
                    {thousandSeparator(previousBalance)} + {thousandSeparator(amountValue)} +{' '}
                    {thousandSeparator(discountValue)} ={' '}
                    <span className="font-semibold">{thousandSeparator(currentBalance)}</span>
                  </div>
                </div>
              ) : null}
            </div>
            <InputElement
              id="manual_voucher_no"
              value={manualVoucherNo}
              name="manual_voucher_no"
              placeholder="Enter Manual Voucher Number"
              label="Manual Voucher Number"
              className=""
              onChange={(e) => setManualVoucherNo(e.target.value)}
              onKeyDown={(e) => handleInputKeyDown(e, 'add_new_button')}
            />
            {/* কোনো Product tracked না থাকলে এটি render-ই হয় না */}
            <TrackedProductField
              value={formData.trackedProductId}
              products={trackedProducts}
              onChange={(productId) =>
                setFormData((prev) => ({ ...prev, trackedProductId: productId }))
              }
              onKeyDown={(e) => handleInputKeyDown(e, 'add_new_button')}
            />
            {/* @container: below 42rem of row the buttons show their icons alone
                (responsiveLabel), the words having been clipped in a half-width
                panel. */}
            <div className="@container grid grid-cols-1 gap-1 sm:grid-cols-3">
              {isUpdating ? (
                <ButtonLoading
                  onClick={editPaymentVoucher}
                  buttonLoading={buttonLoading}
                  label="Update"
                  responsiveLabel="lg"
                  className="whitespace-nowrap text-center mr-0 py-1.5"
                  icon={
                    <FiEdit2 className="text-white text-lg ml-2 mr-2 h-5" />
                  }
                />
              ) : (
                <ButtonLoading
                  id="add_new_button"
                  name="add_new_button"
                  onClick={handleAdd}
                  buttonLoading={buttonLoading}
                  label="Add New"
                  responsiveLabel="lg"
                  className="whitespace-nowrap text-center mr-0"
                  icon={<FiPlus className="text-lg ml-2 mr-2 h-5" />}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAdd();
                      setTimeout(() => {
                        const account = document.getElementById('account');
                        account?.focus();
                      }, 100);
                    }
                  }}
                />
              )}
              {isUpdateButton ? (
                <ButtonLoading
                  onClick={handleInvoiceUpdate}
                  buttonLoading={buttonLoading}
                  label="Update"
                  responsiveLabel="lg"
                  className="whitespace-nowrap text-center mr-0"
                  icon={<FiEdit className="text-lg ml-2 mr-2" />}
                />
              ) : (
                <ButtonLoading
                  disabled={saveButtonLoading}
                  onClick={handleCashPaymentSave}
                  buttonLoading={saveButtonLoading}
                  label={saveButtonLoading ? 'Saving...' : 'Save'}
                  responsiveLabel="lg"
                  className="whitespace-nowrap text-center mr-0"
                  icon={<FiSave className="text-lg ml-2 mr-2" />}
                />
              )}
              <ButtonLoading
                disabled={saveButtonLoading}
                onClick={handleHome}
                buttonLoading={saveButtonLoading}
                label={`Home`}
                responsiveLabel="lg"
                className="whitespace-nowrap text-center mr-0 p-2"
                icon={
                  <FiHome className="text-white text-lg ml-2  mr-2 " />
                }
              />
            </div>
          </div>
        </div>
        <div className="lg:col-span-2 overflow-x-auto lg:mt-6">
          {cashPayment.isLoading ? <Loader /> : null}
          {/* The voucher's own two figures -- what will be printed beside it and
              what the server is about to journal. */}
          {manualVoucherNo || discountValue > 0 ? (
            <div className="mb-1 flex flex-wrap gap-x-4 text-sm text-gray-700 dark:text-[rgb(var(--c-text))]">
              {manualVoucherNo ? (
                <span>
                  Manual Voucher No:{' '}
                  <span className="font-semibold">{manualVoucherNo}</span>
                </span>
              ) : null}
              {discountValue > 0 ? (
                <span>
                  Discount:{' '}
                  <span className="font-semibold">
                    {thousandSeparator(discountValue)}
                  </span>
                </span>
              ) : null}
            </div>
          ) : null}
          <table
            className={`w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400`}
          >
            <thead className="text-xs text-gray-700 uppercase bg-[rgb(var(--c-table-head))] dark:text-gray-200">
              <tr className="bg-black-700">
                <th scope="col" className={`px-2 py-2 `}>
                  {' '}
                  Description{' '}
                </th>
                <th scope="col" className={`px-2 py-2 `}>
                  {' '}
                  Remarks{' '}
                </th>
                {trackedProducts.length > 0 ? (
                  <th scope="col" className={`px-2 py-2 `}>
                    {' '}
                    Product{' '}
                  </th>
                ) : null}
                <th scope="col" className={`px-2 py-2 text-right`}>
                  {' '}
                  Amount{' '}
                </th>
                <th scope="col" className={`px-2 py-2 text-center w-20 `}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-[rgb(var(--c-table-body))] border-b dark:border-gray-700">
              {tableData.map((row) => (
                <tr
                  key={row.id}
                  className="bg-[rgb(var(--c-table-body))] border-b dark:border-gray-700"
                >
                  <td
                    className={`px-2 py-2 font-medium text-gray-900 dark:text-[rgb(var(--c-text))] `}
                  >
                    {row.accountName}
                  </td>
                  <td
                    className={`px-2 py-2 font-medium text-gray-900 dark:text-[rgb(var(--c-text))] `}
                  >
                    {row.remarks}
                  </td>
                  {trackedProducts.length > 0 ? (
                    <td
                      className={`px-2 py-2 font-medium text-gray-900 dark:text-[rgb(var(--c-text))] `}
                    >
                      {trackedProducts.find((p) => p.id === row.trackedProductId)?.name ?? ''}
                    </td>
                  ) : null}
                  <td
                    className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))] text-right `}
                  >
                    {thousandSeparator(Number(row.amount))}
                  </td>
                  <td
                    className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))] text-center w-20 `}
                  >
                    <Button
                      onClick={() => handleDelete(row.id)}
                      className="text-red-500 ml-2 text-center"
                    >
                      <FiTrash2 className="cursor-pointer text-center" />
                    </Button>

                    <Button
                      onClick={() => paymentEditItem(row.id)}
                      className="text-green-500 ml-2 text-center"
                    >
                      <FiEdit2 className="cursor-pointer text-center" />
                    </Button>
                  </td>
                </tr>
              ))}
              <tr className="bg-[rgb(var(--c-table-body))] border-b dark:border-gray-700">
                <td
                  className={`px-2 py-2 font-bold text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))] `}
                  colSpan={2}
                >
                  Payment Total
                </td>
                <td
                  className={`px-2 py-2 font-bold whitespace-nowrap dark:text-[rgb(var(--c-text))] text-right  text-gray-900`}
                >
                  {thousandSeparator(Number(totalAmount))}{' '}
                </td>
                <td
                  className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))] text-center `}
                ></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default TilesCashPayment;
