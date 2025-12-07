import React, { useEffect, useState } from 'react';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import { useDispatch, useSelector } from 'react-redux';
import Loader from '../../../../common/Loader';
import InputDatePicker from '../../../utils/fields/DatePicker';
import InputElement from '../../../utils/fields/InputElement';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';

const ItemChart = (user: any) => {
  const dispatch = useDispatch();
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null); // Define state with type
  const [endDate, setEndDate] = useState<Date | null>(null); // Define state with type
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);
  const [isSelected, setIsSelected] = useState<number | string>('');
  const [perPage, setPerPage] = useState<number>(12);
  const [fontSize, setFontSize] = useState<number>(12); 
  const [branchPad, setBranchPad] = useState<string | null>(null);
  

    useEffect(() => {
      dispatch(getDdlProtectedBranch());
      setIsSelected(user.user.branch_id);
      setBranchId(user.user.branch_id);
      setBranchPad(user?.user?.branch_id.toString().padStart(4, '0'));
    }, []);

    useEffect(() => {
      if (
        branchDdlData?.protectedData?.data &&
        branchDdlData?.protectedData?.transactionDate
      ) {
        setDropdownData(branchDdlData?.protectedData?.data);
        const [day, month, year] =
          branchDdlData?.protectedData?.transactionDate.split('/');
        const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));
        setStartDate(parsedDate);
        setEndDate(parsedDate);
        setBranchId(user.user.branch_id);
      } else {
      }
    }, [branchDdlData?.protectedData?.data]);

  const handleBranchChange = (e: any) => {
    setBranchId(e.target.value);
  };
    const handleStartDate = (e: any) => {
    setStartDate(e);
  };
  const handleEndDate = (e: any) => {
    setEndDate(e);
  };
  return (
  <div className="">
  <HelmetTitle title={'Item Chart'} />

  <div className="mb-2">
    <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 w-full gap-2 items-end">

      {/* ✅ Select Branch */}
      <div>
        <label className="text-sm font-medium">Select Branch</label>
        <div className="w-full">
          {branchDdlData?.isLoading === true && <Loader />}
          <BranchDropdown
            defaultValue={user?.user?.branch_id}
            onChange={handleBranchChange}
            className="w-full font-medium text-sm p-1.5"
            branchDdl={dropdownData}
          />
        </div>
      </div>

      {/* ✅ Item */}
      <div>
        <label className="text-sm font-medium">Select Branch</label>
        <div className="w-full">
          {branchDdlData?.isLoading === true && <Loader />}
          <BranchDropdown
            defaultValue={user?.user?.branch_id}
            onChange={handleBranchChange}
            className="w-full font-medium text-sm p-1.5"
            branchDdl={dropdownData}
          />
        </div>
      </div>

      {/* ✅ Start Date (Period 1) */}
      <div>
        <label className="text-sm font-medium">Start Date</label>
        <InputDatePicker
          setCurrentDate={handleStartDate}
          className="font-medium text-sm w-full h-9"
          selectedDate={startDate}
          setSelectedDate={setStartDate}
        />
      </div>

      {/* ✅ End Date (Period 1) */}
      <div>
        <label className="text-sm font-medium">End Date</label>
        <InputDatePicker
          setCurrentDate={handleEndDate}
          className="font-medium text-sm w-full h-9"
          selectedDate={endDate}
          setSelectedDate={setEndDate}
        />
      </div>

      {/* ✅ Start Date (Period 2) */}
      <div>
        <label className="text-sm font-medium">Start Date</label>
        <InputDatePicker
          setCurrentDate={handleEndDate}
          className="font-medium text-sm w-full h-9"
          selectedDate={endDate}
          setSelectedDate={setEndDate}
        />
      </div>

      {/* ✅ End Date (Period 2) + ✅ Button in SAME COLUMN */}
      <div className="flex flex-col justify-end">
        <label className="text-sm font-medium">End Date</label>
        <InputDatePicker
          setCurrentDate={handleEndDate}
          className="font-medium text-sm w-full h-9"
          selectedDate={endDate}
          setSelectedDate={setEndDate}
        />

        {/* ✅ Perfect Button Placement */}
        <ButtonLoading
          onClick={() => {}}
          buttonLoading={buttonLoading}
          label="Run"
          className="mt-2 w-full h-9"
        />
      </div>

    </div>
  </div>

  <div className="overflow-y-auto mt-3"></div>
</div>

);

};

export default ItemChart;
