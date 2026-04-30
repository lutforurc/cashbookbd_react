import React, { useEffect, useState } from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import Loader from '../../../../common/Loader';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import InputElement from '../../../utils/fields/InputElement';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import httpService from '../../../services/httpService';
import {
  API_CHART_OF_ACCOUNTS_BY_ID_L3_URL,
  API_CHART_OF_ACCOUNTS_L2_URL,
  API_CHART_OF_ACCOUNTS_L3_STORE_URL,
  API_CHART_OF_ACCOUNTS_L3_UPDATE_URL,
  API_CHART_OF_ACCOUNTS_L3_URL,
} from '../../../services/apiRoutes';
import routes from '../../../services/appRoutes';

type DdlOption = {
  id: string | number;
  name: string;
};

const fieldLabelClass = 'mb-2 text-[12px] font-semibold text-black dark:text-white';

const normalizePayloadData = (response: any) => response?.data?.data?.data || response?.data?.data || {};

const AddCoaL3 = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [coaL2Options, setCoaL2Options] = useState<DdlOption[]>([]);
  const [sourceOptions, setSourceOptions] = useState<DdlOption[]>([]);
  const [formData, setFormData] = useState({
    coal2_id: '',
    source_id: '',
    name: '',
  });

  useEffect(() => {
    const loadFormOptions = async () => {
      try {
        const [l2Res, l3Res] = await Promise.all([
          httpService.get(`${API_CHART_OF_ACCOUNTS_L2_URL}?page=1&per_page=500&search=`),
          httpService.get(`${API_CHART_OF_ACCOUNTS_L3_URL}?page=1&per_page=1&search=`),
        ]);
        const l2Data = normalizePayloadData(l2Res);
        const l3Data = normalizePayloadData(l3Res);
        const l2List = Array.isArray(l2Data?.data) ? l2Data.data : [];
        const sources = l3Data?.sources || l3Data?.source || l3Data?.sources_data || [];

        setCoaL2Options(l2List);
        setSourceOptions(Array.isArray(sources) ? sources : []);
      } catch (error) {
        setCoaL2Options([]);
        setSourceOptions([]);
      }
    };

    loadFormOptions();
  }, []);

  useEffect(() => {
    if (!id) {
      return;
    }

    const loadCoal3 = async () => {
      try {
        setIsEditLoading(true);
        const res = await httpService.get(`${API_CHART_OF_ACCOUNTS_BY_ID_L3_URL}${id}`);
        const data = normalizePayloadData(res);

        if (!res?.data?.success || !data) {
          toast.error(res?.data?.message || 'COA L3 data not found.');
          navigate(routes.coal3_list);
          return;
        }

        setFormData({
          coal2_id: data?.acc_coa_level2_id ? String(data.acc_coa_level2_id) : '',
          source_id: data?.acc_source_id ? String(data.acc_source_id) : '',
          name: data?.name || '',
        });
      } catch (error: any) {
        toast.error(error?.response?.data?.message || error?.message || 'Unable to load COA L3.');
        navigate(routes.coal3_list);
      } finally {
        setIsEditLoading(false);
      }
    };

    loadCoal3();
  }, [id, navigate]);

  useEffect(() => {
    if (!formData.source_id && sourceOptions.length > 0) {
      setFormData((prev) => ({
        ...prev,
        source_id: String(sourceOptions[0].id),
      }));
    }
  }, [formData.source_id, sourceOptions]);

  const handleInputChange = (field: 'name') => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handleSelectChange =
    (field: 'coal2_id' | 'source_id') => (e: React.ChangeEvent<HTMLSelectElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
    };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.coal2_id) {
      toast.error('Chart of Accounts (Level-2) is required.');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Chart of Accounts (Level-3) is required.');
      return;
    }

    const normalizedName = formData.name.trim();
    const payload = {
      coal2_id: formData.coal2_id,
      l2_id: formData.coal2_id,
      source_id: formData.source_id || null,
      acc_source_id: formData.source_id || null,
      code: normalizedName,
      name: normalizedName,
    };

    try {
      setButtonLoading(true);
      const res = await httpService.post(
        isEditMode ? `${API_CHART_OF_ACCOUNTS_L3_UPDATE_URL}/${id}` : API_CHART_OF_ACCOUNTS_L3_STORE_URL,
        payload,
      );
      const data = res?.data;

      if (data?.success) {
        toast.success(data?.message || `COA L3 ${isEditMode ? 'updated' : 'created'} successfully.`);
        navigate(routes.coal3_list);
        return;
      }

      toast.info(data?.message || data?.error?.message || 'Unable to save COA L3.');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Save failed.');
    } finally {
      setButtonLoading(false);
    }
  };

  return (
    <div>
      <HelmetTitle title={isEditMode ? 'Edit Chart of Accounts (L-3)' : 'New Chart of Accounts (L-3)'} />

      <div className="mx-auto max-w-4xl rounded-sm border border-gray-300 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h1 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-100">
          {isEditMode ? 'Edit Chart of Accounts (L-3)' : 'New Chart of Accounts (L-3)'}
        </h1>

        {isEditLoading ? <Loader /> : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="coal2_id" className={fieldLabelClass}>
              Chart of Accounts (Level-2)<span className="text-red-500">*</span>
            </label>
            <select
              id="coal2_id"
              name="coal2_id"
              value={formData.coal2_id}
              onChange={handleSelectChange('coal2_id')}
              className="w-full rounded-xs border border-gray-300 bg-transparent p-1 text-sm text-gray-900 outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select COA L2</option>
              {coaL2Options.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          {sourceOptions.length > 0 ? (
            <div>
              <label htmlFor="source_id" className={fieldLabelClass}>
                Source
              </label>
              <select
                id="source_id"
                name="source_id"
                value={formData.source_id}
                onChange={handleSelectChange('source_id')}
                className="w-full rounded-xs border border-gray-300 bg-transparent p-1 text-sm text-gray-900 outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {sourceOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <label className={fieldLabelClass}>
              Chart of Accounts (Level-3)<span className="text-red-500">*</span>
            </label>
            <InputElement
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange('name')}
              placeholder="Chart of Accounts (Level-3)"
            />
          </div>

          <div className="flex items-center gap-1 pt-2">
            <ButtonLoading
              type="submit"
              label={isEditMode ? 'UPDATE' : 'SAVE'}
              buttonLoading={buttonLoading}
              className="h-6 min-w-30 px-4"
            />
            <ButtonLoading
              type="button"
              label="Back"
              onClick={() => navigate(-1)}
              className="h-6 min-w-30 px-4"
              icon={<FiArrowLeft className="text-sm" />}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCoaL3;
