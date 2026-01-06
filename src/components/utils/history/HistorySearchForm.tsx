// import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';

import { FiFileText } from "react-icons/fi";
import { ButtonLoading } from "../../../pages/UiElements/CustomButtons";
import InputElement from "../fields/InputElement";

/* =====================================================
   Search Form (small component)
===================================================== */
const HistorySearchForm = ({
  voucherNo,
  setVoucherNo,
  loading,
  onSubmit,
}) => {
  return (
    <div className="grid grid-cols-1 gap-2 w-full md:w-1/3 mx-auto mt-5">
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
        icon={<FiFileText />}
        onClick={onSubmit}
      />
    </div>
  );
};

export default HistorySearchForm;