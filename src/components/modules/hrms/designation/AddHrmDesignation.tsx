import React, { useEffect, useState } from 'react';
import { FiSave } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useNavigate, useParams } from 'react-router-dom';

import Loader from '../../../../common/Loader';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import ROUTES from '../../../services/appRoutes';
import InputElement from '../../../utils/fields/InputElement';
import Link from '../../../utils/others/Link';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import {
  clearHrmDesignationEditData,
  editHrmDesignation,
  fetchDesignationLevelOptions,
  saveHrmDesignation,
  updateHrmDesignation,
} from './hrmDesignationSlice';

interface HrmDesignationForm {
  id: string | number;
  name: string;
  level_id: string;
  post_sequence: string;
  description: string;
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
  };

  const [formData, setFormData] = useState<HrmDesignationForm>(initialFormData);
  const [buttonLoading, setButtonLoading] = useState(false);

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
    <div>
      <HelmetTitle title={formData?.id ? 'Edit Designation' : 'Add Designation'} />

      {hrmDesignationState?.isLoading === true ? <Loader /> : null}

      <div className="mx-auto grid w-full max-w-[720px] grid-cols-1 gap-4 mt-3 rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark ">
        <InputElement
          id="name"
          value={formData.name}
          name="name"
          placeholder="Enter designation name"
          label="Designation Name"
          onChange={handleInputChange}
        />

        <div className="text-left">
          <label htmlFor="level_id" className="text-black dark:text-white">
            Designation Level
          </label>
          <DropdownCommon
            id="level_id"
            name="level_id"
            value={formData.level_id}
            onChange={handleSelectChange}
            data={levelOptions}
            className="h-9"
          />
        </div>
        <InputElement
          id="description"
          value={formData.description}
          name="description"
          placeholder="Enter short description"
          label="Description"
          onChange={handleInputChange}
        />
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

      <div className="mt-4 flex items-center justify-center">
        {formData?.id ? (
          <ButtonLoading
            onClick={handleUpdate}
            buttonLoading={buttonLoading}
            label="Update"
            className="mr-2 whitespace-nowrap py-1.5"
          />
        ) : (
          <ButtonLoading
            onClick={handleSave}
            buttonLoading={buttonLoading}
            label="Save"
            className="mr-2 whitespace-nowrap p-1.5 text-center"
            icon={<FiSave className="ml-2 mr-2 text-lg text-white" />}
          />
        )}

        <Link to={ROUTES.hrms_designation_list} className="text-nowrap py-1.5">
          Go to back
        </Link>
      </div>
    </div>
  );
};

export default AddHrmDesignation;
