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
import { Button, ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
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
import { editBankReceived, saveBankReceived, updateBankReceived } from './bankReceivedSlice';
import { toast } from 'react-toastify';
import useCtrlS from '../../../utils/hooks/useCtrlS';
import Loader from '../../../../common/Loader';
import { Navigate, useNavigate } from 'react-router-dom';
import TrackedProductField from '../../product-tracking/TrackedProductField';
import { useTrackedProducts } from '../../product-tracking/useTrackedProducts';

interface TransactionList {
  id: string | number;
  account: string;
  accountName: string;
  remarks: string;
  amount: number | string;
  // Which tracked product this row's money is against. It never reaches the
  // legacy transaction tables -- only transaction_product_maps. It lives on the
  // row rather than the header because the backend matches products to rows by
  // their position in the posted `transactions` array.
  trackedProductId?: number | null;
}

interface ReceivedItem {
  id: string | number;
  mtmId: string;
  bankReceivedAccount: string;
  bankReceivedAccountName: string;
  receiverAccount: string;
  receiverAccountName: string;
  transactionList?: TransactionList[]; // âœ… object â†’ array
}

const initialReceivedItem: ReceivedItem = {
  id: '',
  mtmId: '',
  bankReceivedAccount: '',
  bankReceivedAccountName: '',
  receiverAccount: '',
  receiverAccountName: '',
  transactionList: [],
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
  const [updatingLoading, setUpdatingLoading] = useState(false);
  const [formData, setFormData] = useState<ReceivedItem>(initialReceivedItem);
  // Tracking is per party, so the list follows the selected transaction account
  // -- not `bankReceivedAccount`, which is the bank ledger and never a party.
  // With no product tracked for this company the list comes back empty and the
  // dropdown does not render at all, so the form stays exactly as it was.
  const { products: trackedProducts } = useTrackedProducts(
    'received',
    undefined,
    false,
    formData.transactionList?.[0]?.account,
  );
  const [tableData, setTableData] = useState<ReceivedItem[]>([]);
  const [bankId, setBankId] = useState<number | string | null>(null);
  const [ddlBankList, setDdlBankList] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [receivedData, setReceivedData] = useState<ReceivedItem | null>(null);
  const [isLoading, setIsLoading] = useState(false); // âœ… new
  const searchingRef = useRef(false); // âœ… guard against concurrent searches
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
    // A product is configured against a particular party, so one picked for the
    // previous account is not necessarily offered for this one. Carrying it over
    // would leave the dropdown looking empty while the old id was still posted,
    // and the API answers that by rolling back the whole voucher. Keep the
    // selection only while the account itself has not changed.
    const isSameAccount =
      String(currentTransaction?.account ?? '') === String(option.value ?? '');

    setFormData({
      ...formData,
      transactionList: [
        {
          id: currentTransaction?.id || Date.now(),
          account: option.value,
          accountName: option.label,
          remarks: currentTransaction?.remarks || '',
          amount: currentTransaction?.amount || 0,
          trackedProductId: isSameAccount
            ? currentTransaction?.trackedProductId ?? null
            : null,
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
      const response = await dispatch(editBankReceived({ id: search })).unwrap();

      const mapped = mapReceivedData(response);
      setReceivedData(mapped);
      setTableData([mapped]);
      setFormData({ ...mapped, transactionList: [] }); // âœ… Receiver set à¦•à¦°à§à¦¨, transactionList à¦–à¦¾à¦²à¦¿ à¦°à¦¾à¦–à§à¦¨ (fields à¦«à¦¾à¦à¦•à¦¾)
      setIsUpdating(false);
      setIsUpdateButton(true);

      toast.success(response?.message || 'Search successful.');

    } catch (error: any) {
      setIsUpdateButton(false);
      setReceivedData(null);
      toast.error(error?.message || 'Error searching invoice.');
      console.error('Error searching invoice:', error);
    } finally {
      setIsLoading(false);   // âœ… hide Loader
      searchingRef.current = false;
    }
  };



  const mapReceivedData = (res: any): ReceivedItem => {
    const data = res.data.data;
    const details = data.acc_transaction_master[0].acc_transaction_details;


    const filteredDetails = details.slice(0, -1);


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
        // The bank contra row is written last and carries no product, which is
        // why slicing it off above keeps these rows in the order the mapping
        // was saved in.
        trackedProductId: item.trackedProductId ?? null,
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


  const receivedEditItem = useCallback(
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
        setTimeout(() => document.getElementById('account')?.focus(), 100); // Optional: focus account-à¦
        setIsUpdating(true); // Update mode on
        toast.info('Transaction loaded for editing.'); // Optional: user feedback
      } else {
        setIsUpdating(false); // Update mode off
        toast.warning('Transaction not found.');
      }
    },
    [tableData, formData],
  );

  // âœ… Implement editReceivedVoucher like the example (local update)

  const editReceivedVoucher = () => {
    if (updateTransactionId == null) {
      console.error('No transaction selected for update.');
      return;
    }


    const receivedVoucher = formData.transactionList?.[0];
    if (!receivedVoucher) {
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
      account: receivedVoucher.account || '',
      accountName: receivedVoucher.accountName || '',
      remarks: receivedVoucher.remarks || '',
      amount: Number(receivedVoucher.amount) || 0,
      // Without this line the spread above would keep the row's old product and
      // quietly discard the one just chosen in the form.
      trackedProductId: receivedVoucher.trackedProductId ?? null,
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

    // âœ… Reset: header-à¦à¦° id/mtmId/receiver
    setFormData(prev => ({
      ...initialReceivedItem,
      id: prev?.id as any,
      mtmId: prev?.mtmId as any,
      bankReceivedAccount: prev?.bankReceivedAccount,
      bankReceivedAccountName: prev?.bankReceivedAccountName,
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

  const selectedReceiver = useMemo(() => {
    if (!receivedData) return null;
    return {
      id: receivedData.bankReceivedAccount.toString(),
      name: receivedData.bankReceivedAccountName.toString(),
    };
  }, [receivedData]);

  const optionsWithAll = useMemo(
    () => [{ id: '', name: 'Select Receiver Bank Account' }, ...((ddlBankList ?? []) as any[])],
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
        bankReceivedAccount: formData.bankReceivedAccount,
        bankReceivedAccountName: formData.bankReceivedAccountName,
        transactions,
      };
      const response = await dispatch(saveBankReceived(payload)).unwrap();

      // server sample:
      const voucherText = response?.data?.data?.[0];

      if (voucherText) {
        // Use a stable toastId so it can't render twice for the same save
        toast.success(voucherText, { toastId: `bank-received-success-${voucherText}` });
      }


      // âœ… Clear table
      setTableData([]);

      // âœ… Reset form but keep account fields
      setFormData({
        ...initialReceivedItem,
        bankReceivedAccount: formData.bankReceivedAccount,
        bankReceivedAccountName: formData.bankReceivedAccountName,
      });

    } catch (error: any) {
      toast.error(error?.message || 'Something went wrong while saving.');
    } finally {
      setSaveButtonLoading(false);
      setIsLoading(false);
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
    if (bankReceived?.error) {
      toast.error(bankReceived.error);
    }
  }, [bankReceived.error]);

  const handleBankReceivedUpdate = async () => {

    setUpdatingLoading(true);
    setIsLoading(true);

    // âœ… Validation
    const transactions = tableData.flatMap((item) => item.transactionList || []);
    if (!transactions.length) {
      toast.warning('No transactions to update.');
      setUpdatingLoading(false);
      return;
    }

    if (!formData.bankReceivedAccount) {
      toast.warning('Please select Receiver Bank Account.');
      setUpdatingLoading(false);
      return;
    }

    try {
      const payload = {
        id: formData.id,
        mtmId: formData.mtmId,
        bankReceivedAccount: formData.bankReceivedAccount,
        bankReceivedAccountName: formData.bankReceivedAccountName,
        // This projection lists every key it sends, and an update rewrites the
        // voucher's product mappings from scratch. Dropping trackedProductId
        // here would not leave the saved product alone -- it would erase it.
        transactions: transactions.map((t) => ({
          id: t.id,
          account: t.account,
          accountName: t.accountName,
          remarks: t.remarks,
          amount: Number(t.amount),
          trackedProductId: t.trackedProductId ?? null,
        })),
      };


      // âœ… API call or redux dispatch
      const response = await dispatch(updateBankReceived(payload)).unwrap();


      // server sample:
      const voucherText = response?.data?.data?.[0];

      if (voucherText) {
        // Use a stable toastId so it can't render twice for the same save
        toast.success(voucherText, { toastId: `bank-received-success-${voucherText}` });
      }
      setTableData([]); // table clear
      setFormData((prev) => ({
        ...initialReceivedItem,
        bankReceivedAccount: prev.bankReceivedAccount,
        bankReceivedAccountName: prev.bankReceivedAccountName,
      }));
      setIsUpdateButton(false); // update close button 
      setReceivedData(null);

    } catch (error: any) {
      console.error('âŒ Error updating transaction:', error);
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
    if (isUpdateButton) return handleBankReceivedUpdate();
    return handleSave();
  });


  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
        <HelmetTitle title="Bank Received" screen="bank-received" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {isLoading && <Loader />}
        <div className="col-span-1">
          <div className="grid grid-cols-1 gap-y-2">
            {/* space-y-2 so these three sit the same distance apart as the
                fields below them, which the grid spaces. They used to carry
                their own mb-4 / mt-6 and drifted out of step with the form. */}
            <div className="w-full space-y-2">
              <div className="flex w-full items-end">
                {hasPermission(
                  settings.data.permissions,
                  'cash.received.edit',
                ) && (
                    <>
                      <div className="min-w-0 flex-1">
                        <label htmlFor="search">
                          Search Bank Received Voucher
                        </label>
                        <InputOnly
                          id="search"
                          value={search}
                          name="search"
                          placeholder="Search Bank Received Voucher"
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

              <div className="">
                <label htmlFor="">Bank Received Account</label>
                <CategoryDropdown
                  onChange={bankReceivedAccountHandler}
                  className={`w-full font-medium text-sm ${formData.mtmId && 'border! border-red-800!'}`}
                  categoryDdl={optionsWithAll}
                  value={selectedReceiver}
                />
              </div>
              <div>
                <label htmlFor="">Select Transaction Account</label>
                <DdlMultiline
 id="account"
 name="account"
 className=""
 placeholder="Select Transaction Account"
 onSelect={transactionAccountHandler} // âœ… à¦ªà§à¦°à§‹à¦¨à§‹ handler à¦¬à¦¾à¦¦
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
                    trackedProductId: null,
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
                    trackedProductId: null,
                  };
                  const updated = { ...current, amount: e.target.value };
                  setFormData({
                    ...formData,
                    transactionList: [updated],
                  });
                }}
                onKeyDown={(e) => handleInputKeyDown(e, 'add_new_button')}
              />
              {/* Renders nothing when no product is tracked, so the form stays
                  exactly as it was. The value sits one level down here, on the
                  transaction row, so the change rebuilds that row rather than
                  writing onto the header. */}
              <TrackedProductField
                value={formData.transactionList?.[0]?.trackedProductId}
                products={trackedProducts}
                onChange={(productId) =>
                  setFormData((prev) => {
                    const current = prev.transactionList?.[0] || {
                      id: Date.now(),
                      account: '',
                      accountName: '',
                      remarks: '',
                      amount: 0,
                      trackedProductId: null,
                    };
                    return {
                      ...prev,
                      transactionList: [
                        { ...current, trackedProductId: productId },
                      ],
                    };
                  })
                }
                onKeyDown={(e) => handleInputKeyDown(e, 'add_new_button')}
              />
            </div>

            <div className="grid grid-cols-3 gap-x-1 gap-y-1">
              {isUpdating ? (
                <ButtonLoading
                  onClick={editReceivedVoucher}
                  label="Update"
                  className="whitespace-nowrap text-center mr-0 p-2"
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
                  label={buttonLoading ? 'Loading...' : 'Add New'}
                  className="whitespace-nowrap text-center mr-0 p-2"
                  icon={
                    <FiPlus className="text-white text-lg ml-2 mr-2 " />
                  }
                />
              )}

              {isUpdateButton ? (
                <ButtonLoading
                  onClick={handleBankReceivedUpdate}
                  buttonLoading={updatingLoading}
                  label={updatingLoading ? 'Updating...' : 'Update'}
                  className="whitespace-nowrap text-center mr-0 p-2"
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
                  className="whitespace-nowrap text-center mr-0 p-2"
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
                    {trackedProducts.length > 0 ? (
                      <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                        {trackedProducts.find((p) => p.id === t.trackedProductId)
                          ?.name ?? ''}
                      </td>
                    ) : null}
                    <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-right">
                      {t.amount}
                    </td>
                    <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-center w-20">
                      <Button
                        onClick={() => handleDelete(Number(t.id))}
                        className="text-red-500 ml-2 text-center"
                      >
                        <FiTrash2 className="cursor-pointer text-center" />
                      </Button>

                      <Button
                        onClick={() => receivedEditItem(Number(t.id))}
                        className="text-green-500 ml-2 text-center"
                      >
                        <FiEdit2 className="cursor-pointer text-center" />
                      </Button>
                    </td>
                  </tr>
                )),
              )}

              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                <td
                  className={`px-2 py-2 font-bold text-gray-900 whitespace-nowrap dark:text-white `}
                  colSpan={trackedProducts.length > 0 ? 3 : 2}
                >
                  Received Total
                </td>
                <td
                  className={`px-2 py-2 font-bold whitespace-nowrap dark:text-white text-right  text-gray-900`}
                >
                  {thousandSeparator(Number(totalAmount))}{' '}
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
