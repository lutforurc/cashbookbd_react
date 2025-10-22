import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiSave, FiRefreshCcw, FiHome } from 'react-icons/fi';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import InputElement from '../../utils/fields/InputElement';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';

const RealEstateArea = () => {
  const [formData, setFormData] = useState({
    company_id: '',
    branch_id: '',
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

  const handleOnChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleOnSelectChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAreaSave = async () => {
    setButtonLoading(true);
    try {
      // Call API to save area
      const response = await fetch('/api/areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
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
      company_id: '',
      branch_id: '',
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

  // Sample data for dropdowns (fetch from API in real app)
  const companies = [{ id: 1, name: 'Company 1' }]; // Replace with API data
  const branches = [{ id: 1, name: 'Branch 1' }]; // Replace with API data
  const statusOptions = [
    { id: 'active', name: 'Active' },
    { id: 'inactive', name: 'Inactive' },
  ];

//   const isEdit = areaEditData?.editData?.id;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        <DropdownCommon
          id="company_id"
          name="company_id"
          label="Select Company"
          onChange={handleOnSelectChange}
          defaultValue={formData.company_id || ''}
          className="h-[2.1rem] bg-transparent mt-1"
          data={companies}
        />
        <DropdownCommon
          id="branch_id"
          name="branch_id"
          label="Select Branch"
          onChange={handleOnSelectChange}
          defaultValue={formData.branch_id || ''}
          className="h-[2.1rem] bg-transparent mt-1"
          data={branches}
        />
        <InputElement
          id="name"
          value={formData.name || ''}
          name="name"
          placeholder="Enter Area Name"
          label="Enter Area Name"
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
          data={statusOptions}
        />
        <InputElement
          id="created_by"
          value={formData.created_by || ''}
          name="created_by"
          placeholder="Enter Created By"
          label="Enter Created By"
          className=""
          onChange={handleOnChange}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        <InputElement
          id="updated_by"
          value={formData.updated_by || ''}
          name="updated_by"
          placeholder="Enter Updated By"
          label="Enter Updated By"
          className=""
          onChange={handleOnChange}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        {1 !== 2 ? (
          <ButtonLoading
            onClick={handleAreaUpdate}
            buttonLoading={buttonLoading}
            label="Update"
            className="whitespace-nowrap text-center mr-0 p-2"
            icon={<FiSave className="text-white text-lg ml-2 mr-2" />}
          />
        ) : (
          <ButtonLoading
            onClick={handleAreaSave}
            buttonLoading={buttonLoading}
            label="Save"
            className="whitespace-nowrap text-center mr-0 p-2"
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
        <Link to="/areas/area-list" className="text-nowrap justify-center mr-0 p-2">
          <FiHome className="text-white text-lg ml-2 mr-2 h-5" />
          <span className="">Back</span>
        </Link>
      </div>
    </div>
  );
};

export default RealEstateArea;