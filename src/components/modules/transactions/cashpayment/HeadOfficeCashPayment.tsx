import React, { useEffect, useMemo, useState } from 'react';
import InputElement from '../../../utils/fields/InputElement';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
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
  editHeadOfficeCashPayment,
  storeHeadOfficeCashPayment,
  updateHeadOfficeCashPayment,
} from './cashPaymentSlice';
import InputOnly from '../../../utils/fields/InputOnly';
import { handleInputKeyDown } from '../../../utils/utils-functions/handleKeyDown';
import useCtrlS from '../../../utils/hooks/useCtrlS';
import { useNavigate } from 'react-router-dom';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import httpService from '../../../services/httpService';
import { API_CASH_RECEIVED_SUGGESTIONS_URL } from '../../../services/apiRoutes';
import useVoucherAutoEditSearch from '../../../utils/hooks/useVoucherAutoEditSearch';

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
  branchId: string;
  branchName: string;
  remarks: string;
  amount: string | number;
  currentProduct?: { [key: string]: any } | null;
}

interface PaymentMetaItem {
  key: string;
  value: string;
  label?: string;
}

const HeadOfficeCashPayment = () => {
  const dispatch = useDispatch<any>();
  const cashPayment = useSelector((state: any) => state.cashPayment);
  const currentBranch = useSelector((state: any) => state.branchList?.currentBranch);
  const branchDdlData = useSelector((state) => state.branchDdl);
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const navigate = useNavigate();

  const branchName =
    currentBranch?.branch_name ||
    currentBranch?.name ||
    currentBranch?.label ||
    'Head Office';
  const branchId = String(
    currentBranch?.id ?? currentBranch?.branch_id ?? currentBranch?.value ?? '',
  );

  const initialPaymentItem: PaymentItem = useMemo(
    () => ({
      id: '',
      mtmId: '',
      account: '',
      accountName: '',
      branchId,
      branchName,
      remarks: '',
      amount: '',
      currentProduct: undefined,
    }),
    [branchId, branchName],
  );

  const [formData, setFormData] = useState<PaymentItem>(initialPaymentItem);
  const [tableData, setTableData] = useState<PaymentItem[]>([]);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateId, setUpdateId] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [isUpdateButton, setIsUpdateButton] = useState(false);
  const [saveButtonLoading, setSaveButtonLoading] = useState(false);
  const [remarkSuggestions, setRemarkSuggestions] = useState<string[]>([]);
  const totalAmount = tableData.reduce(
    (sum, row) => sum + Number(row.amount),
    0,
  );


  useEffect(() => {
    dispatch(getDdlProtectedBranch());
  }, []);


  useEffect(() => {
    setDropdownData(branchDdlData?.protectedData?.data);
  }, [branchDdlData?.protectedData?.data]);

  useEffect(() => {
    setFormData(initialPaymentItem);
  }, [initialPaymentItem]);

  const selectedLedgerOptionHandler = (option: any) => {
    setFormData((prev) => ({
      ...prev,
      account: option?.value || '',
      accountName: option?.label || '',
    }));
  };

  const getSelectedBranchMeta = () => {
    const selectedBranch = dropdownData.find(
      (branch: any) => String(branch?.id) === String(formData.branchId || branchId),
    );

    const resolvedBranchId = String(
      selectedBranch?.id ?? formData.branchId ?? branchId ?? '',
    );
    const resolvedBranchName =
      selectedBranch?.name ||
      selectedBranch?.branch_name ||
      formData.branchName ||
      branchName;
    const resolvedMtmId = String(
      selectedBranch?.mtmId ??
        selectedBranch?.mtm_id ??
        formData.mtmId ??
        '',
    );

    return {
      resolvedBranchId,
      resolvedBranchName,
      resolvedMtmId,
    };
  };

  const buildPaymentPayload = (rows: PaymentItem[]) => {
    const { resolvedBranchId, resolvedBranchName, resolvedMtmId } =
      getSelectedBranchMeta();

    const normalizedRows = rows.map((row) => ({
      ...row,
      mtmId: row.mtmId || resolvedMtmId,
      branchId: String(row.branchId || resolvedBranchId),
      branchName: row.branchName || resolvedBranchName,
    }));

    const metas: PaymentMetaItem[] = [
      {
        key: 'project_id',
        value: resolvedBranchId,
        label: resolvedBranchName,
      },
    ];

    return {
      mtmId: resolvedMtmId,
      branchId: resolvedBranchId,
      branchName: resolvedBranchName,
      projectId: resolvedBranchId,
      projectName: resolvedBranchName,
      meta: {
        project_id: resolvedBranchId,
        project_name: resolvedBranchName,
        branch_id: resolvedBranchId,
        branch_name: resolvedBranchName,
      },
      metas,
      rows: normalizedRows,
      details: normalizedRows,
      transactions: normalizedRows,
    };
  };

  const handleCashPaymentSave = async () => {
    setSaveButtonLoading(true);
    if (tableData.length === 0) {
      toast.error('Please add some transactions.');
      setSaveButtonLoading(false);
      return;
    }

    const updatedTableData = tableData.map((row) => {
      if (row.id === formData.id) {
        return {
          ...row,
          remarks: formData.remarks,
          amount: formData.amount,
          branchId: formData.branchId,
          branchName: formData.branchName,
        };
      }
      return row;
    });

    setTableData(updatedTableData);

    try {
      await dispatch(storeHeadOfficeCashPayment(buildPaymentPayload(updatedTableData)));
    } catch (error) {
      setSaveButtonLoading(false);
      console.error('Error saving transactions:', error);
    } finally {
      setSaveButtonLoading(false);
    }
  };

  useEffect(() => {
    if (!cashPayment?.data) {
      return;
    }

    toast.success(cashPayment.data);
    setFormData((prev) => ({
      ...initialPaymentItem,
      account: prev.account,
      accountName: prev.accountName,
      branchId: prev.branchId,
      branchName: prev.branchName,
    }));
    setTableData([]);
  }, [cashPayment.data, initialPaymentItem]);

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
      setFormData((prev) => ({
        ...prev,
        id: '',
        mtmId: '',
        remarks: '',
        amount: '',
        currentProduct: null,
      }));
      return;
    }

    if (!formData.account) {
      toast.error('Please select account.');
      return;
    }

    toast.error('Please enter amount.');
  };

  const handleDelete = (id: string | number) => {
    setTableData(tableData.filter((row) => row.id !== id));
  };

  const paymentEditItem = (productId: string | number) => {
    const productIndex = tableData.findIndex((item) => item.id === productId);
    if (productIndex === -1) {
      return;
    }

    const product = tableData[productIndex];

    setFormData((prevState) => ({
      ...prevState,
      id: product?.id || prevState.id || 0,
      mtmId: product?.mtmId || prevState.mtmId || '',
      account: product?.account || prevState.account || '',
      accountName: product?.accountName || prevState.accountName || '',
      branchId: product?.branchId || prevState.branchId || branchId,
      branchName: product?.branchName || prevState.branchName || branchName,
      remarks: product?.remarks || prevState.remarks || '',
      amount: product?.amount?.toString() || prevState.amount || '',
      currentProduct: product
        ? { ...product, index: productIndex }
        : prevState.currentProduct || null,
    }));

    setIsUpdating(true);
    setUpdateId(productIndex);
  };

  const editPaymentVoucher = () => {
    if (updateId === null || updateId === undefined) {
      console.error('No product selected for update.');
      return;
    }

    const paymentItem: PaymentItem = {
      id: formData.id || Date.now(),
      mtmId: formData.mtmId || '',
      account: formData.account || '',
      accountName: formData.accountName || '',
      branchId: formData.branchId || branchId,
      branchName: formData.branchName || branchName,
      remarks: formData.remarks || '',
      amount: Number(formData.amount) || 0,
    };

    const updatedTableData = tableData.map((item, index) =>
      index === updateId ? paymentItem : item,
    );

    setTableData(updatedTableData);
    setIsUpdating(false);
    setFormData((prev) => ({
      ...initialPaymentItem,
      account: prev.account,
      accountName: prev.accountName,
      branchId: prev.branchId,
      branchName: prev.branchName,
    }));
  };

  const searchTransaction = (searchValue = search) => {
    if (searchValue === '') {
      toast.error('Please enter a search value.');
      return;
    }
    try {
      dispatch(
        editHeadOfficeCashPayment({ invoiceNo: searchValue }, (message: string) => {
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
    if (Array.isArray(cashPayment.data)) {
	      setTableData(
	        cashPayment.data.map((item: any) => ({
	          ...item,
	          mtmId: String(item?.mtmId ?? item?.mtm_id ?? ''),
	          branchId: String(item?.branchId ?? item?.branch_id ?? branchId),
	          branchName: item?.branchName || item?.branch_name || branchName,
	        })),
	      );
	      const firstItem = cashPayment.data[0];
	      if (firstItem) {
	        setFormData((prev) => ({
	          ...prev,
	          mtmId: String(firstItem?.mtmId ?? firstItem?.mtm_id ?? prev.mtmId ?? ''),
	          branchId: String(
	            firstItem?.branchId ?? firstItem?.branch_id ?? prev.branchId ?? branchId,
	          ),
	          branchName:
	            firstItem?.branchName ||
	            firstItem?.branch_name ||
	            prev.branchName ||
	            branchName,
	        }));
	      }
	      setIsUpdateButton(true);
	    }
	  }, [cashPayment.isEdit]);

  const handleInvoiceUpdate = async () => {
    try {
      setButtonLoading(true);

      await dispatch(
        updateHeadOfficeCashPayment(buildPaymentPayload(tableData), (message: string) => {
          if (message) toast.info(message);
        }),
      );

      toast.success('Invoice updated successfully!');
      setIsUpdateButton(false);
      setIsUpdating(false);
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Failed to update invoice.');
    } finally {
      setButtonLoading(false);
    }
  };

  const handleHome = () => {
    navigate('/dashboard');
  };

  useEffect(() => {
    if (cashPayment.isEdit) {
      setIsUpdateButton(true);
    } else {
      setIsUpdateButton(false);
    }
  }, [cashPayment.isEdit]);

  const handleBranchChange = (e: any) => {
    const selectedBranchId = String(e.target.value ?? '');
    const selectedBranch = dropdownData.find(
      (branch: any) => String(branch?.id) === selectedBranchId,
    );

    setFormData((prev) => ({
      ...prev,
      mtmId: String(
        selectedBranch?.mtmId ??
          selectedBranch?.mtm_id ??
          prev.mtmId ??
          '',
      ),
      branchId: selectedBranchId,
      branchName:
        selectedBranch?.name ||
        selectedBranch?.branch_name ||
        prev.branchName ||
        branchName,
    }));
  };

  useCtrlS(handleCashPaymentSave);

  return (
    <>
      <HelmetTitle title="Cash Payment" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="col-span-1">
          <div className="grid grid-cols-1 gap-y-2">
            <div className="w-full">
              <div className="relative w-full flex items-center">
                <div className="w-full">
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
              </div>
            </div>

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
                      label: formData.accountName,
                    }
                    : null
                }
                value={
                  formData.account
                    ? {
                      value: formData.account,
                      label: formData.accountName,
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

            <div>
              <div>
                {' '}
                <label htmlFor="">Select Branch</label>
              </div>
              <div className="w-full">
                {branchDdlData.isLoading == true ? <Loader /> : ''}
                <BranchDropdown
                  onChange={handleBranchChange}
                  className="w-60 font-medium text-sm p-1.5 "
                  branchDdl={dropdownData}
                  value={formData.branchId}
                />
              </div>
            </div>

            <InputElement
              id="remarks"
              value={formData.remarks}
              name="remarks"
              placeholder={'Enter Remarks'}
              label={'Enter Remarks'}
              className={''}
              list="head-office-cash-payment-remark-suggestions"
              autoComplete="off"
              onChange={handleOnChange}
              onKeyDown={handleRemarksKeyDown}
            />
            <datalist id="head-office-cash-payment-remark-suggestions">
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
              onKeyDown={(e) => handleInputKeyDown(e, 'add_new_button')}
            />
            <div className="grid grid-cols-3 gap-x-1 gap-y-1">
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
                  icon={<FiPlus className="text-white text-lg ml-2 mr-2 h-5" />}
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
                  icon={<FiEdit className="text-white text-lg ml-2  mr-2" />}
                />
              ) : (
                <ButtonLoading
                  disabled={saveButtonLoading}
                  onClick={handleCashPaymentSave}
                  buttonLoading={saveButtonLoading}
                  label={saveButtonLoading ? 'Saving...' : 'Save'}
                  className="whitespace-nowrap text-center mr-0"
                  icon={<FiSave className="text-white text-lg ml-2  mr-2" />}
                />
              )}
              <ButtonLoading
                disabled={saveButtonLoading}
                onClick={handleHome}
                buttonLoading={saveButtonLoading}
                label={`Home`}
                className="whitespace-nowrap text-center mr-0 p-2"
                icon={
                  <FiHome className="text-white text-lg ml-2  mr-2 " />
                }
              />
            </div>
          </div>
        </div>
        <div className="mt-6 col-span-2 overflow-x-auto ">
          {cashPayment.isLoading ? <Loader /> : null}
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
                  Project / Branch{' '}
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
                    {row.branchName}
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
                      onClick={() => paymentEditItem(row.id)}
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
                  colSpan={3}
                >
                  Payment Total
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

export default HeadOfficeCashPayment;
