import React, { useEffect, useState } from "react";
import HelmetTitle from "../../../utils/others/HelmetTitle";
import BranchDropdown from "../../../utils/utils-functions/BranchDropdown";
import { useDispatch, useSelector } from "react-redux";
import Loader from "../../../../common/Loader";
import InputDatePicker from "../../../utils/fields/DatePicker";
import { ButtonLoading } from "../../../../pages/UiElements/CustomButtons";
import { getDdlProtectedBranch } from "../../branch/ddlBranchSlider";
import DdlMultiline from "../../../utils/utils-functions/DdlMultiline";
import CompareSingleItem from "../../dashboard/CompareSingleItem";

const ItemChart = (user) => {
  const dispatch = useDispatch();
  const branchDdlData = useSelector((state) => state.branchDdl);

  const [dropdownData, setDropdownData] = useState([]);
  const [branchId, setBranchId] = useState(null);

  // ✅✅✅ আলাদা আলাদা Date State
  const [p1StartDate, setP1StartDate] = useState(null);
  const [p1EndDate, setP1EndDate] = useState(null);
  const [p2StartDate, setP2StartDate] = useState(null);
  const [p2EndDate, setP2EndDate] = useState(null);

  const [buttonLoading, setButtonLoading] = useState(false);
  const [ledgerId, setLedgerAccount] = useState(null);

  /* ===============================
   ✅ INITIAL LOAD
  ================================= */
  useEffect(() => {
    dispatch(getDdlProtectedBranch());

    if (user?.user?.branch_id) {
      setBranchId(user.user.branch_id);
    }
  }, []);

  /* ===============================
   ✅ SET DROPDOWN & DEFAULT DATE
  ================================= */
  useEffect(() => {
    if (
      branchDdlData?.protectedData?.data &&
      branchDdlData?.protectedData?.transactionDate
    ) {
      setDropdownData(branchDdlData?.protectedData?.data);

      const [day, month, year] =
        branchDdlData?.protectedData?.transactionDate.split("/");

      const parsedDate = new Date(
        Number(year),
        Number(month) - 1,
        Number(day)
      );

      // ✅✅✅ Default সবগুলো আলাদা করে সেট
      setP1StartDate(parsedDate);
      setP1EndDate(parsedDate);
      setP2StartDate(parsedDate);
      setP2EndDate(parsedDate);

      if (user?.user?.branch_id) {
        setBranchId(user.user.branch_id);
      }
    }
  }, [branchDdlData?.protectedData?.data]);

  /* ===============================
   ✅ HANDLERS
  ================================= */
  const handleBranchChange = (e) => {
    setBranchId(e.target.value);
  };

  const selectedLedgerOptionHandler = (option) => {
    setLedgerAccount(option.value);
  };



  /* ===============================
   ✅ UI
  ================================= */
  return (
    <div className="">
      <HelmetTitle title={"Item Chart"} />

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

          {/* ✅ Select Account */}
          <div>
            <label className="text-sm font-medium">Select Account</label>
            <DdlMultiline onSelect={selectedLedgerOptionHandler} acType={""} />
          </div>

          {/* ✅ Period 1 Start */}
          <div>
            <label className="text-sm font-medium">Start Date (P1)</label>
            <InputDatePicker
              setCurrentDate={setP1StartDate}
              selectedDate={p1StartDate}
              setSelectedDate={setP1StartDate}
              className="font-medium text-sm w-full h-9"
            />
          </div>

          {/* ✅ Period 1 End */}
          <div>
            <label className="text-sm font-medium">End Date (P1)</label>
            <InputDatePicker
              setCurrentDate={setP1EndDate}
              selectedDate={p1EndDate}
              setSelectedDate={setP1EndDate}
              className="font-medium text-sm w-full h-9"
            />
          </div>

          {/* ✅ Period 2 Start */}
          <div>
            <label className="text-sm font-medium">Start Date (P2)</label>
            <InputDatePicker
              setCurrentDate={setP2StartDate}
              selectedDate={p2StartDate}
              setSelectedDate={setP2StartDate}
              className="font-medium text-sm w-full h-9"
            />
          </div>

          {/* ✅ Period 2 End */}
          <div>
            <label className="text-sm font-medium">End Date (P2)</label>
            <InputDatePicker
              setCurrentDate={setP2EndDate}
              selectedDate={p2EndDate}
              setSelectedDate={setP2EndDate}
              className="font-medium text-sm w-full h-9"
            />
          </div>

          {/* ✅ Run Button */}
          {/* <ButtonLoading
            onClick={handleRun}
            buttonLoading={buttonLoading}
            label="Run"
            className="mt-2 w-full h-9"
          /> */}
        </div>
      </div>

      {/* ✅ Compare Chart */}
      <div className="mt-3">
        <CompareSingleItem
          branchId={branchId}
          ledgerId={ledgerId}
          startDate1={p1StartDate}
          endDate1={p1EndDate}
          startDate2={p2StartDate}
          endDate2={p2EndDate}
          run={buttonLoading}
        />
      </div>
    </div>
  );
};

export default ItemChart;
