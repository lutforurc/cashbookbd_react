import React, { useEffect, useRef, useState } from 'react';
import {
  ButtonLoading,
  PrintButton,
} from '../../../../pages/UiElements/CustomButtons';
import InputDatePicker from '../../../utils/fields/DatePicker';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Loader from '../../../../common/Loader';
import { useDispatch, useSelector } from 'react-redux';
import Table from '../../../utils/others/Table';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import { getProductStock } from './productStockSlice';
import SearchInput from '../../../utils/fields/SearchInput';
import { getCategoryDdl } from '../../category/categorySlice';
import CategoryDropdown from '../../../utils/utils-functions/CategoryDropdown';
import dayjs from 'dayjs';
import StockBookPrint from './StockBookPrint';
import { useReactToPrint } from 'react-to-print';
import InputElement from '../../../utils/fields/InputElement';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';

const ProductStock = (user: any) => {
  const dispatch = useDispatch();
  const branchDdlData = useSelector((state) => state.branchDdl);
  const categoryData = useSelector((state) => state.category);
  const stock = useSelector((state) => state.stock);
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [ddlCategory, setDdlCategory] = useState<any[]>([]);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]); // Initialize as an empty array
  const [search, setSearchValue] = useState('');

  const [branchId, setBranchId] = useState<number | string | null>(null);
  const [categoryId, setCategoryId] = useState<number | string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [perPage, setPerPage] = useState<number>(20);
  const [fontSize, setFontSize] = useState<number>(12);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    dispatch(getCategoryDdl());
  }, []);

  useEffect(() => {
    if (Array.isArray(categoryData?.ddlData?.data?.category)) {
      setDdlCategory(categoryData?.ddlData?.data?.category || []);
      setCategoryId(categoryData.ddlData[0]?.id ?? null);
    }
  }, [categoryData]);

  const handlePerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setPerPage(value);
    } else {
      setPerPage(10); // Reset if input is invalid
    }
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);

    if (!isNaN(value)) {
      setFontSize(value);
    } else {
      setFontSize(10); // Reset if input is invalid
    }
  };

  const handlePrint = useReactToPrint({
    content: () => {
      if (!printRef.current) { 
        return null;
      }
      return printRef.current;
    },
    documentTitle: 'Due Report', 
    removeAfterPrint: true,
  });

  useEffect(() => {
    if (!stock.isLoading && Array.isArray(stock?.data)) {
      setTableData(stock?.data);
    }
  }, [stock]);

  const handleBranchChange = (e: any) => {
    setBranchId(e.target.value);
  };

  const handleCategoryChange = (selectedOption: any) => {
    if (selectedOption) {
      setCategoryId(selectedOption.value);
    } else {
      setCategoryId(null); // অথবা default value
    }
  };

  const handleStartDate = (e: any) => {
    setStartDate(e);
  };

  const handleEndDate = (e: any) => {
    setEndDate(e);
  };

  const handleActionButtonClick = () => {
    const startD = dayjs(startDate).format('YYYY-MM-DD'); // Adjust format as needed
    const endD = dayjs(endDate).format('YYYY-MM-DD'); // Adjust format as needed
    dispatch(
      getProductStock({
        branchId,
        categoryId,
        search,
        startDate: startD,
        endDate: endD,
      }),
    );
  };

  useEffect(() => {
    if (
      branchDdlData?.protectedData?.data &&
      branchDdlData?.protectedData?.transactionDate
    ) {
      setDropdownData(branchDdlData?.protectedData?.data);
      setDdlCategory(categoryData?.data);
      const [day, month, year] =
        branchDdlData?.protectedData?.transactionDate.split('/');
      const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));
      setStartDate(parsedDate);
      setEndDate(parsedDate);
      setBranchId(user.user.branch_id);
    }
  }, [branchDdlData?.protectedData]);

  const columns = [
    {
      key: 'sl_number',
      header: 'Sl. No',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'product_name',
      header: 'Product Name',
    },
    {
      key: 'opening',
      header: 'Opening',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <>
          <p>
            { thousandSeparator ( Math.floor(row.opening),0)}
            { Math.floor(row.opening) ? <span className="text-sm "> ({row.unit})</span> : ''}
          </p>
        </>
      ),
    },
    {
      key: 'stock_in',
      header: 'Stock In',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <>
          {row.stock_in ? (
            <span className="text-sm ">
              { thousandSeparator( Math.floor(row.stock_in),0)} ({row.unit})
            </span>
          ) : (
            '-'
          )}
        </>
      ),
    },
    {
      key: 'stock_out',
      header: 'Stock Out',
      render: (row: any) => (
        <>
          {row.stock_out ? (
            <span className="text-sm ">
              { thousandSeparator (Math.floor(row.stock_out),0)} ({row.unit})
            </span>
          ) : (
            '-'
          )}
        </>
      ),
      headerClass: 'text-right',
      cellClass: 'text-right',
    },
    {
      key: 'balance',
      header: 'balance',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <>
          {Math.floor(row.balance) ? (
            <span className="text-sm ">
              { thousandSeparator (Math.floor(row.balance),0)} ({row.unit})
            </span>
          ) : (
            '-'
          )}
        </>
      ),
    },
  ];

const optionsWithAll = [
  { id: '', name: 'All Product' },
  ...(Array.isArray(ddlCategory) ? ddlCategory : []),
];

  return (
    <div className="">
      <HelmetTitle title={'Product Stock'} />
      <div className="mb-2">
        <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-4 gap-y-2">
          <div className="">
            <div>
              {' '}
              <label htmlFor="">Select Branch</label>
            </div>
            <div>
              {branchDdlData.isLoading == true ? <Loader /> : ''}
              <BranchDropdown
                onChange={handleBranchChange}
                className="w-full font-medium text-sm pl-1.5 pt-3 pb-2"
                branchDdl={dropdownData}
              />
            </div>
          </div>
          <div className="">
            <div>
              {' '}
              <label htmlFor="">Select Category</label>
            </div>
            <div>
              {categoryData.isLoading ? (
                <Loader />
              ) : (
                <CategoryDropdown
                  onChange={handleCategoryChange}
                  className="w-full font-medium text-sm"
                  categoryDdl={optionsWithAll}
                />
              )}
            </div>
          </div>
          <div className="grid grid-cols-2">
            <div className='mr-2'>
              <div>{' '}<label htmlFor="">Search by Name</label>
              </div>
              <SearchInput
                search={search}
                setSearchValue={setSearchValue}
                className="text-nowrap h-8 bg-transparent w-full"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="w-full">
                <label htmlFor="">Start Date</label>
                <InputDatePicker
                  setCurrentDate={handleStartDate}
                  className="w-full font-medium text-sm h-8"
                  selectedDate={startDate}
                  setSelectedDate={setStartDate}
                />
              </div>
              <div className="w-full">
                <label htmlFor="">End Date</label>
                <InputDatePicker
                  setCurrentDate={handleEndDate}
                  className="w-full font-medium text-sm h-8"
                  selectedDate={endDate}
                  setSelectedDate={setEndDate}
                />
              </div>
            </div>
          </div>
          <div className="sm:grid md:flex gap-x-3 ">
            <div className="flex w-full">
              <div className="mr-2">
                <InputElement
                  id="perPage"
                  name="perPage"
                  label="Rows"
                  value={perPage.toString()}
                  onChange={handlePerPageChange}
                  type="text"
                  className="font-medium text-sm h-8 w-12"
                />
              </div>
              <div className="mr-2">
                <InputElement
                  id="fontSize"
                  name="fontSize"
                  label="Font"
                  value={fontSize.toString()}
                  onChange={handleFontSizeChange}
                  type="text"
                  className="font-medium text-sm h-8 w-12"
                />
              </div>
              <div className='mt-6'>
                <ButtonLoading
                onClick={handleActionButtonClick}
                buttonLoading={buttonLoading}
                label="Run"
                className="h-8 w-full"
              />
              </div>
              <PrintButton
                onClick={handlePrint}
                label="Print"
                className="ml-2 mt-6  pt-[0.45rem] pb-[0.45rem] h-8"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="overflow-y-auto">
        {stock.isLoading && <Loader />}
        <Table columns={columns} data={tableData || []} />{' '}
        {/* === Hidden Print Component === */}
        <div className="hidden">
          <StockBookPrint
            ref={printRef}
            rows={tableData || []} // আপনার data
            startDate={
              startDate ? dayjs(startDate).format('DD/MM/YYYY') : undefined
            }
            endDate={endDate ? dayjs(endDate).format('DD/MM/YYYY') : undefined}
            title="Product Stock"
            rowsPerPage={Number(perPage)}
            fontSize={Number(fontSize)}
          />
        </div>
      </div>
    </div>
  );
};

export default ProductStock;
