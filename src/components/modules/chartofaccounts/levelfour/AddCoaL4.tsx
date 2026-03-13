import React, { useState } from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import InputElement from '../../../utils/fields/InputElement';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import httpService from '../../../services/httpService';
import { API_CHART_OF_ACCOUNTS_L4_URL } from '../../../services/apiRoutes';
import routes from '../../../services/appRoutes';

type SelectOption = {
  value: string | number;
  label: string;
};

const fieldLabelClass = 'mb-2 text-[12px] font-semibold text-black dark:text-white';

const AddCoaL4 = () => {
  const navigate = useNavigate();
  const [buttonLoading, setButtonLoading] = useState(false);
  const [formData, setFormData] = useState({
    coal3_id: '',
    coal3_label: '',
    reporting_to: '',
    reporting_to_label: '',
    sku_code: '',
    name: '',
  });

  const handleSelect =
    (field: 'coal3_id' | 'reporting_to', labelField: 'coal3_label' | 'reporting_to_label') =>
      (option: SelectOption | null) => {
        setFormData((prev) => ({
          ...prev,
          [field]: option?.value ? String(option.value) : '',
          [labelField]: option?.label ?? '',
        }));
      };

  const handleInputChange = (field: 'sku_code' | 'name') => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.coal3_id) {
      toast.error('Chart of Accounts (Level-3) is required.');
      return;
    }

    if (!formData.reporting_to) {
      toast.error('Reporting To is required.');
      return;
    }

    if (!formData.sku_code.trim()) {
      toast.error('SKU Code is required.');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Chart of Accounts (Level-4) is required.');
      return;
    }

    const payload = {
      coal3_id: formData.coal3_id,
      l3_id: formData.coal3_id,
      reporting_to: formData.reporting_to || null,
      parent_id: formData.reporting_to || null,
      sku_code: formData.sku_code.trim(),
      code: formData.sku_code.trim(),
      name: formData.name.trim(),
    };

    try {
      setButtonLoading(true);
      const res = await httpService.post(API_CHART_OF_ACCOUNTS_L4_URL, payload);
      const data = res?.data;

      if (data?.success) {
        toast.success(data?.message || 'COA L4 created successfully.');
        navigate(routes.coal4_list);
        return;
      }

      toast.info(data?.message || data?.error?.message || 'Unable to save COA L4.');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Save failed.');
    } finally {
      setButtonLoading(false);
    }
  };

  return (
    <div>
      <HelmetTitle title="New Chart of Accounts (L-4)" />

      <div className="mx-auto max-w-4xl rounded-sm border border-gray-300  p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h1 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-100">
          New Chart of Accounts (L-4)
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={fieldLabelClass}>
              Chart of Accounts (Level-3)<span className="text-red-500">*</span>
            </label>
            <DdlMultiline
              id="coal3_id"
              name="coal3_id"
              acType="L3"
              placeholder="Search for a Reference"
              value={
                formData.coal3_id
                  ? { value: formData.coal3_id, label: formData.coal3_label || formData.coal3_id }
                  : null
              }
              onSelect={handleSelect('coal3_id', 'coal3_label')}
              className="text-sm"
            />
          </div>
          <div>
            <label className={fieldLabelClass}>
              Reporting To<span className="text-red-500">*</span>
            </label>
            <DdlMultiline
              id="reporting_to"
              name="reporting_to"
              acType="L4"
              placeholder="Select Reporting To"
              value={
                formData.reporting_to
                  ? {
                    value: formData.reporting_to,
                    label: formData.reporting_to_label || formData.reporting_to,
                  }
                  : null
              }
              onSelect={handleSelect('reporting_to', 'reporting_to_label')}
              className="text-sm"
            />
          </div>
          <div>
            <label className={fieldLabelClass}>
              Chart of Accounts (Level-4) <span className="text-red-500">*</span>
            </label>
            <InputElement
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange('name')}
              placeholder="Chart of Accounts (Level-4)"
              className={''}
            />
          </div>

          <div className="flex items-center gap-1 pt-2">
            <ButtonLoading
              type="submit"
              label="SAVE"
              buttonLoading={buttonLoading}
              className="px-4 h-6 min-w-30"
            />
            <ButtonLoading
              type="button"
              label={"Back"}
              onClick={() => navigate(-1)}
              className="px-4 h-6 min-w-30"
              icon={<FiArrowLeft className="text-sm" />}
            />

          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCoaL4;
