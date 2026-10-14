import React, { useEffect, useState } from 'react';
import InputElement from '../../utils/fields/InputElement';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { useDispatch, useSelector } from 'react-redux';
import { getCategoryDdl } from '../category/categorySlice';
import { getProductGroupDdl } from '../productgroup/productGroupSlice';
import { getPackSizeDdl } from '../packsize/packSizeSlice';
import Loader from '../../../common/Loader';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { editProduct, storeProduct, updateProduct } from './productSlice';
import { useParams } from 'react-router-dom';
import { warrantyType } from '../../utils/fields/DataConstant';
import { FiArrowLeft, FiRefreshCcw, FiSave } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { fetchBrandDdl } from './brand/brandSlice';
import CategoryDropdown from '../../utils/utils-functions/CategoryDropdown';
import { FIELD_TEXTAREA } from '../../../theme/fieldStyles';
import { Textarea } from '../../utils/fields/FormControls';
import { isBranchSettingOn } from '../../utils/userFeatureSettings';

interface productItem {
  id: string | number;
  product_id: string;
  name: string;
  /** The business's own product code; only shown when the branch asks for it. */
  code?: string;
  description: string;
  manufacture_id: string | number;
  category_id: string | number;
  /** Optional second grouping level; only shown when the branch asks for it. */
  group_id?: string | number;
  /** Pack size (12Kg, 35Kg); only shown when the branch asks for it. */
  pack_size_id?: string | number;
  product_type: string | number;
  purchase_price: string | number;
  sales_price: string | number;
  unit_id: string | number;
  warranty_days: string;
  order_level: string | number;
  warranty_type: string | number;
  /** Opening stock, taken only while creating and only where the branch asks. */
  opening_qty?: string | number;
  opening_rate?: string | number;
  opening_serial_no?: string;
  /** Measurement and packaging, shown as extra information on a bill. Each
      pair is both-or-neither: a value beside no unit, or the reverse, is one
      half of an answer and the API refuses it. Display only -- they never
      touch quantity, price or stock. */
  measurement?: string | number;
  measurement_unit_id?: string | number;
  package_size?: string | number;
  package_unit_id?: string | number;
}

// ".67" is 0.67 written without its leading zero. The API asks for a digit
// first, so it is given one on the way out -- the field keeps what was typed,
// the request carries "0.67". A measurement is stored in DECIMAL(18,3) and a
// package size in DECIMAL(18,2).
const withLeadingZero = (value: any): any => {
  const text = String(value ?? '').trim();
  return text.startsWith('.') ? `0${text}` : value;
};

const AddProduct = () => {
  const [search, setSearch] = useState('');
  const category = useSelector((state) => state.category);
  const product = useSelector((state) => state.product);
  const brand = useSelector((state) => state.brand);
  const settings = useSelector((state) => state.settings);
  const categoryData = useSelector((state) => state.category);
  const warrantyTypeOptions = warrantyType.map(item => ({
    ...item,
    id: String(item.id),
  }));
  const dispatch = useDispatch();
  const navigate = useNavigate();
  // const [themeMode, setThemeMode] = useState(string | null);
  const initialProduct: productItem = {
    id: '',
    product_id: '',
    name: '',
    code: '',
    description: '',
    manufacture_id: '',
    category_id: '',
    group_id: '',
    pack_size_id: '',
    product_type: '',
    purchase_price: '',
    sales_price: '',
    unit_id: '',
    warranty_days: '',
    order_level: '',
    warranty_type: '0', // Default to 'Not Applicable'
    opening_qty: '',
    opening_rate: '',
    opening_serial_no: '',
    measurement: '',
    measurement_unit_id: '',
    package_size: '',
    package_unit_id: '',
  };

  // The same branch switch the product list reads before showing its
  // IMEI / Qty / Rate columns, so a branch takes openings in both places or in
  // neither. Editing an existing product never offers it: the list is where a
  // stocked product's opening is corrected.
  const isOpeningEnabled = String(settings?.data?.branch?.is_opening) === '1';
  const [formData, setFormData] = useState<productItem>(initialProduct);
  // Whether the quantity is being counted rather than typed.
  const hasOpeningSerials = String(formData.opening_serial_no ?? '').trim() !== '';
  const { id } = useParams();
  const [ddlCategory, setDdlCategory] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState<number | string | null>(null);
  const productGroupData = useSelector((state) => state.productGroup);
  const [ddlProductGroup, setDdlProductGroup] = useState<any[]>([]);
  const needProductGroup = isBranchSettingOn(settings, 'need_product_group');
  const packSizeData = useSelector((state) => state.packSize);
  const [ddlPackSize, setDdlPackSize] = useState<any[]>([]);
  const needPackage = isBranchSettingOn(settings, 'need_package');
  const needCode = isBranchSettingOn(settings, 'need_code');
  const productTypeOptions = category?.ddlData?.data?.product_type || [];
  const unitOptions = category?.ddlData?.data?.unit || [];

  // The measurement and package unit pickers read the same authorized unit list
  // the Unit field uses -- no second endpoint, and never a unit the branch
  // cannot reach. A leading blank lets a pair be left empty.
  const measurementUnitOptions = [
    { id: '', name: 'Not applicable' },
    ...(Array.isArray(unitOptions) ? unitOptions : []),
  ];

  useEffect(() => {
    if (product?.editData) {
      const edit = product.editData;

      const warrantyTypeKey = Object.keys(edit?.warranty_days || {}).find(
        (key) => !isNaN(Number(key)),
      );

      setFormData({
        ...edit,
        code: edit?.code ?? '',
        category_id: edit?.category_id != null ? String(edit.category_id) : '',
        group_id: edit?.group_id != null ? String(edit.group_id) : '',
        pack_size_id: edit?.pack_size_id ? String(edit.pack_size_id) : '',
        product_type: edit?.product_type != null ? String(edit.product_type) : '',
        unit_id: edit?.unit_id != null ? String(edit.unit_id) : '',
        manufacture_id: edit?.manufacture_id != null ? String(edit.manufacture_id) : '',
        measurement: edit?.measurement ?? '',
        measurement_unit_id: edit?.measurement_unit_id != null ? String(edit.measurement_unit_id) : '',
        package_size: edit?.package_size ?? '',
        package_unit_id: edit?.package_unit_id != null ? String(edit.package_unit_id) : '',
        warranty_type: String(warrantyTypeKey || edit?.warranty_type || '0'),
        warranty_days: edit?.warranty_days?.day || '',
      });
    }
  }, [product?.editData]);


  console.log('====================================');
  console.log("product", product);
  console.log('====================================');

  useEffect(() => {
    if (id) {
      dispatch(editProduct(id));
    }
  }, [id, dispatch]);


  // Waits for the answer. It used to announce success and leave for the list
  // before the server had replied, so a refused edit -- a code or a name
  // already taken -- looked saved and was lost.
  const handleBranchUpdate = () => {
    const measurementIssue = measurementError();
    if (measurementIssue) {
      toast.info(measurementIssue);
      return;
    }
    // ".67" is accepted on screen but sent as "0.67"; empty stays empty, which
    // the API reads as NULL.
    const payload = {
      ...formData,
      measurement: withLeadingZero(formData.measurement),
      package_size: withLeadingZero(formData.package_size),
    };
    dispatch(
      updateProduct(payload, (d: any) => {
        if (d?.success) {
          toast.success(d?.message || 'Product updated successfully');
          setTimeout(() => {
            setFormData(initialProduct);
            navigate('/product/product-list');
          }, 1000);
        } else {
          toast.error(d?.message || 'Product could not be updated.');
        }
      }),
    );
  };

  useEffect(() => {
    dispatch(getCategoryDdl({ search }));
    dispatch(fetchBrandDdl());
  }, []);

  // Only where the branch has asked for it. Fetched unconditionally, every
  // branch that never turned the switch on would still make the call -- and
  // settings can arrive after mount, so this waits for the switch rather than
  // reading it once at mount.
  useEffect(() => {
    if (needProductGroup) dispatch(getProductGroupDdl());
  }, [needProductGroup]);

  useEffect(() => {
    if (needPackage) dispatch(getPackSizeDdl());
  }, [needPackage]);

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


  // A leading dot -- ".67" -- is how a person may write 0.67, and it is
  // accepted; withLeadingZero() below gives it its digit before the request.
  // The two columns are different scales, so each has its own pattern: a
  // measurement takes three decimals (0.667) and a package size two.
  const measurementPattern = /^(?:\d+(?:\.\d{1,3})?|\.\d{1,3})$/;
  const packageSizePattern = /^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/;

  // The same rules the API keeps (ItemController::measurementValidationError):
  // each pair is both-or-neither, and a value is a number with at most the
  // decimals its own column holds -- a measurement three, a package size two.
  // A further decimal is refused, not rounded away. Zero is a value like any
  // other; empty is empty, and is never read as zero.
  const measurementError = (): string | null => {
    const decimal = (
      value: any,
      label: string,
      pattern: RegExp,
      maxDecimals: string,
    ): string | null => {
      const text = String(value ?? '').trim();
      if (text === '') return null;
      if (!pattern.test(text)) {
        return `${label} must be a number with at most ${maxDecimals} decimals.`;
      }
      return null;
    };

    const valueError =
      decimal(formData.measurement, 'Measurement', measurementPattern, 'three') ||
      decimal(formData.package_size, 'Package size', packageSizePattern, 'two');
    if (valueError) return valueError;

    const hasMeasurement = String(formData.measurement ?? '').trim() !== '';
    const hasMeasurementUnit = String(formData.measurement_unit_id ?? '').trim() !== '';
    if (hasMeasurement !== hasMeasurementUnit) {
      return 'Measurement and measurement unit must be given together.';
    }

    const hasPackageSize = String(formData.package_size ?? '').trim() !== '';
    const hasPackageUnit = String(formData.package_unit_id ?? '').trim() !== '';
    if (hasPackageSize !== hasPackageUnit) {
      return 'Package size and package type must be given together.';
    }

    return null;
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

    const measurementIssue = measurementError();
    if (measurementIssue) {
      toast.info(measurementIssue);
      return;
    }

    // ".67" is accepted on screen but sent as "0.67"; empty stays empty, which
    // the API reads as NULL.
    const payload = {
      ...formData,
      measurement: withLeadingZero(formData.measurement),
      package_size: withLeadingZero(formData.package_size),
    };

    // ✅ async/await
    const result = await dispatch(
      storeProduct(payload, (d: any) => {
        if (d?.success) {
          toast.success(d?.message);
          setTimeout(() => {
            navigate('/product/product-list');
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

    // One serial is one unit, so the quantity is not asked for twice -- it is
    // counted here as they are typed, split the same way the server splits them.
    // Emptied entirely, the field is handed back so a product without serials
    // can still be given a quantity by hand.
    if (name === 'opening_serial_no') {
      const counted = String(value ?? '')
        .split(/[\r\n,]+/)
        .map((entry) => entry.trim())
        .filter(Boolean).length;

      setFormData({
        ...formData,
        opening_serial_no: value,
        opening_qty: counted > 0 ? counted : '',
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

  const handleGroupChange = (selectedOption: any) => {
    setFormData((prev) => ({
      ...prev,
      group_id: selectedOption?.value ?? '',
    }));
  };

  const handlePackSizeChange = (selectedOption: any) => {
    setFormData((prev) => ({
      ...prev,
      pack_size_id: selectedOption?.value ?? '',
    }));
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
    { id: '', name: 'Select Category' },
    ...(Array.isArray(ddlCategory) ? ddlCategory : []),
  ];

  // Optional, so the list opens on this blank option rather than forcing a
  // pick -- CategoryDropdown auto-selects its first option when nothing is
  // chosen yet.
  const productGroupOptions = [
    { id: '', name: 'Not applicable' },
    ...(Array.isArray(ddlProductGroup) ? ddlProductGroup : []),
  ];

  useEffect(() => {
    if (Array.isArray(categoryData?.ddlData?.data?.category)) {
      setDdlCategory(categoryData?.ddlData?.data?.category || []);
      setCategoryId(categoryData.ddlData[0]?.id ?? null);
    }
  }, [categoryData]);

  useEffect(() => {
    if (Array.isArray(productGroupData?.ddlData?.data)) {
      setDdlProductGroup(productGroupData?.ddlData?.data || []);
    }
  }, [productGroupData]);

  // Same shape as the group: optional, so it opens on "Not applicable".
  const packSizeOptions = [
    { id: '', name: 'Not applicable' },
    ...(Array.isArray(ddlPackSize) ? ddlPackSize : []),
  ];

  useEffect(() => {
    if (Array.isArray(packSizeData?.ddlData?.data)) {
      setDdlPackSize(packSizeData?.ddlData?.data || []);
    }
  }, [packSizeData]);

  useEffect(() => {
    setFormData((prev) => {
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

  const handleBrandChange = (selectedOption: any) => {
    const selectedId = selectedOption?.value ?? '';

    setFormData((prev) => ({
      ...prev,
      manufacture_id: selectedId,
    }));
  };

  console.log('====================================');
  console.log("category control", settings?.data?.branch?.warranty_controll);
  console.log('====================================');


  return (
    <div>
      <HelmetTitle title={formData?.id ? 'Edit Product' : 'Add New Product'} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {category.isLoading == true ? <Loader /> : ''}

        <div>
          <label htmlFor="" className='text-sm'>Select Brand</label>
          <CategoryDropdown
            onChange={handleBrandChange}
            className="w-full text-sm !"
            categoryDdl={brandOptions}
            value={formData.manufacture_id}
          />
        </div>
        {needProductGroup && (
          <div>
            <label htmlFor="" className='text-sm'>Select Product Group</label>
            <CategoryDropdown
              onChange={handleGroupChange}
              className="w-full text-sm !"
              categoryDdl={productGroupOptions}
              value={formData.group_id}
              placeholder="Not Applicable..."
            />
          </div>
        )}
        {needPackage && (
          <div>
            <label htmlFor="" className='text-sm'>Select Package</label>
            <CategoryDropdown
              onChange={handlePackSizeChange}
              className="w-full text-sm !"
              categoryDdl={packSizeOptions}
              value={formData.pack_size_id}
              placeholder="Not Applicable..."
            />
          </div>
        )}
        {categoryData.isLoading ? (
          <Loader />
        ) : (
          <div>
            <label htmlFor="" className='text-sm'>Select Category</label>
            <CategoryDropdown
              onChange={handleCategoryChange}
              className="w-full text-sm !"
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
 className=""
 data={category?.ddlData?.data?.category}
 defaultValue={formData?.category_id?.toString() ?? ''}
        /> */}
        {needCode && (
          <InputElement
            id="code"
            value={formData.code ?? ''}
            name="code"
            placeholder={'Enter Product Code'}
            label={'Product Code'}
            className={''}
            onChange={handleOnChange}
          />
        )}
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
        {/* The two prices side by side in one cell, the way Product Type and
            Unit already are below: they are read together. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
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
            name="sales_price"
            placeholder={'Enter Sales Price'}
            label={'Sales Price'}
            className={''}
            onChange={handleOnChange}
          />
        </div>

        {/* the text '0' is truthy, so this has to be asked, not assumed */}
        {isBranchSettingOn(settings, 'warranty_controll') ? (
          <>
            <DropdownCommon
              id="warranty_type"
              label="Select Waranty/Guaranty Type"
              onChange={handleOnChange}
              name="warranty_type"
              className=""
              data={warrantyTypeOptions}
              value={formData?.warranty_type?.toString() || '0'}
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
              className="w-full"
              data={category?.ddlData?.data?.product_type}
              value={formData?.product_type?.toString() ?? ''}
            />
          </div>

          <div className="w-full">
            <DropdownCommon
              id="unit_id"
              label="Select Unit"
              onChange={handleOnChange}
              name="unit_id"
              className="w-full"
              data={category?.ddlData?.data?.unit}
              value={formData?.unit_id?.toString() ?? ''}
            />
          </div>
        </div>
        {/* Measurement and packaging: additional information and nothing else.
            Left empty on a product they simply do not print. Each pair goes
            together. A measurement carries at most three decimals (0.667), a
            package size two -- each column's own scale. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <InputElement
            id="measurement"
            // `?? ''`, not a truthy test: a measurement of 0 is a value, and a
            // truthy check would render it as a blank box.
            value={formData.measurement ?? ''}
            name="measurement"
            inputMode="decimal"
            step="0.001"
            placeholder={'e.g. 0.667'}
            label={'Measurement'}
            description={'A number with up to three decimals, e.g. 0.667.'}
            className={''}
            onChange={handleOnChange}
          />
          <DropdownCommon
            id="measurement_unit_id"
            label="Measurement Unit"
            onChange={handleOnChange}
            name="measurement_unit_id"
            className="w-full"
            data={measurementUnitOptions}
            value={formData?.measurement_unit_id?.toString() ?? ''}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <InputElement
            id="package_size"
            value={formData.package_size ?? ''}
            name="package_size"
            inputMode="decimal"
            step="0.01"
            placeholder={'e.g. 10'}
            label={'Package Size'}
            description={'A number with up to two decimals.'}
            className={''}
            onChange={handleOnChange}
          />
          <DropdownCommon
            id="package_unit_id"
            label="Package Type"
            onChange={handleOnChange}
            name="package_unit_id"
            className="w-full"
            data={measurementUnitOptions}
            value={formData?.package_unit_id?.toString() ?? ''}
          />
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

      {/* Only while creating: an existing product's opening is corrected from
          the list, where the stock it already carries is in view. */}
      {isOpeningEnabled && !id && (
        <div className="mt-4 rounded border border-[rgb(var(--c-border))] p-3">
          <h4 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Opening Stock
          </h4>
          <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
            Optional. Left empty the product is created with no stock. Given, it
            is received exactly as the product list receives one — stock, and
            the purchase entry behind it.
          </p>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {/* First, and a box rather than a line: serials are entered one to a
                row and there is no telling how many. It can be dragged taller
                for a long list without pushing the rest of the form about. */}
            <div className="md:col-span-3">
              <label
                htmlFor="opening_serial_no"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                IMEI / Serial
              </label>
              <Textarea
                id="opening_serial_no"
                name="opening_serial_no"
                rows={3}
                value={formData.opening_serial_no ?? ''}
                onChange={handleOnChange}
                placeholder={'One IMEI / serial per line'}
                className={`${FIELD_TEXTAREA} block w-full resize-y p-2 text-sm`}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                One per line. The quantity below counts them as you type.
              </p>
            </div>

            <div>
              <InputElement
                id="opening_qty"
                name="opening_qty"
                type="number"
                value={formData.opening_qty ? formData.opening_qty.toString() : ''}
                placeholder={'Enter Quantity'}
                label={'Quantity'}
                className={''}
                onChange={handleOnChange}
                // Counted from the serials while there are any. Left editable it
                // could be made to disagree with them, and the server would
                // ignore it anyway -- the serials decide.
                disabled={hasOpeningSerials}
              />
              {hasOpeningSerials && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Counted from the serials above.
                </p>
              )}
            </div>
            <InputElement
              id="opening_rate"
              name="opening_rate"
              type="number"
              step="0.01"
              value={formData.opening_rate ? formData.opening_rate.toString() : ''}
              placeholder={'Defaults to the purchase price'}
              label={'Rate'}
              className={''}
              onChange={handleOnChange}
            />
          </div>
        </div>
      )}

      <div className="flex mt-4 justify-center items-center">
        {id ? (
          <ButtonLoading
            onClick={handleBranchUpdate}
            buttonLoading={buttonLoading}
            label="Update"
            className="whitespace-nowrap mr-2 py-1.5"
            icon={<FiRefreshCcw className="text-lg ml-2 mr-2" />}
          />
        ) : (
          <ButtonLoading
            onClick={handleButtonClick}
            buttonLoading={buttonLoading}
            label="Save"
            className="whitespace-nowrap mr-2 py-1.5"
            icon={<FiSave className="text-lg ml-2 mr-2" />}
          />
        )}
        <ButtonLoading
          onClick={() => navigate('/product/product-list')}
          label="Go to back"
          className="whitespace-nowrap mr-2 py-1.5"
          icon={<FiArrowLeft className="text-lg ml-2 mr-2" />}
        />
      </div>
    </div>
  );
};

export default AddProduct;
