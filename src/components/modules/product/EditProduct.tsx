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
import { editProduct, updateProduct } from './productSlice';

const parseWarrantyDetails = (warrantyDays: unknown, fallbackType?: unknown) => {
  if (warrantyDays && typeof warrantyDays === 'object' && !Array.isArray(warrantyDays)) {
    const record = warrantyDays as Record<string, unknown>;
    const typeKey = Object.keys(record).find(key => /^\d+$/.test(key));

    return {
      warranty_type: String(typeKey || fallbackType || '0'),
      warranty_days:
        typeof record.day === 'string' || typeof record.day === 'number'
          ? String(record.day)
          : '',
    };
  }

  return {
    warranty_type: String(fallbackType || '0'),
    warranty_days:
      typeof warrantyDays === 'string' || typeof warrantyDays === 'number'
        ? String(warrantyDays)
        : '',
  };
};

const EditProduct = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams(); // product ID from URL
  const category = useSelector((state) => state.category);
  const product = useSelector((state) => state.product);
  const productTypeOptions = category?.data?.product_type || [];
  const unitOptions = category?.data?.unit || [];
  const warrantyTypeOptions = warrantyType.map(item => ({
    ...item,
    id: String(item.id),
  }));

  console.log('====================================');
  console.log("product", product);
  console.log('====================================');


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
  }, [dispatch]);

  useEffect(() => {
    if (id) {
      dispatch(editProduct(id));
    }
  }, [id, dispatch]);

  useEffect(() => {
    const edit = product?.editData;
    if (!edit) return;
    const parsedWarranty = parseWarrantyDetails(edit?.warranty_days, edit?.warranty_type);
    console.log('edit product payload', edit);
    console.log('parsed warranty details', parsedWarranty);

    setFormData(prev => ({
      ...prev,
      ...edit,
      category_id: edit?.category_id != null ? String(edit.category_id) : '',
      product_type: edit?.product_type != null ? String(edit.product_type) : '',
      unit_id: edit?.unit_id != null ? String(edit.unit_id) : '',
      warranty_type: parsedWarranty.warranty_type,
      warranty_days: parsedWarranty.warranty_days,
    }));
  }, [product?.editData]);

  useEffect(() => {
    setFormData(prev => {
      const next = { ...prev };
      let changed = false;

      if (
        Array.isArray(productTypeOptions) &&
        productTypeOptions.length > 0 &&
        !productTypeOptions.some((item: any) => String(item.id) === String(prev.product_type ?? ''))
      ) {
        next.product_type = String(productTypeOptions[0].id);
        changed = true;
      }

      if (
        Array.isArray(unitOptions) &&
        unitOptions.length > 0 &&
        !unitOptions.some((item: any) => String(item.id) === String(prev.unit_id ?? ''))
      ) {
        next.unit_id = String(unitOptions[0].id);
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [productTypeOptions, unitOptions]);

  console.log('render formData.warranty_type', formData.warranty_type);
  console.log('render warrantyTypeOptions', warrantyTypeOptions);

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

    dispatch(
      updateProduct({ id, ...formData }, (res: any) => {
        setButtonLoading(false);
        if (res?.success) {
          toast.success('Product updated successfully!');
          navigate('/product/product-list');
          return;
        }

        toast.error(res?.error?.message || res?.message || 'Failed to update product.');
      }),
    );
  };

  return (
    <div>
      <HelmetTitle title={'Edit Product'} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {category.isLoading && <Loader />}
        <div className="md:col-span-2 rounded border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-200">
          debug: warranty_type=`{String(formData.warranty_type)}` warranty_days=`
          {String(formData.warranty_days)}`
        </div>

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
              data={warrantyTypeOptions}
              value={String(formData.warranty_type ?? '0')}
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
