import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import { FiEdit2, FiHome, FiPlus, FiSave, FiSearch, FiTrash2 } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { getCoal3ByCoal4 } from '../../chartofaccounts/levelthree/coal3Sliders';
import useCtrlS from '../../../utils/hooks/useCtrlS';
import { hasPermission } from '../../../utils/permissionChecker';
import Loader from '../../../../common/Loader';
import InputOnly from '../../../utils/fields/InputOnly';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import CategoryDropdown from '../../../utils/utils-functions/CategoryDropdown';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import InputElement from '../../../utils/fields/InputElement';
import { handleInputKeyDown } from '../../../utils/utils-functions/handleKeyDown';
import Link from '../../../utils/others/Link';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { toast } from 'react-toastify';
import { editBankPayment, saveBankPayment, updateBankPayment } from './bankPaymentSlice';
import { useNavigate } from 'react-router-dom';

interface TransactionList {
  id: string | number;
  account: string;
  accountName: string;
  remarks: string;
  amount: number | string;
}


interface PaymentItem {
  id: string | number;
  mtmId: string;
  bankPaymentAccount: string;
  bankPaymentAccountName: string;
  paymentAccount: string;
  paymentAccountName: string;
  transactionList?: TransactionList[]; // ✅ object → array
}

const initialPaymentItem: PaymentItem = {
  id: '',
  mtmId: '',
  bankPaymentAccount: '',
  bankPaymentAccountName: '',
  paymentAccount: '',
  paymentAccountName: '',
  transactionList: [],
};

const BankPayment = () => {
  const prevDataRef = useRef(null);
  const dispatch = useDispatch();
  const settings = useSelector((s: any) => s.settings);
  const coal3 = useSelector((s: any) => s.coal3);
  const bankPayment = useSelector((s: any) => s.bankPayment);
  const [search, setSearch] = useState('');
  const [buttonLoading, setButtonLoading] = useState(false);
  const [saveButtonLoading, setSaveButtonLoading] = useState(false);
  const [updatingLoading, setUpdatingLoading] = useState(false);
  const [formData, setFormData] = useState<PaymentItem>(initialPaymentItem);
  const [tableData, setTableData] = useState<PaymentItem[]>([]);
  const [bankId, setBankId] = useState<number | string | null>(null);
  const [ddlBankList, setDdlBankList] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentItem | null>(null);
  const [isLoading, setIsLoading] = useState(false); // ✅ new
  const searchingRef = useRef(false); // ✅ guard against concurrent searches
  const [updateTransactionId, setUpdateTransactionId] = useState<number | null>(
    null,
  );
  const [isUpdateButton, setIsUpdateButton] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    dispatch(getCoal3ByCoal4(2));
  }, []);

  useEffect(() => {
    if (Array.isArray(coal3?.coal4)) {
      setDdlBankList(coal3?.coal4 || []);
      setBankId(coal3?.coal4[0]?.id ?? null);
    }
  }, [coal3]);



  const transactionAccountHandler = (option: any) => {
    const currentTransaction = formData.transactionList?.[0];
    setFormData({
      ...formData,
      transactionList: [
        {
          id: currentTransaction?.id || Date.now(),
          account: option.value,
          accountName: option.label,
          remarks: currentTransaction?.remarks || '',
          amount: currentTransaction?.amount || 0,
        },
      ],
    });
  };


  const searchTransaction = async () => {
    if (search === '') {
      toast.error('Please enter a search value.');
      return;
    }

    try {
      searchingRef.current = true;
      setIsLoading(true);
      const response = await dispatch(editBankPayment({ id: search })).unwrap();

      const mapped = mapReceivedData(response);
      setPaymentData(mapped);
      setTableData([mapped]);
      setFormData({ ...mapped, transactionList: [] }); // ✅ Payment set করুন, transactionList খালি রাখুন (fields ফাঁকা)
      setIsUpdating(false);
      setIsUpdateButton(true);

      toast.success(response?.message || 'Search successful.');

    } catch (error: any) {
      setIsUpdateButton(false);
      setPaymentData(null);
      toast.error(error?.message || 'Error searching invoice.');
      console.error('Error searching invoice:', error);
    } finally {
      setIsLoading(false);   // ✅ hide Loader
      searchingRef.current = false;
    }
  };


  const mapPaymentData = (res: any): PaymentItem => {
    const data = res.data.data;
    const details = data.acc_transaction_master[0].acc_transaction_details;


    const filteredDetails = details.slice(0, -1);


    const lastDetail = details[details.length - 1];

    return {
      id: data.id,
      mtmId: data.mtmId,
      bankPaymentAccount: lastDetail?.coa4_id?.toString() || '',
      bankPaymentAccountName: lastDetail?.coa_l4?.name || '',
      paymentAccount: '',
      paymentAccountName: '',
      transactionList: filteredDetails.map((item: any) => ({
        id: item.id,
        account: item.coa4_id,
        accountName: item.coa_l4?.name,
        remarks: item.remarks,
        amount: item.credit,
      })),
    };
  };


  const handleAdd = () => {
    const [transaction] = formData.transactionList || [];
    if (!transaction?.account || !transaction?.amount) {
      toast.warning('Please select account and enter amount');
      return;
    }

    const newTransaction = { ...transaction, id: Date.now() };

    setTableData((prev) => [
      ...prev,
      { ...formData, transactionList: [newTransaction], id: newTransaction.id },
    ]);

    setFormData((prev) => ({ ...prev, transactionList: [] }));

    setTimeout(() => document.getElementById('account')?.focus(), 100);
  };

  const handleDelete = (id: number) => {
    setTableData((prev) =>
      prev
        .map((row) => ({
          ...row,
          transactionList: row.transactionList?.filter((t) => t.id !== id),
        }))
        .filter((row) => row.transactionList?.length),
    );
  };


  const paymentEditItem = useCallback(
    (id: number) => {
      const allTransactions = tableData.flatMap(
        (row) => row.transactionList || [],
      );
      const transactionToEdit = allTransactions.find(
        (t) => Number(t.id) === id,
      );

      if (transactionToEdit) {
        setFormData({
          ...formData,
          transactionList: [transactionToEdit],
        });
        setUpdateTransactionId(id);
        setTimeout(() => document.getElementById('account')?.focus(), 100); // Optional: focus account-এ
        setIsUpdating(true); // Update mode on
        toast.info('Transaction loaded for editing.'); // Optional: user feedback
      } else {
        setIsUpdating(false); // Update mode off
        toast.warning('Transaction not found.');
      }
    },
    [tableData, formData],
  );

  // ✅ Implement editPaymentVoucher like the example (local update)

  const editPaymentVoucher = () => {
    if (updateTransactionId == null) {
      console.error('No transaction selected for update.');
      return;
    }


    const paymentVoucher = formData.transactionList?.[0];
    if (!paymentVoucher) {
      toast.warning('No transaction data in form.');
      return;
    }

    const currentLine =
      tableData
        .flatMap(r => r.transactionList ?? [])
        .find(t => String(t.id) === String(updateTransactionId));

    if (!currentLine) {
      console.error('Transaction not found in tableData.');
      return;
    }

    const updatedTransaction: TransactionList = {
      ...currentLine,
      id: currentLine.id, // original id keep
      account: paymentVoucher.account || '',
      accountName: paymentVoucher.accountName || '',
      remarks: paymentVoucher.remarks || '',
      amount: Number(paymentVoucher.amount) || 0,
    };


    const updatedTableData = tableData
      .map(row => ({
        ...row,
        transactionList: (row.transactionList ?? []).map(t =>
          String(t.id) === String(updateTransactionId) ? updatedTransaction : t
        ),
      }))
      .filter(row => (row.transactionList?.length ?? 0) > 0);

    setTableData(updatedTableData);
    setIsUpdating(false);

    // ✅ Reset: header-এর id/mtmId/receiver
    setFormData(prev => ({
      ...initialPaymentItem,
      id: prev?.id as any,
      mtmId: prev?.mtmId as any,
      bankPaymentAccount: prev?.bankPaymentAccount,
      bankPaymentAccountName: prev?.bankPaymentAccountName,
    }));

    setUpdateTransactionId(null);
    toast.success('Transaction updated successfully!');
  };

  const totalAmount = useMemo(
    () =>
      tableData.reduce(
        (sum, row) =>
          sum +
          (row.transactionList?.reduce(
            (s, t) => s + Number(t.amount || 0),
            0,
          ) || 0),
        0,
      ),
    [tableData],
  );

  const selectedPayment = useMemo(() => {
    if (!paymentData) return null;
    return {
      id: paymentData.bankPaymentAccount.toString(),
      name: paymentData.bankPaymentAccountName.toString(),
    };
  }, [paymentData]);

  const optionsWithAll = useMemo(
    () => [{ id: '', name: 'Select Payment Bank Account' }, ...((ddlBankList ?? []) as any[])],
    [ddlBankList]
  );

  const handleSave = useCallback(async () => {

    if (saveButtonLoading) return;

    const transactions = tableData.flatMap(
      (item) => item.transactionList || [],
    );
    if (!transactions.length)
      return toast.warning('Add at least one transaction');

    setIsLoading(true);
    setSaveButtonLoading(true);

    try {
      const payload = {
        mtmId: formData.mtmId,
        bankPaymentAccount: formData.bankPaymentAccount,
        bankPaymentAccountName: formData.bankPaymentAccountName,
        transactions,
      };
      const response = await dispatch(saveBankPayment(payload)).unwrap();

      // server sample:
      const voucherText = response?.data?.data?.[0];

      if (voucherText) {
        // Use a stable toastId so it can't render twice for the same save
        toast.success(voucherText, { toastId: `bank-payment-success-${voucherText}` });
      }

      // ✅ Clear table
      setTableData([]);

      // ✅ Reset form but keep account fields
      setFormData({
        ...initialPaymentItem,
        bankPaymentAccount: formData.bankPaymentAccount,
        bankPaymentAccountName: formData.bankPaymentAccountName,
      });

    } catch (error: any) {
      toast.error(error?.message || 'Something went wrong while saving.');
    } finally {
      setSaveButtonLoading(false);
      setIsLoading(false);
    }
  }, [saveButtonLoading, tableData, formData]);

  const bankPaymentAccountHandler = (option: any) => {
    setFormData({
      ...formData,
      bankPaymentAccount: option.value,
      bankPaymentAccountName: option.label,
    });
  };


  useEffect(() => {
    if (bankPayment?.error) {
      toast.error(bankPayment.error);
    }
  }, [bankPayment?.error]);

  const handleBankPaymentUpdate = async () => {

    setUpdatingLoading(true);
    setIsLoading(true);

    // ✅ Validation
    const transactions = tableData.flatMap((item) => item.transactionList || []);
    if (!transactions.length) {
      toast.warning('No transactions to update.');
      setUpdatingLoading(false);
      return;
    }

    if (!formData.bankPaymentAccount) {
      toast.warning('Please select Receiver Bank Account.');
      setUpdatingLoading(false);
      return;
    }

    try {
      const payload = {
        id: formData.id,
        mtmId: formData.mtmId,
        bankPaymentAccount: formData.bankPaymentAccount,
        bankPaymentAccountName: formData.bankPaymentAccountName,
        transactions: transactions.map((t) => ({
          id: t.id,
          account: t.account,
          accountName: t.accountName,
          remarks: t.remarks,
          amount: Number(t.amount),
        })),
      };


      // ✅ API call or redux dispatch
      const response = await dispatch(updateBankPayment(payload)).unwrap();


      // server sample:
      const voucherText = response?.data?.data?.[0];

      if (voucherText) {
        // Use a stable toastId so it can't render twice for the same save
        toast.success(voucherText, { toastId: `bank-received-success-${voucherText}` });
      }
      setTableData([]); // table clear
      setFormData((prev) => ({
        ...initialPaymentItem,
        bankPaymentAccount: prev.bankPaymentAccount,
        bankPaymentAccountName: prev.bankPaymentAccountName,
      }));
      setIsUpdateButton(false); // update close button 
      setPaymentData(null);

    } catch (error: any) {
      console.error('❌ Error updating transaction:', error);
      toast.error(error?.message || 'Failed to update transaction.');
    } finally {
      setIsLoading(false);
      setUpdatingLoading(false);
    }
  };

  const handleHome = () => {
    navigate('/dashboard');
  }

  // useCtrlS(handleSave);
  useCtrlS(() => {
    if (isUpdateButton) return handleBankPaymentUpdate();
    return handleSave();
  });


  return (
    <>
      <HelmetTitle title="Bank Payment" />
      {/* <span className="text-2xl font-bold text-red-500 text-center block">(Not Ready)</span> */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {isLoading && <Loader />}
        <div className="col-span-1">
          <div className="grid grid-cols-1 gap-y-2">
            <div className="w-full">
              <div className="relative w-full flex items-center">
                {hasPermission(
                  settings.data.permissions,
                  'cash.received.edit',
                ) && (
                    <>
                      <div className="w-full mb-4">
                        <label htmlFor="search">
                          Search Bank Received Voucher
                        </label>
                        <InputOnly
                          id="search"
                          value={search}
                          name="search"
                          placeholder="Search Bank Received Voucher"
                          label=""
                          className="py-1 w-full" // Add padding-right to account for the button
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </div>
                      <div className="">
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

              <div className="">
                <label htmlFor="">Bank Received Account</label>
                <CategoryDropdown
                  onChange={bankPaymentAccountHandler}
                  className={`w-full font-medium text-sm ${formData.mtmId && '!border !border-red-800'}`}
                  categoryDdl={optionsWithAll}
                  value={selectedPayment}
                />
              </div>
              <div className="mt-6">
                <label htmlFor="">Select Transaction Account</label>
                <DdlMultiline
                  id="account"
                  name="account"
                  placeholder="Select Transaction Account"
                  onSelect={transactionAccountHandler} // ✅ পুরোনো handler বাদ
                  value={
                    formData.transactionList &&
                      formData.transactionList[0]?.account
                      ? {
                        value: formData.transactionList[0].account,
                        label: formData.transactionList[0].accountName,
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
                />
              </div>

              <InputElement
                id="remarks"
                value={formData.transactionList?.[0]?.remarks || ''}
                name="remarks"
                placeholder={'Enter Remarks'}
                label={'Enter Remarks'}
                className={''}
                onChange={(e) => {
                  const current = formData.transactionList?.[0] || {
                    id: Date.now(),
                    account: '',
                    accountName: '',
                    remarks: '',
                    amount: 0,
                  };
                  const updated = { ...current, remarks: e.target.value };
                  setFormData({
                    ...formData,
                    transactionList: [updated],
                  });
                }}
                onKeyDown={(e) => handleInputKeyDown(e, 'amount')}
              />
              <InputElement
                id="amount"
                value={String(formData.transactionList?.[0]?.amount || '')}
                name="amount"
                type="number"
                placeholder="Enter Amount"
                label="Amount (Tk.)"
                onChange={(e) => {
                  const current = formData.transactionList?.[0] || {
                    id: Date.now(),
                    account: '',
                    accountName: '',
                    remarks: '',
                    amount: 0,
                  };
                  const updated = { ...current, amount: e.target.value };
                  setFormData({
                    ...formData,
                    transactionList: [updated],
                  });
                }}
                onKeyDown={(e) => handleInputKeyDown(e, 'add_new_button')}
              />
            </div>

            <div className="grid grid-cols-3 gap-x-1 gap-y-1">
              {isUpdating ? (
                <ButtonLoading
                  onClick={editPaymentVoucher}
                  label="Update"
                  className="whitespace-nowrap text-center mr-0"
                  icon={<FiEdit2 className="text-white text-lg ml-2 mr-2" />}
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
                  label={buttonLoading ? 'Loading...' : 'Add New'}
                  className="whitespace-nowrap text-center mr-0"
                  icon={
                    <FiPlus className="text-white text-lg ml-2 mr-2 " />
                  }
                />
              )}

              {isUpdateButton ? (
                <ButtonLoading
                  onClick={handleBankPaymentUpdate}
                  buttonLoading={updatingLoading}
                  label={updatingLoading ? 'Updating...' : 'Update'}
                  className="whitespace-nowrap text-center mr-0"
                  icon={
                    <FiEdit2 className="text-white text-lg ml-2  mr-2 " />
                  }
                />
              ) : (
                <ButtonLoading
                  disabled={saveButtonLoading}
                  onClick={handleSave}
                  buttonLoading={saveButtonLoading}
                  label={saveButtonLoading ? 'Saving...' : 'Save'}
                  className="whitespace-nowrap text-center mr-0"
                  icon={
                    <FiSave className="text-white text-lg ml-2  mr-2 " />
                  }
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
          {/* {cashReceived.isLoading ? <Loader /> : null} */}
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
              {tableData.map((row) =>
                row.transactionList?.map((t) => (
                  <tr
                    key={t.id}
                    className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                  >
                    <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                      {t.accountName}
                    </td>
                    <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                      {t.remarks}
                    </td>
                    <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-right">
                      {thousandSeparator(Number(t.amount), 0)}
                    </td>
                    <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-center w-20">
                      <button
                        onClick={() => handleDelete(Number(t.id))}
                        className="text-red-500 ml-2 text-center"
                      >
                        <FiTrash2 className="cursor-pointer text-center" />
                      </button>

                      <button
                        onClick={() => paymentEditItem(Number(t.id))}
                        className="text-green-500 ml-2 text-center"
                      >
                        <FiEdit2 className="cursor-pointer text-center" />
                      </button>
                    </td>
                  </tr>
                )),
              )}

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

export default BankPayment;
