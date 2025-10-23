import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiSave, FiRefreshCcw, FiHome, FiPlus, FiEdit2 } from 'react-icons/fi';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import InputElement from '../../../utils/fields/InputElement';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import { useDispatch, useSelector } from 'react-redux';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import Loader from '../../../../common/Loader';
import { status } from '../../../utils/fields/DataConstant';
import { saveArea } from './areaSlice';
import { FaArrowLeft } from 'react-icons/fa6';

const AreaAdd = (user: any) => {
  const dispatch = useDispatch();
  const branchDdlData = useSelector((state) => state.branchDdl);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    latitude: '',
    longitude: '',
    notes: '',
    status: 'active',
    created_by: '',
    updated_by: '',
  });
  const [buttonLoading, setButtonLoading] = useState(false);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());

  }, []);

  const handleOnChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleOnSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // BranchDropdown -> onChange(value) => branch_id আপডেট
  const handleBranchChange = (e: any) => {
    setFormData({ ...formData, ['branch_id']: e.target.value });
  };

  const handleAreaSave = async () => {
    setButtonLoading(true);
    try {
      // Call API to save area
      const response = await dispatch(saveArea(formData)).unwrap();

      if (response.ok) {
        // onSuccess(); // Refresh list or close modal
      }
    } catch (error) {
      console.error('Error saving area:', error);
    }
    setButtonLoading(false);
  };

  const handleAreaUpdate = async () => {
    setButtonLoading(true);
    // try {
    //   // Call API to update area
    //   const response = await fetch(`/api/areas/${areaEditData?.editData?.id}`, {
    //     method: 'PUT',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(formData),
    //   });
    //   if (response.ok) {
    //     onSuccess();
    //   }
    // } catch (error) {
    //   console.error('Error updating area:', error);
    // }
    setButtonLoading(false);
  };

  const handleReset = () => {
    setFormData({
      name: '',
      description: '',
      latitude: '',
      longitude: '',
      notes: '',
      status: 'active',
      created_by: '',
      updated_by: '',
    });
  };

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/real-estate/area-list');
  };


  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        {branchDdlData.isLoading == true ? <Loader /> : ''}
        <InputElement
          id="name"
          value={formData.name || ''}
          name="name"
          placeholder="Enter Area Name"
          label="Enter Area Name"
          className=""
          onChange={handleOnChange}
        />

        <InputElement
          id="latitude"
          value={formData.latitude || ''}
          name="latitude"
          placeholder="Enter Latitude"
          label="Enter Latitude"
          className=""
          onChange={handleOnChange}
        />
        <InputElement
          id="longitude"
          value={formData.longitude || ''}
          name="longitude"
          placeholder="Enter Longitude"
          label="Enter Longitude"
          className=""
          onChange={handleOnChange}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        <InputElement
          id="description"
          value={formData.description || ''}
          name="description"
          placeholder="Enter Description"
          label="Enter Description"
          className=""
          onChange={handleOnChange}
        />
        <InputElement
          id="notes"
          value={formData.notes || ''}
          name="notes"
          placeholder="Enter Notes"
          label="Enter Notes"
          className=""
          onChange={handleOnChange}
        />
        <DropdownCommon
          id="status"
          name="status"
          label="Select Status"
          onChange={handleOnSelectChange}
          defaultValue={formData.status || ''}
          className="h-[2.1rem] bg-transparent mt-1"
          data={status}
        />
      </div>

      <div className="grid grid-cols-3 gap-x-1 gap-y-1">
        {1 !== 1 ? (
          <ButtonLoading
            onClick={handleAreaUpdate}
            buttonLoading={buttonLoading}
            label="Update"
            className="whitespace-nowrap text-center mr-0"
            icon={<FiSave className="text-white text-lg ml-2  mr-2" />}
          />
        ) : (
          <ButtonLoading
            onClick={handleAreaSave}
            buttonLoading={buttonLoading}
            label="Save"
            className="whitespace-nowrap text-center mr-0"
            icon={<FiSave className="text-white text-lg ml-2 mr-2" />}
          />
        )}
        <ButtonLoading
          onClick={handleReset}
          buttonLoading={false}
          label="Reset"
          className="whitespace-nowrap text-center mr-0 p-2"
          icon={<FiRefreshCcw className="text-white text-lg ml-2 mr-2" />}
        />
        <ButtonLoading
          onClick={handleBack}
          buttonLoading={false}
          label="Back"
          className="whitespace-nowrap text-center mr-0 p-2"
          icon={<FaArrowLeft className="text-white text-lg ml-2 mr-2" />}
        />
      </div>
    </div>
  );
};

export default AreaAdd;
