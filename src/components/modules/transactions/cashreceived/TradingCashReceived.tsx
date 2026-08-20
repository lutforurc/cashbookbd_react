import React, { useEffect, useState } from 'react';
import InputElement from '../../../utils/fields/InputElement';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import { Button, ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import Link from '../../../utils/others/Link';
import {
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
import OrderDropdown from '../../../utils/utils-functions/OrderDropdown';
import { validateForm } from '../../../utils/utils-functions/validationUtils';
import { validationMessage } from '../../../utils/utils-functions/validationMessage';
import InputOnly from '../../../utils/fields/InputOnly';
import { hasPermission } from '../../../utils/permissionChecker';
import {
  editCashReceived,
  storeCashReceived,
  updateCashReceived,
} from './cashReceivedSlice';
import { handleInputKeyDown } from '../../../utils/utils-functions/handleKeyDown';
import useCtrlS from '../../../utils/hooks/useCtrlS';
import { useNavigate } from 'react-router-dom';
import httpService from '../../../services/httpService';
import { API_CASH_RECEIVED_SUGGESTIONS_URL } from '../../../services/apiRoutes';
import useVoucherAutoEditSearch from '../../../utils/hooks/useVoucherAutoEditSearch';
import TrackedProductField from '../../product-tracking/TrackedProductField';
import { useTrackedProducts } from '../../product-tracking/useTrackedProducts';
import { extractVoucherNo } from '../extractVoucherNo';

const normalizeSuggestionItems = (items: any) =>
  Array.isArray(items)
    ? items
      .map((item: any) => String(item ?? '').trim())
      .filter((item: string, index: number, arr: string[]) => item && arr.indexOf(item) === index)
    : [];

interface ReceivedItem {
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

const initialReceivedItem: ReceivedItem = {
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

const TradingCashReceived = () => {
  const dispatch = useDispatch();
  const cashReceived = useSelector((state: any) => state.cashReceived);
  const [formData, setFormData] = useState<ReceivedItem>(initialReceivedItem);
  const settings = useSelector((s: any) => s.settings);
  // এই Company-তে কোনো Product tracked না থাকলে খালি তালিকা আসে এবং
  // dropdown render-ই হয় না — form তখন হুবহু আগের মতো।
  const { products: trackedProducts } = useTrackedProducts('received', undefined, false, formData.account);

  const [tableData, setTableData] = useState<ReceivedItem[]>([]);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateId, setUpdateId] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [isUpdateButton, setIsUpdateButton] = useState(false);
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

  const handleCashReceivedSave = async () => {
    if (tableData.length === 0) {
      toast.error('Please add some transactions.');
      return;
    }

    const updatedTableData = tableData.map((row) => {
      if (row.id === formData.id) {
        return {
          ...row,
          orderNumber: formData.purchaseOrderNumber,
          remarks: formData.remarks,
          amount: formData.amount,
        };
      }
      return row; // Keep other rows unchanged
    });

    // Update the state with the modified data
    setTableData(updatedTableData);

    // Dispatch the updated data to your store or API
    try {
      await dispatch(storeCashReceived(updatedTableData));
    } catch (error) {
      console.error('Error saving transactions:', error);
    }
  };

  useEffect(() => {
    // The same slice field holds two different things: the API's success
    // sentence after a save, and the voucher object loaded for editing. Only
    // the sentence has something to announce -- the object printed itself as
    // "[object Object]", and the empty initial state announced nothing at all.
    if (!cashReceived?.data) {
      return;
    }

    if (typeof cashReceived.data === 'string') {
      // The success string carries the voucher number in inconsistent
      // wording — show just the number.
      const voucherNo = extractVoucherNo(cashReceived.data);
      toast.success(voucherNo ? `Voucher No. ${voucherNo}` : cashReceived.data);
    }

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
  }, [cashReceived.data]);

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

  const handleHome = () => {
    navigate('/dashboard');
  }


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

  const receivedEditItem = (productId: number) => {
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

  const editReceivedVoucher = () => {
    if (updateId === null || updateId === undefined) {
      console.error('No product selected for update.');
      return;
    }

    let receivedVoucher = formData;

    let receivedItem: ReceivedItem = {
      id: receivedVoucher.id || Date.now(), // Keep the original ID if it exists, otherwise generate a new one
      mtmId: receivedVoucher.mtmId || '',
      account: receivedVoucher.account || '',
      accountName: receivedVoucher.accountName || '',
      remarks: receivedVoucher.remarks || '',
      amount: Number(receivedVoucher.amount) || 0,
      purchaseOrderNumber: receivedVoucher.purchaseOrderNumber || '',
      purchaseOrderText: receivedVoucher.purchaseOrderText || '',
      trackedProductId: receivedVoucher.trackedProductId ?? null,
    };

    // Update the specific item in the array
    const updatedTableData = tableData.map((item, index) =>
      index === updateId ? receivedItem : item,
    );

    setTableData(updatedTableData); // Update the state with the modified array
    setIsUpdating(false); // Exit update mode
    setFormData(initialReceivedItem); // Reset form data
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
        editCashReceived({ invoiceNo }, (message: string) => {
          if (message) {
            toast.error(message);
          }
        }),
      );

      setIsUpdating(false);
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

    if (Array.isArray(cashReceived.data)) {
      setTableData(cashReceived.data); // Update tableData only if it's an array
      setIsUpdateButton(true);
    }
  }, [cashReceived.isEdit]);

  const handleInvoiceUpdate = async () => {
    dispatch(
      updateCashReceived(tableData, function (message) {
        if (message) {
          toast.info(message);
        }
      }),
    );
    setIsUpdateButton(false);
    setIsUpdating(false);
  };

  useEffect(() => {
    if (cashReceived.isEdit) {
      setIsUpdateButton(true);
    } else {
      setIsUpdateButton(false);
    }
  }, [cashReceived.isEdit]);

  useCtrlS(handleCashReceivedSave);
  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
        <HelmetTitle title="Cash Received" screen="cash-received.trading" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="col-span-1">
          <div className="grid grid-cols-1 gap-y-2">
            <div className="w-full">
              <div className="flex w-full items-end">
                {hasPermission(
                  settings.data.permissions,
                  'cash.received.edit',
                ) && (
                    <>
                      <div className="min-w-0 flex-1">
                        <label htmlFor="search">Search Received</label>
                        <InputOnly
                          id="search"
                          value={search}
                          name="search"
                          placeholder="Search Received"
                          label=""
                          className="py-1 w-full"
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </div>
                      {/* No gap, and -ml-px so the two borders sit on one line
                          -- the box and its button read as one control. */}
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
                        label: formData.purchaseOrderText, //productData.accountName
                      }
                      : null
                  }
                  value={
                    formData.purchaseOrderNumber
                      ? {
                        value: formData.purchaseOrderNumber,
                        label: formData.purchaseOrderText, //productData.accountName
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
 name="account"
 className=""
 onSelect={selectedLedgerOptionHandler}
 value={
 formData.account
                    ? { value: formData.account, label: formData.accountName }
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
              />
            </div>

            <InputElement
              id="remarks"
              value={formData.remarks}
              name="remarks"
              placeholder={'Enter Remarks'}
              label={'Enter Remarks'}
              className={''}
              list="cash-received-remark-suggestions"
              autoComplete="off"
              onChange={handleOnChange}
              onKeyDown={handleRemarksKeyDown}
            />
            <datalist id="cash-received-remark-suggestions">
              {remarkSuggestions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <InputElement
              id="amount"
              name="amount"
              value={String(formData.amount)}
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
            <div className="grid grid-cols-3 gap-x-1 gap-y-1">
              {isUpdating ? (
                <ButtonLoading
                  onClick={editReceivedVoucher}
                  buttonLoading={buttonLoading}
                  label="Update"
                  className="whitespace-nowrap text-center mr-0 py-1.5"
                  icon={<FiEdit2 className="text-lg ml-2 mr-2" />}
                />
              ) : (
                <ButtonLoading
                  id="add_new_button"
                  name="add_new_button"
                  onClick={handleAdd}
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
                  buttonLoading={buttonLoading}
                  label="Add New"
                  className="whitespace-nowrap text-center mr-0"
                  icon={<FiPlus className="text-lg ml-2 mr-2" />}
                />
              )}

              {isUpdateButton ? (
                <ButtonLoading
                  onClick={handleInvoiceUpdate}
                  buttonLoading={buttonLoading}
                  label="Update"
                  className="whitespace-nowrap text-center mr-0"
                  icon={<FiEdit2 className="text-lg ml-2 mr-2" />}
                />
              ) : (
                <ButtonLoading
                  onClick={handleCashReceivedSave}
                  buttonLoading={buttonLoading}
                  label="Save"
                  className="whitespace-nowrap text-center mr-0"
                  icon={<FiSave className="text-lg ml-2 mr-2" />}
                />
              )}
              <ButtonLoading
                // disabled={saveButtonLoading}
                onClick={handleHome}
                // buttonLoading={saveButtonLoading}
                label={`Home`}
                className="whitespace-nowrap text-center mr-0 p-2"
                icon={
                  <FiHome className="text-white text-lg ml-2  mr-2 " />
                }
              />
            </div>
          </div>
        </div>
        <div className="mt-6 md:col-span-2 overflow-x-auto ">
          {cashReceived.isLoading ? <Loader /> : null}
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
            <tbody className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
              {tableData.map((row) => (
                <tr
                  key={row.id}
                  className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                >
                  <td
                    className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))] `}
                  >
                    {row.accountName}
                  </td>
                  <td
                    className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))] `}
                  >
                    {row.remarks}
                  </td>
                  {trackedProducts.length > 0 ? (
                    <td
                      className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))] `}
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
                      onClick={() => receivedEditItem(row.id)}
                      className="text-green-500 ml-2 text-center"
                    >
                      <FiEdit2 className="cursor-pointer text-center" />
                    </Button>
                  </td>
                </tr>
              ))}
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                <td
                  className={`px-2 py-2 font-bold text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))] `}
                  colSpan={2}
                >
                  Received Total
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

export default TradingCashReceived;
