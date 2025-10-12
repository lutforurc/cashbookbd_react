import { useEffect, useState } from 'react';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import { FiEdit2, FiHome, FiPlus, FiSave, FiSearch, FiTrash2 } from 'react-icons/fi';
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

interface ReceivedItem {
  id: string | number;
  mtmId: string;
  account: string;
  accountName: string;
  remarks: string;
  amount: string | number;
  currentProduct?: { [key: string]: any } | null; // Allow null
}

const initialReceivedItem: ReceivedItem = {
  id: '',
  mtmId: '',
  account: '',
  accountName: '',
  remarks: '',
  amount: 0,
  currentProduct: undefined, // Use undefined instead of null
};
const BankReceived = () => {
  const dispatch = useDispatch();
  const settings = useSelector((s: any) => s.settings);
  const coal3 = useSelector((s: any) => s.coal3);
  const [search, setSearch] = useState('');
  const [buttonLoading, setButtonLoading] = useState(false);
  const [formData, setFormData] = useState<ReceivedItem>(initialReceivedItem);
  const [tableData, setTableData] = useState<ReceivedItem[]>([]);
  const [bankId, setBankId] = useState<number | string | null>(null);
  const [ddlBankList, setDdlBankList] = useState<any[]>([]);

    useEffect(() => {
      dispatch(getCoal3ByCoal4(2));
    }, []);

      useEffect(() => {
        if (Array.isArray(coal3?.coal4)) {
          setDdlBankList(coal3?.coal4 || []);
          setBankId(coal3?.coal4[0]?.id ?? null);
        }
      }, [coal3]);
 



  const receiverBankAccountHandler = (option: any) => {
    const key = 'account'; // Set the desired key dynamically
    const accountName = 'accountName'; // Set the desired key dynamically
    setFormData({
      ...formData,
      [key]: option.value,
      [accountName]: option.label,
    });

    console.log('====================================');
    console.log(formData);
    console.log('====================================');
  };
  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const searchTransaction = () => { }
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
      setFormData({
        id: formData.id,
        mtmId: '',
        account: formData.account,
        accountName: formData.accountName,
        remarks: '',
        amount: '',
        currentProduct: null,
      }); // Reset form
      setTimeout(() => {
        const nextElement = document.getElementById('account');
        if (nextElement instanceof HTMLElement) {
          nextElement.focus();
        }
      }, 100);
    }
    console.log('====================================');
    console.log("table data", tableData);
    console.log('====================================');
  };
  const handleDelete = (id: number) => {
    setTableData(tableData.filter((row) => row.id !== id));
  };
  
  const totalAmount = tableData.reduce(
    (sum, row) => sum + Number(row.amount),
    0,
  );

  const handleBankChange = (selectedOption: any) => {
    if (selectedOption) {
      setBankId(selectedOption.value);
    } else {
      setBankId(null); // অথবা default value
    }
    console.log('====================================');
    console.log(bankId);
    console.log('====================================');
  };

  const optionsWithAll = [
  { id: '', name: 'Select Receiver Bank Account' },
  ...(Array.isArray(ddlBankList) ? ddlBankList : []),
];


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
                        <label htmlFor="search">Search Bank Received Voucher</label>
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
                      <div className=''>
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
                <label htmlFor="">Receiver Bank Account</label>
                <CategoryDropdown
                  onChange={handleBankChange}
                  className="w-full font-medium text-sm"
                  categoryDdl={optionsWithAll}
                />
               
              </div>

              <div className="mt-6">
                <label htmlFor="">Select Transaction Account</label>
                <DdlMultiline
                  id="account"
                  name="account"
                  placeholder='Select Transaction Account'
                  onSelect={receiverBankAccountHandler}
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
                onKeyDown={(e) => handleInputKeyDown(e, 'amount')}
              />
              <InputElement
                id="amount"
                value={String(formData.amount)}
                name="amount"
                type="number"
                placeholder="Enter Amount"
                label="Amount (Tk.)"
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'add_new_button')} //
              />
            </div>

            <div className="grid grid-cols-3 gap-x-1 gap-y-1">
              {1 !== 1 ? (
                <ButtonLoading
                  // onClick={editReceivedVoucher}
                  // buttonLoading={buttonLoading}
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
                  // buttonLoading={buttonLoading}
                  label="Add New"
                  className="whitespace-nowrap text-center mr-0"
                  icon={
                    <FiPlus className="text-white text-lg ml-2 mr-2 hidden xl:block" />
                  }
                />
              )}

              {1 === 1 ? (
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
                  // onClick={handleCashReceivedSave}
                  // buttonLoading={buttonLoading}
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
                      onClick={() => handleDelete(Number(row.id))}
                      className="text-red-500 ml-2 text-center"
                    >
                      <FiTrash2 className="cursor-pointer text-center" />
                    </button>

                    <button
                      // onClick={() => receivedEditItem(Number(row.id))}
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

export default BankReceived;
