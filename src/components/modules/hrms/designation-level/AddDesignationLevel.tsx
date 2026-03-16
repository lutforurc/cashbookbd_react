import React, { useEffect, useState } from 'react';
import { FiHome, FiSave } from 'react-icons/fi';
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
    <>
      <HelmetTitle title={formData?.id ? 'Edit Designation Level' : 'Add Designation Level'} />

      <div className="mx-auto mt-10 mb-10 w-full items-center md:w-4/5 lg:w-3/5 xl:w-2/5">
        <div className="grid">
          {designationLevelState?.isLoading === true ? <Loader /> : null}

          <div className="w-full">
            <div className="mb-2">
              <InputElement
                id="name"
                value={formData.name}
                name="name"
                placeholder="Enter designation level name"
                label="Level Name"
                onChange={handleOnChange}
              />
            </div>

            <InputElement
              id="description"
              value={formData.description}
              name="description"
              placeholder="Enter short description"
              label="Description"
              onChange={handleOnChange}
            />

            <div className="mt-3 grid grid-cols-2 gap-x-1 gap-y-1">
              {formData?.id ? (
                <ButtonLoading
                  onClick={handleUpdate}
                  buttonLoading={buttonLoading}
                  label={buttonLoading ? 'Updating...' : 'Update'}
                  className="mr-0 whitespace-nowrap p-2 text-center"
                  icon={<FiSave className="ml-2 mr-2 text-lg text-white" />}
                />
              ) : (
                <ButtonLoading
                  onClick={handleSave}
                  buttonLoading={buttonLoading}
                  label={buttonLoading ? 'Saving...' : 'Save'}
                  className="mr-0 whitespace-nowrap p-2 text-center"
                  icon={<FiSave className="ml-2 mr-2 text-lg text-white" />}
                />
              )}

              <Link
                to={ROUTES.hrms_designation_level_list}
                className="mr-0 justify-center whitespace-nowrap p-2"
              >
                <FiHome className="ml-2 mr-2 text-lg text-white" />
                <span>Back</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddDesignationLevel;
