import React, { useEffect, useState } from 'react';
import { FiHome, FiSave } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useNavigate, useParams } from 'react-router-dom';

import Loader from '../../../../common/Loader';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import ROUTES from '../../../services/appRoutes';
import InputElement from '../../../utils/fields/InputElement';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import {
  clearHrmDesignationEditData,
  editHrmDesignation,
  fetchDesignationLevelOptions,
  saveHrmDesignation,
  updateHrmDesignation,
} from './hrmDesignationSlice';
import BilingualInput from '../../../utils/fields/BilingualInput';
import { useLanguage } from '../../../../i18n/useLanguage';
import { useTranslation } from 'react-i18next';

interface HrmDesignationForm {
  id: string | number;
  name: string;
  level_id: string;
  post_sequence: string;
  description: string;
  name_local?: string;
  description_local?: string;
}

const AddHrmDesignation = () => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const { id } = useParams();
  const hrmDesignationState = useSelector((state: any) => state.hrmDesignation);

  const initialFormData: HrmDesignationForm = {
    id: '',
    name: '',
    level_id: '',
    post_sequence: '',
    description: '',
    name_local: '',
    description_local: '',
  };

  const [formData, setFormData] = useState<HrmDesignationForm>(initialFormData);
  const [buttonLoading, setButtonLoading] = useState(false);
  const { localCode, localName } = useLanguage();
  const { t } = useTranslation('common');

  useEffect(() => {
    dispatch(fetchDesignationLevelOptions());

    if (id) {
      dispatch(editHrmDesignation(id));
      return;
    }

    dispatch(clearHrmDesignationEditData());
    setFormData(initialFormData);
  }, [dispatch, id]);

  useEffect(() => {
    if (!hrmDesignationState?.editData) return;

    setFormData({
      id: hrmDesignationState.editData?.id ?? '',
      name: hrmDesignationState.editData?.name ?? '',
      level_id: hrmDesignationState.editData?.level_id?.toString() ?? '',
      post_sequence: hrmDesignationState.editData?.post_sequence?.toString() ?? '',
      description: hrmDesignationState.editData?.description ?? '',
      name_local: hrmDesignationState.editData?.name_local ?? '',
      description_local: hrmDesignationState.editData?.description_local ?? '',
    });
  }, [hrmDesignationState?.editData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validate = () => {
    if (!(formData.name || '').trim()) {
      toast.error('Please enter designation name.');
      return false;
    }
    // "Enable Bangla" on: the Bangla name is required too.
    if (localCode && !(formData.name_local || '').trim()) {
      toast.error(t('data.localRequired', { field: 'Designation Name', language: localName }));
      return false;
    }

    if (!(formData.level_id || '').trim()) {
      toast.error('Please select designation level.');
      return false;
    }

    if (!(formData.post_sequence || '').trim()) {
      toast.error('Please enter sequence.');
      return false;
    }

    return true;
  };

  const handleSave = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setButtonLoading(true);
    try {
      const response = await dispatch(
        saveHrmDesignation({
          ...formData,
          level_id: Number(formData.level_id),
          post_sequence: Number(formData.post_sequence),
        }),
      ).unwrap();
      toast.success(response?.message || 'Designation saved successfully');
      setTimeout(() => navigate(ROUTES.hrms_designation_list), 500);
    } catch (err: any) {
      toast.error(err || 'Failed to save designation');
    } finally {
      setButtonLoading(false);
    }
  };

  const handleUpdate = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setButtonLoading(true);
    try {
      const response = await dispatch(
        updateHrmDesignation({
          ...formData,
          level_id: Number(formData.level_id),
          post_sequence: Number(formData.post_sequence),
        }),
      ).unwrap();
      toast.success(response?.message || 'Designation updated successfully');
      setTimeout(() => navigate(ROUTES.hrms_designation_list), 500);
    } catch (err: any) {
      toast.error(err || 'Failed to update designation');
    } finally {
      setButtonLoading(false);
    }
  };

  const levelOptions = [
    { id: '', name: 'Select Level' },
    ...(hrmDesignationState?.designationLevelDdl || []),
  ];

  return (
    <>
      <HelmetTitle title={formData?.id ? 'Edit Designation' : 'Add Designation'} />

      <div className="mx-auto mt-10 mb-10 w-full items-center md:w-4/5 lg:w-3/5 xl:w-2/5">
        <div className="grid">
          {hrmDesignationState?.isLoading === true ? <Loader /> : null}

          <div className="w-full">
            <div className="mb-2 text-left">
              <label htmlFor="level_id" className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                Designation Level
              </label>
              <DropdownCommon
 id="level_id"
 name="level_id"
 value={formData.level_id}
 onChange={handleSelectChange}
 data={levelOptions}
 className=""
              />
            </div>

            <div className="mb-2">
              <BilingualInput
                name="name"
                kind="name"
                value={formData.name}
                localValue={formData.name_local || ''}
                placeholder="Enter designation name"
                label="Designation Name"
                onChange={handleInputChange}
                onLocalChange={(value) => setFormData((prev) => ({ ...prev, name_local: value }))}
              />
            </div>

            <div className="mb-2">
              <InputElement
                id="post_sequence"
                value={formData.post_sequence}
                name="post_sequence"
                placeholder="Enter sequence"
                label="Sequence"
                type="number"
                onChange={handleInputChange}
              />
            </div>

            <BilingualInput
              name="description"
              kind="description"
              value={formData.description}
              localValue={formData.description_local || ''}
              placeholder="Enter short description"
              label="Description"
              onChange={handleInputChange}
              onLocalChange={(value) => setFormData((prev) => ({ ...prev, description_local: value }))}
            />

            <div className="mt-3 grid grid-cols-2 gap-x-1 gap-y-1">
              {formData?.id ? (
                <ButtonLoading
                  onClick={handleUpdate}
                  buttonLoading={buttonLoading}
                  label={buttonLoading ? 'Updating...' : 'Update'}
                  className="mr-0 whitespace-nowrap p-2 text-center"
                  icon={<FiSave className="mr-2 text-lg" />}
                />
              ) : (
                <ButtonLoading
                  onClick={handleSave}
                  buttonLoading={buttonLoading}
                  label={buttonLoading ? 'Saving...' : 'Save'}
                  className="mr-0 whitespace-nowrap p-2 text-center"
                  icon={<FiSave className="mr-2 text-lg" />}
                />
              )}

              <ButtonLoading
                onClick={() => navigate(ROUTES.hrms_designation_list)}
                buttonLoading={false}
                label="Back"
                className="whitespace-nowrap text-center mr-0"
                icon={<FiHome className="text-lg mr-2" />}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddHrmDesignation;
