import React, { useEffect, useState } from 'react';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { useDispatch, useSelector } from 'react-redux';
import InputDatePicker from '../../utils/fields/DatePicker';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import Loader from '../../../common/Loader';
import { Attachment, ImageVoucherType } from '../../utils/fields/DataConstant';
import { toast } from 'react-toastify';
import { bulkUploadImages } from './imageUploadSlice';
import dayjs from 'dayjs';
import { FiX } from 'react-icons/fi';
import HelmetTitle from '../../utils/others/HelmetTitle';

export default function BulkImageUpload(user: any): JSX.Element {
  const [files, setFiles] = useState<File[]>([]);
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
      const selectedFiles = Array.from(e.target.files).filter(
        (file) => file.size <= 5 * 1024 * 1024,
      ); // 5MB size limit
      if (selectedFiles.length !== e.target.files.length) {
        toast.warning('Some files are too large and were not added.');
      }
      setFiles(selectedFiles);
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
  const handleBranchChange = (e: any) => {
    setBranchId(e.target.value);
    setVoucherImageFormData((prev) => ({
      ...prev,
      branch_id: e.target.value,
    }));
  };
  const handleStartDate = (date: Date) => {
    setStartDate(date);
    setVoucherImageFormData((prev) => ({
      ...prev,
      start_date: dayjs(date).format('YYYY-MM-DD'),
    }));
  };

  // console.log( "Settings:", settings?.data?.trx_dt)

  const handleEndDate = (date: Date) => {
    setEndDate(date);
    setVoucherImageFormData((prev) => ({
      ...prev,
      end_date: dayjs(date).format('YYYY-MM-DD'),
    }));
  };

  useEffect(() => {
    return () => {
      // Cleanup object URLs when component unmounts
      files.forEach((file) => URL.revokeObjectURL(file));
    };
  }, [files]);

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

  const handleUploadBulkImage = async () => {
    setButtonLoading(true);

    if (!files || files.length === 0) {
      toast.warning('Please select files first!');
      setButtonLoading(false); // Stop loading immediately
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

    try {
      await dispatch(
        bulkUploadImages(formData, (message, success) => {
          if (success) {
            console.log('Success Message:', message);
            toast.success(message);

            // Clear the files state after successful upload
            setFiles([]); // This should be fine now, as the upload is successful
          } else {
            console.log('Error Message:', message);
            toast.info(message);
          }
        }),
      );

      // After uploading, stop the loading button
      setButtonLoading(false);
    } catch (error) {
      toast.error('Failed to upload data');
      setButtonLoading(false); // Stop loading immediately on error
    }
  };

  const handleOnSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setVoucherImageFormData({ ...voucherImageFormData, [name]: value });
  };

  const handleRemoveFile = (index: number) => {
    if (window.confirm('Are you sure you want to remove this file?')) {
      const updatedFiles = files.filter((_, i) => i !== index);
      setFiles(updatedFiles);
    }
  };

  return (
    <div className="mx-auto p-4">
      <HelmetTitle title={'Bulk Voucher Upload'} />
      <div className="grid sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-9 w-full gap-2">
        {/* 1. Branch Dropdown (wide) */}
        <div className="col-span-1 lg:col-span-2">
          <label className='font-sm text-gray-900 dark:text-gray-100' htmlFor="">Select Branch</label>
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
          <label className='text-sm text-gray-900 dark:text-gray-100' htmlFor="">Start Date</label>
          <InputDatePicker
            setCurrentDate={handleStartDate}
            className="font-medium text-sm w-full h-8"
            selectedDate={startDate}
            setSelectedDate={setStartDate}
          />
        </div>

        {/* 5. End Date (narrow) */}
        <div className="lg:col-span-1 w-full">
          <label className='text-sm text-gray-900 dark:text-gray-100' htmlFor="">End Date</label>
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
            onClick={handleUploadBulkImage}
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
              className="cursor-pointer text-black dark:text-white underline font-bold text-xl"
            >
              Choose Voucher
            </label>
            {files && files.length > 0 && (
              <span className="ml-2 text-sm text-black dark:text-white">
                {files.length} file(s) selected
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Image Viewer */}
      {files && files.length > 0 && (
        <div className="mt-6">
          {/* <h3 className="text-xl font-medium mb-4">Voucher Viewer</h3> */}
          <div className="grid grid-cols-3 gap-4">
            {files.map((file, index) => (
              <div key={index} className="border p-2 rounded-md relative">
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-full h-auto object-cover"
                />
                <p className="mt-2 text-sm">{file.name}</p>
                {/* Remove button */}
                <button
                  className="mt-2 text-red-500 text-3xl absolute top-2 right-4 bg-gray-100 border border-gray-300"
                  onClick={() => handleRemoveFile(index)}
                >
                  <FiX />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// export default BulkImageUpload;
