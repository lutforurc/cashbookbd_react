import React, { useEffect, useState } from 'react';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import InputElement from '../../../utils/fields/InputElement';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import { toast } from 'react-toastify';
import Link from '../../../utils/others/Link';
import { useDispatch, useSelector } from 'react-redux';
import { userCurrentBranch } from '../../branch/branchSlice';
import { getDdlWarehouse } from '../../warehouse/ddlWarehouseSlider';
import Loader from '../../../../common/Loader';
import InputDatePicker from '../../../utils/fields/DatePicker';
import {
  FiEdit,
  FiEdit2,
  FiHome,
  FiPlus,
  FiRefreshCcw,
  FiSave,
  FiSearch,
  FiTrash2,
} from 'react-icons/fi';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import dayjs from 'dayjs';
import { validateForm } from '../../../utils/utils-functions/validationUtils';
import { invoiceMessage } from '../../../utils/utils-functions/invoiceMessage';
import { validateProductData } from '../../../utils/utils-functions/productValidationHandler';
import InputOnly from '../../../utils/fields/InputOnly';
import { handleInputKeyDown } from '../../../utils/utils-functions/handleKeyDown';
import { hasPermission } from '../../../utils/permissionChecker';
import {
  labourInvoiceEdit,
  labourInvoiceStore,
  labourInvoiceUpdate,
} from './labourInvoiceSlice';
import LabourDropdown from '../../../utils/utils-functions/LabourDropdown';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import { voucherTypes } from '../../../utils/fields/DataConstant';
import useCtrlS from '../../../utils/hooks/useCtrlS';

interface Product {
  id: number;
  product: number;
  product_name: string;
  unit: string;
  qty: string;
  price: string;
}

function ConstructionLabourInvoice() {
  const warehouse = useSelector((s: any) => s.activeWarehouse);
  const labourInvoice = useSelector((s: any) => s.labourInvoice);
  const settings = useSelector((s: any) => s.settings);
  const dispatch = useDispatch<any>();
  const [buttonLoading, setButtonLoading] = useState(false);
  const [warehouseDdlData, setWarehouseDdlData] = useState<any[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null); // Define state with type
  const [unit, setUnit] = useState<string | null>(null); // Define state with type
  const [search, setSearch] = useState(''); // State to store the search value
  const [productData, setProductData] = useState<any>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateId, setUpdateId] = useState<any>(null);

  const [isUpdateButton, setIsUpdateButton] = useState(false);
  const [isInvoiceUpdate, setIsInvoiceUpdate] = useState(false);
  const [permissions, setPermissions] = useState<any>([]);
  const [voucherType, setVoucherType] = useState('');
  const [saveButtonLoading, setSaveButtonLoading] = useState(false);

  useEffect(() => {
    // dispatch(userCurrentBranch());
    dispatch(getDdlWarehouse());
    setPermissions(settings.data.permissions);
  }, []);

  interface FormData {
    mtmId: string;
    account: string;
    accountName: string;
    bill_no: string;
    bill_date: string;
    paymentAmt: string;
    discountAmt: number;
    notes: string;
    currentProduct: { index?: number } | null; // Initialize `currentProduct` with optional index
    searchInvoice: string;
    products: Product[];
  }

  const initialFormData = {
    mtmId: '',
    account: '',
    accountName: '',
    bill_no: '',
    bill_date: '',
    paymentAmt: '',
    discountAmt: 0,
    notes: '',
    currentProduct: null,
    searchInvoice: '',
    products: [],
  };

  const [formData, setFormData] = useState<FormData>({
    mtmId: '',
    account: '',
    accountName: '',
    bill_no: '',
    bill_date: '',
    paymentAmt: '',
    discountAmt: 0,
    notes: '',
    currentProduct: null,
    searchInvoice: '',
    products: [],
  });

  useEffect(() => {
    if (warehouse?.data && warehouse?.data.length > 0) {
      setWarehouseDdlData(warehouse?.data);
    }
  }, [warehouse?.data]);

  const supplierAccountHandler = (option: any) => {
    const key = 'account'; // Set the desired key dynamically
    const accountName = 'accountName'; // Set the desired key dynamically
    setFormData({
      ...formData,
      [key]: option.value,
      [accountName]: option.label,
    });
  };



  const productSelectHandler = (option: any) => {
    const key = 'product'; // Set the desired key dynamically
    const accountName = 'product_name'; // Set the desired key dynamically
    const unit = 'unit'; // Set the desired key dynamically
    setUnit(option.label_3);
    setProductData({
      ...productData,
      [key]: option.value,
      [accountName]: option.label,
      [unit]: option.label_3,
    });
  };

  const resetProducts = () => {
    setFormData({ ...formData, products: [] }); // Reset to the initial state
    setIsUpdateButton(false);
    isUpdating && setIsUpdating(false);
  };

  const searchInvoice = () => {
    if (!search) {
      toast.info('Please enter an invoice number');
      return;
    }
    dispatch(
      labourInvoiceEdit(
        { invoiceNo: search, voucherType: voucherType },
        (message: string) => {
          if (message) {
            toast.error(message);
          }
        },
      ),
    );
    if (labourInvoice.isEdit === true) {
      setIsUpdateButton(true);
    }
    setFormData({ ...formData, searchInvoice: search }); // Update the state with the search value
    setIsInvoiceUpdate(true);
  };
  console.log('labourInvoice', labourInvoice);
  // Process `labourInvoice.data` when it updates
  useEffect(() => {
    if (labourInvoice?.data?.invoice_date) {
      const parsedDate = new Date(labourInvoice?.data?.invoice_date);
      if (!isNaN(parsedDate.getTime())) {
        setStartDate(parsedDate);
      } else { 
        setStartDate(null);
      }
    } else {
      setStartDate(null);
    }
    if (labourInvoice?.editLabourInvoice?.data?.data) {
      // console.log( labourInvoice?.editLabourInvoice?.data?.data?.products )
      let currentLabourInvoice = labourInvoice?.editLabourInvoice?.data;
      const products: Product[] = currentLabourInvoice?.data?.products.map(
        (product: any) => ({
          id: product.id,
          product: product.product,
          product_name: product.product_name, // Replace with actual logic if available
          unit: product.unit, // Replace with actual logic if available
          qty: product.quantity,
          price: product.price,
        }),
      );

      if (products && products.length > 0) {
        setFormData({
          ...currentLabourInvoice.data,
          products,
        });
        toast.success('Thank you for finding the invoice!');
      } else {
        setFormData({
          ...currentLabourInvoice.data,
          products: [],
        });
        toast.success('Something went wrong!');
      }
    }
  }, [labourInvoice.editLabourInvoice]);



  const addProduct = () => {
    const isValid = validateProductData(productData);
    if (!isValid) {
      // Proceed with form submission or API call
      return;
    }

    // Generate a unique ID for the product
    const newProduct: Product = {
      ...productData,
      id: Date.now(), // Use timestamp as a unique ID
      product: productData.product || 0,
      product_name: productData.product_name || '',
      unit: productData.unit || '',
      qty: productData.qty || '',
      price: productData.price || '',
    };

    // Add the product to the formData.products array
    setFormData((prevFormData) => ({
      ...prevFormData,
      products: [...prevFormData.products, newProduct],
    }));
  };

  const editProduct = () => {
    const isValid = validateProductData(productData);
    if (!isValid) {
      // Proceed with form submission or API call
      return;
    }
    let products = formData.products;
    let newItem: Product = {
      id: Date.now(), // Use timestamp as a unique ID
      product: productData.product || 0,
      product_name: productData.product_name || '',
      unit: productData.unit || '',
      qty: productData.qty || '',
      price: productData.price || '',
    };
    products[updateId] = newItem;
    // Add the product to the formData.products array
    setFormData((prevFormData) => ({
      ...prevFormData,
      products: products,
    }));
    setIsUpdating(false);
    setUpdateId(null);
  };

  const totalAmount = formData.products.reduce(
    (sum, row) => sum + Number(row.qty) * Number(row.price),
    0,
  );

  const handleDelete = (id: number) => {
    // Filter out the product with the matching id
    const updatedProducts = formData.products.filter(
      (product: any) => product.id !== id,
    );

    // Update the state with the new products array
    setFormData((prevFormData) => ({
      ...prevFormData,
      products: updatedProducts,
    }));
  };

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProductData((prevState: any) => ({
      ...prevState,
      [name]: value,
    }));
  };

  useEffect(() => {
    const voucherNo = labourInvoice?.data?.vr_no || '';
    if (voucherNo !== '') {
      toast.success(`Voucher No.: ${voucherNo}`);
      setFormData((prevState) => ({
        ...prevState,
        products: [],
      }));
    }
  }, [labourInvoice?.data?.vr_no, labourInvoice?.isUpdated]);

  useEffect(() => {
    setFormData((prevState) => ({
      ...prevState,
      products: [],
    }));
  }, [labourInvoice.isUpdated]);

  const handleInvoiceSave = async () => {
    const validationMessages = validateForm(formData, invoiceMessage);
    if (validationMessages) {
      toast.info(validationMessages);
      return;
    }
    if (formData.paymentAmt === '') {
      toast.info('Please enter payment amount!');
      return;
    }

    if (!formData.account || formData.products.length === 0) {
      toast.error('Please add products information!');
      return;
    }

    try {
      setSaveButtonLoading(true);
      const resultAction = await dispatch(
        labourInvoiceStore(formData),
      ).unwrap();
      // success message or redirect here
      // toast.success('Invoice saved successfully!');
      setTimeout(() => {
        setSaveButtonLoading(false);
        resetProducts();
      }, 1000);
    } catch (err: any) {
      toast.error(err?.message || 'Something went wrong!');
      setSaveButtonLoading(false);
    }
  };

  const handleInvoiceUpdate = async () => {
    const validationMessages = validateForm(formData, invoiceMessage);
    if (validationMessages) {
      toast.info(validationMessages);
      return;
    }

    if (!formData.account || formData.products.length === 0) {
      toast.error('Please add products information!');
      return;
    }

    // Save Invoice
    dispatch(
      labourInvoiceUpdate(formData, function (message) {
        if (message) {
          toast.info(message);
        }
      }),
    );
    setIsUpdateButton(false);
    setIsUpdating(false);
  };

  useEffect(() => {
    if (labourInvoice.isEdit) {
      setIsUpdateButton(true);
    } else {
      setIsUpdateButton(false);
    }
  }, [labourInvoice.isEdit]);


  useEffect(() => {
    if (labourInvoice.storeLabourInvoice?.data?.data?.vr_no) {
      toast.success(`Voucher No.: ${labourInvoice.storeLabourInvoice.data.data.vr_no}`);
      setFormData((prevState) => ({
        ...prevState,
        products: [],
      }));
    }
  }, [labourInvoice.storeLabourInvoice]);

  const handleStartDate = (e: any) => {
    const startD = dayjs(e).format('YYYY-MM-DD');
    const key = 'invoice_date';
    setFormData({ ...formData, [key]: startD });
  };

  const editProductItem = (productId: number) => {
    // Find the product by its unique id
    const productIndex = formData.products.findIndex(
      (item) => item.id === productId,
    );

    if (productIndex === -1) {
      // console.error("Product not found");
      return;
    }

    // Retrieve the specific product
    const product = formData.products[productIndex];

    // Populate the form with product details for editing
    setFormData((prevState) => ({
      ...prevState,
      currentProduct: { ...product, index: productIndex }, // Store index to identify the product during save
    }));

    //setWarehouseDdlData(productData.warehouse);
    setProductData(product);
    setIsUpdating(true);
    setUpdateId(productIndex);
  };

  const handleChangeVoucherType = (e: any) => {
    setVoucherType(e.target.value);
  };

  useEffect(() => {
    const total = formData.products.reduce((acc, product) => {
      const qty = parseFloat(product.qty) || 0;
      const price = parseFloat(product.price) || 0;
      return acc + qty * price;
    }, 0);

    const discount = formData.discountAmt || 0;
    const netTotal = total - discount;

    setFormData((prev) => ({
      ...prev,
      paymentAmt: netTotal.toFixed(2), // Keep as string
    }));
  }, [formData.account, formData.products, formData.discountAmt]);

    useCtrlS(handleInvoiceSave);

  return (
    <>
      <HelmetTitle title="Labour Invoice" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-8">
        {labourInvoice.isLoading ? <Loader /> : null}
        <div className="self-start md:self-auto">
          <div className="grid grid-cols-1 gap-y-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="text-black dark:text-white" htmlFor="">
                  Select Supplier
                </label>
                <DdlMultiline
                  id="account"
                  name="account"
                  onSelect={supplierAccountHandler}
                  // defaultValue={
                  //   formData.account
                  //     ? {
                  //         value: formData.account,
                  //         label: formData.accountName, //productData.accountName
                  //       }
                  //     : null
                  // }
                  value={
                    formData.account
                      ? {
                          value: formData.account,
                          label: formData.accountName, //productData.accountName
                        }
                      : null
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      // Delay to allow react-select to complete selection
                      setTimeout(() => {
                        const input = document.querySelector(
                          '#notes',
                        ) as HTMLInputElement | null;
                        if (input) input.focus();
                        if (input) input.select();
                      }, 150);
                    }
                  }}
                  acType={'3'}
                />
              </div>
              <InputElement
                id="notes"
                name="notes"
                value={formData.notes}
                placeholder={'Notes'}
                label={'Notes'}
                className={'py-1'}
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'bill_no')} // Dynamically pass the next element's ID
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <InputElement
                id="bill_no"
                value={formData.bill_no}
                name="bill_no"
                placeholder={'Bill Number'}
                label={'Bill Number'}
                className={'py-1 -mt-1'}
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'bill_date')} // Pass the next field's ID
              />
              <div>
                <label>Bill Date</label>
                <InputDatePicker
                  id="bill_date"
                  name="bill_date"
                  setCurrentDate={handleStartDate}
                  className="w-full p-1"
                  selectedDate={startDate}
                  setSelectedDate={setStartDate}
                  onKeyDown={(e) => handleInputKeyDown(e, 'paymentAmt')} // Pass the next field's ID
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <InputElement
                id="paymentAmt"
                value={formData.paymentAmt}
                name="paymentAmt"
                type="number"
                disabled={Number(formData.account) === 17}
                placeholder={'Payment Amount'}
                label={'Payment Amount'}
                className={'py-1 text-right'}
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'discountAmt')} // Pass the next field's ID
              />
              <InputElement
                id="discountAmt"
                name="discountAmt"
                type="number"
                value={formData.discountAmt.toString()}
                placeholder={'Discount Amount'}
                label={'Discount Amount'}
                className={'py-1 text-right'}
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'product')} // Dynamically pass the next element's ID
              />
              <div className="grid grid-cols-1 md:gap-x-1 -mb-1 ">
                <p className="text-sm font-bold dark:text-white">Total Tk.</p>
                <span className="text-sm font-bold dark:text-white">
                  {' '}
                  {thousandSeparator(totalAmount, 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="">
          <div className="grid grid-cols-1 gap-y-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {hasPermission(permissions, 'purchase.edit') && (
                <div className="relative mt-6">
                  <div className="w-full ">
                    <DropdownCommon
                      id={'voucher_type'}
                      name={'voucher_type'}
                      label={'Select Invoice Type'}
                      className="h-9"
                      onChange={handleChangeVoucherType}
                      data={voucherTypes}
                    />
                  </div>
                </div>
              )}
              {hasPermission(permissions, 'purchase.edit') && (
                <>
                  <div className="relative mt-6">
                    <label className="text-black dark:text-white" htmlFor="">
                      Search Invoice
                    </label>
                    <div className="w-full ">
                      <InputOnly
                        id="search"
                        value={search}
                        name="search"
                        placeholder={'Search Labour Invoice'}
                        label={''}
                        className={'py-1 w-full'}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => handleInputKeyDown(e, 'btnSearch')} // Pass the next field's ID
                      />
                    </div>
                    <ButtonLoading
                      id="btnSearch"
                      name="btnSearch"
                      onClick={searchInvoice}
                      buttonLoading={buttonLoading}
                      label=""
                      className="whitespace-nowrap !bg-transparent text-center mr-0 py-2 absolute -right-1 top-6 background-red-500 !pr-2 !pl-2"
                      icon={
                        <FiSearch className="dark:text-white text-black-2 text-lg ml-2  mr-2" />
                      }
                    />
                  </div>
                </>
              )}
            </div>
            <div className="grid grid-cols-12 gap-x-2">
              <div className="col-span-12 md:col-span-6">
                <label className="text-black dark:text-white" htmlFor="">
                  Select Product
                </label>
                <LabourDropdown
                  id="product"
                  name="product"
                  onSelect={productSelectHandler}
                  defaultValue={
                    productData.product_name && productData.product
                      ? {
                          label: productData.product_name,
                          value: productData.product,
                        }
                      : null
                  }
                  value={
                    productData.product_name && productData.product
                      ? {
                          label: productData.product_name,
                          value: productData.product,
                        }
                      : null
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      // Delay to allow react-select to complete selection
                      setTimeout(() => {
                        const input = document.querySelector(
                          '#qty',
                        ) as HTMLInputElement | null;
                        if (input) input.focus();
                        if (input) input.select();
                      }, 150);
                    }
                  }}
                  className="w-full py-1"
                />
              </div>

              <div className="col-span-12 md:col-span-3 block relative">
                <InputElement
                  id="qty"
                  value={productData.qty}
                  name="qty"
                  placeholder={'Quantity'}
                  label={'Quantity'}
                  className={'py-1'}
                  type="number"
                  onChange={handleProductChange}
                  onKeyDown={(e) => handleInputKeyDown(e, 'price')}
                />
                <span className="absolute top-8 right-3 z-50">{unit}</span>
              </div>

              <div className="col-span-12 md:col-span-3">
                <InputElement
                  id="price"
                  value={productData.price}
                  name="price"
                  placeholder={'Price'}
                  label={'Price'}
                  className={'py-1'}
                  type="number"
                  onChange={handleProductChange}
                  onKeyDown={(e) => handleInputKeyDown(e, 'addProduct')}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-x-1 gap-y-1">
              {isUpdating ? (
                <ButtonLoading
                  onClick={editProduct}
                  buttonLoading={buttonLoading}
                  label="Update"
                  className="whitespace-nowrap text-center mr-0 py-1.5"
                  icon={<FiEdit2 className="text-white text-lg ml-2  mr-2" />}
                />
              ) : (
                <ButtonLoading
                  id="addProduct"
                  onClick={addProduct}
                  buttonLoading={buttonLoading}
                  label="Add New"
                  className="whitespace-nowrap text-center mr-0 py-1.5"
                  icon={<FiPlus className="text-white text-lg ml-2  mr-2" />}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addProduct();
                      setTimeout(() => {
                        const product = document.getElementById('product');
                        product?.focus();
                      }, 100);
                    }
                  }}
                />
              )}
              {isUpdateButton ? (
                <ButtonLoading
                  onClick={handleInvoiceUpdate}
                  buttonLoading={buttonLoading}
                  label="Update"
                  className="whitespace-nowrap text-center mr-0"
                  icon={<FiEdit className="text-white text-lg ml-2  mr-2" />}
                />
              ) : (
                <ButtonLoading
                  onClick={handleInvoiceSave}
                  buttonLoading={saveButtonLoading}
                  label={saveButtonLoading ? "Saving..." : "Save"}
                  className="whitespace-nowrap text-center mr-0"
                  icon={<FiSave className="text-white text-lg ml-2 mr-2" />}
                  disabled={saveButtonLoading}
                />
              )}

              <ButtonLoading
                onClick={resetProducts}
                buttonLoading={buttonLoading}
                label="Reset"
                className="whitespace-nowrap text-center mr-0"
                icon={
                  <FiRefreshCcw className="text-white text-lg ml-2  mr-2" />
                }
              />
              <Link to="/dashboard" className="text-nowrap justify-center mr-0">
                <FiHome className="text-white text-lg ml-2  mr-2" />
                <span className="hidden md:block">{'Home'}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 col-span-2 overflow-x-auto ">
        {labourInvoice.isLoading ? <Loader /> : null}
        <table
          className={`w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400`}
        >
          <thead className="text-xs text-gray-700 uppercase bg-gray-300 dark:bg-gray-700 dark:text-gray-200">
            <tr className="bg-black-700">
              <th scope="col" className={`px-2 py-2 text-center `}>
                {' '}
                Sl. No.{' '}
              </th>
              <th scope="col" className={`px-2 py-2 `}>
                {' '}
                Item Name{' '}
              </th>
              <th scope="col" className={`px-2 py-2 text-right`}>
                {' '}
                Quantity{' '}
              </th>
              <th scope="col" className={`px-2 py-2 text-right`}>
                {' '}
                Rate{' '}
              </th>
              <th scope="col" className={`px-2 py-2 text-right`}>
                {' '}
                Total{' '}
              </th>
              <th scope="col" className={`px-2 py-2 text-center w-20 `}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {formData.products.length > 0 &&
              formData.products.map((row, index) => (
                <tr
                  key={index}
                  className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                >
                  <td
                    className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-center `}
                  >
                    {++index}
                  </td>
                  <td
                    className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white `}
                  >
                    {row.product_name}
                  </td>
                  <td
                    className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-right `}
                  >
                    {thousandSeparator(Number(row.qty), 2)} {row.unit}
                  </td>
                  <td
                    className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-right `}
                  >
                    {thousandSeparator(Number(row.price), 2)}
                  </td>
                  <td
                    className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-right `}
                  >
                    {thousandSeparator(Number(row.price) * Number(row.qty), 2)}
                  </td>
                  <td
                    className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-center w-20 `}
                  >
                    <button
                      onClick={() => handleDelete(row.id)}
                      className="text-red-500 ml-2 text-center"
                    >
                      <FiTrash2 className="cursor-pointer text-center" />
                    </button>
                    <button
                      onClick={() => editProductItem(row.id)}
                      className="text-green-500 ml-2 text-center"
                    >
                      <FiEdit2 className="cursor-pointer text-center" />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default ConstructionLabourInvoice;
