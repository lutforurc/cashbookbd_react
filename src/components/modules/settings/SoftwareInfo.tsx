import { FormEvent, useEffect, useState } from 'react';
import { FiSave } from 'react-icons/fi';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import Loader from '../../../common/Loader';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import InputElement from '../../utils/fields/InputElement';
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

  const optionalLabel = (text: string) => (
    <>
      {text} <span className="text-gray-400">(optional)</span>
    </>
  );

  return (
    <div>
      {/* The heading is HelmetTitle's alone -- a second one below it said the
          same words twice. What is worth keeping is the line explaining where
          these details end up. */}
      <HelmetTitle title="Software Information" />
      <p className="mb-3 text-center text-sm text-gray-500 dark:text-gray-400">
        This name and mobile number appear in the footer of all reports.
      </p>

      {loading ? <Loader /> : null}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputElement
            id="name"
            name="name"
            label="Software Company Name"
            placeholder="e.g. ABC Software Ltd."
            value={formData.name}
            className=""
            onChange={(event) => handleChange('name', event.target.value)}
          />
          <InputElement
            id="mobile"
            name="mobile"
            label="Mobile Number"
            placeholder="e.g. 01700000000"
            value={formData.mobile}
            className=""
            onChange={(event) => handleChange('mobile', event.target.value)}
          />
          <InputElement
            id="email"
            name="email"
            label={optionalLabel('Email')}
            placeholder="Enter email"
            value={formData.email}
            className=""
            onChange={(event) => handleChange('email', event.target.value)}
          />
          <InputElement
            id="website"
            name="website"
            label={optionalLabel('Website')}
            placeholder="Enter website"
            value={formData.website}
            className=""
            onChange={(event) => handleChange('website', event.target.value)}
          />

          {/* Runs the width of the row: an address is the longest of these and
              would otherwise sit half-width with empty space beside it. */}
          <div className="md:col-span-2">
            <InputElement
              id="address"
              name="address"
              label={optionalLabel('Address')}
              placeholder="Enter address"
              value={formData.address}
              className=""
              onChange={(event) => handleChange('address', event.target.value)}
            />
          </div>
        </div>

        <div className="flex mt-4 justify-center items-center">
          <ButtonLoading
            buttonLoading={saving}
            label="Update"
            icon={<FiSave className="text-white text-lg ml-2 mr-2" />}
            type="submit"
            className="whitespace-nowrap py-1.5"
          />
        </div>
      </form>
    </div>
  );
};

export default SoftwareInfo;
