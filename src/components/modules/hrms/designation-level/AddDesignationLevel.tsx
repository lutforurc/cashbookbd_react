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
import {
  clearDesignationLevelEditData,
  editDesignationLevel,
  saveDesignationLevel,
  updateDesignationLevel,
} from './designationLevelSlice';

interface DesignationLevelForm {
  id: string | number;
  name: string;
  description: string;
}

const AddDesignationLevel = () => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const { id } = useParams();
  const designationLevelState = useSelector((state: any) => state.designationLevel);

  const initialFormData: DesignationLevelForm = {
    id: '',
    name: '',
    description: '',
  };

  const [formData, setFormData] = useState<DesignationLevelForm>(initialFormData);
  const [buttonLoading, setButtonLoading] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(editDesignationLevel(id));
      return;
    }

    dispatch(clearDesignationLevelEditData());
    setFormData(initialFormData);
  }, [dispatch, id]);

  useEffect(() => {
    if (!designationLevelState?.editData) return;

    setFormData({
      id: designationLevelState.editData?.id ?? '',
      name: designationLevelState.editData?.name ?? '',
      description: designationLevelState.editData?.description ?? '',
    });
  }, [designationLevelState?.editData]);

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validate = () => {
    if (!(formData.name || '').trim()) {
      toast.error('Please enter designation level name.');
      return false;
    }

    return true;
  };

  const handleSave = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setButtonLoading(true);
    try {
      const response = await dispatch(saveDesignationLevel(formData)).unwrap();
      toast.success(response?.message || 'Designation level saved successfully');
      setTimeout(() => navigate(ROUTES.hrms_designation_level_list), 500);
    } catch (err: any) {
      toast.error(err || 'Failed to save designation level');
    } finally {
      setButtonLoading(false);
    }
  };

  const handleUpdate = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setButtonLoading(true);
    try {
      const response = await dispatch(updateDesignationLevel(formData)).unwrap();
      toast.success(response?.message || 'Designation level updated successfully');
      setTimeout(() => navigate(ROUTES.hrms_designation_level_list), 500);
    } catch (err: any) {
      toast.error(err || 'Failed to update designation level');
    } finally {
      setButtonLoading(false);
    }
  };

  return (
    <div>
      <HelmetTitle title={formData?.id ? 'Edit Designation Level' : 'Add Designation Level'} />

      {designationLevelState?.isLoading === true ? <Loader /> : null}

      <div className="mx-auto grid w-full max-w-[620px] grid-cols-1 gap-4 rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
        <InputElement
          id="name"
          value={formData.name}
          name="name"
          placeholder="Enter designation level name"
          label="Level Name"
          onChange={handleOnChange}
        />

        <InputElement
          id="description"
          value={formData.description}
          name="description"
          placeholder="Enter short description"
          label="Description"
          onChange={handleOnChange}
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

        <Link to={ROUTES.hrms_designation_level_list} className="text-nowrap py-1.5">
          Go to back
        </Link>
      </div>
    </div>
  );
};

export default AddDesignationLevel;
