import React, { useEffect, useState } from 'react';
import InputElement from '../../../utils/fields/InputElement';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import { Button, ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import Link from '../../../utils/others/Link';
import {
  FiEdit,
  FiEdit2,
  FiHome,
  FiPlus,
  FiSave,
  FiSearch,
  FiTrash2,
} from 'react-icons/fi';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { useDispatch, useSelector } from 'react-redux';
import Loader from '../../../../common/Loader';
import { toast } from 'react-toastify';
import {
  editCashPayment,
  storeCashPayment,
  updateCashPayment,
} from './cashPaymentSlice';
import OrderDropdown from '../../../utils/utils-functions/OrderDropdown';
import InputOnly from '../../../utils/fields/InputOnly';
import useCtrlS from '../../../utils/hooks/useCtrlS';
import { useNavigate } from 'react-router-dom';
import { handleInputKeyDown } from '../../../utils/utils-functions/handleKeyDown';
import httpService from '../../../services/httpService';
import { API_CASH_RECEIVED_SUGGESTIONS_URL } from '../../../services/apiRoutes';
import useVoucherAutoEditSearch from '../../../utils/hooks/useVoucherAutoEditSearch';
import TrackedProductField from '../../product-tracking/TrackedProductField';
import { useTrackedProducts } from '../../product-tracking/useTrackedProducts';
import { hasPermission } from '../../../utils/permissionChecker';

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
}

const initialPaymentItem: PaymentItem = {
  id: '',
  mtmId: '',
  account: '',
  accountName: '',
  remarks: '',
  amount: 0, // Ensure the type matches `number` as defined in ReceivedItem
  purchaseOrderNumber: '',
  purchaseOrderText: '',
  currentProduct: undefined, // Use undefined instead of null
  trackedProductId: null,
};

const TradingCashPayment = () => {
  const dispatch = useDispatch();
  const cashPayment = useSelector((state: any) => state.cashPayment);
  const settings = useSelector((state: any) => state.settings);
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
  const navigate = useNavigate();
  const totalAmount = tableData.reduce(
    (sum, row) => sum + Number(row.amount),
    0,
  );

  const selectedLedgerOptionHandler = (option: any) => {
    const key = 'account'; // Set the desired key dynamically
    const accountName = 'accountName'; // Set the desired key dynamically
    setFormData({
      ...formData,
      [key]: option.value,
      [accountName]: option.label,
    });
  };

  const handleCashPaymentSave = async () => {
    setSaveButtonLoading(true);
    if (tableData.length === 0) {
      toast.error('Please add some transactions.');
      return;
    }
    // Update the tableData with the selected purchaseOrderNumber from formData
    const updatedTableData = tableData.map((row) => {
      // Update only rows related to the current formData if necessary
      if (row.id === formData.id) {
        return {
          ...row,
          orderNumber: formData.purchaseOrderNumber, // Assign the selected orderNumber
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
      await dispatch(storeCashPayment(tableData));
    } catch (error) {
          setSaveButtonLoading(true);
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
      purchaseOrderNumber: formData.purchaseOrderNumber,
      purchaseOrderText: formData.purchaseOrderText,
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
        purchaseOrderNumber: formData.purchaseOrderNumber,
        purchaseOrderText: formData.purchaseOrderText,
        currentProduct: null,
        trackedProductId: null,
      }); // Reset form
    }
  };

  const handleDelete = (id: number) => {
    setTableData(tableData.filter((row) => row.id !== id));
  };

  const selectedOrderOptionHandler = (option: any) => {
    setFormData((prevState) => ({
      ...prevState,
      purchaseOrderNumber: option?.value || '',
      purchaseOrderText: option?.label || '',
    }));
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
      amount: product?.amount?.toString() || prevState.amount || '', // Ensure amount is always a string
      purchaseOrderNumber:
        product?.purchaseOrderNumber || prevState.purchaseOrderNumber || '',
      purchaseOrderText:
        product?.purchaseOrderText || prevState.purchaseOrderText || '',
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
      purchaseOrderNumber: paymentVoucher.purchaseOrderNumber || '',
      purchaseOrderText: paymentVoucher.purchaseOrderText || '',
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
    }
  }, [cashPayment.data, cashPayment.isEdit]);

  const handleInvoiceUpdate = async () => {
    // Check Required fields are not empty
    // const validationMessages = validateForm(formData, invoiceMessage);
    // if (validationMessages) {
    //     toast.info(validationMessages);
    //     return;
    // }

    // if (!formData.account || formData.products.length === 0) {
    //     toast.error("Please add products information!");
    //     return;
    // }

    // Save Invoice Update
    dispatch(
      updateCashPayment(tableData, function (message) {
        if (message) {
          toast.info(message);
        }
      }),
    );
    setIsUpdateButton(false);
    setIsUpdating(false);
    setIsUpdateButton(false);
  };

  useEffect(() => {
    if (cashPayment.isEdit) {
      setIsUpdateButton(true);
    } else {
      setIsUpdateButton(false);
    }
  }, [cashPayment.isEdit]);

  const handleHome = () => {
    navigate('/dashboard');
  }


  useCtrlS(handleCashPaymentSave);
  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
        <HelmetTitle title="Cash Payment" screen="cash-payment.trading" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-2">
        <div className="col-span-1">
          <div className="grid grid-cols-1 gap-y-2">
            <div className="w-full">
              <div className="flex w-full items-end">
                {hasPermission(settings?.data?.permissions, 'cash.payment.edit') && (
                  <>
                    <div className="min-w-0 flex-1">
                      <label htmlFor="search">Search Payment</label>
                      <InputOnly
                        id="search"
                        value={search}
                        name="search"
                        placeholder="Search Payment"
                        label=""
                        className="py-1 w-full"
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    {/* No gap, and -ml-px so the two borders sit on one line --
                        the box and its button read as one control. */}
                    <ButtonLoading
                      onClick={searchTransaction}
                      buttonLoading={buttonLoading}
                      label=" "
                      className="-ml-px w-12 shrink-0 whitespace-nowrap border border-gray-600 text-center hover:border-blue-500 sm:w-20"
                      icon={<FiSearch className="text-lg ml-2" />}
                    />
                  </>
                )}
              </div>
            </div>

            <div className="relative">
              <div>
                <label htmlFor="">Select Order (Optional) </label>
                <OrderDropdown
                  onSelect={selectedOrderOptionHandler}
                  defaultValue={
                    formData.purchaseOrderNumber
                      ? {
                        value: formData.purchaseOrderNumber,
                        label:
                          formData.purchaseOrderText ||
                          String(formData.purchaseOrderNumber), //productData.accountName
                      }
                      : null
                  }
                  value={
                    formData.purchaseOrderNumber
                      ? {
                        value: formData.purchaseOrderNumber,
                        label:
                          formData.purchaseOrderText ||
                          String(formData.purchaseOrderNumber), //productData.accountName
                      }
                      : null
                  }
                />
              </div>
            </div>
            <div className="">
              <label htmlFor="">Select Account</label>
              <DdlMultiline
                id="account"
                name='account'
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
              />
            </div>

            <InputElement
              id="remarks"
              value={formData.remarks}
              name="remarks"
              placeholder={'Enter Remarks'}
              label={'Enter Remarks'}
              className={''}
              list="cash-payment-remark-suggestions"
              autoComplete="off"
              onChange={handleOnChange}
              onKeyDown={handleRemarksKeyDown}
            />
            <datalist id="cash-payment-remark-suggestions">
              {remarkSuggestions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <InputElement
              id="amount"
              value={String(formData.amount)}
              name="amount"
              placeholder={'Enter Amount'}
              label={'Amount (Tk.)'}
              type="number"
              className={''}
              onChange={handleOnChange}
              onKeyDown={(e) => handleInputKeyDown(e, 'add_new_button')} //
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
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
              {isUpdating ? (
                <ButtonLoading
                  onClick={editPaymentVoucher}
                  buttonLoading={buttonLoading}
                  label="Update"
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
                  className="whitespace-nowrap text-center mr-0"
                  icon={<FiEdit className="text-lg ml-2 mr-2" />}
                />
              ) : (
                <ButtonLoading
                  onClick={handleCashPaymentSave}
                  buttonLoading={buttonLoading}
                  // label="Save"
                  label={saveButtonLoading ? 'Saving...' : 'Save'}
                  className="whitespace-nowrap text-center mr-0"
                  icon={<FiSave className="text-lg ml-2 mr-2" />}
                />
              )}
              <ButtonLoading
                onClick={handleHome}
                label={`Home`}
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

export default TradingCashPayment;
