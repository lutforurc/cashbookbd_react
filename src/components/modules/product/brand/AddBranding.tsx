import React, { useEffect, useState } from 'react';
// import InputElement from '../../utils/fields/InputElement';
// import HelmetTitle from '../../utils/others/HelmetTitle';
// import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
// import Link from '../../utils/others/Link';
// import { useDispatch, useSelector } from 'react-redux';
// import Loader from '../../../common/Loader';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FiSave } from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Loader from '../../../../common/Loader';
import InputElement from '../../../utils/fields/InputElement';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import Link from '../../../utils/others/Link';
import { editBrand, saveBrand, updateBrand } from './brandSlice';
import ROUTES from '../../../services/appRoutes';


interface Brand {
  id: string | number;
  name: string;
  address: string;
  email: string;
  contacts: string;
}

const AddBranding = () => {
  const brand = useSelector((state: any) => state.brand);
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const { id } = useParams();

  const initialBrand: Brand = {
    id: '',
    name: '',
    address: '',
    email: '',
    contacts: '',
  };

  const [formData, setFormData] = useState<Brand>(initialBrand);
  const [buttonLoading, setButtonLoading] = useState(false);

  // ========== Edit Mode: load data ==========
  useEffect(() => {
    if (id) {
      dispatch(editBrand(id));
    }
  }, [id]);

  useEffect(() => {
    if (brand?.editData) {
      setFormData({
        id: brand.editData?.id ?? '',
        name: brand.editData?.name ?? '',
        address: brand.editData?.address ?? '',
        email: brand.editData?.email ?? '',
        contacts: brand.editData?.contacts ?? '',
      });
    }
  }, [brand?.editData]);

  // ========== Handlers ==========
  const handleOnChange = (e: any) => {
    const { value, name } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const isValidEmail = (email: string) => {
    // simple email validation
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validate = () => {
    if (!(formData.name || '').trim()) {
      toast.error('Please enter brand name.');
      return false;
    }
    if (!(formData.address || '').trim()) {
      toast.error('Please enter address.');
      return false;
    }
    if (!(formData.email || '').trim()) {
      toast.error('Please enter email.');
      return false;
    }
    if (!isValidEmail(formData.email.trim())) {
      toast.error('Please enter a valid email.');
      return false;
    }
    if (!(formData.contacts || '').trim()) {
      toast.error('Please enter contact number.');
      return false;
    }
    return true;
  };

   const handleSave = async (e: any) => {
    e.preventDefault();
    if (!validate()) return;

    setButtonLoading(true);


    try {
              const response = await dispatch(saveBrand(formData)).unwrap();
          toast.success('Employee saved successfully');
   
        } catch (err: any) {
          toast.error(err?.message || 'Failed to save employee');
        } finally {
         setButtonLoading(false);
        }
    
  };

  const handleUpdate = (e: any) => {
    e.preventDefault();
    if (!validate()) return;

    setButtonLoading(true);

    dispatch(
      updateBrand(formData, (d: any) => {
        setButtonLoading(false);

        if (d?.success) {
          toast.success(d?.message || 'Manufacturer updated successfully');
          setTimeout(() => {
            navigate('/product-manufacturer/manufacturer-list'); // ✅ আপনার রাউট অনুযায়ী চেঞ্জ করুন
          }, 700);
        } else {
          toast.error(d?.message || 'Update failed');
        }
      }),
    );
  };

  return (
    <div>
      <HelmetTitle title={formData?.id ? 'Edit Brand' : 'Add Brand'} />

      {brand?.isLoading === true ? <Loader /> : null}

      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <InputElement
          id="name"
          value={formData.name}
          name="name"
          placeholder="Enter Brand Name"
          label="Brand Name"
          className=""
          onChange={handleOnChange}
        />

        <InputElement
          id="email"
          value={formData.email}
          name="email"
          placeholder="Enter Email"
          label="Email"
          className=""
          onChange={handleOnChange}
        />

        <InputElement
          id="contacts"
          value={formData.contacts}
          name="contacts"
          placeholder="Enter Contact Number"
          label="Contact"
          className=""
          onChange={handleOnChange}
        />

        <InputElement
          id="address"
          value={formData.address}
          name="address"
          placeholder="Enter Address"
          label="Address"
          className="md:col-span-2"
          onChange={handleOnChange}
        />
      </div>

      <div className="flex mt-4 justify-center items-center">
        {formData?.id ? (
          <ButtonLoading
            onClick={handleUpdate}
            buttonLoading={buttonLoading}
            label="Update"
            className="whitespace-nowrap mr-2 py-1.5"
          />
        ) : (
          <ButtonLoading
            onClick={handleSave}
            buttonLoading={buttonLoading}
            label="Save"
            className="whitespace-nowrap text-center mr-2 p-1.5"
            icon={<FiSave className="text-white text-lg ml-2 mr-2" />}
          />
        )}

        <Link to={ROUTES.brand_list} className="text-nowrap py-1.5">
          Go to back
        </Link>
      </div>
    </div>
  );
};

export default AddBranding;
