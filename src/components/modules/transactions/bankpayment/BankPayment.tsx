import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import { FiEdit2, FiHome, FiPlus, FiSave, FiSearch, FiTrash2 } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { getCoal3ByCoal4 } from '../../chartofaccounts/levelthree/coal3Sliders';
import useCtrlS from '../../../utils/hooks/useCtrlS';
import { hasPermission } from '../../../utils/permissionChecker';
import useVoucherAutoEditSearch from '../../../utils/hooks/useVoucherAutoEditSearch';
import useOrderFieldEnabled from '../../../utils/hooks/useOrderFieldEnabled';
import Loader from '../../../../common/Loader';
import InputOnly from '../../../utils/fields/InputOnly';
import { Button, ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import CategoryDropdown from '../../../utils/utils-functions/CategoryDropdown';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import OrderDropdown from '../../../utils/utils-functions/OrderDropdown';
import resolveOrderParty from '../../../utils/utils-functions/resolveOrderParty';
import InputElement from '../../../utils/fields/InputElement';
import { handleInputKeyDown } from '../../../utils/utils-functions/handleKeyDown';
import Link from '../../../utils/others/Link';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { toast } from 'react-toastify';
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
  transactionList?: TransactionList[]; // âœ… object â†’ array

  // The order this voucher answers to, if any. It belongs to the VOUCHER and
  // not to a row -- acc_transaction_master.order_no is one column, and the API
  // reads purchaseOrderNumber off the top level of the payload rather than off
  // the transactions array. The text is carried beside the id only so the box
  // can show the number a person recognises.
  purchaseOrderNumber?: string;
  purchaseOrderText?: string;
}

const initialPaymentItem: PaymentItem = {
  id: '',
  mtmId: '',
  bankPaymentAccount: '',
  bankPaymentAccountName: '',
  paymentAccount: '',
  paymentAccountName: '',
  transactionList: [],
  purchaseOrderNumber: '',
  purchaseOrderText: '',
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
  const [tableData, setTableData] = useState<PaymentItem[]>([]);
  const [bankId, setBankId] = useState<number | string | null>(null);
  const [ddlBankList, setDdlBankList] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentItem | null>(null);
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
   * While an order is chosen, the transaction account is the order's own party
   * and cannot be changed here.
   *
   * Without this the two could be saved disagreeing -- money moved against one
   * order but posted to another party's ledger -- and neither the order's due
   * nor the ledger would say which of them was right. The cash screens hold the
   * same rule.
   *
   * The account itself has to be filled for the lock to apply, not just the
   * order: resolveOrderParty() deliberately returns a name with no id when the
   * order's party cannot be matched exactly, and locking an empty box would be
   * a dead end with nothing the operator could do but start over.
   */
  /**
   * The order box only where the cash screens have one -- a Trading branch. On
   * a General or head-office branch Cash Payment offers no order, so neither
   * does this.
   */
  const orderFieldEnabled = useOrderFieldEnabled();

  const isAccountLockedByOrder = Boolean(
    orderFieldEnabled &&
      formData.purchaseOrderNumber &&
      formData.transactionList?.[0]?.account,
  );

  /**
   * Picking an order also says who the money is for.
   *
   * The same as the cash screens: the order number already names the party, so
   * the account box fills itself rather than asking for the name a second time.
   * Clearing the order leaves the account alone -- it may have been chosen on
   * purpose by then.
   */
  const selectedOrderOptionHandler = async (option: any) => {
    if (!option) {
      setFormData((prevState) => ({
        ...prevState,
        purchaseOrderNumber: '',
        purchaseOrderText: '',
      }));
      return;
    }

    const party = await resolveOrderParty(option);
    const current = formData.transactionList?.[0];

    setFormData((prevState) => ({
      ...prevState,
      purchaseOrderNumber: option?.value || '',
      purchaseOrderText: option?.label || '',
      // The row is rebuilt whole, as transactionAccountHandler does, so every
      // field already typed has to be carried over by hand or it is lost.
      ...(party.name
        ? {
            transactionList: [
              {
                id: current?.id || Date.now(),
                account: party.id ? String(party.id) : '',
                accountName: party.name,
                remarks: current?.remarks || '',
                amount: current?.amount || 0,
                trackedProductId: current?.trackedProductId ?? null,
              },
            ],
          }
        : {}),
    }));
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
      const response = await dispatch(editBankPayment({ id: invoiceNo })).unwrap();

      const mapped = mapPaymentData(response);
      setPaymentData(mapped);
      setTableData([mapped]);
      setFormData({ ...mapped, transactionList: [] }); // âœ… Payment set à¦•à¦°à§à¦¨, transactionList à¦–à¦¾à¦²à¦¿ à¦°à¦¾à¦–à§à¦¨ (fields à¦«à¦¾à¦à¦•à¦¾)
      setIsUpdating(false);
      setIsUpdateButton(true);

      toast.success(response?.message || 'Search successful.');

    } catch (error: any) {
      setIsUpdateButton(false);
      setPaymentData(null);
      toast.error(error?.message || 'Error searching invoice.');
      console.error('Error searching invoice:', error);
    } finally {
      setIsLoading(false);   // âœ… hide Loader
      searchingRef.current = false;
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
      // ⚠️ The id is what the ledger stores; the number is what a person reads.
      // Both are needed, or the box comes back empty on an edit -- and an empty
      // box saved again takes the order off the voucher without saying so.
      purchaseOrderNumber: data.acc_transaction_master?.[0]?.order_no?.toString() || '',
      purchaseOrderText: data.acc_transaction_master?.[0]?.order_number || '',
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

  // âœ… Implement editPaymentVoucher like the example (local update)

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

    // âœ… Reset: header-à¦à¦° id/mtmId/receiver
    setFormData(prev => ({
      ...initialPaymentItem,
      id: prev?.id as any,
      mtmId: prev?.mtmId as any,
      bankPaymentAccount: prev?.bankPaymentAccount,
      bankPaymentAccountName: prev?.bankPaymentAccountName,
      // ⚠️ Carried over, not reset. Editing one ROW must not take the order off
      // the VOUCHER -- the update sends whatever is in the form, so a wiped box
      // here would clear order_no in the ledger without anybody asking for it.
      purchaseOrderNumber: prev?.purchaseOrderNumber,
      purchaseOrderText: prev?.purchaseOrderText,
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

    setIsLoading(true);
    setSaveButtonLoading(true);

    try {
      const payload = {
        mtmId: formData.mtmId,
        bankPaymentAccount: formData.bankPaymentAccount,
        bankPaymentAccountName: formData.bankPaymentAccountName,
        transactions,
        // One column on the voucher, not a field on a row --
        // acc_transaction_master.order_no, which BankServices reads off the
        // top level of this payload.
        purchaseOrderNumber: formData.purchaseOrderNumber || null,
      };
      const response = await dispatch(saveBankPayment(payload)).unwrap();

      // server sample:
      const voucherText = response?.data?.data?.[0];

      if (voucherText) {
        // Use a stable toastId so it can't render twice for the same save
        toast.success(voucherText, { toastId: `bank-payment-success-${voucherText}` });
      }

      // âœ… Clear table
      setTableData([]);

      // âœ… Reset form but keep account fields
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

    // âœ… Validation
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
        // Sent on every update, empty included: the server clears order_no
        // when it is absent, which is how an order taken off a voucher here
        // actually leaves the ledger.
        purchaseOrderNumber: formData.purchaseOrderNumber || null,
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


      // âœ… API call or redux dispatch
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
    if (isUpdateButton) return handleBankPaymentUpdate();
    return handleSave();
  });


  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
        <HelmetTitle title="Bank Payment" screen="bank-payment" />
      </div>
      {/* <span className="text-2xl font-bold text-red-500 text-center block">(Not Ready)</span> */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {isLoading && <Loader />}
        <div className="col-span-1">
          <div className="grid grid-cols-1 gap-y-2">
            {/* space-y-2 so the search row sits the same distance from the
                fields below it as they sit from each other -- the grid spaces
                those, and this block was spacing itself with its own mb-4. */}
            <div className="w-full space-y-2">
              <div className="flex w-full items-end">
                {hasPermission(
                  settings.data.permissions,
                  'cash.received.edit',
                ) && (
                    <>
                      <div className="min-w-0 flex-1">
                        <label htmlFor="search">
                          Search Bank Payment Voucher
                        </label>
                        <InputOnly
                          id="search"
                          value={search}
                          name="search"
                          placeholder="Search Bank Payment Voucher"
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
              {/* ⚠️ The order names the party, so choosing one fills the
                  account below in and locks it. Saved on the VOUCHER
                  (acc_transaction_master.order_no), not on a row -- one bank
                  voucher answers to one order, the same as the cash screens.

                  Offered only where the cash screens offer it -- a Trading
                  branch -- so the two sides of the same voucher do not
                  disagree about whether an order may be named. */}
              {orderFieldEnabled ? (
                <div className="relative">
                  <label htmlFor="">Select Order (Optional) </label>
                  <OrderDropdown
                    /* Purchase and stock only. Money going out never answers to
                       a sales order, and offering all three is offering the two
                       that cannot be right. */
                    orderType={['1', '3']}
                    onSelect={selectedOrderOptionHandler}
                    defaultValue={
                      formData.purchaseOrderNumber
                        ? {
                            value: formData.purchaseOrderNumber,
                            label: formData.purchaseOrderText,
                          }
                        : null
                    }
                    value={
                      formData.purchaseOrderNumber
                        ? {
                            value: formData.purchaseOrderNumber,
                            label: formData.purchaseOrderText,
                          }
                        : null
                    }
                  />
                </div>
              ) : null}
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
                  isDisabled={isAccountLockedByOrder}
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
                {isAccountLockedByOrder && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    The order names the party, so this cannot be changed here.
                    Clear the order above to choose another account.
                  </p>
                )}
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

            <div className="grid grid-cols-3 gap-x-1 gap-y-1">
              {isUpdating ? (
                <ButtonLoading
                  onClick={editPaymentVoucher}
                  label="Update"
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

export default BankPayment;
