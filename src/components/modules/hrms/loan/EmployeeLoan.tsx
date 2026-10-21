import { useState, useCallback, useEffect } from 'react';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import { FiHome, FiSave } from 'react-icons/fi';
import { useDispatch } from 'react-redux';
import useCtrlS from '../../../utils/hooks/useCtrlS';
import Loader from '../../../../common/Loader';
import { Button, ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import InputElement from '../../../utils/fields/InputElement';
import { handleInputKeyDown } from '../../../utils/utils-functions/handleKeyDown';
import { toast } from 'react-toastify';
import EmployeeDropdownSearch from '../../../utils/utils-functions/EmployeeDropdownSearch';
import {
  employeeLoan,
  employeeLoanDisbursement,
  employeeLoanLedger,
  employeeLoanSearch,
  employeeLoanUpdate,
} from './employeeLoanSlice';
import { useNavigate } from 'react-router-dom';
import useVoucherAutoEditSearch from '../../../utils/hooks/useVoucherAutoEditSearch';

interface LoanPayload {
  id: string | number;
  account: string;       // employee id
  accountName: string;   // employee name
  remarks: string;
  amount: number | string;
  /** The number written on the paper voucher. Optional. */
  manualVoucherNo: string;
}

interface LoanEditInfo {
  loan_detail_id: number;
  main_trx_id: number;
  vr_no: string;
}

const EmployeeLoan = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [isLoading, setIsLoading] = useState(false);
  const [saveButtonLoading, setSaveButtonLoading] = useState(false);

  // When set, the form is editing an existing loan disbursement.
  const [editInfo, setEditInfo] = useState<LoanEditInfo | null>(null);

  // ✅ single payload state
  const [tx, setTx] = useState<LoanPayload>({
    id: Date.now(),
    account: '',
    accountName: '',
    remarks: '',
    amount: '',
    manualVoucherNo: '',
  });


  useEffect(() => {
    dispatch(
      employeeLoanLedger({
        ledger_id: 5,
        startdate: '01/01/2015',
        enddate: '31/12/2030',
      })
    );
  }, [dispatch]);

  // Employee select -> tx update
  const transactionAccountHandler = (selectedOption: any) => {
    setTx((prev) => ({
      ...prev,
      account: String(selectedOption?.value ?? ''),
      accountName: String(selectedOption?.label ?? ''),
    }));
  };

  const resetForm = () => {
    setTx({
      id: Date.now(),
      account: '',
      accountName: '',
      remarks: '',
      amount: '',
      manualVoucherNo: '',
    });
    setEditInfo(null);
  };

  // Load a loan for editing by its voucher number -- the number Cash Book's
  // Edit button hands over (see the hook below). There is no search box.
  const loadLoan = async (voucherNo: string) => {
    const vrNo = voucherNo.trim();
    if (vrNo === '') return;

    setIsLoading(true);
    try {
      const data = await dispatch(employeeLoanSearch({ vr_no: vrNo })).unwrap();

      if (data.is_approved === 1) {
        toast.error('Approved loan cannot be edited.');
        return;
      }

      setTx({
        id: data.loan_detail_id,
        account: String(data.account ?? ''),
        accountName: String(data.accountName ?? ''),
        remarks: data.remarks ?? '',
        amount: data.amount ?? '',
        manualVoucherNo: data.manual_voucher_no ?? '',
      });
      setEditInfo({
        loan_detail_id: data.loan_detail_id,
        main_trx_id: data.main_trx_id,
        vr_no: data.vr_no,
      });
      toast.success(`Loan loaded for editing (Vr. No. ${data.vr_no}).`);
    } catch (error: any) {
      toast.info(typeof error === 'string' ? error : error?.message || 'No employee loan found.');
    } finally {
      setIsLoading(false);
    }
  };

  // Opened from Cash Book's Edit on a loan voucher: load it, the way every
  // other voucher screen does.
  useVoucherAutoEditSearch({
    triggerSearch: (vrNo) => loadLoan(vrNo),
  });

  const handleSave = useCallback(async () => {
    if (saveButtonLoading) return;

    if (!tx.account) return toast.warning('Please select employee');
    if (!tx.amount || Number(tx.amount) <= 0)
      return toast.warning('Please enter amount');

    setIsLoading(true);
    setSaveButtonLoading(true);

    try {
      // ===== Edit mode: update an existing loan disbursement =====
      if (editInfo) {
        const result = await dispatch(
          employeeLoanUpdate({
            loan_detail_id: editInfo.loan_detail_id,
            main_trx_id: editInfo.main_trx_id,
            account: tx.account,
            accountName: tx.accountName,
            remarks: tx.remarks ?? '',
            amount: Number(tx.amount),
            // Always sent, '' included: blank on an edit means "cleared".
            manual_voucher_no: tx.manualVoucherNo.trim(),
          })
        ).unwrap();

        toast.success(result?.message || 'Loan updated successfully.');
        resetForm();
        return;
      }

      // ===== Create mode: new loan disbursement =====
      const payload = {
        id: tx.id,
        account: tx.account,
        accountName: tx.accountName,
        remarks: tx.remarks ?? '',
        amount: Number(tx.amount),
        manual_voucher_no: tx.manualVoucherNo.trim(),
      };


      const response = await dispatch(
        employeeLoanDisbursement(payload)
      ).unwrap();

      if (response?.success === false) {
        toast.info(response?.error?.message || response?.message);
        return;
      }

      if (response?.message) {
        toast.success(response.message);
        setTx({
          id: Date.now(),
          account: '',
          accountName: '',
          remarks: '',
          amount: '',
          manualVoucherNo: '',
        });
      }
    } catch (error: any) {
      toast.info(typeof error === 'string' ? error : error?.message || 'Something went wrong while saving.');
    } finally {
      setSaveButtonLoading(false);
      setIsLoading(false);
    }
  }, [saveButtonLoading, tx, editInfo, dispatch]);

  useCtrlS(handleSave);

  return (
    <>
      <HelmetTitle title="Employee Loan" />

      <div className="w-full md:w-4/5 lg:w-3/5 xl:w-2/5 items-center mx-auto mt-10 mb-10">
        <div className="grid">
          {isLoading && <Loader />}

          <div className="">
            <div className="">
              <div className="w-full">
                {/* No search box: a loan is opened for editing from Cash Book's
                    Edit button, which loads it here (see loadLoan). */}
                <div className="mt-0 mb-2">
                  <label className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">Select Employee</label>
                  <EmployeeDropdownSearch
                    id="account"
                    name="account"
                    placeholder="Select Employee"
                    onSelect={transactionAccountHandler}
                    value={
                      tx.account
                        ? { value: tx.account, label: tx.accountName }
                        : null
                    }
                    onKeyDown={(e: any) => {
                      if (e.key === 'Enter') document.getElementById('remarks')?.focus();
                    }}
                  />
                </div>

                <div className="mb-2">
                  <InputElement
                    id="remarks"
                    value={tx.remarks}
                    name="remarks"
                    placeholder="Enter Remarks"
                    label="Enter Remarks"
                    onChange={(e) => setTx((prev) => ({ ...prev, remarks: e.target.value }))}
                    onKeyDown={(e) => handleInputKeyDown(e, 'amount')}
                  />
                </div>
                <InputElement
                  id="amount"
                  value={String(tx.amount)}
                  name="amount"
                  type="number"
                  placeholder="Enter Amount"
                  label="Amount (Tk.)"
                  onChange={(e) => setTx((prev) => ({ ...prev, amount: e.target.value }))}
                  onKeyDown={(e) => handleInputKeyDown(e, 'manual_voucher_no')}
                />
                {/* The number on the paper voucher -- the same box, label and
                    column the Tiles cash screens use, and printed beside the
                    name on the Cash Book. */}
                <div className="mt-2">
                  <InputElement
                    id="manual_voucher_no"
                    value={tx.manualVoucherNo}
                    name="manual_voucher_no"
                    placeholder="Enter Manual Voucher Number"
                    label="Manual Voucher Number"
                    onChange={(e) => setTx((prev) => ({ ...prev, manualVoucherNo: e.target.value }))}
                    onKeyDown={(e) => handleInputKeyDown(e, 'save_button')}
                  />
                </div>
              </div>

              {editInfo && (
                <div className="mt-3 flex items-center justify-between rounded border border-amber-400/40 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-400/30 dark:bg-amber-900/20 dark:text-amber-300">
                  <span>
                    Editing loan — Vr. No. <strong>{editInfo.vr_no}</strong>
                  </span>
                  <Button
                    type="button"
                    onClick={resetForm}
                    className="font-medium text-amber-700 underline hover:text-amber-900 dark:text-amber-300"
                  >
                    Cancel
                  </Button>
                </div>
              )}

              <div>
                <div className="grid grid-cols-2 gap-x-1 gap-y-1 mt-3">
                  <ButtonLoading
                    id="save_button"
                    disabled={saveButtonLoading}
                    onClick={handleSave}
                    buttonLoading={saveButtonLoading}
                    label={
                      saveButtonLoading
                        ? editInfo
                          ? 'Updating...'
                          : 'Saving...'
                        : editInfo
                          ? 'Update'
                          : 'Save'
                    }
                    className="whitespace-nowrap text-center mr-0 p-2"
                    icon={<FiSave className="text-lg ml-2 mr-2" />}
                  />

                  <ButtonLoading
                    onClick={() => navigate('/dashboard')}
                    buttonLoading={false}
                    label="Home"
                    className="whitespace-nowrap text-center mr-0"
                    icon={<FiHome className="text-lg ml-2 mr-2" />}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default EmployeeLoan;
