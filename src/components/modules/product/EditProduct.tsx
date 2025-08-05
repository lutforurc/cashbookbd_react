import React, { useEffect, useState } from 'react';
import InputElement from '../../utils/fields/InputElement';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import Link from '../../utils/others/Link';
import { useDispatch, useSelector } from 'react-redux';
import { getCategoryDdl } from '../category/categorySlice';
import Loader from '../../../common/Loader';
import { toast } from 'react-toastify';
import { useNavigate, useParams } from 'react-router-dom';
import { warrantyType } from '../../utils/fields/DataConstant';
// import { getProductById, updateProduct } from './productSlice';

const EditProduct = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams(); // product ID from URL
  const category = useSelector((state) => state.category);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    product_type: '',
    purchase_price: '',
    sales_price: '',
    unit_id: '',
    warranty_days: '',
    order_level: '',
    warranty_type: '0',
  });

  const [buttonLoading, setButtonLoading] = useState(false);

  useEffect(() => {
    dispatch(getCategoryDdl({ search: '' }));

    // fetch product data by ID
    dispatch(getProductById(id)).then((res) => {
      if (res.payload?.data) {
        setFormData(res.payload.data);
      } else {
        toast.error('Failed to fetch product.');
      }
    });
  }, [id]);

  const handleOnChange = (e) => {
    const { value, type, name } = e.target;

    if (name === 'warranty_type') {
      setFormData({ ...formData, warranty_type: value, warranty_days: '' });
      return;
    }

    switch (type) {
      case 'checkbox':
        setFormData({ ...formData, [name]: e.target.checked });
        break;
      default:
        setFormData({ ...formData, [name]: value });
    }
  };

  const handleKeyDown = (e) => {
    if (['1', '2'].includes(formData.warranty_type)) {
      if (
        !/[0-9]/.test(e.key) &&
        e.key !== 'Backspace' &&
        e.key !== 'Delete' &&
        e.key !== 'ArrowLeft' &&
        e.key !== 'ArrowRight' &&
        e.key !== 'Tab'
      ) {
        e.preventDefault();
      }
    }
  };

  const handleUpdate = (e) => {
    e.preventDefault();

    if (!(formData.category_id || '').trim()) {
      toast.error('Please enter category.');
      return;
    } else if (!(formData.product_type || '').trim()) {
      toast.error('Please enter product type.');
      return;
    } else if (!(formData.name || '').trim()) {
      toast.error('Please enter valid name.');
      return;
    } else if (!(formData.description || '').trim()) {
      toast.error('Please enter description.');
      return;
    } else if (!(formData.unit_id || '').trim()) {
      toast.error('Please select unit.');
      return;
    }

    setButtonLoading(true);

    dispatch(updateProduct({ id, data: formData })).then((res) => {
      setButtonLoading(false);
      if (res.payload?.success) {
        toast.success('Product updated successfully!');
        navigate('/product/product-list');
      } else {
        toast.error('Failed to update product.');
      }
    });
  };

  return (
    <div>
      <HelmetTitle title={'Edit Product'} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {category.isLoading && <Loader />}

        <DropdownCommon
          id="category_id"
          name="category_id"
          label="Select Category"
          onChange={handleOnChange}
          className="h-[2.20rem]"
          data={category?.data?.category}
          value={formData.category_id}
        />
        <DropdownCommon
          id="product_type"
          name="product_type"
          label="Select Product Type"
          onChange={handleOnChange}
          className="h-[2.20rem]"
          data={category?.data?.product_type}
          value={formData.product_type}
        />

        <InputElement
          id="name"
          name="name"
          label="Product Name"
          value={formData.name}
          onChange={handleOnChange}
        />
        <InputElement
          id="description"
          name="description"
          label="Product Description"
          value={formData.description}
          onChange={handleOnChange}
        />
        <InputElement
          id="purchase_price"
          name="purchase_price"
          label="Purchase Price"
          value={formData.purchase_price}
          onChange={handleOnChange}
        />
        <InputElement
          id="sales_price"
          name="sales_price"
          label="Sales Price"
          value={formData.sales_price}
          onChange={handleOnChange}
        />

        {category?.data?.branch?.warranty_controll && (
          <>
            <DropdownCommon
              id="warranty_type"
              label="Select Waranty/Guaranty Type"
              name="warranty_type"
              className="h-[2.20rem] mt-1"
              data={warrantyType}
              value={formData.warranty_type}
              onChange={handleOnChange}
            />
            <InputElement
              id="warranty_days"
              name="warranty_days"
              value={formData.warranty_days}
              placeholder="Enter warranty days"
              label="Warranty Days"
              onChange={handleOnChange}
              onKeyDown={handleKeyDown}
              disabled={formData.warranty_type === '0'}
              inputMode={
                ['1', '2'].includes(formData.warranty_type) ? 'numeric' : 'text'
              }
              pattern={
                ['1', '2'].includes(formData.warranty_type)
                  ? '[0-9]*'
                  : undefined
              }
            />
          </>
        )}

        <DropdownCommon
          id="unit_id"
          name="unit_id"
          label="Select Unit"
          className="h-[2.20rem] mt-1"
          data={category?.data?.unit}
          value={formData.unit_id}
          onChange={handleOnChange}
        />
        <InputElement
          id="order_level"
          name="order_level"
          label="Order Level"
          value={formData.order_level}
          onChange={handleOnChange}
        />
      </div>

      <div className="flex mt-4 justify-center items-center">
        <ButtonLoading
          onClick={handleUpdate}
          buttonLoading={buttonLoading}
          label="Update"
          className="whitespace-nowrap mr-2 py-1.5"
        />
        <Link to="/product/product-list" className="text-nowrap py-1.5">
          Go to back
        </Link>
      </div>
    </div>
  );
};

export default EditProduct;
