import React, { useEffect, useState } from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import InputElement from '../../../utils/fields/InputElement';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import httpService from '../../../services/httpService';
import {
  API_CHART_OF_ACCOUNTS_BY_ID_L4_URL,
  API_CHART_OF_ACCOUNTS_L4_STORE_URL,
  API_CHART_OF_ACCOUNTS_L4_URL,
  API_CHART_OF_ACCOUNTS_L4_UPDATE_URL,
} from '../../../services/apiRoutes';
import routes from '../../../services/appRoutes';
import ChartOfAccountsL3 from '../../../utils/utils-functions/ChartOfAccountsL3';
import { useSelector } from 'react-redux';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import Loader from '../../../../common/Loader';

type SelectOption = {
  value: string | number;
  label: string;
};

const fieldLabelClass = 'mb-2 text-[12px] font-semibold text-black dark:text-white';
const DEFAULT_REPORTING_TO_ID = '3';

const AddCoaL4 = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const coal4 = useSelector((state: any) => state.coal4);
  const [reportToOptions, setReportToOptions] = useState<{ id: string | number; name: string }[]>([]);
  const [formData, setFormData] = useState({
    coal3_id: '',
    coal3_label: '',
    reporting_to: DEFAULT_REPORTING_TO_ID,
    reporting_to_label: '',
    name: '',
  });

  useEffect(() => {
    const loadReportToOptions = async () => {
      try {
        const res = await httpService.get(`${API_CHART_OF_ACCOUNTS_L4_URL}?page=1&per_page=1&search=`);
        const data = res?.data?.data?.data || res?.data?.data;
        const reporttos = data?.reporttos || [];

        if (Array.isArray(reporttos)) {
          setReportToOptions(reporttos);
        }
      } catch (error) {
        setReportToOptions([]);
      }
    };

    loadReportToOptions();
  }, []);

  useEffect(() => {
    if (!id) {
      return;
    }

    const loadCoal4 = async () => {
      try {
        setIsEditLoading(true);
        const res = await httpService.get(`${API_CHART_OF_ACCOUNTS_BY_ID_L4_URL}${id}`);
        const data = res?.data?.data?.data || res?.data?.data;

        if (!res?.data?.success || !data) {
          toast.error(res?.data?.message || 'COA L4 data not found.');
          navigate(routes.coal4_list);
          return;
        }

        setFormData({
          coal3_id: data?.acc_coa_level3_id ? String(data.acc_coa_level3_id) : '',
          coal3_label: data?.coa3s?.name || data?.l3_name || '',
          reporting_to: data?.acc_reporting_to_id
            ? String(data.acc_reporting_to_id)
            : DEFAULT_REPORTING_TO_ID,
          reporting_to_label: data?.reporting_to?.name || '',
          name: data?.name || '',
        });
      } catch (error: any) {
        toast.error(error?.response?.data?.message || error?.message || 'Unable to load COA L4.');
        navigate(routes.coal4_list);
      } finally {
        setIsEditLoading(false);
      }
    };

    loadCoal4();
  }, [id, navigate]);

  useEffect(() => {
    const reportingToData = reportToOptions.length > 0 ? reportToOptions : coal4?.data?.reporttos || [];
    const selectedItem = reportingToData.find(
      (item: { id: string | number; name: string }) => String(item.id) === formData.reporting_to,
    );

    if (!selectedItem) {
      return;
    }

    setFormData((prev) => {
      if (
        prev.reporting_to === DEFAULT_REPORTING_TO_ID &&
        prev.reporting_to_label === selectedItem.name
      ) {
        return prev;
      }

      return {
        ...prev,
        reporting_to: prev.reporting_to || DEFAULT_REPORTING_TO_ID,
        reporting_to_label: selectedItem.name,
      };
    });
  }, [coal4?.data?.reporttos, formData.reporting_to, reportToOptions]);

  const handleSelect =
    (field: 'coal3_id' | 'reporting_to', labelField: 'coal3_label' | 'reporting_to_label') =>
      (option: SelectOption | null) => {
        setFormData((prev) => ({
          ...prev,
          [field]: option?.value ? String(option.value) : '',
          [labelField]: option?.label ?? '',
        }));
      };

  const handleOnSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    const reportingToData = reportToOptions.length > 0 ? reportToOptions : coal4?.data?.reporttos || [];
    const selectedItem = reportingToData.find(
      (item: { id: string | number; name: string }) => String(item.id) === value,
    );

    setFormData((prev) => ({
      ...prev,
      reporting_to: value,
      reporting_to_label: selectedItem?.name ?? '',
    }));
  };

  const handleInputChange = (field: 'name') => (e: React.ChangeEvent<HTMLInputElement>) => {
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

    if (!formData.name.trim()) {
      toast.error('Chart of Accounts (Level-4) is required.');
      return;
    }

    const normalizedCode = formData.name.trim();

    const payload = {
      coal3_id: formData.coal3_id,
      l3_id: formData.coal3_id,
      reporting_to: formData.reporting_to || null,  
      code: normalizedCode,
      name: formData.name.trim(),
    };

    try {
      setButtonLoading(true);
      const res = await httpService.post(
        isEditMode ? `${API_CHART_OF_ACCOUNTS_L4_UPDATE_URL}/${id}` : API_CHART_OF_ACCOUNTS_L4_STORE_URL,
        payload,
      );
      const data = res?.data;

      if (data?.success) {
        toast.success(data?.message || `COA L4 ${isEditMode ? 'updated' : 'created'} successfully.`);
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
      <HelmetTitle title={isEditMode ? 'Edit Chart of Accounts (L-4)' : 'New Chart of Accounts (L-4)'} />

      <div className="mx-auto max-w-4xl rounded-sm border border-gray-300  p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h1 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-100">
          {isEditMode ? 'Edit Chart of Accounts (L-4)' : 'New Chart of Accounts (L-4)'}
        </h1>

        {isEditLoading ? <Loader /> : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={fieldLabelClass}>
              Chart of Accounts (Level-3)<span className="text-red-500">*</span>
            </label>
            <ChartOfAccountsL3
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
            <DropdownCommon
              id="reporting_to"
              name={'reporting_to'}
              label="Reporting To"
              onChange={handleOnSelectChange}
              value={formData?.reporting_to || ''}
              className="h-[2.1rem] bg-transparent"
              data={reportToOptions.length > 0 ? reportToOptions : coal4?.data?.reporttos || []}
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
              label={isEditMode ? 'UPDATE' : 'SAVE'}
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
