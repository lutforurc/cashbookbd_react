import { FormEvent, useEffect, useState } from 'react';
import { FiSave } from 'react-icons/fi';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import Loader from '../../../common/Loader';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import HelmetTitle from '../../utils/others/HelmetTitle';
import httpService from '../../services/httpService';
import {
  API_SOFTWARE_INFO_URL,
  API_SOFTWARE_INFO_UPDATE_URL,
} from '../../services/apiRoutes';
import { getSettings } from './settingsSlice';

interface SoftwareInfoForm {
  name: string;
  mobile: string;
  email: string;
  website: string;
  address: string;
}

const emptyForm: SoftwareInfoForm = {
  name: '',
  mobile: '',
  email: '',
  website: '',
  address: '',
};

const SoftwareInfo = () => {
  const dispatch = useDispatch<any>();

  const [formData, setFormData] = useState<SoftwareInfoForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await httpService.get(API_SOFTWARE_INFO_URL);
        const data = res?.data?.data?.data;
        if (data) {
          setFormData({
            name: data.name || '',
            mobile: data.mobile || '',
            email: data.email || '',
            website: data.website || '',
            address: data.address || '',
          });
        }
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Failed to load software information.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleChange = (field: keyof SoftwareInfoForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!formData.name.trim() && !formData.mobile.trim()) {
      toast.error('Please enter at least the software company name or mobile.');
      return;
    }

    setSaving(true);
    try {
      await httpService.post(API_SOFTWARE_INFO_UPDATE_URL, formData);
      toast.success('Software information updated successfully.');
      // Refresh redux settings so report footers update immediately.
      dispatch(getSettings());
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Software information update failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <HelmetTitle title="Software Information" />

      <div className="mb-3">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
          Software Information
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          This name and mobile number appear in the footer of all reports.
        </p>
      </div>

      <div className="relative max-w-3xl">
        {loading ? <Loader /> : null}

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-sm border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Software Company Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(event) => handleChange('name', event.target.value)}
              placeholder="e.g. ABC Software Ltd."
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Mobile Number
            </label>
            <input
              type="text"
              value={formData.mobile}
              onChange={(event) => handleChange('mobile', event.target.value)}
              placeholder="e.g. 01700000000"
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Email <span className="text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              value={formData.email}
              onChange={(event) => handleChange('email', event.target.value)}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Website <span className="text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              value={formData.website}
              onChange={(event) => handleChange('website', event.target.value)}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Address <span className="text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(event) => handleChange('address', event.target.value)}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end">
            <ButtonLoading
              buttonLoading={saving}
              label="Update"
              icon={<FiSave />}
              type="submit"
              className="h-9"
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default SoftwareInfo;
