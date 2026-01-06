import { FiClock, FiFileText } from "react-icons/fi";
import { ButtonLoading } from "../../../pages/UiElements/CustomButtons";
import InputElement from "../fields/InputElement";
import BranchDropdown from "../utils-functions/BranchDropdown";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

const HistorySearchForm = ({
  voucherNo,
  setVoucherNo,
  loading,
  onSubmit,
  user,
  branchId,        // ✅ from parent
  setBranchId,     // ✅ from parent
}) => {
  const branchDdlData = useSelector((state) => state.branchDdl);
  const [dropdownData, setDropdownData] = useState<any[]>([]);

  const handleBranchChange = (e: any) => {
    // select value string হয়, তাই number করে নিন
    setBranchId(Number(e.target.value));
  };

  useEffect(() => {
    if (branchDdlData?.protectedData?.data) {
      setDropdownData(branchDdlData.protectedData.data);

      // ✅ branchId null থাকলে শুধু default set (user choice overwrite হবে না)
      if (branchId === null) {
        setBranchId(user?.user?.branch_id ?? null);
      }
    } else {
      setDropdownData([]);
    }
  }, [branchDdlData?.protectedData?.data]); // intentionally only data change

  return (
    <div className="grid grid-cols-1 gap-2 w-full md:w-1/3 mx-auto">
      <div>
        <label className="text-gray-900 dark:text-gray-100 !mb-0">Select Branch</label>
      </div>

      <div className="w-full">
        <BranchDropdown
          value={branchId ?? ""}          // ✅ controlled
          onChange={handleBranchChange}
          className="w-60 font-medium text-sm p-1.5"
          branchDdl={dropdownData}
        />
      </div>

      <InputElement
        id="voucherNo"
        name="voucherNo"
        value={voucherNo}
        label="Voucher Number"
        placeholder="Enter Voucher Number"
        onChange={(e) => setVoucherNo(e.target.value)}
      />

      <ButtonLoading
        label="View History"
        buttonLoading={loading}
        className="p-2 dark:text-gray-200"
        icon={<FiClock className="mr-2" />}
        onClick={onSubmit}
      />
    </div>
  );
};

export default HistorySearchForm;
