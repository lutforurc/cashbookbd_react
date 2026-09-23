import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { FIELD_FILE_BUTTON } from '../../../theme/fieldStyles';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import Loader from '../../../common/Loader';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { getSettings } from '../settings/settingsSlice';
import { resolveAssetUrl } from '../../services/resolveAssetUrl';
import InputElement from '../../utils/fields/InputElement';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import FormToggleField from '../../utils/utils-functions/FormToggleField';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { editCompany, updateCompany } from './companySlice';
import { Input, Textarea } from '../../utils/fields/FormControls';

/** Matches the textarea in the product form, so both read as the same field. */
const TEXTAREA_CLASS =
  'block w-full resize-y rounded-xs border border-gray-300 bg-white p-2 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-boxdark dark:text-[rgb(var(--c-text))] dark:focus:border-blue-400';

/**
 * Matches PhotoInput, which is how every other upload in the app is drawn --
 * and now says so by sharing its button rather than by repeating the string.
 */
const FILE_INPUT_CLASS = `w-full text-sm text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))] ${FIELD_FILE_BUTTON}`;

const buildCompanyFormData = (data: any, logoFile: File | null, logoDarkFile: File | null) => {
  const payload = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (key === 'company_logo' || key === 'company_logo_dark') return;
    // A switch goes as 1 or 0: "false" is a non-empty string, and the
    // server's boolean rule would refuse it.
    payload.append(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
  });

  if (logoFile) {
    payload.append('company_logo', logoFile);
  }

  if (logoDarkFile) {
    payload.append('company_logo_dark', logoDarkFile);
  }

  return payload;
};

/**
 * The month a financial year starts in, as the dropdown offers it.
 *
 * ⚠️ A month, not a pair of dates. The year END is worked out from it -- the
 * last day of the month before -- so there is nothing for the two to disagree
 * about. July is what every company here keeps and what the tax year runs to.
 */
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "1 July – 30 June": what the chosen month means, said beside the box. */
const yearRuns = (startMonth: number) => {
  const endMonth = startMonth <= 1 ? 12 : startMonth - 1;
  // Day 0 of the next month is the last day of this one; 2001 is not a leap
  // year, so February reads "28 February" rather than promising a 29th.
  const lastDay = new Date(2001, endMonth, 0).getDate();

  return `1 ${MONTHS[startMonth - 1]} – ${lastDay} ${MONTHS[endMonth - 1]}`;
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
    fy_start_month: '7',
    year_closing_enabled: false,
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
      // Absent on a server not yet patched, which means July.
      fy_start_month: String(editData.fy_start_month || 7),
      // Off until the company chooses; absent on a server not yet patched.
      year_closing_enabled: Number(editData.year_closing_enabled) === 1,
    });
    setLogoFile(null);
    setLogoPreview(resolveAssetUrl(editData.company_logo || '', environment));
    setLogoDarkFile(null);
    setLogoDarkPreview(resolveAssetUrl(editData.company_logo_dark || '', environment));
  }, [company?.editData, environment]);

  const handleChange = (field: string, value: string | boolean) => {
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
            <label htmlFor="address" className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
              Address
            </label>
            <Textarea
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
            <label htmlFor="notes" className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
              Notes
            </label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              value={formData.notes}
              onChange={(event) => handleChange('notes', event.target.value)}
              placeholder="Enter notes"
              className={TEXTAREA_CLASS}
            />
          </div>

          {/* ⚠️ Which month the books' year starts in. The year end, the
              closing and the depreciation run all follow from this one number
              -- set it once, before the first year is closed. Changing it
              later is allowed: the next closing covers a short or long period
              once, and the server's answer says so. */}
          <DropdownCommon
            id="fy_start_month"
            name="fy_start_month"
            label="Financial year starts in"
            data={MONTHS.map((month, index) => ({ id: String(index + 1), name: month }))}
            value={formData.fy_start_month}
            onChange={(event) => handleChange('fy_start_month', event.target.value)}
            description={`Runs ${yearRuns(Number(formData.fy_start_month) || 7)}. Year closing and depreciation follow it.`}
          />

          {/* ⚠️ WHETHER THIS COMPANY CLOSES ITS YEARS AT ALL. Off, nobody sees
              the screen and nothing is ever locked -- the books run on as they
              always have, which is right for a trader with no accountant. On,
              whoever holds year.closing.run may close a year, and a closed
              year's vouchers are frozen until the closing is undone. */}
          <FormToggleField
            label="Year closing"
            description="On, the year can be closed to Retained Earnings and a closed year's vouchers are locked. Off, the books simply run on."
            checked={Boolean(formData.year_closing_enabled)}
            onChange={(checked) => handleChange('year_closing_enabled', checked)}
          />
        </div>

        {/* Boxed off the way the product form boxes its opening stock: the two
            uploads belong together and neither is required to save. */}
        <div className="mt-4 rounded border border-[rgb(var(--c-border))] p-3">
          <h4 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Company Logo
          </h4>
          <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
            Optional. The dark-mode logo is shown while the app is in dark mode —
            leave it empty to use the light-mode logo everywhere.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-left flex flex-col">
              <label htmlFor="company_logo" className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                Light Mode
              </label>
              <div className="flex items-center gap-2">
                {/* Previewed on a white chip regardless of theme, since this
                    logo is shown against light backgrounds. */}
                <img
                  src={logoPreview || undefined}
                  alt="Company logo"
                  className={`h-[2.4rem] w-[4.2rem] shrink-0 rounded-sm border border-[rgb(var(--c-border))] bg-white object-contain p-0.5 ${
 logoPreview ? '' : 'hidden'
 }`}
                />
                <Input
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
              <label htmlFor="company_logo_dark" className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                Dark Mode
              </label>
              <div className="flex items-center gap-2">
                {/* Previewed on a dark chip regardless of theme, since this
                    logo is shown against dark backgrounds. */}
                <img
                  src={logoDarkPreview || undefined}
                  alt="Company logo (dark mode)"
                  className={`h-[2.4rem] w-[4.2rem] shrink-0 rounded-sm border border-[rgb(var(--c-border))] bg-slate-800 object-contain p-0.5 ${
 logoDarkPreview ? '' : 'hidden'
 }`}
                />
                <Input
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
            icon={<FiSave className="text-lg ml-2 mr-2" />}
            type="submit"
            className="whitespace-nowrap mr-2 py-1.5"
          />
          <ButtonLoading
            onClick={() => navigate('/company/company-list')}
            buttonLoading={false}
            label="Go to back"
            className="whitespace-nowrap text-center mr-0"
            icon={<FiArrowLeft className="text-lg ml-2 mr-2" />}
          />
        </div>
      </form>
    </div>
  );
};

export default EditCompany;
