import React, { useEffect, useState } from 'react';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import InputDatePicker from '../../../utils/fields/DatePicker';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Loader from '../../../../common/Loader';
import { useDispatch, useSelector } from 'react-redux';
import Table from '../../../utils/others/Table';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import { getCatWiseInOut } from './catWiseInOutSlice';
import SearchInput from '../../../utils/fields/SearchInput';
import { getCategoryDdl } from '../../category/categorySlice';
import CategoryDropdown from '../../../utils/utils-functions/CategoryDropdown';
import { orderType } from '../../../utils/fields/DataConstant';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
const CatWiseInOut = (user: any) => {
  const dispatch = useDispatch();
  const branchDdlData = useSelector((state) => state.branchDdl);
  const categoryData = useSelector((state) => state.category);
  const inOutData = useSelector((state) => state.catWiseInOut);
  const stock = useSelector((state) => state.stock);
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [ddlCategory, setDdlCategory] = useState<any[]>([]);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]); // Initialize as an empty array
  const [reportType, setReportType] = useState('');

  const [branchId, setBranchId] = useState<number | string | null>(null);
  const [categoryId, setCategoryId] = useState<number | string | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);



  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    dispatch(getCategoryDdl());
    // setBranchId(user?.user?.branch_id);
    if (Array.isArray(categoryData)) {
      setDdlCategory(categoryData); // Use data if it's an array
      setCategoryId(ddlCategory[0]?.id);
    } else {
      setDdlCategory([]); // Fallback to empty array
    }
  }, []);


  useEffect(() => {
    if (
      branchDdlData?.protectedData?.data &&
      branchDdlData?.protectedData?.transactionDate
    ) {
      setDropdownData(branchDdlData?.protectedData?.data);
      setDdlCategory(categoryData?.data);
      const [day, month, year] = branchDdlData?.protectedData?.transactionDate.split('/');
      const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));
      setStartDate(parsedDate);
      setEndDate(parsedDate);
      setBranchId(user.user.branch_id);
    }
  }, [branchDdlData?.protectedData]);



  useEffect(() => {
    if (!stock.isLoading && Array.isArray(stock?.data)) {
      setTableData(stock?.data);
    }
  }, [stock]);

  const handleBranchChange = (e: any) => {
    setBranchId(e.target.value);
  };

  const handleCategoryChange = (e: any) => {
    setCategoryId(e.target.value);
  };

  const handleStartDate = (e: any) => {
    setStartDate(e);
  };

  const handleEndDate = (e: any) => {
    setEndDate(e);
  };

  const handleReportTypeChange = (e: any) => {
    setReportType(e.target.value);
  }

  const handleActionButtonClick = () => {
    if (!(reportType || '').trim()) {
      toast.info('Please select report type.');
      return;
    }

    const startD = dayjs(startDate).format('YYYY-MM-DD'); // Adjust format as needed
    const endD = dayjs(endDate).format('YYYY-MM-DD'); // Adjust format as needed

    dispatch(getCatWiseInOut({ branchId, reportType, categoryId, startDate: startD, endDate: endD }));
  };

  useEffect(() => {
    // Update table data only when ledgerData is valid
    if (!inOutData.isLoading && Array.isArray(inOutData?.data)) {
      setTableData(inOutData?.data);
    }
  }, [inOutData]);


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
      key: 'cat_name',
      header: 'Cagegery Name',
    },
    {
      key: 'unit',
      header: 'Unit',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'quantity',
      header: 'Quantity',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <>
          <p>{ thousandSeparator (row.quantity, 0)}</p>
        </>
      ),
    }
  ];

  return (
    <div className="">
      <HelmetTitle title={'Category wise in and out'} />
      <div className="mb-2 ">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
          <div className=''>
            <div>
              {' '}
              <label htmlFor="">Select Branch</label>
            </div>
            <div>
              {branchDdlData.isLoading == true ? <Loader /> : ''}
              <BranchDropdown
                onChange={handleBranchChange}
                className="w-full font-medium text-sm p-1.5"
                branchDdl={dropdownData}
              />
            </div>
          </div>
          <div className=''>
            <div>
              {' '}
              <label htmlFor="">Select Category</label>
            </div>
            <div>
              {categoryData.isLoading == true ? <Loader /> : ''}
              <CategoryDropdown
                onChange={handleCategoryChange}
                className="w-full font-medium text-sm p-1.5"
                categoryDdl={ddlCategory?.category}
              />
            </div>
          </div>
          <div className=''>
            <div>
              {categoryData.isLoading == true ? <Loader /> : ''}
              <DropdownCommon id="category_type_id"
                name={'category_type_id'}
                label="Report Type"
                onChange={handleReportTypeChange}
                className="h-[2.1rem] bg-transparent"
                data={orderType} />
            </div>
          </div>
          <div className='sm:grid md:flex gap-x-3 '>
            <div className='w-full'>
              <label htmlFor="">Start Date</label>
              <InputDatePicker
                setCurrentDate={handleStartDate}
                className="w-full font-medium text-sm h-8.5"
                selectedDate={startDate}
                setSelectedDate={setStartDate}
              />
            </div>
            <div className='w-full'>
              <label htmlFor="">End Date</label>
              <InputDatePicker
                setCurrentDate={handleEndDate}
                className="w-full font-medium text-sm h-8.5"
                selectedDate={endDate}
                setSelectedDate={setEndDate}
              />
            </div>
            <div className='mt-1 md:mt-6 w-full'>
              <ButtonLoading
                onClick={handleActionButtonClick}
                buttonLoading={buttonLoading}
                label="Run"
                className="pt-[0.45rem] pb-[0.45rem] w-full"
              />
            </div>
          </div>
        </div>
      </div>
      <div className='overflow-y-auto'>
        {inOutData.isLoading && <Loader />}
        <Table columns={columns} data={tableData || []} /> {/* Ensure data is always an array */}
      </div>

    </div>
  );
};

export default CatWiseInOut;