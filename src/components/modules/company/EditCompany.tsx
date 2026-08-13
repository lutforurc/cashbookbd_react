import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { FIELD_FILE_BUTTON } from '../../../theme/fieldStyles';
import { FiSave } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import Loader from '../../../common/Loader';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { getSettings } from '../settings/settingsSlice';
import { resolveAssetUrl } from '../../services/resolveAssetUrl';
import InputElement from '../../utils/fields/InputElement';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Link from '../../utils/others/Link';
import { editCompany, updateCompany } from './companySlice';

/** Matches the textarea in the product form, so both read as the same field. */
const TEXTAREA_CLASS =
  'block w-full resize-y rounded-xs border border-gray-300 bg-white p-2 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-boxdark dark:text-white dark:focus:border-blue-400';

/**
 * Matches PhotoInput, which is how every other upload in the app is drawn --
 * and now says so by sharing its button rather than by repeating the string.
 */
const FILE_INPUT_CLASS = `w-full text-sm text-black dark:text-white ${FIELD_FILE_BUTTON}`;

const buildCompanyFormData = (data: any, logoFile: File | null, logoDarkFile: File | null) => {
  const payload = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (key === 'company_logo' || key === 'company_logo_dark') return;
    payload.append(key, String(value));
  });

  if (logoFile) {
    payload.append('company_logo', logoFile);
  }

  if (logoDarkFile) {
    payload.append('company_logo_dark', logoDarkFile);
  }

  return payload;
};

const EditCompany = () => {
  const { id } = useParams();
  const company = useSelector((state: any) => state.company);
  const environment = useSelector((state: any) => state.settings?.data?.env);
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    company_logo: '',
    company_logo_dark: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [logoDarkFile, setLogoDarkFile] = useState<File | null>(null);
  const [logoDarkPreview, setLogoDarkPreview] = useState('');

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
      email: editData.email || '',
      address: editData.address || '',
      notes: editData.notes || '',
      company_logo: editData.company_logo || '',
      company_logo_dark: editData.company_logo_dark || '',
    });
    setLogoFile(null);
    setLogoPreview(resolveAssetUrl(editData.company_logo || '', environment));
    setLogoDarkFile(null);
    setLogoDarkPreview(resolveAssetUrl(editData.company_logo_dark || '', environment));
  }, [company?.editData, environment]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setLogoFile(file);
    setLogoPreview(file ? URL.createObjectURL(file) : resolveAssetUrl(formData.company_logo, environment));
  };

  const handleLogoDarkChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setLogoDarkFile(file);
    setLogoDarkPreview(file ? URL.createObjectURL(file) : resolveAssetUrl(formData.company_logo_dark, environment));
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
    }, logoFile, logoDarkFile);
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

      {company?.isLoading ? <Loader /> : null}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputElement
            id="name"
            name="name"
            label="Name of Company"
            placeholder="Enter company name"
            value={formData.name}
            className=""
            onChange={(event) => handleChange('name', event.target.value)}
          />
          <InputElement
            id="contact_person"
            name="contact_person"
            label="Contact Person"
            placeholder="Enter contact person"
            value={formData.contact_person}
            className=""
            onChange={(event) => handleChange('contact_person', event.target.value)}
          />
          <InputElement
            id="phone"
            name="phone"
            label="Phone/Mobile"
            placeholder="Enter phone / mobile"
            value={formData.phone}
            className=""
            onChange={(event) => handleChange('phone', event.target.value)}
          />
          <InputElement
            id="email"
            name="email"
            type="email"
            label="Email"
            placeholder="Enter email"
            value={formData.email}
            className=""
            onChange={(event) => handleChange('email', event.target.value)}
          />

          <div className="text-left flex flex-col">
            <label htmlFor="address" className="text-black dark:text-white">
              Address
            </label>
            <textarea
              id="address"
              name="address"
              rows={2}
              value={formData.address}
              onChange={(event) => handleChange('address', event.target.value)}
              placeholder="Enter address"
              className={TEXTAREA_CLASS}
            />
          </div>

          {/* Printed under the company name on letterheads, so it is worth a
              couple of lines rather than a single-line input. */}
          <div className="text-left flex flex-col">
            <label htmlFor="notes" className="text-black dark:text-white">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              value={formData.notes}
              onChange={(event) => handleChange('notes', event.target.value)}
              placeholder="Enter notes"
              className={TEXTAREA_CLASS}
            />
          </div>
        </div>

        {/* Boxed off the way the product form boxes its opening stock: the two
            uploads belong together and neither is required to save. */}
        <div className="mt-4 rounded border border-stroke p-3 dark:border-strokedark">
          <h4 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Company Logo
          </h4>
          <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
            Optional. The dark-mode logo is shown while the app is in dark mode —
            leave it empty to use the light-mode logo everywhere.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-left flex flex-col">
              <label htmlFor="company_logo" className="text-black dark:text-white">
                Light Mode
              </label>
              <div className="flex items-center gap-2">
                {/* Previewed on a white chip regardless of theme, since this
                    logo is shown against light backgrounds. */}
                <img
                  src={logoPreview || undefined}
                  alt="Company logo"
                  className={`h-[2.4rem] w-[4.2rem] shrink-0 rounded-sm border border-gray-300 bg-white object-contain p-0.5 dark:border-gray-600 ${
                    logoPreview ? '' : 'hidden'
                  }`}
                />
                <input
                  id="company_logo"
                  name="company_logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className={FILE_INPUT_CLASS}
                />
              </div>
            </div>

            <div className="text-left flex flex-col">
              <label htmlFor="company_logo_dark" className="text-black dark:text-white">
                Dark Mode
              </label>
              <div className="flex items-center gap-2">
                {/* Previewed on a dark chip regardless of theme, since this
                    logo is shown against dark backgrounds. */}
                <img
                  src={logoDarkPreview || undefined}
                  alt="Company logo (dark mode)"
                  className={`h-[2.4rem] w-[4.2rem] shrink-0 rounded-sm border border-gray-300 bg-slate-800 object-contain p-0.5 dark:border-gray-600 ${
                    logoDarkPreview ? '' : 'hidden'
                  }`}
                />
                <input
                  id="company_logo_dark"
                  name="company_logo_dark"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoDarkChange}
                  className={FILE_INPUT_CLASS}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex mt-4 justify-center items-center">
          <ButtonLoading
            buttonLoading={company?.isSaving}
            label="Update"
            icon={<FiSave className="text-white text-lg ml-2 mr-2" />}
            type="submit"
            className="whitespace-nowrap mr-2 py-1.5"
          />
          <Link to="/company/company-list" className="text-nowrap py-1.5">
            Go to back
          </Link>
        </div>
      </form>
    </div>
  );
};

export default EditCompany;
