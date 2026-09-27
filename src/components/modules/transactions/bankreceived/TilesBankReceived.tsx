import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import {
  FiEdit2,
  FiHome,
  FiPlus,
  FiSave,
  FiTrash2,
} from 'react-icons/fi';
import { Button, ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import useVoucherAutoEditSearch from '../../../utils/hooks/useVoucherAutoEditSearch';
import useRemarkSuggestions from '../../../utils/hooks/useRemarkSuggestions';
import { useDispatch, useSelector } from 'react-redux';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import InputElement from '../../../utils/fields/InputElement';
import { handleInputKeyDown } from '../../../utils/utils-functions/handleKeyDown';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import CategoryDropdown from '../../../utils/utils-functions/CategoryDropdown';
import { getCoal3ByCoal4 } from '../../chartofaccounts/levelthree/coal3Sliders';
import { editBankReceived, saveBankReceived, updateBankReceived } from './bankReceivedSlice';
import httpService from '../../../services/httpService';
import { API_TILES_PREVIOUS_BALANCE_URL } from '../../../services/apiRoutes';
import { toast } from 'react-toastify';
import { toastRefusal } from '../../../utils/refusalToast';
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
  transactionList?: TransactionList[]; // ✅ object → array

  // ⚠️ NOTHING ABOUT AN ORDER HERE. This screen is offered no order box (see
  // the render), so the payload never carries purchaseOrderNumber -- and the
  // bank update path reads an absent order as "clear it", which is right: a
  // tiles shop's bank receipt answers to no order.

  // Tiles and Sanitary only, and the VOUCHER's figures rather than a row's --
  // the same two the cash screen calls its Discount and its Manual Voucher
  // Number, and they ride at the top level of the payload exactly as the order
  // does. Nothing reads a missing one as a zero on the way in: an absent key
  // leaves what the voucher already carries alone, and an empty one clears it.
  discount?: number | string;
  instrumentNo?: string;
}

const initialReceivedItem: ReceivedItem = {
  id: '',
  mtmId: '',
  bankReceivedAccount: '',
  bankReceivedAccountName: '',
  receiverAccount: '',
  receiverAccountName: '',
  transactionList: [],
  discount: '',
  instrumentNo: '',
};

const TilesBankReceived = () => {
  const prevDataRef = useRef(null);
  const dispatch = useDispatch();
  const coal3 = useSelector((s: any) => s.coal3);
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
  // What has been written in this box before, on any voucher of this branch.
  // The cash screens have offered this for a while; the bank ones did not.
  const remarkSuggestions = useRemarkSuggestions(
    formData.transactionList?.[0]?.remarks || '',
  );

  // Enter takes the first match and moves on to Amount, which is what the cash
  // screens do. Typing four letters of a remark used a hundred times before and
  // pressing Enter is the whole point of the list -- without it the box offers
  // suggestions that still have to be clicked.
  const handleRemarksKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && remarkSuggestions.length > 0) {
      event.preventDefault();
      const [matchedRemark] = remarkSuggestions;

      setFormData((prevState) => {
        const current = prevState.transactionList?.[0] || {
          id: Date.now(),
          account: '',
          accountName: '',
          remarks: '',
          amount: 0,
          trackedProductId: null,
        };

        return {
          ...prevState,
          transactionList: [{ ...current, remarks: matchedRemark }],
        };
      });
    }

    handleInputKeyDown(event, 'amount');
  };

  const [tableData, setTableData] = useState<ReceivedItem[]>([]);
  const [bankId, setBankId] = useState<number | string | null>(null);
  const [ddlBankList, setDdlBankList] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [receivedData, setReceivedData] = useState<ReceivedItem | null>(null);
  const [isLoading, setIsLoading] = useState(false); // ✅ new
  const searchingRef = useRef(false); // ✅ guard against concurrent searches
  const [updateTransactionId, setUpdateTransactionId] = useState<number | null>(
    null,
  );
  const [isUpdateButton, setIsUpdateButton] = useState(false);
  // What the party already owes this branch, fetched when the account is
  // picked. Display only -- it never reaches the server and is not a column
  // anywhere; the cash screen keeps the same figure the same way.
  const [previousBalance, setPreviousBalance] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(getCoal3ByCoal4(2));
  }, []);

  /**
   * Opened from the Bank Book's edit link: the voucher number arrives in the
   * navigation state, so the search runs itself.
   *
   * The cash screens and the invoices have had this for a while; these two were
   * never on the list, because until now nothing sent a voucher here.
   */
  useVoucherAutoEditSearch({
    setSearch,
    triggerSearch: (value: string) => {
      void searchTransaction(value);
    },
  });

  useEffect(() => {
    if (Array.isArray(coal3?.coal4)) {
      setDdlBankList(coal3?.coal4 || []);
      setBankId(coal3?.coal4[0]?.id ?? null);
    }
  }, [coal3]);

  /**
   * What the party owed on the day this voucher is being written, straight off
   * the ledger -- the figure the cash screen shows beside the amount, and the
   * reason the clerk can see what is still outstanding after this collection.
   *
   * ⚠️ The cash screen's own endpoint, reused as it stands: it answers for a
   * party, and nothing in it is about cash. A bank receipt collects from the
   * same party the cash one would.
   */
  const loadPreviousBalance = async (account: string | number) => {
    if (!account) {
      return;
    }
    try {
      const response = await httpService.get(API_TILES_PREVIOUS_BALANCE_URL, {
        params: { account },
      });
      const balance = Number(response?.data?.data?.data?.balance ?? 0);
      setPreviousBalance(balance);
      // Nothing owing -> nothing to prefill; the desk types what it collected.
      // Written onto the transaction row, where this screen keeps its amount,
      // rather than onto the header as the cash screen does.
      setFormData((prev) => {
        const current = prev.transactionList?.[0];
        if (!current) {
          return prev;
        }
        return {
          ...prev,
          transactionList: [{ ...current, amount: balance > 0 ? balance : '' }],
        };
      });
    } catch (error) {
      setPreviousBalance(0);
    }
  };

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

    // Asked for the party just chosen. Runs after the row above: React applies
    // both updaters in order, so this one's amount wins.
    void loadPreviousBalance(option.value);
  };


  const searchTransaction = async (searchValue?: string) => {
    // Typed into the box, or handed over by whoever sent us here -- the Bank
    // Book's edit link arrives with the voucher number in the navigation state
    // and the box has not been filled in yet when this runs.
    const invoiceNo = typeof searchValue === 'string' ? searchValue.trim() : search.trim();

    if (invoiceNo === '') {
      toast.error('Please enter a search value.');
      return;
    }

    try {
      searchingRef.current = true;
      setIsLoading(true);
      const response = await dispatch(editBankReceived({ id: invoiceNo })).unwrap();

      const mapped = mapReceivedData(response);
      setReceivedData(mapped);
      setTableData([mapped]);
      setFormData({ ...mapped, transactionList: [] }); // ✅ Receiver set করুন, transactionList খালি রাখুন (fields ফাঁকা)
      setIsUpdating(false);
      setIsUpdateButton(true);

      toast.success(response?.message || 'Search successful.');

    } catch (error: any) {
      setIsUpdateButton(false);
      setReceivedData(null);
      toast.error(error?.message || 'Error searching invoice.');
      console.error('Error searching invoice:', error);
    } finally {
      setIsLoading(false);   // ✅ hide Loader
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
      // The voucher's own two figures, on the mtm itself and not on a row: a
      // bank edit answers with ONE MainTransactionMaster, where the cash
      // screen's answers with a list whose row 0 carries them. The instrument
      // number is a plain column and arrives unbidden; the discount is the sum
      // of the twin journal's legs, which the server has to attach.
      discount: Number(data.discount) > 0 ? String(data.discount) : '',
      instrumentNo: data.manual_voucher_no ?? '',
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

    // ✅ Reset: header-এর id/mtmId/receiver
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

  /**
   * The bank account a searched voucher was drawn on, for the dropdown.
   *
   * ⚠️ THE ID, NOT AN OBJECT. CategoryDropdown takes a string or a number and
   * matches it with `value.toString()`; handed {id, name} it compared
   * "[object Object]" against every option, matched none, and the box sat on
   * "Select ..." while the voucher it had just loaded named an account.
   */
  const selectedReceiver = useMemo(
    () => (receivedData ? String(receivedData.bankReceivedAccount ?? '') : null),
    [receivedData],
  );

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

    // ⚠️ The same guard the update path has carried from the start. The bank box
    // starts on the placeholder option, whose id is '' -- and an empty string
    // arrives at the server as null (Laravel's ConvertEmptyStringsToNull), so the
    // bank contra leg was inserted with coa4_id NULL and died as
    // "1048 Column 'coa4_id' cannot be null" on the desk's screen (2026-09-27).
    if (!formData.bankReceivedAccount) {
      toast.warning('Please select Receiver Bank Account.');
      return;
    }

    setIsLoading(true);
    setSaveButtonLoading(true);

    try {
      const payload = {
        mtmId: formData.mtmId,
        bankReceivedAccount: formData.bankReceivedAccount,
        bankReceivedAccountName: formData.bankReceivedAccountName,
        transactions,
        // No purchaseOrderNumber: this screen offers no order box, and the
        // bank path reads an absent order as "none" (clearing order_no on an
        // update), which is what a tiles shop's bank receipt answers to.
        // Tiles and Sanitary, and read off the top level of the payload -- they
        // belong to the voucher, not to a row. ⚠️ Both are sent on every save,
        // empty ones included -- the server reads an ABSENT key as "leave what
        // the voucher already carries alone", so a blank instrument number
        // could never be cleared without this.
        discount: Number(formData.discount) || 0,
        manual_voucher_no: formData.instrumentNo ?? '',
      };
      const response = await dispatch(saveBankReceived(payload)).unwrap();

      // server sample:
      const voucherText = response?.data?.data?.[0];

      if (voucherText) {
        // Use a stable toastId so it can't render twice for the same save
        toast.success(voucherText, { toastId: `bank-received-success-${voucherText}` });
      }


      // ✅ Clear table
      setTableData([]);

      // ✅ Reset form but keep account fields
      setFormData({
        ...initialReceivedItem,
        bankReceivedAccount: formData.bankReceivedAccount,
        bankReceivedAccountName: formData.bankReceivedAccountName,
      });
      // The party is gone with the rows, so the balance shown beside them goes
      // too -- it is about whoever was about to pay, not about the voucher.
      setPreviousBalance(0);

    } catch (error: any) {
      toastRefusal(typeof error === 'string' ? error : error?.message || 'Something went wrong while saving.');
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


  // ⚠️ No effect toasting `bankReceived.error` here. Every rejection the slice
  // records was already spoken for by whoever asked -- the search's own catch,
  // the save's, the update's -- so the effect said the same sentence a second
  // time, one toast away: the owner saw two "Request failed with status code
  // 404" toasts at once (2026-09-27). The slice still records the error;
  // nothing reads it.

  const handleBankReceivedUpdate = async () => {

    setUpdatingLoading(true);
    setIsLoading(true);

    // ✅ Validation
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
        // No purchaseOrderNumber, on purpose: this screen has no order box, and
        // the bank path reads an absent order as "none" -- so an order_no left
        // on the voucher by another screen is cleared here rather than kept
        // alive out of sight.
        // ⚠️ AND THESE TWO, for the very reason the note below gives about
        // trackedProductId: this projection lists every key it sends, and the
        // server treats an absent one as "leave it alone". Leaving them out
        // would not keep a typed discount -- it would freeze the old one in
        // place, and a discount struck out on this screen could never be
        // retired. An empty instrument number clears it; a 0 retires the
        // journal.
        discount: Number(formData.discount) || 0,
        manual_voucher_no: formData.instrumentNo ?? '',
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


      // ✅ API call or redux dispatch
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
      setPreviousBalance(0);

    } catch (error: any) {
      console.error('❌ Error updating transaction:', error);
      // ⚠️ toastRefusal, not toast.error: a refusal comes back as success:false
      // and the sentence in it is meant for the desk -- the discount journal is
      // already signed off, the chart holds no discount head. The same call
      // handleSave's catch makes.
      toastRefusal(typeof error === 'string' ? error : error?.message || 'Failed to update transaction.');
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

  // The arithmetic the desk does in its head: what was owing, what came in,
  // what was written off, what is left.
  const discountValue = Number(formData.discount) || 0;
  const amountValue = Number(formData.transactionList?.[0]?.amount) || 0;
  const currentBalance = previousBalance - amountValue - discountValue;


  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
        <HelmetTitle title="Bank Received" screen="bank-received.tiles" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {isLoading && <Loader />}
        <div className="col-span-1">
          <div className="grid grid-cols-1 gap-y-2">
            {/* space-y-2 so these three sit the same distance apart as the
                fields below them, which the grid spaces. They used to carry
                their own mb-4 / mt-6 and drifted out of step with the form. */}
            <div className="w-full space-y-2">
              {/* ⚠️ No search box and no order box here, on the owner's word
                  (2026-09-27). The ledger's Edit link still opens a voucher --
                  useVoucherAutoEditSearch() runs the same searchTransaction()
                  off the navigation state, so nothing needed the box to work.
                  An order is not part of this screen's work at all: the bank
                  receipt answers to no order, so the payload never names one
                  and the server clears any order_no it finds. */}
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
                list="bank-received-remark-suggestions"
                autoComplete="off"
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
                onKeyDown={handleRemarksKeyDown}
              />
              <datalist id="bank-received-remark-suggestions">
                {remarkSuggestions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
              {/* What the party already owes, as at the branch's own day. Shown
                  only once asked for -- a party the ledger says nothing about
                  shows no line at all, rather than a bare 0. */}
              {previousBalance > 0 ? (
                <div className="flex items-center justify-between border border-gray-300 px-2 py-1 text-sm dark:border-gray-600">
                  <span>Previous Balance</span>
                  <span className="font-semibold">
                    {thousandSeparator(previousBalance)}
                  </span>
                </div>
              ) : null}

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
                onKeyDown={(e) => handleInputKeyDown(e, 'discount')}
              />
              <div>
                <InputElement
                  id="discount"
                  value={formData.discount ?? ''}
                  name="discount"
                  type="number"
                  placeholder="Enter Discount"
                  label="Discount (Tk.)"
                  className=""
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      discount: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => handleInputKeyDown(e, 'manual_voucher_no')}
                />
                {/* The arithmetic the desk does in its head: what was owing, what
                    came in, what was written off, what is left. The first line
                    says which three figures are being subtracted; the second is
                    this voucher's own numbers. */}
                {previousBalance > 0 ? (
                  <div className="mt-0.5 text-xs text-gray-600 dark:text-gray-300">
                    <div>Current Balance = Previous Balance − Amount (Tk.) − Discount (Tk.)</div>
                    <div>
                      {thousandSeparator(previousBalance)} − {thousandSeparator(amountValue)} −{' '}
                      {thousandSeparator(discountValue)} ={' '}
                      <span className="font-semibold">{thousandSeparator(currentBalance)}</span>
                    </div>
                  </div>
                ) : null}
              </div>
              {/* The bank's own number -- cheque, RTGS or slip. Same column the
                  cash screen writes its manual voucher number into: the shop's
                  own number beside the system's. */}
              <InputElement
                id="manual_voucher_no"
                value={formData.instrumentNo ?? ''}
                name="manual_voucher_no"
                placeholder="Enter Cheque / Instrument No"
                label="Cheque / Instrument No"
                className=""
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    instrumentNo: e.target.value,
                  }))
                }
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

            {/* @container: below 42rem of row the buttons show their icons alone
                (responsiveLabel), the words having been clipped in a half-width
                panel. */}
            <div className="@container grid grid-cols-3 gap-x-1 gap-y-1">
              {isUpdating ? (
                <ButtonLoading
                  onClick={editReceivedVoucher}
                  label="Update"
                  responsiveLabel="lg"
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
                  responsiveLabel="lg"
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
                  responsiveLabel="lg"
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
                  responsiveLabel="lg"
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
                responsiveLabel="lg"
                className="whitespace-nowrap text-center mr-0 p-2"
                icon={
                  <FiHome className="text-white text-lg ml-2  mr-2 " />
                }
              />
            </div>
          </div>
        </div>


        <div className="mt-6 md:col-span-2 overflow-x-auto ">
          {/* {cashReceived.isLoading ? <Loader /> : null} */}
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
              {tableData.map((row) =>
                row.transactionList?.map((t) => (
                  <tr
                    key={t.id}
                    className="bg-[rgb(var(--c-table-body))] border-b dark:border-gray-700"
                  >
                    <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))]">
                      {t.accountName}
                    </td>
                    <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))]">
                      {t.remarks}
                    </td>
                    {trackedProducts.length > 0 ? (
                      <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))]">
                        {trackedProducts.find((p) => p.id === t.trackedProductId)
                          ?.name ?? ''}
                      </td>
                    ) : null}
                    <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))] text-right">
                      { thousandSeparator(Number(t.amount)) }
                    </td>
                    <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))] text-center w-20">
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

              <tr className="bg-[rgb(var(--c-table-body))] border-b dark:border-gray-700">
                <td
                  className={`px-2 py-2 font-bold text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))] `}
                  colSpan={trackedProducts.length > 0 ? 3 : 2}
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

export default TilesBankReceived;
