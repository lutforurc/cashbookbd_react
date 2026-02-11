import { useState, useCallback, useEffect } from 'react';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import { FiHome, FiSave, FiSearch } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import useCtrlS from '../../../utils/hooks/useCtrlS';
import { hasPermission } from '../../../utils/permissionChecker';
import Loader from '../../../../common/Loader';
import InputOnly from '../../../utils/fields/InputOnly';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import InputElement from '../../../utils/fields/InputElement';
import { handleInputKeyDown } from '../../../utils/utils-functions/handleKeyDown';
import Link from '../../../utils/others/Link';
import { toast } from 'react-toastify';
import EmployeeDropdownSearch from '../../../utils/utils-functions/EmployeeDropdownSearch';
import { employeeLoan, employeeLoanDisbursement, employeeLoanLedger } from './employeeLoanSlice';

interface LoanPayload {
  id: string | number;
  account: string;       // employee id
  accountName: string;   // employee name
  remarks: string;
  amount: number | string;
}

const EmployeeLoan = () => {
  const dispatch = useDispatch();
  const settings = useSelector((s: any) => s.settings);

  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [saveButtonLoading, setSaveButtonLoading] = useState(false);

  // ✅ single payload state
  const [tx, setTx] = useState<LoanPayload>({
    id: Date.now(),
    account: '',
    accountName: '',
    remarks: '',
    amount: '',
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

  const searchTransaction = async () => {
    if (search === '') {
      toast.error('Please enter a search value.');
      return;
    }
    toast.info('Search এখনো implement করা হয়নি (Single Entry Mode)।');
  };

  const handleSave = useCallback(async () => {
    if (saveButtonLoading) return;

    if (!tx.account) return toast.warning('Please select employee');
    if (!tx.amount || Number(tx.amount) <= 0)
      return toast.warning('Please enter amount');

    setIsLoading(true);
    setSaveButtonLoading(true);

    try {
      const payload = {
        id: tx.id,
        account: tx.account,
        accountName: tx.accountName,
        remarks: tx.remarks ?? '',
        amount: Number(tx.amount),
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
        });
      }
    } catch (error: any) {
      toast.error(error?.message || 'Something went wrong while saving.');
    } finally {
      setSaveButtonLoading(false);
      setIsLoading(false);
    }
  }, [saveButtonLoading, tx, dispatch]);

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
                <div className="relative w-full flex items-center">
                  {hasPermission(settings?.data?.permissions, 'cash.received.edit') && (
                    <>
                      <div className="w-full mb-4">
                        <label htmlFor="search" className="text-black dark:text-white">
                          Search Employee Loan
                        </label>
                        <InputOnly
                          id="search"
                          value={search}
                          name="search"
                          placeholder="Search Employee Loan"
                          label=""
                          className="py-1 w-full"
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </div>

                      <div>
                        <ButtonLoading
                          onClick={searchTransaction}
                          buttonLoading={false}
                          label=" "
                          className="whitespace-nowrap text-center h-8.5 w-20 border-[1px] border-gray-600 hover:border-blue-500 right-0 top-6 absolute"
                          icon={<FiSearch className="text-white text-lg ml-2" />}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-0 mb-2">
                  <label className="text-black dark:text-white">Select Employee</label>
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
                  onKeyDown={(e) => handleInputKeyDown(e, 'save_button')}
                />
              </div>

              <div>
                <div className="grid grid-cols-2 gap-x-1 gap-y-1 mt-3">
                  <ButtonLoading
                    id="save_button"
                    disabled={saveButtonLoading}
                    onClick={handleSave}
                    buttonLoading={saveButtonLoading}
                    label={saveButtonLoading ? 'Saving...' : 'Save'}
                    className="whitespace-nowrap text-center mr-0 p-2"
                    icon={<FiSave className="text-white text-lg ml-2 mr-2 hidden xl:block" />}
                  />

                  <Link to="/dashboard" className="text-nowrap justify-center mr-0 p-2">
                    <FiHome className="text-white text-lg ml-2 mr-2 hidden xl:block" />
                    <span>Home</span>
                  </Link>
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
