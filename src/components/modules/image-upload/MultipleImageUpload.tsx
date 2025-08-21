import React, { useEffect, useState } from 'react';
import { getVoucherForImage, uploadImage } from './imageUploadSlice';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import InputDatePicker from '../../utils/fields/DatePicker';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import Loader from '../../../common/Loader';
import { getDdlProtectedBranch } from '../branch/ddlBranchSlider';
import dayjs from 'dayjs';
import HelmetTitle from '../../utils/others/HelmetTitle';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import { Attachment, ImageVoucherType } from '../../utils/fields/DataConstant';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import ImagePopup from '../../utils/others/ImagePopup';
import Table from '../../utils/others/Table';

type FileMap = { [voucherId: number]: File[] };
type PreviewMap = { [voucherId: number]: string[] };
type LoadingMap = { [voucherId: number]: boolean };
type StatusMap = {
  [voucherId: number]: 'success' | 'error' | null | undefined;
};

export default function VoucherUpload(user: any): JSX.Element {
  const branchDdlData = useSelector((state) => state.branchDdl);
  const settings = useSelector((state) => state.settings);
  const imageUpload = useSelector((state) => state.imageUpload);

  const [files, setFiles] = useState<FileMap>({});
  const [previews, setPreviews] = useState<PreviewMap>({});
  const [loading, setLoading] = useState<LoadingMap>({});
  const [uploadStatus, setUploadStatus] = useState<StatusMap>({});
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null); // Define state with type
  const [endDate, setEndDate] = useState<Date | null>(null); // Define state with type
  const [selectedOption, setSelectedOption] = useState<OptionType | null>(null);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);

  const [branchId, setBranchId] = useState<number | null>(null);
  const [buttonLoading, setButtonLoading] = useState(false);

  interface Voucher {
    mtm_id: number;
    serial_no: number;
    vr_no: string;
    branchPad: string;
    voucher_image: string;
    title: string;
    vr_dt: string;
    nam: string;
    debit: number;
    credit: number;
    // add other properties you use
  }

  interface OptionType {
    value: string;
    label: string;
    additionalDetails: string;
  }

  const [voucherImageFormData, setVoucherImageFormData] = useState({
    branch_id: user.user.branch_id,
    voucher_type: '',
    image_type: '',
    start_date: settings?.data?.trx_dt,
    end_date: settings?.data?.trx_dt,
  });

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    // setIsSelected(user.user.branch_id);
    setBranchId(user.user.branch_id);
    // setBranchPad(user?.user?.branch_id.toString().padStart(4, '0'));
  }, []);

  useEffect(() => {
    if (Array.isArray(imageUpload?.dataForImage?.data)) {
      setVouchers(imageUpload.dataForImage?.data);
      setTableData(imageUpload.dataForImage?.data);
    } else {
      setVouchers([]);
    }
  }, [imageUpload?.dataForImage?.data]);

  useEffect(() => {
    if (startDate && endDate) {
      setVoucherImageFormData((prev) => ({
        ...prev,
        start_date: dayjs(startDate).format('YYYY-MM-DD'),
        end_date: dayjs(endDate).format('YYYY-MM-DD'),
      }));
    }
  }, [startDate, endDate]);

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

  const handleFileChange = (id: number, selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const fileArray = Array.from(selectedFiles);

    setFiles((prev) => ({ ...prev, [id]: fileArray }));
    setUploadStatus((prev) => ({ ...prev, [id]: null }));

    const previewURLs: string[] = [];

    fileArray.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          previewURLs.push(reader.result);
          if (previewURLs.length === fileArray.length) {
            setPreviews((prev) => ({ ...prev, [id]: previewURLs }));
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async (id: number) => {
    const selectedFiles = files[id];
    if (!selectedFiles?.length) {
      toast.warning('Please select files first!');
      return;
    }

    setLoading((prev) => ({ ...prev, [id]: true }));
    setUploadStatus((prev) => ({ ...prev, [id]: null }));

    try {
      const formData = new FormData();

      selectedFiles.forEach((file) => {
        formData.append('images[]', file); // ✅ correct way to send multiple files
      });

      formData.append('voucher_id', id.toString());

      // Debug form data
      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }

      await dispatch(uploadImage(formData, id));

      toast.success('Files uploaded successfully!');
      setUploadStatus((prev) => ({ ...prev, [id]: 'success' }));

      // Clear files after successful upload
      setFiles((prev) => ({ ...prev, [id]: [] }));
      setPreviews((prev) => ({ ...prev, [id]: [] }));
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload files');
      setUploadStatus((prev) => ({ ...prev, [id]: 'error' }));
    } finally {
      setLoading((prev) => ({ ...prev, [id]: false }));
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
    setVoucherImageFormData((prev) => ({
      ...prev,
      start_date: dayjs(date).format('YYYY-MM-DD'),
    }));
  };
  const handleEndDate = (date: Date) => {
    setEndDate(date);
    setVoucherImageFormData((prev) => ({
      ...prev,
      end_date: dayjs(date).format('YYYY-MM-DD'),
    }));
  };

  const handleActionButtonClick = (e: any) => {
    dispatch(getVoucherForImage(voucherImageFormData));
  };

  const handleOnSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setVoucherImageFormData({ ...voucherImageFormData, [name]: value });

    console.log('Selected value:', voucherImageFormData);
  };

  const columns = [
    {
      key: 'serial_no',
      header: 'SL No.',
      headerClass: 'text-center',
      cellClass: 'text-center',
      width: '80px',
    },
    {
      key: 'vr_no',
      header: 'Voucher No.',
      width: '150px',
      render: (row: any) => {
        return (
          <div className="flex flex-col">
            <span className="px-4 py-0">{row.vr_no}</span>
            <span className="px-4 py-0">{row.vr_date}</span>
          </div>
        )
      }
    },
    {
      key: 'nam',
      header: 'Voucher Details',
    },
    {
      key: 'debit',
      header: 'Amount (Tk.)',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => {
        return <span className="px-4 py-2">{row.debit > 0 ? thousandSeparator(row.debit, 0) : thousandSeparator(row.credit, 0)}</span>;
      },
    },
    {
      key: 'voucher_image',
      header: 'Voucher Images',
      render: (row: any) => {
        return (
          <td className="px-4 py-2">
            <div className="flex flex-col gap-2">
              {row.voucher_image ? (
                row.voucher_image.toLowerCase().endsWith('.pdf') ? (
                  <a
                    target="_blank"
                    href={`${imageUpload.dataForImage?.project_directory}/voucher/${row.voucher_image}`}
                    download
                    className="text-blue-600 text-sm"
                  >
                    📄 PDF
                  </a>
                ) : (
                  <ImagePopup
                    title={row.nam} // `row.nam` used as per your provided code
                    branchPad={row.branchPad || ''}
                    voucher_image={row.voucher_image || ''}
                  />
                )
              ) : (
                <>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) =>
                      handleFileChange(row.mtm_id, e.target.files)
                    }
                  />
                  <button
                    onClick={() => handleUpload(row.mtm_id)}
                    disabled={loading[row.mtm_id]}
                    className={`px-3 py-1 rounded text-white ${
                      loading[row.mtm_id]
                        ? 'bg-gray-400'
                        : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                  >
                    {loading[row.mtm_id] ? (
                      <span className="flex items-center gap-1">
                        <span className="animate-spin border-2 border-white border-t-transparent rounded-full h-4 w-4"></span>
                        Uploading...
                      </span>
                    ) : (
                      'Upload'
                    )}
                  </button>

                  {uploadStatus[row.mtm_id] === 'success' && (
                    <p className="text-green-600 text-sm">
                      ✅ Uploaded successfully!
                    </p>
                  )}
                  {uploadStatus[row.mtm_id] === 'error' && (
                    <p className="text-red-600 text-sm">❌ Upload failed.</p>
                  )}
                </>
              )}
            </div>
          </td>
        );
      },
    },
  ];
  return (
    <div className="p-4 mx-auto">
      <HelmetTitle title={'Upload Voucher Image'} />
      <div className="flex justify-between mb-1">
        {selectedOption && (
          <div className="mt-4">
            <p>Selected:</p>
            <p className="font-bold">{selectedOption.label}</p>
          </div>
        )}
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
      </div>

      {/* <Table columns={columns} dataSource={data} /> */}
      <Table columns={columns} data={tableData || []} />
      {/* <table className="w-full border-collapse border">
        <thead className="bg-gray-200 dark:bg-transparent">
          <tr className="text-gray-700 dark:text-gray-200">
            <th className="w-16 border px-2 py-0 text-center">Sl. No</th>
            <th className="border px-4 py-2">Voucher No.</th>
            <th className="border px-4 py-2 text-left">Voucher Details</th>
            <th className="w-36 border px-2 py-2 text-right">Amount (Tk.)</th>
            <th className="border px-4 py-2">Voucher Images</th>
          </tr>
        </thead>
        <tbody className="text-gray-700 dark:text-gray-200">
          {imageUpload?.dataForImage?.length === 0 ? (
            <tr className="text-gray-700 dark:text-gray-200">
              <td colSpan={5} className="text-center py-4">
                No data available
              </td>
            </tr>
          ) : (
            vouchers
              .filter((voucher) => voucher.debit > 0 || voucher.credit > 0)
              .map((voucher, index) => (
                <tr
                  key={index}
                  className="border-t text-gray-900 dark:text-gray-200"
                >
                  <td className="border px-4 py-2 text-center">{index + 1}</td>
                  <td className="border px-2 py-2 text-center w-34">
                    {voucher.vr_no}
                  </td>
                  <td className="border px-4 py-2">{voucher.nam}</td>
                  <td className="border px-4 py-2 text-right">
                    {thousandSeparator(voucher.debit, 0) ||
                      thousandSeparator(voucher.credit, 0)}
                  </td>
                  <td className="border px-4 py-2">
                    <div className="flex flex-col gap-2 ">
                      {voucher.voucher_image ? (
                        voucher.voucher_image.toLowerCase().endsWith('.pdf') ? (
                          <>
                            <a
                              target="_blank"
                              href={`${imageUpload.dataForImage?.project_directory}/voucher/${voucher.voucher_image}`}
                              download
                              className="text-blue-600 text-sm"
                            >
                              📄 PDF
                            </a>
                          </>
                        ) : (
                          <ImagePopup
                            title={voucher.title}
                            branchPad={voucher.branchPad || ''}
                            voucher_image={voucher.voucher_image || ''}
                          />
                        )
                      ) : (
                        <>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) =>
                              handleFileChange(voucher.mtm_id, e.target.files)
                            }
                          />
                          <button
                            onClick={() => handleUpload(voucher.mtm_id)}
                            disabled={loading[voucher.mtm_id]}
                            className={`px-3 py-1 rounded text-white ${
                              loading[voucher.mtm_id]
                                ? 'bg-gray-400'
                                : 'bg-blue-500 hover:bg-blue-600'
                            }`}
                          >
                            {loading[voucher.mtm_id] ? (
                              <span className="flex items-center gap-1">
                                <span className="animate-spin border-2 border-white border-t-transparent rounded-full h-4 w-4"></span>
                                Uploading...
                              </span>
                            ) : (
                              'Upload'
                            )}
                          </button>

                          {uploadStatus[voucher.mtm_id] === 'success' && (
                            <p className="text-green-600 text-sm">
                              ✅ Uploaded successfully!
                            </p>
                          )}
                          {uploadStatus[voucher.mtm_id] === 'error' && (
                            <p className="text-red-600 text-sm">
                              ❌ Upload failed.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
          )}
        </tbody>
      </table> */}
    </div>
  );
}
