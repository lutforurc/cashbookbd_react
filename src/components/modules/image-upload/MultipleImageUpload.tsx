import React, { useEffect, useState } from 'react';
import { getVoucherForImage, uploadImage } from './imageUploadSlice';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import InputDatePicker from '../../utils/fields/DatePicker';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import Loader from '../../../common/Loader';
import { getDdlProtectedBranch } from '../branch/ddlBranchSlider';
import { getSettings } from '../settings/settingsSlice';
import dayjs from 'dayjs';
import HelmetTitle from '../../utils/others/HelmetTitle';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import { Attachment, ImageVoucherType } from '../../utils/fields/DataConstant';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import ImagePopup from '../../utils/others/ImagePopup';
import Table from '../../utils/others/Table';
import { formatDate } from '../../utils/utils-functions/formatDate';
import httpService from '../../services/httpService';
import {
  API_DELETE_VOUCHER_IMAGE_URL,
  API_VOUCHER_IMAGE_FOR_UPLOAD_URL,
} from '../../services/apiRoutes';
import { hasPermission } from '../../Sidebar/permissionUtils';
import { FiCheckSquare } from 'react-icons/fi';

type FileMap = { [voucherId: number]: File[] };
type PreviewMap = { [voucherId: number]: string[] };
type LoadingMap = { [voucherId: number]: boolean };
type ResetMap = { [voucherId: number]: number };
type RemovingUploadedImageMap = { [voucherId: number]: string | null };
type StatusMap = {
  [voucherId: number]: 'success' | 'error' | null | undefined;
};

interface Voucher {
  id?: number;
  mtm_id: number;
  serial_no: number;
  vr_no: string;
  vr_date?: string;
  branchPad: string;
  voucher_image: string;
  title: string;
  vr_dt: string;
  nam: string;
  debit: number;
  credit: number;
}

interface OptionType {
  value: string;
  label: string;
  additionalDetails: string;
}

export default function VoucherUpload(user: any): JSX.Element {
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const settings = useSelector((state: any) => state.settings);
  const imageUpload = useSelector((state: any) => state.imageUpload);
  const userPermissions = settings?.data?.permissions || [];
  const canDeleteVoucherPhoto = hasPermission(userPermissions, 'voucher.photo.delete');

  const [files, setFiles] = useState<FileMap>({});
  const [previews, setPreviews] = useState<PreviewMap>({});
  const [loading, setLoading] = useState<LoadingMap>({});
  const [inputResetKeys, setInputResetKeys] = useState<ResetMap>({});
  const [removingUploadedImages, setRemovingUploadedImages] = useState<RemovingUploadedImageMap>({});
  const [uploadStatus, setUploadStatus] = useState<StatusMap>({});
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedOption, setSelectedOption] = useState<OptionType | null>(null);
  const [tableData, setTableData] = useState<Voucher[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [buttonLoading, setButtonLoading] = useState(false);

  const [voucherImageFormData, setVoucherImageFormData] = useState({
    branch_id: user.user.branch_id,
    voucher_type: '',
    image_type: '',
    start_date: settings?.data?.trx_dt,
    end_date: settings?.data?.trx_dt,
  });


console.log('settings permissions:', settings?.data?.permissions);
console.log(
  'has voucher.photo.delete:',
  settings?.data?.permissions?.some((p: any) => p?.name === 'voucher.photo.delete')
);

  const dispatch = useDispatch<any>();

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    dispatch(getSettings({}));
    setBranchId(user.user.branch_id);
  }, [dispatch, user.user.branch_id]);

  useEffect(() => {
    if (Array.isArray(imageUpload?.dataForImage?.data)) {
      setTableData(imageUpload.dataForImage.data);
    } else {
      setTableData([]);
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
      setDropdownData(branchDdlData.protectedData.data);
      const [day, month, year] =
        branchDdlData.protectedData.transactionDate.split('/');
      const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));
      setStartDate(parsedDate);
      setEndDate(parsedDate);
      setBranchId(user.user.branch_id);
    }
  }, [branchDdlData?.protectedData?.data, branchDdlData?.protectedData?.transactionDate, user.user.branch_id]);

  const getVoucherRowId = (row: Voucher) => Number(row?.id ?? row?.mtm_id ?? 0);

  const buildPreviewList = async (selectedFiles: File[]) => {
    const previewReaders = selectedFiles.map((file) => {
      if (file.type === 'application/pdf') {
        return Promise.resolve('');
      }

      const reader = new FileReader();
      return new Promise<string>((resolve) => {
        reader.onloadend = () => {
          resolve(typeof reader.result === 'string' ? reader.result : '');
        };
        reader.readAsDataURL(file);
      });
    });

    const previewUrls = await Promise.all(previewReaders);
    return previewUrls;
  };

  const handleFileChange = async (id: number, selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const fileArray = Array.from(selectedFiles);
    const mergedFiles = [...(files[id] || []), ...fileArray];

    setFiles((prev) => ({ ...prev, [id]: mergedFiles }));
    setUploadStatus((prev) => ({ ...prev, [id]: null }));
    setPreviews((prev) => ({
      ...prev,
      [id]: [],
    }));

    const previewUrls = await buildPreviewList(mergedFiles);
    setPreviews((prev) => ({
      ...prev,
      [id]: previewUrls,
    }));
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
        formData.append('images[]', file);
      });

      formData.append('voucher_id', id.toString());

      await dispatch(uploadImage(formData, id));
      await refreshVoucherList();

      toast.success('Files uploaded successfully!');
      setUploadStatus((prev) => ({ ...prev, [id]: 'success' }));
      setFiles((prev) => ({ ...prev, [id]: [] }));
      setPreviews((prev) => ({ ...prev, [id]: [] }));
      setInputResetKeys((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload files');
      setUploadStatus((prev) => ({ ...prev, [id]: 'error' }));
    } finally {
      setLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleClearSelectedFiles = (id: number) => {
    setFiles((prev) => ({ ...prev, [id]: [] }));
    setPreviews((prev) => ({ ...prev, [id]: [] }));
    setUploadStatus((prev) => ({ ...prev, [id]: null }));
    setInputResetKeys((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const handleRemoveSelectedFile = async (id: number, fileIndex: number) => {
    const currentFiles = files[id] || [];
    const updatedFiles = currentFiles.filter((_, index) => index !== fileIndex);

    setFiles((prev) => ({ ...prev, [id]: updatedFiles }));
    setUploadStatus((prev) => ({ ...prev, [id]: null }));

    if (updatedFiles.length === 0) {
      setPreviews((prev) => ({ ...prev, [id]: [] }));
      setInputResetKeys((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
      return;
    }

    const previewUrls = await buildPreviewList(updatedFiles);
    setPreviews((prev) => ({
      ...prev,
      [id]: previewUrls,
    }));
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

  const handleActionButtonClick = () => {
    dispatch(getVoucherForImage(voucherImageFormData));
  };

  const handleOnSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setVoucherImageFormData((prev) => ({ ...prev, [name]: value }));
  };

  const refreshVoucherList = async () => {
    const response = await httpService.post(API_VOUCHER_IMAGE_FOR_UPLOAD_URL, voucherImageFormData);
    const refreshedPayload = response?.data?.data?.data || {};
    const refreshedRows = refreshedPayload?.data || [];
    setTableData(refreshedRows);
  };

  const handleRemoveUploadedImage = async (row: Voucher, imageName: string) => {
    const voucherId = getVoucherRowId(row);

    try {
      setRemovingUploadedImages((prev) => ({
        ...prev,
        [voucherId]: imageName,
      }));

      await httpService.post(`${API_DELETE_VOUCHER_IMAGE_URL}${voucherId}`, {
        image_name: imageName,
        branch_pad: row.branchPad,
      });

      await refreshVoucherList();
      toast.success('Uploaded attachment removed successfully!');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to remove uploaded attachment.');
    } finally {
      setRemovingUploadedImages((prev) => ({
        ...prev,
        [voucherId]: null,
      }));
    }
  };

  const renderExistingVoucherImage = (row: Voucher) => {
    if (!row?.voucher_image) {
      return (
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          No image uploaded yet
        </div>
      );
    }

    return (
      <ImagePopup
        title={row.nam}
        branchPad={row.branchPad || ''}
        voucher_image={row.voucher_image || ''}
        onRemoveImage={canDeleteVoucherPhoto ? (imageName) => handleRemoveUploadedImage(row, imageName) : undefined}
        removingImage={canDeleteVoucherPhoto ? removingUploadedImages[getVoucherRowId(row)] : null}
      />
    );
  };

  const renderVoucherImages = (row: Voucher) => {
    const voucherId = getVoucherRowId(row);
    const hasExistingImage = Boolean(row?.voucher_image);
    const selectedFiles = files[voucherId] || [];
    const selectedPreviews = previews[voucherId] || [];

    return (
      <td className="align-top">
        <div className="w-full max-w-[320px] rounded-xl p-3 shadow-sm">
          {renderExistingVoucherImage(row)}
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_112px] sm:items-center">
            <div className="p-2">
              <input
                key={inputResetKeys[voucherId] || 0}
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={(e) => handleFileChange(voucherId, e.target.files)}
                className="block w-full cursor-pointer text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
              />
            </div>

            <button
              onClick={() => handleUpload(voucherId)}
              disabled={loading[voucherId]}
              className={`inline-flex h-full min-h-[46px] w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-white transition ${
                loading[voucherId]
                  ? 'bg-gray-400'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading[voucherId] ? (
                <span className="flex items-center gap-1">
                  <span className="animate-spin border-2 border-white border-t-transparent rounded-full h-4 w-4"></span>
                  Uploading...
                </span>
              ) : hasExistingImage ? (
                'Add More'
              ) : (
                'Upload'
              )}
            </button>
          </div>

          {selectedFiles.length > 0 && (
            <div className="mt-3 flex flex-col gap-2 rounded-lg bg-slate-50 p-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-600">
                  Selected {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}
                </p>
                <button
                  type="button"
                  onClick={() => handleClearSelectedFiles(voucherId)}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={`${voucherId}-file-${index}`}
                    className="relative flex items-center gap-2 rounded-md border border-slate-300 bg-white p-1.5 pr-7"
                  >
                    {selectedPreviews[index] ? (
                      <img
                        src={selectedPreviews[index]}
                        alt={`Preview ${index + 1}`}
                        className="h-10 w-10 rounded border object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded border bg-slate-100 text-[10px] font-medium text-slate-500">
                        PDF
                      </div>
                    )}

                    <span className="max-w-[120px] truncate text-xs text-slate-600">
                      {file.name}
                    </span>

                    {canDeleteVoucherPhoto && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSelectedFile(voucherId, index)}
                        className="absolute right-1 top-1 rounded px-1 text-xs font-bold text-slate-400 transition hover:bg-slate-100 hover:text-red-500"
                        aria-label={`Remove ${file.name}`}
                      >
                        x
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploadStatus[voucherId] === 'success' && (
            <p className="mt-2 text-sm text-green-600">Uploaded successfully!</p>
          )}
          {uploadStatus[voucherId] === 'error' && (
            <p className="mt-2 text-sm text-red-600">Upload failed.</p>
          )}
        </div>
      </td>
    );
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
      render: (row: Voucher) => {
        return (
          <div className="flex flex-col">
            <span className="px-4 py-0">{row.vr_no}</span>
            <span className="px-4 py-0">{formatDate(row.vr_date)}</span>
          </div>
        );
      },
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
      render: (row: Voucher) => {
        return (
          <span className="px-4 py-2">
            {row.debit > 0
              ? thousandSeparator(row.debit, 0)
              : thousandSeparator(row.credit, 0)}
          </span>
        );
      },
    },
    {
      key: 'voucher_image',
      header: 'Voucher Images',
      render: (row: Voucher) => renderVoucherImages(row),
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
          <div className="col-span-1 lg:col-span-2">
            <label htmlFor="">Select Branch</label>
            <div className="w-full">
              {branchDdlData.isLoading === true ? <Loader /> : ''}
              <BranchDropdown
                defaultValue={user?.user?.branch_id}
                onChange={handleBranchChange}
                className="w-full font-medium text-sm p-1 h-8"
                branchDdl={dropdownData}
              />
            </div>
          </div>

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

          <div className="lg:col-span-1 w-full">
            <label htmlFor="">Start Date</label>
            <InputDatePicker
              setCurrentDate={handleStartDate}
              className="font-medium text-sm w-full h-8"
              selectedDate={startDate}
              setSelectedDate={setStartDate}
            />
          </div>

          <div className="lg:col-span-1 w-full">
            <label htmlFor="">End Date</label>
            <InputDatePicker
              setCurrentDate={handleEndDate}
              className="font-medium text-sm w-full h-8"
              selectedDate={endDate}
              setSelectedDate={setEndDate}
            />
          </div>

          <div className="lg:col-span-1 w-full">
            <ButtonLoading
              onClick={handleActionButtonClick}
              buttonLoading={buttonLoading}
              label="Run"
              icon={<FiCheckSquare />}
              className="mt-0 md:mt-6 pt-[0.45rem] pb-[0.45rem] w-full"
            />
          </div>
        </div>
      </div>

      <Table columns={columns} data={tableData || []} />
    </div>
  );
}
