import React, { useEffect, useMemo, useState } from 'react';
import { FiSave, FiX } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import { getDdlArea } from '../../area/areaSlice';
import { getCoal4DdlNext } from '../../chartofaccounts/levelfour/coal4DdlSlicer';
import { storeCustomer } from '../../customer-supplier/customerSlice';
import { ClientType } from '../../../utils/fields/DataConstant';
import InputElement from '../../../utils/fields/InputElement';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import DdlDynamicMultiline from '../../../utils/utils-functions/DdlDynamicMultiline';

interface QuickCustomerFormData {
  name: string;
  mobile: string;
  manual_address: string;
  type_id: string;
  area_id: string;
  areaName: string;
}

interface QuickCustomerOption {
  value: string;
  label: string;
}

interface QuickCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerSaved: (customer: { id: string; name: string }) => void;
  entityLabel?: string;
  defaultTypeId?: string;
  initialName?: string;
}

const createInitialFormData = (defaultTypeId = '1'): QuickCustomerFormData => ({
  name: '',
  mobile: '',
  manual_address: '',
  type_id: defaultTypeId,
  area_id: '',
  areaName: '',
});

const QuickCustomerModal: React.FC<QuickCustomerModalProps> = ({
  isOpen,
  onClose,
  onCustomerSaved,
  entityLabel = 'Customer',
  defaultTypeId = '1',
  initialName = '',
}) => {
  const dispatch = useDispatch<any>();
  const area = useSelector((s: any) => s.area);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<QuickCustomerFormData>>({});
  const [formData, setFormData] = useState<QuickCustomerFormData>(
    createInitialFormData(defaultTypeId),
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    dispatch(getDdlArea());
    setFormData({
      ...createInitialFormData(defaultTypeId),
      name: initialName,
    });
    setErrors({});
  }, [defaultTypeId, dispatch, initialName, isOpen]);

  const formattedAreaData = useMemo(() => {
    const areaList = Array.isArray(area?.area)
      ? area.area
      : Array.isArray(area?.area?.data)
        ? area.area.data
        : [];

    return areaList.map((item: any) => ({
      value: item?.id?.toString() || '',
      label: item?.name || '',
      label_2: item?.thana_name || '',
      label_3: item?.district_name || '',
      label_4: item?.mobile || '',
      label_5: item?.manual_address || '',
    }));
  }, [area?.area]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setErrors((prev) => ({
      ...prev,
      [name]: '',
    }));
  };

  const handleAreaSelect = (option: QuickCustomerOption | null) => {
    setFormData((prev) => ({
      ...prev,
      area_id: option?.value || '',
      areaName: option?.label || '',
    }));
  };

  const validateForm = () => {
    const nextErrors: Partial<QuickCustomerFormData> = {};

    if (!formData.name.trim()) {
      nextErrors.name = 'Customer name is required';
    }
    if (!formData.mobile.trim()) {
      nextErrors.mobile = 'Mobile number is required';
    }
    if (!formData.manual_address.trim()) {
      nextErrors.manual_address = 'Address is required';
    }
    if (!formData.type_id) {
      nextErrors.type_id = 'Customer type is required';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleClose = () => {
    setFormData(createInitialFormData(defaultTypeId));
    setErrors({});
    onClose();
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.info('Please fill the required customer information');
      return;
    }

    setButtonLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        mobile: formData.mobile.trim(),
        manual_address: formData.manual_address.trim(),
        type_id: formData.type_id,
        area_id: formData.area_id,
      };

      const res: any = await dispatch(storeCustomer(payload)).unwrap();
      const customerData = res?.data ?? res?.customer ?? res?.contact ?? null;
      const customerName = customerData?.name ?? customerData?.label ?? payload.name;
      let customerId =
        customerData?.id ??
        customerData?.customer_id ??
        customerData?.coa_l4_id ??
        customerData?.value ??
        null;

      if (!customerId) {
        const lookupText = payload.mobile || customerName;
        const lookupResponse: any = await dispatch(getCoal4DdlNext(lookupText, '3'));
        const options = Array.isArray(lookupResponse?.payload) ? lookupResponse.payload : [];
        const matchedCustomer = options.find((item: any) => {
          const optionLabel = item?.label?.toString().trim().toLowerCase();
          const optionMobile = item?.label_4?.toString().trim();

          return (
            optionLabel === customerName.trim().toLowerCase() ||
            optionMobile === payload.mobile
          );
        });

        customerId = matchedCustomer?.value ?? null;
      }

      if (!customerId) {
        throw new Error('Customer saved but could not be selected automatically');
      }

      onCustomerSaved({
        id: customerId.toString(),
        name: customerName,
      });

      toast.success(res?.message || 'Customer saved successfully');
      handleClose();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save customer');
    } finally {
      setButtonLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/50 px-3 py-6">
      <div className="w-full max-w-2xl rounded-sm bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Add New {entityLabel}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Save {entityLabel.toLowerCase()} and select it instantly for this invoice.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-sm p-1 text-gray-500 transition hover:bg-gray-100 hover:text-red-500 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <FiX className="text-lg" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              Customer Type
            </label>
            <DropdownCommon
              id="type_id"
              name="type_id"
              onChange={handleInputChange}
              value={formData.type_id}
              className="h-[2.4rem] bg-transparent"
              data={ClientType}
            />
            {errors.type_id && (
              <p className="mt-1 text-xs text-red-500">{errors.type_id}</p>
            )}
          </div>
          <div>
            <InputElement
              id="quick_customer_name"
              name="name"
              label={`${entityLabel} Name`}
              placeholder={`Enter ${entityLabel.toLowerCase()} name`}
              value={formData.name}
              onChange={handleInputChange}
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>
          <div>
            <InputElement
              id="quick_customer_mobile"
              name="mobile"
              label="Mobile Number"
              placeholder="Enter mobile number"
              value={formData.mobile}
              onChange={handleInputChange}
            />
            {errors.mobile && <p className="mt-1 text-xs text-red-500">{errors.mobile}</p>}
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              Select Area
            </label>
            <DdlDynamicMultiline
              onSelect={handleAreaSelect}
              value={
                formData.area_id && formData.areaName
                  ? { value: formData.area_id, label: formData.areaName }
                  : null
              }
              defaultValue={
                formData.area_id && formData.areaName
                  ? { value: formData.area_id, label: formData.areaName }
                  : null
              }
              data={formattedAreaData}
            />
          </div>
          <div className="md:col-span-2">
            <label
              htmlFor="quick_customer_address"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              Address
            </label>
            <textarea
              id="quick_customer_address"
              name="manual_address"
              rows={3}
              value={formData.manual_address}
              onChange={handleInputChange}
              placeholder="Enter customer address"
              className="w-full rounded-xs border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-transparent dark:text-white"
            />
            {errors.manual_address && (
              <p className="mt-1 text-xs text-red-500">{errors.manual_address}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-gray-200 px-4 py-3 sm:flex-row sm:justify-end dark:border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-sm border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <ButtonLoading
              onClick={handleSave}
            buttonLoading={buttonLoading}
            label={buttonLoading ? 'Saving...' : `Save ${entityLabel}`}
            className="whitespace-nowrap text-center"
            icon={<FiSave className="text-white text-lg ml-2 mr-2" />}
            disabled={buttonLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default QuickCustomerModal;
