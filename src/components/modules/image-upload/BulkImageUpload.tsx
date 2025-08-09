import React, { useEffect, useState } from 'react';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { useDispatch, useSelector } from 'react-redux';
import InputDatePicker from '../../utils/fields/DatePicker';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import Loader from '../../../common/Loader';
import { Attachment, ImageVoucherType } from '../../utils/fields/DataConstant';
import { toast } from 'react-toastify';
import { uploadImage } from './imageUploadSlice';

const BulkImageUpload: React.FC = (user: any) => {
  const [files, setFiles] = useState<File[] | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [buttonLoading, setButtonLoading] = useState(false);
  const branchDdlData = useSelector((state) => state.branchDdl);
  const settings = useSelector((state) => state.settings);
  const imageUpload = useSelector((state) => state.imageUpload);
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const dispatch = useDispatch();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleBranchChange = (e: any) => {
    setBranchId(e.target.value);
    setVoucherImageFormData((prev) => ({
      ...prev,
      branch_id: e.target.value,
    }));
  };
  const handleStartDate = (date: Date) => {
    setStartDate(date);
  };

  const handleEndDate = (date: Date) => {
    setEndDate(date);
  };

  const handleUpload = () => {
    setButtonLoading(true);
    setTimeout(() => {
      setButtonLoading(false);
      alert('Images uploaded successfully!');
    }, 2000);
  };

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

  const handleActionButtonClick = async () => {
    if (!files || files.length === 0) {
      toast.warning('Please select files first!');
      return;
    }

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images[]', file); // append all selected images
    });

    // Logging FormData entries
    for (let [key, value] of formData.entries()) {
      console.log(key, value); // Will log the key and value pairs
    }

    // Continue with appending other fields to FormData
    formData.append('branch_id', voucherImageFormData.branch_id.toString());
    formData.append('voucher_type', voucherImageFormData.voucher_type);
    formData.append('image_type', voucherImageFormData.image_type);
    formData.append('start_date', voucherImageFormData.start_date);
    formData.append('end_date', voucherImageFormData.end_date);

    // Attach updated vouchers data (for sending updated data)
    formData.append('vouchers', JSON.stringify(voucherImageFormData.vouchers));

    setButtonLoading(true);

    try {
      // Assuming your backend endpoint for uploading is '/upload-voucher-images'
      // const response = await axios.post('/upload-voucher-images', formData, {
      //   headers: {
      //     'Content-Type': 'multipart/form-data',
      //   },
      // });
      await dispatch(uploadImage(formData, id));

      // Handle successful response
      toast.success('Voucher uploaded successfully!');
      setButtonLoading(false);
    } catch (error) {
      toast.error('Failed to upload data');
      setButtonLoading(false);
    }
  };

  const [voucherImageFormData, setVoucherImageFormData] = useState({
    branch_id: user.user.branch_id,
    voucher_type: '',
    image_type: '',
    start_date: settings?.data?.trx_dt,
    end_date: settings?.data?.trx_dt,
    vouchers: [], // Initialize with an empty array
  });

  const handleOnSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setVoucherImageFormData({ ...voucherImageFormData, [name]: value });

    console.log('Selected value:', voucherImageFormData);
  };

  return (
    <div className="max-w-screen-lg mx-auto p-4">
      <div className="grid sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-9 w-full gap-2">
        {/* 1. Branch Dropdown (wide) */}
        <div className="col-span-1 lg:col-span-2">
          <label htmlFor="">Select Branch</label>
          <div className="w-full">
            {branchDdlData.isLoading === true ? <Loader /> : ''}
            <BranchDropdown
              defaultValue={user?.user?.branch_id}
              onChange={handleBranchChange}
              className="w-full font-medium text-sm p-1.5"
              branchDdl={dropdownData}
            />
          </div>
        </div>

        {/* 2. Image Voucher Type Dropdown (wide) */}
        <div className="col-span-1 lg:col-span-2">
          <DropdownCommon
            id="voucher_type"
            name="voucher_type"
            label="Voucher Type"
            onChange={handleOnSelectChange}
            className="h-[2.0rem] bg-transparent w-full"
            data={ImageVoucherType}
          />
        </div>

        {/* 3. image_type Dropdown (wide) */}
        <div className="col-span-1 lg:col-span-2">
          <DropdownCommon
            id="image_type"
            name="image_type"
            label="Attachment Type"
            onChange={handleOnSelectChange}
            className="h-[2.0rem] bg-transparent w-full"
            data={Attachment}
          />
        </div>

        {/* 4. Start Date (narrow) */}
        <div className="lg:col-span-1 w-full">
          <label htmlFor="">Start Date</label>
          <InputDatePicker
            setCurrentDate={handleStartDate}
            className="font-medium text-sm w-full h-8"
            selectedDate={startDate}
            setSelectedDate={setStartDate}
          />
        </div>

        {/* 5. End Date (narrow) */}
        <div className="lg:col-span-1 w-full">
          <label htmlFor="">End Date</label>
          <InputDatePicker
            setCurrentDate={handleEndDate}
            className="font-medium text-sm w-full h-8"
            selectedDate={endDate}
            setSelectedDate={setEndDate}
          />
        </div>

        {/* 6. Run Button (narrow) */}
        <div className="lg:col-span-1 w-full">
          <ButtonLoading
            onClick={handleActionButtonClick}
            buttonLoading={buttonLoading}
            label="Run"
            className="mt-0 md:mt-6 pt-[0.45rem] pb-[0.45rem] w-full"
          />
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              multiple
              onChange={handleFileChange}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer text-blue-600 underline"
            >
              Choose Voucher
            </label>
            {files && files.length > 0 && (
              <span className="ml-2 text-sm text-gray-500">
                {files.length} file(s) selected
              </span>
            )}
          </div>
          <ButtonLoading
            onClick={handleUpload}
            buttonLoading={buttonLoading}
            label="Upload"
            className="bg-green-600 text-white px-6 py-2 rounded-md"
          />
        </div>
      </div>

      {/* Image Viewer */}
      {files && files.length > 0 && (
        <div className="mt-6">
          {/* <h3 className="text-xl font-medium mb-4">Voucher Viewer</h3> */}
          <div className="grid grid-cols-3 gap-4">
            {files.map((file, index) => (
              <div key={index} className="border p-2 rounded-md">
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-full h-auto object-cover"
                />
                <p className="mt-2 text-sm">{file.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkImageUpload;
