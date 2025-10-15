import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import {
  FiEdit2,
  FiHome,
  FiPlus,
  FiSave,
  FiSearch,
  FiTrash2,
} from 'react-icons/fi';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import Link from '../../../utils/others/Link';
import { hasPermission } from '../../../utils/permissionChecker';
import { useDispatch, useSelector } from 'react-redux';
import InputOnly from '../../../utils/fields/InputOnly';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import InputElement from '../../../utils/fields/InputElement';
import { handleInputKeyDown } from '../../../utils/utils-functions/handleKeyDown';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import CategoryDropdown from '../../../utils/utils-functions/CategoryDropdown';
import { getCoal3ByCoal4 } from '../../chartofaccounts/levelthree/coal3Sliders';
import { editBankReceived, saveBankReceived } from './bankReceivedSlice';
import { toast } from 'react-toastify';
import useCtrlS from '../../../utils/hooks/useCtrlS';

interface TransactionList {
  id: string | number;
  account: string;
  accountName: string;
  remarks: string;
  amount: number | string;
}

interface ReceivedItem {
  id: string | number;
  mtmId: string;
  bankReceivedAccount: string;
  bankReceivedAccountName: string;
  receiverAccount: string;
  receiverAccountName: string;
  transactionList?: TransactionList[]; // ✅ object → array
}

const initialReceivedItem: ReceivedItem = {
  id: '',
  mtmId: '',
  bankReceivedAccount: '',
  bankReceivedAccountName: '',
  receiverAccount: '',
  receiverAccountName: '',
  transactionList: [], // ✅ object নয়, array হবে
};

const BankReceived = () => {
  const prevDataRef = useRef(null);
  const dispatch = useDispatch();
  const settings = useSelector((s: any) => s.settings);
  const coal3 = useSelector((s: any) => s.coal3);
  const bankReceived = useSelector((s: any) => s.bankReceived);
  const [search, setSearch] = useState('');
  const [buttonLoading, setButtonLoading] = useState(false);
  const [saveButtonLoading, setSaveButtonLoading] = useState(false);
  const [formData, setFormData] = useState<ReceivedItem>(initialReceivedItem);
  const [tableData, setTableData] = useState<ReceivedItem[]>([]);
  const [bankId, setBankId] = useState<number | string | null>(null);
  const [ddlBankList, setDdlBankList] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [receivedData, setReceivedData] = useState<ReceivedItem | null>(null);
  const [updateTransactionId, setUpdateTransactionId] = useState<number | null>(
    null,
  ); // ✅ নতুন: update-এর জন্য transaction ID track
    const [isUpdateButton, setIsUpdateButton] = useState(false);

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
      const response = await dispatch(
        editBankReceived({ id: search }),
      ).unwrap();

      const mapped = mapReceivedData(response);
      setReceivedData(mapped);
      setTableData([mapped]);
      setFormData({ ...mapped, transactionList: [] }); // ✅ Receiver set করুন, transactionList খালি রাখুন (fields ফাঁকা)
      setIsUpdating(false);
      setIsUpdateButton(true);

      toast.success(response?.message || 'Search successful.');

    } catch (error: any) {
      toast.error(error || 'Error searching invoice.');
      console.error('Error searching invoice:', error);
    }
  };

  const mapReceivedData = (res: any): ReceivedItem => {
    const data = res.data.data;
    const details = data.acc_transaction_master[0].acc_transaction_details;

    // ✅ শেষের object বাদ
    const filteredDetails = details.slice(0, -1);

    
    // ✅ receiverAccount হবে শেষের object
    const lastDetail = details[details.length - 1];

    return {
      id: data.id,
      mtmId: data.mtmId,
      bankReceivedAccount: lastDetail?.coa4_id?.toString() || '',
      bankReceivedAccountName: lastDetail?.coa_l4?.name || '',
      receiverAccount: '',
      receiverAccountName: '',
      transactionList: filteredDetails.map((item: any) => ({
        id: item.id,
        account: item.coa4_id,
        accountName: item.coa_l4?.name,
        remarks: item.remarks,
        amount: item.credit,
      })),
    };
  };

  // ✅ useEffect remove করুন - search-এ fields ফাঁকা রাখার জন্য, শুধু edit button-এ load হবে

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

  // ✅ নতুন: Table-এ edit button-এর জন্য function (আগে undefined ছিল)
  const receivedEditItem = useCallback(
    (id: number) => {
      // সব row থেকে transaction খুঁজুন
      const allTransactions = tableData.flatMap(
        (row) => row.transactionList || [],
      );
      const transactionToEdit = allTransactions.find(
        (t) => Number(t.id) === id,
      );

      if (transactionToEdit) {
        setFormData({
          ...formData, // receiver info রাখুন (search থেকে)
          transactionList: [transactionToEdit], // এই transaction load করুন form-এ
        });
        setUpdateTransactionId(id); // ✅ Update ID set করুন
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

  // ✅ Implement editReceivedVoucher like the example (local update)
  // ✅ Implement editReceivedVoucher like the example (local update)
  const editReceivedVoucher = () => {
    if (updateTransactionId === null || updateTransactionId === undefined) {
      console.error('No transaction selected for update.');
      return;
    }

    const [receivedVoucher] = formData.transactionList || [];

    let updatedTransaction: TransactionList = {
      id: updateTransactionId, // Keep the original ID
      account: receivedVoucher.account || '',
      accountName: receivedVoucher.accountName || '',
      remarks: receivedVoucher.remarks || '',
      amount: Number(receivedVoucher.amount) || 0,
    };

    // Update the specific transaction in tableData
    const updatedTableData = tableData
      .map((row) => ({
        ...row,
        transactionList:
          row.transactionList?.map((t) =>
            Number(t.id) === updateTransactionId ? updatedTransaction : t,
          ) || [],
      }))
      .filter((row) => row.transactionList?.length > 0); // Optional: filter empty rows

    setTableData(updatedTableData); // Update the state with the modified array
    setIsUpdating(false); // Exit update mode
    // ✅ Receiver fields preserve করুন reset-এর সময়
    setFormData({
      ...initialReceivedItem,
      bankReceivedAccount: formData.bankReceivedAccount,
      bankReceivedAccountName: formData.bankReceivedAccountName,
    }); // Reset form data but keep receiver
    setUpdateTransactionId(null); // Reset update ID
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

  const selectedReceiver = useMemo(() => {
    if (!receivedData) return null;
    return {
      id: receivedData.bankReceivedAccount.toString(),
      name: receivedData.bankReceivedAccountName.toString(),
    };
  }, [receivedData]);

  const optionsWithAll = useMemo(
    () => [
      { id: '', name: 'Select Receiver Bank Account' },
      ...(ddlBankList || []),
    ],
    [ddlBankList],
  );

  const handleSave = useCallback(async () => {
    if (saveButtonLoading) return;

    const transactions = tableData.flatMap(
      (item) => item.transactionList || [],
    );
    if (!transactions.length)
      return toast.warning('Add at least one transaction');

    setSaveButtonLoading(true);

    try {
      const payload = {
        mtmId: formData.mtmId,
        bankReceivedAccount: formData.bankReceivedAccount,
        bankReceivedAccountName: formData.bankReceivedAccountName,
        transactions,
      };

      console.log('====================================');
      console.log('payload', payload);
      console.log('====================================');

      await dispatch(saveBankReceived(payload)).unwrap();
    } catch (error: any) {
      toast.error(error?.message || 'Something went wrong while saving.');
    } finally {
      setSaveButtonLoading(false);
    }
  }, [saveButtonLoading, tableData, formData]);

  const bankReceivedAccountHandler = (option: any) => {
    setFormData({
      ...formData,
      bankReceivedAccount: option.value,
      bankReceivedAccountName: option.label,
    });
  };

  useEffect(() => {
    const latestData =
      bankReceived?.bankReceived?.slice(-1)[0]?.data?.data?.[0];
    if (!latestData) return;

    const latestId = latestData.id;
    if (prevDataRef.current === latestId) return;

    toast.success('Data saved successfully!');
    prevDataRef.current = latestId;

    setFormData((prev) => ({ ...prev, transactionList: [] }));
    setTableData([]);
  }, [bankReceived?.bankReceived?.length]); // only depend on length

  useEffect(() => {
    if (bankReceived?.error) {
      toast.error(bankReceived.error);
    }
  }, [bankReceived.error]);

  useCtrlS(handleSave);
  return (
    <>
      <HelmetTitle title="Bank Received" />
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
                  onChange={bankReceivedAccountHandler}
                  className={`w-full font-medium text-sm ${formData.mtmId && '!border !border-red-800'}`}
                  categoryDdl={optionsWithAll}
                  value={selectedReceiver}
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
                  onClick={editReceivedVoucher}
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
                  label="Add New"
                  className="whitespace-nowrap text-center mr-0"
                  icon={
                    <FiPlus className="text-white text-lg ml-2 mr-2 hidden xl:block" />
                  }
                />
              )}

              { isUpdateButton ? (
                <ButtonLoading
                  // onClick={handleInvoiceUpdate}
                  // buttonLoading={buttonLoading}
                  label="Update"
                  className="whitespace-nowrap text-center mr-0"
                  icon={
                    <FiEdit2 className="text-white text-lg ml-2  mr-2 hidden xl:block" />
                  }
                />
              ) : (
                <ButtonLoading
                  disabled={saveButtonLoading}
                  onClick={handleSave}
                  buttonLoading={saveButtonLoading}
                  label="Save"
                  className="whitespace-nowrap text-center mr-0"
                  icon={
                    <FiSave className="text-white text-lg ml-2  mr-2 hidden xl:block" />
                  }
                />
              )}
              <Link to="/dashboard" className="text-nowrap justify-center mr-0">
                <FiHome className="text-white text-lg ml-2  mr-2 hidden xl:block" />
                <span className="">{'Home'}</span>
              </Link>
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
                      {t.amount}
                    </td>
                    <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-center w-20">
                      <button
                        onClick={() => handleDelete(Number(t.id))}
                        className="text-red-500 ml-2 text-center"
                      >
                        <FiTrash2 className="cursor-pointer text-center" />
                      </button>

                      <button
                        onClick={() => receivedEditItem(Number(t.id))}
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

export default BankReceived;
