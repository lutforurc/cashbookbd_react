import React, { useEffect, useState } from 'react';
import InputElement from '../../../utils/fields/InputElement';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import Link from '../../../utils/others/Link';
import {
  FiEdit2,
  FiHome,
  FiPlus,
  FiRefreshCcw,
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
};

const TradingCashReceived = () => {
  const dispatch = useDispatch();
  const cashReceived = useSelector((state: any) => state.cashReceived);
  const [formData, setFormData] = useState<ReceivedItem>(initialReceivedItem);
  const settings = useSelector((s: any) => s.settings);

  const [tableData, setTableData] = useState<ReceivedItem[]>([]);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateId, setUpdateId] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [isUpdateButton, setIsUpdateButton] = useState(false);
  const [isResetOrder, setIsResetOrder] = useState(true); // State to store the search value

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
    toast.success(cashReceived.data);
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
      }); // Reset form
    }
  };

  const handleDelete = (id: number) => {
    setTableData(tableData.filter((row) => row.id !== id));
  };
  const selectedOrderOptionHandler = (option: any) => {
    const key = 'purchaseOrderNumber'; // Set the desired key dynamically
    setFormData({
      ...formData,
      [key]: option.value,
      purchaseOrderText: option.label,
    });
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
    }));
    setIsResetOrder(true);

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
    };

    // Update the specific item in the array
    const updatedTableData = tableData.map((item, index) =>
      index === updateId ? receivedItem : item,
    );

    setTableData(updatedTableData); // Update the state with the modified array
    setIsUpdating(false); // Exit update mode
    setFormData(initialReceivedItem); // Reset form data
  };

  const searchTransaction = () => {
    if (search === '') {
      toast.error('Please enter a search value.');
      return;
    }
    try {
      // Dispatch the search action
      dispatch(
        editCashReceived({ invoiceNo: search }, (message: string) => {
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

  const handleOrderReset = () => {
    setFormData((prevState) => ({
      ...prevState,
      purchaseOrderNumber: '',
      purchaseOrderText: '',
    }));
    setIsResetOrder(false);
  };
  useCtrlS(handleCashReceivedSave);
  return (
    <>
      <HelmetTitle title="Trading Cash Received" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="col-span-1">
          <div className="grid grid-cols-1 gap-y-2">
            <div className="w-full">
              <div className="relative w-full flex items-center">
                {hasPermission(
                  settings.data.permissions,
                  'cash.received.edit',
                ) && (
                  <>
                    <div className="w-full">
                      <label htmlFor="search">Search Received</label>
                      <InputOnly
                        id="search"
                        value={search}
                        name="search"
                        placeholder="Search Received"
                        label=""
                        className="py-1 w-full" // Add padding-right to account for the button
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor=""> </label>
                      <ButtonLoading
                        onClick={searchTransaction}
                        buttonLoading={buttonLoading}
                        label=" "
                        className="whitespace-nowrap text-center h-8.5 w-20 border-[1px] border-gray-600 hover:border-blue-500 right-0 top-6 absolute"
                        icon={<FiSearch className="text-white text-lg ml-2" />}
                      />
                    </div>
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
              <ButtonLoading
                onClick={handleOrderReset}
                buttonLoading={buttonLoading}
                label=" "
                className="whitespace-nowrap text-center mr-0 w-15 absolute right-0 top-6 h-9.5"
                icon={<FiRefreshCcw className="text-white text-lg" />}
              />
            </div>

            <div className="">
              <label htmlFor="">Select Account</label>
              <DdlMultiline
                id="account"
                name="account"
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
              onChange={handleOnChange}
              onKeyDown={(e) => handleInputKeyDown(e, 'amount')} //
            />
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
            <div className="grid grid-cols-3 gap-x-1 gap-y-1">
              {isUpdating ? (
                <ButtonLoading
                  onClick={editReceivedVoucher}
                  buttonLoading={buttonLoading}
                  label="Update"
                  className="whitespace-nowrap text-center mr-0 py-1.5"
                  icon={<FiEdit2 className="text-white text-lg ml-2  mr-2" />}
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
                  icon={<FiPlus className="text-white text-lg ml-2  mr-2" />}
                />
              )}

              {isUpdateButton ? (
                <ButtonLoading
                  onClick={handleInvoiceUpdate}
                  buttonLoading={buttonLoading}
                  label="Update"
                  className="whitespace-nowrap text-center mr-0"
                  icon={<FiEdit2 className="text-white text-lg ml-2  mr-2" />}
                />
              ) : (
                <ButtonLoading
                  onClick={handleCashReceivedSave}
                  buttonLoading={buttonLoading}
                  label="Save"
                  className="whitespace-nowrap text-center mr-0"
                  icon={<FiSave className="text-white text-lg ml-2  mr-2" />}
                />
              )}
              <Link to="/dashboard" className="text-nowrap justify-center mr-0">
                <FiHome className="text-white text-lg ml-2  mr-2" />
                <span className="hidden md:block">{'Home'}</span>
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-6 col-span-2 overflow-x-auto ">
          {cashReceived.isLoading ? <Loader /> : null}
          <table
            className={`w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400`}
          >
            <thead className="text-xs text-gray-700 uppercase bg-gray-300 dark:bg-gray-700 dark:text-gray-200">
              <tr className="bg-black-700">
                <th scope="col" className={`px-2 py-2 `}>
                  {' '}
                  Description{' '}
                </th>
                <th scope="col" className={`px-2 py-2 `}>
                  {' '}
                  Remarks{' '}
                </th>
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
                    className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white `}
                  >
                    {row.accountName}
                  </td>
                  <td
                    className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white `}
                  >
                    {row.remarks}
                  </td>
                  <td
                    className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-right `}
                  >
                    {thousandSeparator(Number(row.amount), 0)}
                  </td>
                  <td
                    className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-center w-20 `}
                  >
                    <button
                      onClick={() => handleDelete(row.id)}
                      className="text-red-500 ml-2 text-center"
                    >
                      <FiTrash2 className="cursor-pointer text-center" />
                    </button>

                    <button
                      onClick={() => receivedEditItem(row.id)}
                      className="text-green-500 ml-2 text-center"
                    >
                      <FiEdit2 className="cursor-pointer text-center" />
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                <td
                  className={`px-2 py-2 font-bold text-gray-900 whitespace-nowrap dark:text-white `}
                  colSpan={2}
                >
                  Received Total
                </td>
                <td
                  className={`px-2 py-2 font-bold whitespace-nowrap dark:text-white text-right  text-gray-900`}
                >
                  {thousandSeparator(Number(totalAmount), 0)}{' '}
                </td>
                <td
                  className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-center `}
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
