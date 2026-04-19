import React, { useEffect, useState } from 'react';
import { FiSave } from 'react-icons/fi';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';

import Loader from '../../../../common/Loader';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import InputElement from '../../../utils/fields/InputElement';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Link from '../../../utils/others/Link';
import ROUTES from '../../../services/appRoutes';
import {
  clearProductUnitEditData,
  editProductUnit,
  saveProductUnit,
  updateProductUnit,
} from './unitSlice';

interface ProductUnitForm {
  id: string | number;
  name: string;
  short_name: string;
  description: string;
}

const AddProductUnit = () => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const { id } = useParams();
  const productUnit = useSelector((state: any) => state.productUnit);

  const initialFormData: ProductUnitForm = {
    id: '',
    name: '',
    short_name: '',
    description: '',
  };

  const [formData, setFormData] = useState<ProductUnitForm>(initialFormData);
  const [buttonLoading, setButtonLoading] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(editProductUnit(id));
      return;
    }

    dispatch(clearProductUnitEditData());
    setFormData(initialFormData);
  }, [dispatch, id]);

  useEffect(() => {
    if (!productUnit?.editData) return;

    setFormData({
      id: productUnit.editData?.id ?? '',
      name: productUnit.editData?.name ?? '',
      short_name: productUnit.editData?.short_name ?? '',
      description: productUnit.editData?.description ?? '',
    });
  }, [productUnit?.editData]);

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validate = () => {
    if (!(formData.name || '').trim()) {
      toast.error('Please enter unit name.');
      return false;
    }

    if (!(formData.short_name || '').trim()) {
      toast.error('Please enter unit short name.');
      return false;
    }

    if (!(formData.description || '').trim()) {
      toast.error('Please enter description.');
      return false;
    }

    return true;
  };

  const handleSave = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setButtonLoading(true);
    try {
      const response = await dispatch(saveProductUnit(formData)).unwrap();
      toast.success(response?.message || 'Product unit saved successfully');
      setTimeout(() => {
        navigate(ROUTES.product_unit_list);
      }, 500);
    } catch (err: any) {
      toast.error(err || 'Failed to save product unit');
    } finally {
      setButtonLoading(false);
    }
  };

  const handleUpdate = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setButtonLoading(true);
    try {
      const response = await dispatch(updateProductUnit(formData)).unwrap();
      toast.success(response?.message || 'Product unit updated successfully');
      setTimeout(() => {
        navigate(ROUTES.product_unit_list);
      }, 500);
    } catch (err: any) {
      toast.error(err || 'Failed to update product unit');
    } finally {
      setButtonLoading(false);
    }
  };

  return (
    <div>
      <HelmetTitle title={formData?.id ? 'Edit Product Unit' : 'Add Product Unit'} />

      {productUnit?.isLoading === true ? <Loader /> : null}

      <div className="grid grid-cols-1 md:grid-cols-1 gap-4 md:w-[500px] text-center mx-auto">
        <InputElement
          id="name"
          value={formData.name}
          name="name"
          placeholder="Enter Unit Name"
          label="Unit Name"
          onChange={handleOnChange}
        />

        <InputElement
          id="short_name"
          value={formData.short_name}
          name="short_name"
          placeholder="Enter Short Name"
          label="Short Name"
          onChange={handleOnChange}
        />

        <InputElement
          id="description"
          value={formData.description}
          name="description"
          placeholder="Enter Description"
          label="Description"
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

        <Link to={ROUTES.product_unit_list} className="text-nowrap py-1.5">
          Go to back
        </Link>
      </div>
    </div>
  );
};

export default AddProductUnit;
