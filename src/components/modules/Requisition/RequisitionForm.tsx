import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
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
import { userCurrentBranch } from '../branch/branchSlice';
import { constructionPurchaseEdit, constructionPurchaseStore } from '../invoices/purchase/constructionPurchaseSlice';
import { validateProductData } from '../../utils/utils-functions/productValidationHandler';
import useCtrlS from '../../utils/hooks/useCtrlS';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Loader from '../../../common/Loader';
import InputElement from '../../utils/fields/InputElement';
import { handleInputKeyDown } from '../../utils/utils-functions/handleKeyDown';
import InputDatePicker from '../../utils/fields/DatePicker';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import InputOnly from '../../utils/fields/InputOnly';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import Link from '../../utils/others/Link';
import RequisitionItemsDropdown from '../../utils/utils-functions/RequisitionItemsDropdown';
import { requisitionStore } from './requisitionSlice';



interface Product {
  id: number;
  product: number;
  product_name: string;
  remarks?: string;
  unit: string;
  day: string;
  qty: string;
  price: string;
}

const RequisitionForm = () => {
  const purchase = useSelector((s: any) => s.constructionPurchase);
  const settings = useSelector((s: any) => s.settings);
  const dispatch = useDispatch<any>();
  const [buttonLoading, setButtonLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null); // Define state with type
  const [endDate, setEndDate] = useState<Date | null>(null); // Define state with type
  const [unit, setUnit] = useState<string | null>(null); // Define state with type
  const [search, setSearch] = useState(''); // State to store the search value
  const [productData, setProductData] = useState<any>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateId, setUpdateId] = useState<any>(null);
  const [isInvoiceUpdate, setIsInvoiceUpdate] = useState(false);
  const [permissions, setPermissions] = useState<any>([]);
  const [voucherType, setVoucherType] = useState('');
  const [saveButtonLoading, setSaveButtonLoading] = useState(false);
  const [lineTotal, setLineTotal] = useState<number>(0);

  useEffect(() => {
    dispatch(userCurrentBranch());
    setPermissions(settings.data.permissions);
  }, []);

  interface FormData {
    mtmId: string;
    requisitionAmt: string;
    startDate: string;
    endDate: string;
    notes: string;
    currentProduct: { index?: number } | null; // Initialize `currentProduct` with optional index
    searchInvoice: string;
    products: Product[];
  }

  const initialFormData: FormData = {
  mtmId: '',
  requisitionAmt: '',
  notes: '',
  startDate: '',
  endDate: '',
  currentProduct: null,
  searchInvoice: '',
  products: [],
};

  const [formData, setFormData] = useState<FormData>(initialFormData);


  const productSelectHandler = (option: any) => {
    const key = 'product'; // Set the desired key dynamically
    const accountName = 'product_name'; // Set the desired key dynamically
    const unit = 'unit'; // Set the desired key dynamically
    const price = 'price'; // Set the desired key dynamically

    setUnit(option.label_3);

    setProductData({
      ...productData,
      [key]: option.value,
      [accountName]: option.label,
      [unit]: option.label_3,
      [price]: Number(option.label_4).toFixed(2),
    });

    // After setting product data, recalculate line total
    const days = parseFloat(productData.day) || 0; // Use the latest day
    const qty = parseFloat(productData.qty) || 0; // Use the latest qty
    const priceValue = Number(option.label_3) || 0; // Use the price from the selected product
    const newLineTotal = days * qty * priceValue;

    // Update the lineTotal state with the new value
    setLineTotal(Number(newLineTotal.toFixed(2))); // Keep it as a string for display
  };

  const resetProducts = () => {
    setFormData(initialFormData); // Reset to the initial state
  };

  const searchInvoice = () => {
    if (!search) {
      toast.info('Please enter an invoice number');
      return;
    }
    dispatch(
      constructionPurchaseEdit(
        { invoiceNo: search, voucherType: voucherType },
        (message: string) => {
          if (message) {
            toast.error(message);
          }
        },
      ),
    );
    setFormData({ ...formData, searchInvoice: search }); // Update the state with the search value
    setIsInvoiceUpdate(true);
  };

  const totalAmount = formData.products.reduce(
    (sum, row) => sum + Number(row.qty) * Number(row.price) * Number(row.day),
    0,
  );

  // Process `purchase.data` when it updates
  useEffect(() => {
    if (purchase?.data?.invoice_date) {
      const parsedDate = new Date(purchase.data.invoice_date);
      if (!isNaN(parsedDate.getTime())) {
        setStartDate(parsedDate);
      } else {
        console.warn(
          'Invalid date format in invoice_date:',
          purchase.data.invoice_date,
        );
        setStartDate(null);
      }
    } else {
      setStartDate(null);
    }
    if (purchase?.data?.products) {
      const products: Product[] = purchase.data.products.map(
        (product: any) => ({
          id: product.id,
          product: product.product,
          product_name: product.product_name, // Replace with actual logic if available
          remarks: product.remarks || '',
          unit: product.unit, // Replace with actual logic if available
          day: product.day, // Replace with actual logic if available
          qty: product.quantity,
          price: product.price, 
        }),
      );

      if (products && products.length > 0) {
        setFormData({
          ...purchase.data,
          products,
        });
        toast.success('Thank you for finding the invoice!');
      } else {
        setFormData({
          ...purchase.data,
          products: [],
        });
        toast.success('Something went wrong!');
      }
    } 
  }, [purchase?.data]);

  const addProduct = () => {
    if (!validateProductData(productData)) return;

    // Generate a unique ID for the product
    const newProduct: Product = {
      ...productData,
      id: Date.now(), // Use timestamp as a unique ID
      product: productData.product || 0,
      product_name: productData.product_name || '',
      unit: productData.unit || '',
      day: productData.day || '',
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
    if (!isValid) return;

    let newItem: Product = {
      id: Date.now(), // Use timestamp as a unique ID
      product: productData.product || 0,
      product_name: productData.product_name || '',
      remarks: productData.remarks || '',
      unit: productData.unit || '',
      qty: productData.qty || '',
      day: productData.day || '',
      price: productData.price || '',
    };

    setFormData((prevFormData) => ({
      ...prevFormData,
      products: prevFormData.products.map((item, index) =>
        index === updateId ? newItem : item,
      ),
    }));
    setIsUpdating(false);
    setUpdateId(null);
  };

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
      [name]:
        name === 'discountAmt'
          ? isNaN(parseFloat(value))
            ? 0
            : parseFloat(value)
          : value,
    }));
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newValue = value ? parseFloat(value) : 0;
    setProductData((prevState: any) => ({
      ...prevState,
      [name]: value,
    }));

    // Update product data state
    setProductData((prevState: any) => {
      const updatedProductData = { ...prevState, [name]: newValue };

      // Calculate line total after updating product data
      const day = parseFloat(updatedProductData.day) || 0;
      const qty = parseFloat(updatedProductData.qty) || 0;
      const price = parseFloat(updatedProductData.price) || 0;
      const newLineTotal = day * qty * price;

      setLineTotal(Number(newLineTotal.toFixed(2))); // Keep it as a string for display
      return updatedProductData;
    });
  };

  useEffect(() => {
    const voucherNo = purchase?.data?.vr_no || '';
    if (voucherNo !== '') {
      toast.success(`Voucher No.: ${voucherNo}`);
      setFormData((prevState) => ({
        ...prevState, // Spread the previous state to retain all other properties
        products: [], // Reset only the `products` array
      }));
    }
  }, [purchase?.data?.vr_no, purchase?.isUpdated]);

  useEffect(() => {
    setFormData((prevState) => ({
      ...prevState, // Spread the previous state to retain all other properties
      products: [], // Reset only the `products` array
    }));
  }, [purchase.isUpdated]);

  const handlePurchaseInvoiceSave = async () => {

    
    setSaveButtonLoading(true); 
    
    if (formData.requisitionAmt == '') {
      toast.error('Please add requisition amount!');
      setSaveButtonLoading(false);
      return;
    }
    console.log('Ready');
    dispatch(
      requisitionStore(formData, function (message) {
        if (message) {
          toast.error(message);
        }
        setTimeout(() => {
          setSaveButtonLoading(false);
          // resetProducts();
          setFormData((prevFormData) => ({
            ...prevFormData,
            requisitionAmt: '',
            notes: '',
            products: [],
          }));
        }, 1000);
      }),
    );
  }

  const handleStartDate = (e: any) => {
    const startD = dayjs(e).format('YYYY-MM-DD'); // Adjust format as needed
    const key = 'startDate'; // Set the desired key dynamically
    setFormData({ ...formData, [key]: startD });
  };

  const handleEndDate = (e: any) => {
    const startD = dayjs(e).format('YYYY-MM-DD'); // Adjust format as needed
    const key = 'endDate'; // Set the desired key dynamically
    setFormData({ ...formData, [key]: startD });
  };


  const editProductItem = (productId: number) => {
    // Find the product by its unique id
    const productIndex = formData.products.findIndex(
      (item) => item.id === productId,
    );

    if (productIndex === -1) {
      // console.error("Product not found");
      toast.info('Product not found');
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



  useEffect(() => {
    const total = formData.products.reduce((acc, product) => {
      const day = parseFloat(product.day) || 0;
      const qty = parseFloat(product.qty) || 0;
      const price = parseFloat(product.price) || 0;
      return acc + qty * price * day;
    }, 0);

    setFormData((prev) => ({
      ...prev,
      requisitionAmt: total.toFixed(0), // Keep as string
    }));
  }, [formData.products]);

  useCtrlS(handlePurchaseInvoiceSave);

  return (
    <>
      <HelmetTitle title="Requisition Form" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-8">
        {purchase.isLoading ? <Loader /> : null}
        <div className="self-start md:self-auto">
          <div className="grid grid-cols-1 gap-y-1">
            <div className="grid grid-cols-1 md:grid-cols-1 gap-2">

              <InputElement
                id="notes"
                value={formData.notes}
                name="notes"
                placeholder={'Notes'}
                label={'Notes'}
                className={'py-1.5'}
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'requisition_start_date')} // Dynamically pass the next element's ID
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">

              <div className="w-full">
                <label className="text-black dark:text-white" htmlFor="">
                  Requisition Start Date
                </label>
                <InputDatePicker
                  id="requisition_start_date"
                  name="requisition_start_date"
                  setCurrentDate={handleStartDate}
                  className="w-full p-1 "
                  selectedDate={startDate}
                  setSelectedDate={setStartDate}
                  onKeyDown={(e) => handleInputKeyDown(e, 'requisition_end_date')} // Pass the next field's ID
                />
              </div>
              <div className="w-full">
                <label className="text-black dark:text-white" htmlFor="">
                  Requisition End Date
                </label>
                <InputDatePicker
                  id="requisition_end_date"
                  name="requisition_end_date"
                  setCurrentDate={handleEndDate}
                  className="w-full p-1 "
                  selectedDate={endDate}
                  setSelectedDate={setEndDate}
                  onKeyDown={(e) => handleInputKeyDown(e, 'requisition_end_date')} // Pass the next field's ID
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <InputElement
                id="requisitionAmt"
                name="requisitionAmt"
                value={thousandSeparator(Number(formData.requisitionAmt), 0)}
                placeholder={'Requisition Amount'}
                label={'Requisition Amount'}
                className={'py-1 text-right'}
                onChange={handleOnChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    // Delay to allow react-select to complete selection
                    setTimeout(() => {
                      const input = document.querySelector(
                        '#product',
                      ) as HTMLInputElement | null;
                      if (input) input.focus();
                    }, 150);
                  }
                }}
              />
              <div className="relative">
                <label className="text-black dark:text-white" htmlFor="">
                  Search Requisition
                </label>
                <div className="w-full ">
                  <InputOnly
                    id="search"
                    value={search}
                    name="search"
                    placeholder={'Search Requisition'}
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
            </div>
          </div>
        </div>
        <div className="">
          <div className="grid grid-cols-1 gap-y-1">
            <div className="grid grid-cols-1 md:grid-cols-1 gap-2">
              <div>
                <label className="text-black dark:text-white" htmlFor="">
                  Select Product
                </label>
                <RequisitionItemsDropdown
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
                          '#day',
                        ) as HTMLInputElement | null;
                        if (input) input.focus();
                        if (input) input.select();
                      }, 150);
                    }
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="block relative">
                <InputElement
                  id="day"
                  value={productData.day}
                  name="day"
                  placeholder={'Enter Day'}
                  label={'Day'}
                  type="number"
                  className={''}
                  onChange={handleProductChange}
                  onKeyDown={(e) => handleInputKeyDown(e, 'qty')} // Pass the next field's ID
                />
                <span className="absolute top-7 right-3 z-1">{unit}</span>
              </div>
              <div className="block relative">
                <InputElement
                  id="qty"
                  value={productData.qty}
                  name="qty"
                  placeholder={'Enter Quantity'}
                  label={'Quantity'}
                  type="number"
                  className={''}
                  onChange={handleProductChange}
                  onKeyDown={(e) => handleInputKeyDown(e, 'price')} // Pass the next field's ID
                />
                <span className="absolute top-7 right-3 z-1">{unit}</span>
              </div>

              <div className="block relative">
                <InputElement
                  id="price"
                  value={productData.price}
                  name="price"
                  type="number"
                  placeholder={'Enter Price'}
                  label={'Price'}
                  className={''}
                  onChange={handleProductChange}
                  onKeyDown={(e) => handleInputKeyDown(e, 'addProduct')} // Pass the next field's ID
                />
                <span className="absolute top-7 right-3 z-1">{thousandSeparator(lineTotal, 0)}</span>
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
              {purchase.isEdit ? (
                <ButtonLoading
                  // onClick={handleInvoiceUpdate}
                  buttonLoading={buttonLoading}
                  label="Update"
                  className="whitespace-nowrap text-center mr-0"
                  icon={<FiEdit className="text-white text-lg ml-2  mr-2" />}
                />
              ) : (
                <ButtonLoading
                  onClick={handlePurchaseInvoiceSave}
                  buttonLoading={saveButtonLoading}
                  label={saveButtonLoading ? 'Saving...' : 'Save'}
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
        {/* {cashPayment.isLoading ? <Loader /> : null} */}
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
                Product Name{' '}
              </th>
              <th scope="col" className={`px-2 py-2 text-right`}>
                {' '}
                Days{' '}
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
                  <td className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-right `}>
                    {thousandSeparator(Number(row.day), 2)}
                  </td>
                  <td
                    className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-right `}
                  >
                    {thousandSeparator(Number(row.qty), 2)} {row.unit}
                  </td>
                  <td className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-right `}>
                    {thousandSeparator(Number(row.price), 2)}
                  </td>

                  <td
                    className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-right `}
                  >
                    {thousandSeparator(
                      Math.floor(Number(row.price) * Number(row.day) * Number(row.qty)),
                      2,
                    )}
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
};

export default RequisitionForm;
