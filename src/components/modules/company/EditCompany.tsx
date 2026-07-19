import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { FiArrowLeft, FiSave } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import Loader from '../../../common/Loader';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { getSettings } from '../settings/settingsSlice';
import { resolveAssetUrl } from '../../services/resolveAssetUrl';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { editCompany, updateCompany } from './companySlice';

const buildCompanyFormData = (data: any, logoFile: File | null) => {
  const payload = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (key === 'company_logo') return;
    payload.append(key, String(value));
  });

  if (logoFile) {
    payload.append('company_logo', logoFile);
  }

  return payload;
};

const EditCompany = () => {
  const { id } = useParams();
  const company = useSelector((state: any) => state.company);
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    contact_person: '',
    phone: '',
    company_logo: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');

  useEffect(() => {
    if (id) {
      dispatch(editCompany(id));
    }
  }, [dispatch, id]);

  useEffect(() => {
    const editData = company?.editData || {};
    if (!editData?.id && !editData?.company_id) return;

    setFormData({
      id: String(editData.company_id || editData.id || ''),
      name: editData.name || editData.company_name || '',
      contact_person: editData.contact_person || '',
      phone: editData.phone || editData.mobile || '',
      company_logo: editData.company_logo || '',
    });
    setLogoFile(null);
    setLogoPreview(resolveAssetUrl(editData.company_logo || ''));
  }, [company?.editData]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setLogoFile(file);
    setLogoPreview(file ? URL.createObjectURL(file) : resolveAssetUrl(formData.company_logo));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Company name is required.');
      return;
    }

    const payload = buildCompanyFormData({
      ...formData,
      company_id: formData.id,
      mobile: formData.phone,
    }, logoFile);
    const response = await dispatch(updateCompany(payload));

    if (updateCompany.fulfilled.match(response)) {
      toast.success('Company updated successfully.');
      dispatch(getSettings() as any);
      navigate('/company/company-list');
      return;
    }

    toast.error(String(response.payload || 'Company update failed.'));
  };

  return (
    <div>
      <HelmetTitle title="Edit Company" />

      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate('/company/company-list')}
          className="inline-flex items-center gap-2 rounded bg-slate-200 px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
        >
          <FiArrowLeft />
          Back
        </button>
      </div>

      <div className="relative max-w-3xl">
        {company?.isLoading ? <Loader /> : null}

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-sm border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Name of Company
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(event) => handleChange('name', event.target.value)}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Contact Person
            </label>
            <input
              type="text"
              value={formData.contact_person}
              onChange={(event) => handleChange('contact_person', event.target.value)}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Phone/Mobile
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={(event) => handleChange('phone', event.target.value)}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Company Logo
            </label>
            <div className="flex flex-wrap items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="block w-full max-w-md rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 file:mr-3 file:rounded file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-sm file:font-medium dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:file:bg-gray-700 dark:file:text-white"
              />
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Company logo"
                  className="h-16 w-28 rounded border border-slate-200 object-contain p-1 dark:border-gray-700"
                />
              ) : null}
            </div>
          </div>

          <div className="flex justify-end">
            <ButtonLoading
              buttonLoading={company?.isSaving}
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

export default EditCompany;
