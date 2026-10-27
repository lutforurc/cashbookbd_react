import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import { FiEdit2, FiHome, FiPlus, FiSave, FiTrash2 } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { getCoal3ByCoal4 } from '../../chartofaccounts/levelthree/coal3Sliders';
import useCtrlS from '../../../utils/hooks/useCtrlS';
import useVoucherAutoEditSearch from '../../../utils/hooks/useVoucherAutoEditSearch';
import useRemarkSuggestions from '../../../utils/hooks/useRemarkSuggestions';
import Loader from '../../../../common/Loader';
import { Button, ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import CategoryDropdown from '../../../utils/utils-functions/CategoryDropdown';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import InputElement from '../../../utils/fields/InputElement';
import httpService from '../../../services/httpService';
import { API_TILES_PREVIOUS_BALANCE_URL } from '../../../services/apiRoutes';
import { handleInputKeyDown } from '../../../utils/utils-functions/handleKeyDown';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { toast } from 'react-toastify';
import { toastRefusal } from '../../../utils/refusalToast';
import { editBankPayment, saveBankPayment, updateBankPayment } from './bankPaymentSlice';
import { useNavigate } from 'react-router-dom';
import TrackedProductField from '../../product-tracking/TrackedProductField';
import { useTrackedProducts } from '../../product-tracking/useTrackedProducts';

interface TransactionList {
  id: string | number;
  account: string;
  accountName: string;
  remarks: string;
  amount: number | string;
  // Which tracked Product this row's money is against. It never reaches the
  // legacy transaction tables -- only transaction_product_maps. The backend
  // pairs a map to a row by position in the `transactions` array, so this has
  // to live on the row, not on the voucher header.
  trackedProductId?: number | null;
}


interface PaymentItem {
  id: string | number;
  mtmId: string;
  bankPaymentAccount: string;
  bankPaymentAccountName: string;
  paymentAccount: string;
  paymentAccountName: string;
  transactionList?: TransactionList[]; // ✅ object → array

  // ⚠️ NOTHING ABOUT AN ORDER HERE, the same as TilesBankReceived: this screen
  // offers no order box, so the payload never carries purchaseOrderNumber, and
  // the bank update path reads an absent order as "clear it".

  // Tiles and Sanitary only, and the VOUCHER's figures rather than a row's --
  // they ride at the top level of the payload. An absent key leaves what the
  // voucher already carries alone, and an empty one clears it.
  discount?: number | string;
  instrumentNo?: string;
}

const initialPaymentItem: PaymentItem = {
  id: '',
  mtmId: '',
  bankPaymentAccount: '',
  bankPaymentAccountName: '',
  paymentAccount: '',
  paymentAccountName: '',
  transactionList: [],
  discount: '',
  instrumentNo: '',
};

/**
 * Bank Payment for the Tiles and Sanitary trade -- a copy of the generic
 * BankPayment carrying what its Bank Received twin (TilesBankReceived) carries:
 * the party's Previous Balance, a Discount the supplier gave (journalled by the
 * server to Purchase Discount 40), and the bank's own Cheque / Instrument No.
 * No order box and no search box, on the owner's word for the received side
 * (2026-09-27); the ledger's Edit link still opens a voucher through
 * useVoucherAutoEditSearch().
 */
const TilesBankPayment = () => {
  const dispatch = useDispatch();
  const coal3 = useSelector((s: any) => s.coal3);
  const [search, setSearch] = useState('');
  const [buttonLoading, setButtonLoading] = useState(false);
  const [saveButtonLoading, setSaveButtonLoading] = useState(false);
  const [updatingLoading, setUpdatingLoading] = useState(false);
  const [formData, setFormData] = useState<PaymentItem>(initialPaymentItem);
  // The party is the row account, not `bankPaymentAccount` -- that one is the
  // bank ledger itself and no product is ever tracked against it. With no
  // Product tracked for this company the list comes back empty and the
  // dropdown does not render at all, leaving the form exactly as it was.
  const { products: trackedProducts } = useTrackedProducts(
    'payment',
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

  const [tableData, setTableData] = useState<PaymentItem[]>([]);
  const [ddlBankList, setDdlBankList] = useState<any[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentItem | null>(null);
  const [isLoading, setIsLoading] = useState(false); // ✅ new
  // A newer search supersedes an older one: each run takes a number and only the
  // newest may write its result. The boolean this replaces was set on every run
  // and never read, so two overlapping searches could land out of order and
  // leave the earlier voucher on the screen.
  const searchSeqRef = useRef(0);
  const [updateTransactionId, setUpdateTransactionId] = useState<number | null>(
    null,
  );
  const [isUpdateButton, setIsUpdateButton] = useState(false);
  // What the party stands at, fetched when the account is picked. Display only
  // -- it never reaches the server.
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
    }
  }, [coal3]);



  /**
   * What the party stood at on the day this voucher is being written, straight
   * off the ledger -- the cash screen's own endpoint, which answers for a party
   * and has nothing to do with cash.
   *
   * ⚠️ `allow_negative`: signed debit minus credit, so a supplier we owe reads
   * NEGATIVE, the same as their ledger. What we owe is prefilled into Amount,
   * turned positive; a party who owes US is not someone to pay, so nothing is.
   * Written onto the transaction row, where this screen keeps its amount.
   */
  const loadPreviousBalance = async (account: string | number) => {
    if (!account) {
      return;
    }
    try {
      const response = await httpService.get(API_TILES_PREVIOUS_BALANCE_URL, {
        params: { account, allow_negative: 1 },
      });
      const balance = Number(response?.data?.data?.data?.balance ?? 0);
      setPreviousBalance(balance);
      setFormData((prev) => {
        const current = prev.transactionList?.[0];
        if (!current) {
          return prev;
        }
        return {
          ...prev,
          transactionList: [{ ...current, amount: balance < 0 ? -balance : '' }],
        };
      });
    } catch (error) {
      setPreviousBalance(0);
    }
  };

  const transactionAccountHandler = (option: any) => {
    const currentTransaction = formData.transactionList?.[0];
    // This rebuilds the row from scratch, so every field the user may already
    // have filled in has to be carried over by hand or it is silently lost.
    setFormData({
      ...formData,
      transactionList: [
        {
          id: currentTransaction?.id || Date.now(),
          account: option.value,
          accountName: option.label,
          remarks: currentTransaction?.remarks || '',
          amount: currentTransaction?.amount || 0,
          trackedProductId: currentTransaction?.trackedProductId ?? null,
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

    // A newer search wins. This run's number is the newest only while no later
    // run has taken one after it, so a reply that is no longer the newest is
    // dropped -- two overlapping searches can never leave the older voucher on
    // the screen. (The ref this replaces was written but never read.)
    const seq = ++searchSeqRef.current;

    try {
      setIsLoading(true);
      const response = await dispatch(editBankPayment({ id: invoiceNo })).unwrap();

      if (seq !== searchSeqRef.current) return; // superseded: another search is in flight

      const mapped = mapPaymentData(response);
      setPaymentData(mapped);
      setTableData([mapped]);
      setFormData({ ...mapped, transactionList: [] }); // ✅ Payment set করুন, transactionList খালি রাখুন (fields ফাঁকা)
      setIsUpdating(false);
      setIsUpdateButton(true);

      toast.success(response?.message || 'Search successful.');

    } catch (error: any) {
      if (seq !== searchSeqRef.current) return; // superseded: its own error is not ours to show
      setIsUpdateButton(false);
      setPaymentData(null);
      toast.error(error?.message || 'Error searching invoice.');
      console.error('Error searching invoice:', error);
    } finally {
      // Only the newest run clears the spinner; a superseded one must not hide
      // the loader the newer search is still using.
      if (seq === searchSeqRef.current) setIsLoading(false);   // ✅ hide Loader
    }
  };


  const mapPaymentData = (res: any): PaymentItem => {
    const data = res.data.data;
    const details = data.acc_transaction_master[0].acc_transaction_details;


    // The bank contra row is always written last, so dropping the tail leaves
    // exactly the party rows -- and in the order they were saved, which is what
    // the backend's row-position based product mapping is keyed on.
    const filteredDetails = details.slice(0, -1);


    const lastDetail = details[details.length - 1];

    return {
      id: data.id,
      mtmId: data.mtmId,
      // The voucher's own two figures, on the mtm itself: the instrument
      // number is a plain column, the discount the sum of the twin journal's
      // legs, which the server attaches.
      discount: Number(data.discount) > 0 ? String(data.discount) : '',
      instrumentNo: data.manual_voucher_no ?? '',
      bankPaymentAccount: lastDetail?.coa4_id?.toString() || '',
      bankPaymentAccountName: lastDetail?.coa_l4?.name || '',
      paymentAccount: '',
      paymentAccountName: '',
      transactionList: filteredDetails.map((item: any) => ({
        id: item.id,
        account: item.coa4_id,
        accountName: item.coa_l4?.name,
        remarks: item.remarks,
        // ⚠️ DEBIT, not credit. This screen was written from the received one,
        // where the party rows are the credits -- on a payment they are the
        // debits and the bank carries the credit. Reading the wrong side made
        // every line open at nought, and saving from there would have posted a
        // voucher of noughts over a real one.
        amount: item.debit,
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
      // Without this the spread above keeps the row's old product and quietly
      // throws away whatever the user just picked in the form.
      trackedProductId: paymentVoucher.trackedProductId ?? null,
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
      // ⚠️ Carried over, not reset. Editing one ROW must not take the discount
      // or the instrument number off the VOUCHER -- the update sends whatever
      // is in the form, and an empty pair would retire the journal.
      discount: prev?.discount,
      instrumentNo: prev?.instrumentNo,
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
  const selectedPayment = useMemo(
    () => (paymentData ? String(paymentData.bankPaymentAccount ?? '') : null),
    [paymentData],
  );

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

    // ⚠️ The guard TilesBankReceived carries since 2026-09-27: the bank box
    // starts on the placeholder option, whose id is '', and an empty string
    // reaches the server as null -- the bank leg would be written with a NULL
    // head and die as "1048 Column 'coa4_id' cannot be null".
    if (!formData.bankPaymentAccount) {
      toast.warning('Please select Payment Bank Account.');
      return;
    }

    setIsLoading(true);
    setSaveButtonLoading(true);

    try {
      const payload = {
        mtmId: formData.mtmId,
        bankPaymentAccount: formData.bankPaymentAccount,
        bankPaymentAccountName: formData.bankPaymentAccountName,
        transactions,
        // No purchaseOrderNumber: this screen offers no order box.
        // Tiles and Sanitary, read off the top level -- they belong to the
        // voucher. ⚠️ Both sent on every save, empty ones included: the server
        // reads an ABSENT key as "leave what the voucher carries alone".
        discount: Number(formData.discount) || 0,
        manual_voucher_no: formData.instrumentNo ?? '',
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
      // The balance is about whoever was being paid, not about the voucher.
      setPreviousBalance(0);

    } catch (error: any) {
      toastRefusal(typeof error === 'string' ? error : error?.message || 'Something went wrong while saving.');
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


  // ⚠️ No effect toasting `bankPayment.error` here, the same fix as
  // TilesBankReceived: every rejection is already spoken for by whoever asked
  // -- the search's own catch, the save's, the update's -- and the effect said
  // the same sentence a second time, one toast away.

  const handleBankPaymentUpdate = async () => {

    setUpdatingLoading(true);
    setIsLoading(true);

    // ✅ Validation
    const transactions = tableData.flatMap((item) => item.transactionList || []);
    if (!transactions.length) {
      toast.warning('No transactions to update.');
      setUpdatingLoading(false);
      setIsLoading(false);
      return;
    }

    if (!formData.bankPaymentAccount) {
      toast.warning('Please select Payment Bank Account.');
      setUpdatingLoading(false);
      setIsLoading(false);
      return;
    }

    try {
      const payload = {
        id: formData.id,
        mtmId: formData.mtmId,
        bankPaymentAccount: formData.bankPaymentAccount,
        bankPaymentAccountName: formData.bankPaymentAccountName,
        // No purchaseOrderNumber, on purpose: no order box here, and the bank
        // path reads an absent order as "none".
        // ⚠️ AND THESE TWO, for the reason the note below gives about
        // trackedProductId: the server treats an absent key as "leave it
        // alone", so a discount struck out here could never be retired without
        // them. An empty instrument number clears it; a 0 retires the journal.
        discount: Number(formData.discount) || 0,
        manual_voucher_no: formData.instrumentNo ?? '',
        // This projection whitelists keys, so anything left out is stripped.
        // An update rewrites the voucher's product maps from scratch rather
        // than patching them, so omitting trackedProductId here would not
        // leave the saved product alone -- it would erase it.
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
      setPreviousBalance(0);

    } catch (error: any) {
      console.error('❌ Error updating transaction:', error);
      // toastRefusal: a refusal's sentence is meant for the desk -- the discount
      // journal is already approved, the chart holds no Purchase Discount head.
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
    if (isUpdateButton) return handleBankPaymentUpdate();
    return handleSave();
  });

  // The arithmetic the desk does in its head. A payment and its discount both
  // DEBIT the supplier, so both move a negative balance back towards nought.
  const discountValue = Number(formData.discount) || 0;
  const amountValue = Number(formData.transactionList?.[0]?.amount) || 0;
  const currentBalance = previousBalance + amountValue + discountValue;


  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
        <HelmetTitle title="Bank Payment" screen="bank-payment.tiles" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {isLoading && <Loader />}
        <div className="col-span-1">
          <div className="grid grid-cols-1 gap-y-2">
            <div className="w-full space-y-2">
              {/* ⚠️ No order box here, the same as TilesBankReceived: the
                  payload never names an order and the server clears any
                  order_no it finds. */}
              <div className="">
                <label htmlFor="">Bank Payment Account</label>
                <CategoryDropdown
                  onChange={bankPaymentAccountHandler}
                  className={`w-full font-medium text-sm ${formData.mtmId && 'border! border-red-800!'}`}
                  categoryDdl={optionsWithAll}
                  value={selectedPayment}
                />
              </div>

              {/* No mt-6 here: the grid's own gap-y-2 spaces every other field
                  on this form, and the extra top margin left one gap on the
                  Payment screen wider than the same gap on Received -- two
                  screens that are otherwise the same form. */}
              <div>
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
                list="tiles-bank-payment-remark-suggestions"
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
              <datalist id="tiles-bank-payment-remark-suggestions">
                {remarkSuggestions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
              {/* What the party stands at, signed as their ledger is -- a
                  supplier we owe is negative. `!== 0`, never `> 0`. */}
              {previousBalance !== 0 ? (
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
              {/* The bank's own number -- cheque, RTGS or slip. Same column the
                  cash screen writes its manual voucher number into. */}
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
              {/* Renders nothing when no Product is tracked, so the form stays
                  exactly as it was. The product belongs to the row, so the
                  single-entry transactionList has to be rebuilt here rather
                  than setting a field on the header. */}
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
                  onClick={editPaymentVoucher}
                  label="Update"
                  responsiveLabel="lg"
                  className="whitespace-nowrap text-center mr-0"
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
                  responsiveLabel="lg"
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
                  responsiveLabel="lg"
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
          {/* The voucher's own two figures -- what will be printed beside it and
              what the server is about to journal. */}
          {formData.instrumentNo || discountValue > 0 ? (
            <div className="mb-1 flex flex-wrap gap-x-4 text-sm text-gray-700 dark:text-[rgb(var(--c-text))]">
              {formData.instrumentNo ? (
                <span>
                  Cheque / Instrument No:{' '}
                  <span className="font-semibold">{formData.instrumentNo}</span>
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
                      {thousandSeparator(Number(t.amount))}
                    </td>
                    <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))] text-center w-20">
                      <Button
                        onClick={() => handleDelete(Number(t.id))}
                        className="text-red-500 ml-2 text-center"
                      >
                        <FiTrash2 className="cursor-pointer text-center" />
                      </Button>

                      <Button
                        onClick={() => paymentEditItem(Number(t.id))}
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

export default TilesBankPayment;
