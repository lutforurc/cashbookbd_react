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
import 'react-toastify/dist/ReactToastify.css';
import { editProduct, storeProduct, updateProduct } from './productSlice';
import { Navigate, useParams } from 'react-router-dom';
import { warrantyType } from '../../utils/fields/DataConstant';
import { FiSave } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { fetchBrandDdl } from './brand/brandSlice';
import CategoryDropdown from '../../utils/utils-functions/CategoryDropdown';

interface productItem {
  id: string | number;
  product_id: string;
  name: string;
  description: string;
  manufacture_id: string | number;
  category_id: string | number;
  product_type: string | number;
  purchase_price: string | number;
  sales_price: string | number;
  unit_id: string | number;
  warranty_days: string;
  order_level: string | number;
  warranty_type: string | number;
}

const AddProduct = () => {
  const [search, setSearch] = useState('');
  const category = useSelector((state) => state.category);
  const product = useSelector((state) => state.product);
  const brand = useSelector((state) => state.brand);
  const categoryData = useSelector((state) => state.category);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  // const [themeMode, setThemeMode] = useState(string | null);
  const initialProduct: productItem = {
    id: '',
    product_id: '',
    name: '',
    description: '',
    manufacture_id: '',
    category_id: '',
    product_type: '',
    purchase_price: '',
    sales_price: '',
    unit_id: '',
    warranty_days: '',
    order_level: '',
    warranty_type: '0', // Default to 'Not Applicable'
  };
  const [formData, setFormData] = useState<productItem>(initialProduct);
  const { id } = useParams();
  const [ddlCategory, setDdlCategory] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState<number | string | null>(null);

  useEffect(() => {
    if (product?.editData) {
      const edit = product.editData;

      const warrantyTypeKey = Object.keys(edit?.warranty_days || {}).find(
        (key) => !isNaN(Number(key)),
      );

      setFormData({
        ...edit,
        warranty_type: warrantyTypeKey || '0',
        warranty_days: edit?.warranty_days?.day || '',
      });
    }
  }, [product?.editData]);

  useEffect(() => {
    if (id) {
      dispatch(editProduct(id));
    }
  }, [id, dispatch]);


  const handleBranchUpdate = () => {
    try {
      dispatch(updateProduct(formData));
      toast.success('Product updated successfully');
      setTimeout(() => {
        setFormData(initialProduct);
        navigate('/product/product-list');
      }, 1000);
    } catch (error) {
      console.error('Error saving transactions:', error);
    }
  };

  useEffect(() => {
    dispatch(getCategoryDdl({ search }));
    dispatch(fetchBrandDdl());
  }, []);

  const [buttonLoading, setButtonLoading] = useState(false);
  const handleSelectChange = (e) => {
    const { value, type, name } = e.target;
    switch (type) {
      case 'checkbox':
        setFormData({
          ...formData,
          [name]: e.target.checked,
        });
        break;
      default:
        setFormData({
          ...formData,
          [name]: value,
        });
    }
  };


  const handleButtonClick = async (e: any) => {
    e.preventDefault();

    if (!formData.category_id) {
      toast.info('Please select category.');
      return;
    } else if (!(formData.product_type || '').trim()) {
      toast.info('Please enter product type.');
      return;
    } else if (!(formData.name || '').trim()) {
      toast.info('Please enter valid name.');
      return;
    } else if (!(formData.description || '').trim()) {
      toast.info('Please enter description.');
      return;
    } else if (!(formData.unit_id || '').trim()) {
      toast.info('Please select unit.');
      return;
    }

    // ✅ async/await
    const result = await dispatch(
      storeProduct(formData, (d: any) => {
        if (d?.success) {
          toast.success(d?.message);
          setTimeout(() => {
            Navigate('/branch/branch-list');
          }, 300);
        } else {
          toast.error(d?.message || 'Failed');
        }
      }),
    );
 
  };

  const handleProductCreate = (e) => {
    e.preventDefault();
  };

  const handleOnChange = (e: any) => {
    const { value, type, name } = e.target;

    if (name === 'warranty_type') {
      setFormData({
        ...formData,
        warranty_type: value,
        warranty_days: '',
      });
      return;
    }

    switch (type) {
      case 'checkbox':
        setFormData({
          ...formData,
          [name]: e.target.checked,
        });
        break;
      default:
        setFormData({
          ...formData,
          [name]: value,
        });
    }
  };

  const handleCategoryChange = (selectedOption: any) => {
    const selectedId = selectedOption?.value ?? '';

    setCategoryId(selectedId);

    setFormData((prev) => ({
      ...prev,
      category_id: selectedId,
    }));
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (formData.warranty_type === '1' || formData.warranty_type === '2') {
      // numeric only: allow digits, backspace, delete, arrows etc.
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

  const brandOptions = [
    { id: '', name: 'Not applicable' },
    ...(brand?.brandDdl?.data || []),
  ];

  const optionsWithAll = [
    { id: '', name: 'All Product' },
    ...(Array.isArray(ddlCategory) ? ddlCategory : []),
  ];

  useEffect(() => {
    if (Array.isArray(categoryData?.ddlData?.data?.category)) {
      setDdlCategory(categoryData?.ddlData?.data?.category || []);
      setCategoryId(categoryData.ddlData[0]?.id ?? null);
    }
  }, [categoryData]);

  const handleBrandChange = (selectedOption: any) => {
  const selectedId = selectedOption?.value ?? '';

  setFormData((prev) => ({
    ...prev,
    manufacture_id: selectedId,
  }));
};

  return (
    <div>
      <HelmetTitle title={formData?.id ? 'Edit Product' : 'Add New Product'} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {category.isLoading == true ? <Loader /> : ''}

        <div>
          <label htmlFor="" className='text-sm'>Select Brand</label>
          <CategoryDropdown
            onChange={handleBrandChange}
            className="w-full text-sm !h-7"
            categoryDdl={brandOptions}
            value={formData.manufacture_id}
          />
        </div>
        {categoryData.isLoading ? (
          <Loader />
        ) : (
          <div>
            <label htmlFor="" className='text-sm'>Select Category</label>
            <CategoryDropdown
              onChange={handleCategoryChange}
              className="w-full text-sm !h-7"
              categoryDdl={optionsWithAll}
              value={formData.category_id}
            />
          </div>
        )}
        {/* <DropdownCommon
          id="category_id"
          name={'category_id'}
          label="Select Category"
          onChange={handleOnChange}
          className="h-[2.20rem]"
          data={category?.ddlData?.data?.category}
          defaultValue={formData?.category_id?.toString() ?? ''}
        /> */}
        <InputElement
          id="name"
          value={formData.name}
          name="name"
          placeholder={'Enter Product Name'}
          label={'Product Name'}
          className={''}
          onChange={handleOnChange}
        />
        <InputElement
          id="description"
          value={formData.description}
          name="description"
          placeholder={'Enter Product Description'}
          label={'Product Description'}
          className={''}
          onChange={handleOnChange}
        />
        <InputElement
          id="purchase_price"
          value={
            formData.purchase_price ? formData.purchase_price.toString() : ''
          }
          name="purchase_price"
          placeholder={'Enter Purchase Price'}
          label={'Purchase Price'}
          className={''}
          onChange={handleOnChange}
        />
        <InputElement
          id="sales_price"
          value={formData.sales_price ? formData.sales_price.toString() : ''}
          // value={formData.sales_price.toString()}
          name="sales_price"
          placeholder={'Enter Sales Price'}
          label={'Sales Price'}
          className={''}
          onChange={handleOnChange}
        />

        {category?.data?.branch?.warranty_controll ? (
          <>
            <DropdownCommon
              id="warranty_type"
              label="Select Waranty/Guaranty Type"
              onChange={handleOnChange}
              name="warranty_type"
              className="h-[2.20rem] mt-1"
              data={warrantyType}
              defaultValue={formData.warranty_type.toString() || '0'}
            />
            <InputElement
              id="warranty_days"
              value={formData.warranty_days || ''}
              name="warranty_days"
              placeholder="Enter warranty days"
              label="Warranty Days"
              onChange={handleOnChange}
              onKeyDown={handleKeyDown}
              disabled={formData.warranty_type === '0'}
              inputMode={
                ['1', '2'].includes(formData.warranty_type.toString())
                  ? 'numeric'
                  : 'text'
              }
              pattern={
                ['1', '2'].includes(formData.warranty_type.toString())
                  ? '[0-9]*'
                  : undefined
              }
            />
          </>
        ) : (
          ''
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <div className="w-full">
            <DropdownCommon
              id="product_type"
              label="Select Product Type"
              onChange={handleOnChange}
              name="product_type"
              className="h-[2.20rem] w-full"
              data={category?.ddlData?.data?.product_type}
              defaultValue={formData?.product_type?.toString() ?? ''}
            />
          </div>

          <div className="w-full">
            <DropdownCommon
              id="unit_id"
              label="Select Unit"
              onChange={handleOnChange}
              name="unit_id"
              className="h-[2.20rem] w-full"
              data={category?.ddlData?.data?.unit}
              defaultValue={formData?.unit_id?.toString() ?? ''}
            />
          </div>
        </div>
        <InputElement
          id="order_level"
          // value={formData.order_level.toString()}
          value={formData.order_level ? formData.order_level.toString() : ''}
          name="order_level"
          placeholder={'Enter Order Level'}
          label={'Order Level'}
          className={''}
          onChange={handleOnChange}
        />
      </div>
      <div className="flex mt-4 justify-center items-center">
        {id ? (
          <ButtonLoading
            onClick={handleBranchUpdate}
            buttonLoading={buttonLoading}
            label="Update"
            className="whitespace-nowrap mr-2 py-1.5"
          />
        ) : (
          <ButtonLoading
            onClick={handleButtonClick}
            buttonLoading={buttonLoading}
            label="Save"
            className="whitespace-nowrap mr-2 py-1.5"
            icon={<FiSave className="text-white text-lg ml-2 mr-2" />}
          />
        )}
        <Link to="/product/product-list" className="text-nowrap py-1.5">
          Go to back
        </Link>
      </div>
    </div>
  );
};

export default AddProduct;
