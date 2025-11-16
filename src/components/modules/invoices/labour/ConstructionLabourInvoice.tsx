import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import HelmetTitle from "../../../utils/others/HelmetTitle";
import DdlMultiline from "../../../utils/utils-functions/DdlMultiline";
import InputElement from "../../../utils/fields/InputElement";
import { ButtonLoading } from "../../../../pages/UiElements/CustomButtons";
import { toast } from "react-toastify";
import Link from "../../../utils/others/Link";
import { useDispatch, useSelector } from "react-redux";
import { getDdlWarehouse } from "../../warehouse/ddlWarehouseSlider";
import Loader from "../../../../common/Loader";
import InputDatePicker from "../../../utils/fields/DatePicker";
import {
  FiEdit,
  FiEdit2,
  FiHome,
  FiPlus,
  FiRefreshCcw,
  FiSave,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import dayjs from "dayjs";
import { validateForm } from "../../../utils/utils-functions/validationUtils";
import { invoiceMessage } from "../../../utils/utils-functions/invoiceMessage";
import { validateProductData } from "../../../utils/utils-functions/productValidationHandler";
import InputOnly from "../../../utils/fields/InputOnly";
import { handleInputKeyDown } from "../../../utils/utils-functions/handleKeyDown";
import { hasPermission } from "../../../utils/permissionChecker";
import {
  labourInvoiceEdit,
  labourInvoiceStore,
  labourInvoiceUpdate,
} from "./labourInvoiceSlice";
import LabourDropdown from "../../../utils/utils-functions/LabourDropdown";
import DropdownCommon from "../../../utils/utils-functions/DropdownCommon";
import { voucherTypes } from "../../../utils/fields/DataConstant";
import useCtrlS from "../../../utils/hooks/useCtrlS";

/* -------------------------
   Types
------------------------- */
interface Product {
  id: number;
  product: number;
  product_name: string;
  unit: string;
  qty: string;
  price: string;
}

interface FormState {
  mtmId: string;
  account: string;
  accountName: string;
  bill_no: string;
  bill_date: string;
  paymentAmt: string;
  discountAmt: number;
  notes: string;
  currentProduct: { index?: number } | null;
  searchInvoice: string;
  products: Product[];
}

/* -------------------------
   Initial state / reducer
------------------------- */
const initialFormState: FormState = {
  mtmId: "",
  account: "",
  accountName: "",
  bill_no: "",
  bill_date: "",
  paymentAmt: "",
  discountAmt: 0,
  notes: "",
  currentProduct: null,
  searchInvoice: "",
  products: [],
};

type Action =
  | { type: "SET_FIELD"; key: keyof FormState; value: any }
  | { type: "SET_PRODUCTS"; products: Product[] }
  | { type: "ADD_PRODUCT"; product: Product }
  | { type: "UPDATE_PRODUCT"; index: number; product: Product }
  | { type: "REMOVE_PRODUCT"; id: number }
  | { type: "RESET" }
  | { type: "LOAD_EDIT"; payload: Partial<FormState> };

function reducer(state: FormState, action: Action): FormState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.key]: action.value };
    case "SET_PRODUCTS":
      return { ...state, products: action.products };
    case "ADD_PRODUCT":
      return { ...state, products: [...state.products, action.product] };
    case "UPDATE_PRODUCT": {
      const products = [...state.products];
      products[action.index] = action.product;
      return { ...state, products };
    }
    case "REMOVE_PRODUCT":
      return { ...state, products: state.products.filter((p) => p.id !== action.id) };
    case "LOAD_EDIT":
      return { ...state, ...action.payload };
    case "RESET":
      return { ...initialFormState };
    default:
      return state;
  }
}

/* -------------------------
   Component
------------------------- */
function ConstructionLabourInvoice(): JSX.Element {
  const dispatch = useDispatch<any>();
  const warehouse = useSelector((s: any) => s.activeWarehouse);
  const labourInvoice = useSelector((s: any) => s.labourInvoice);
  const settings = useSelector((s: any) => s.settings);

  const [state, localDispatch] = useReducer(reducer, initialFormState);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [unit, setUnit] = useState<string | null>(null);
  const [productData, setProductData] = useState<any>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateIndex, setUpdateIndex] = useState<number | null>(null);
  const [isUpdateButton, setIsUpdateButton] = useState(false);

  // flags
  const [isInvoiceUpdate, setIsInvoiceUpdate] = useState(false); // true when editing an invoice (preloaded)
  const [voucherType, setVoucherType] = useState("");
  const [saveButtonLoading, setSaveButtonLoading] = useState(false);

  const mountedRef = useRef(false);

  useEffect(() => {
    dispatch(getDdlWarehouse());
    // settings might be undefined on first render; guard
    if (settings?.data?.permissions) {
      // if you keep permissions in local state you can set them here
    }
    mountedRef.current = true;
  }, [dispatch, settings?.data?.permissions]);


  /* -------------------------
     Helpers
  ------------------------- */
  const setField = useCallback((key: keyof FormState, value: any) => {
    localDispatch({ type: "SET_FIELD", key, value });
  }, []);

  const resetForm = useCallback(() => {
    localDispatch({ type: "RESET" });
    setIsUpdateButton(false);
    setIsUpdating(false);
    setUpdateIndex(null);
    setIsInvoiceUpdate(false);
    setProductData({});
  }, []);

  /* -------------------------
     Product handlers
  ------------------------- */
  const addProduct = useCallback(() => {
    if (!validateProductData(productData)) return;

    const newProduct: Product = {
      id: Date.now(),
      product: productData.product || 0,
      product_name: productData.product_name || "",
      unit: productData.unit || "",
      qty: productData.qty || "0",
      price: productData.price || "0",
    };
    localDispatch({ type: "ADD_PRODUCT", product: newProduct });
    // clear productData inputs
    setProductData({});
  }, [productData]);

  const editProductSave = useCallback(() => {
    if (!validateProductData(productData)) return;
    if (updateIndex === null) return;
    const updated: Product = {
      id: Date.now(),
      product: productData.product || 0,
      product_name: productData.product_name || "",
      unit: productData.unit || "",
      qty: productData.qty || "0",
      price: productData.price || "0",
    };
    localDispatch({ type: "UPDATE_PRODUCT", index: updateIndex, product: updated });
    setIsUpdating(false);
    setUpdateIndex(null);
    setProductData({});
  }, [productData, updateIndex]);

  const removeProduct = useCallback((id: number) => {
    localDispatch({ type: "REMOVE_PRODUCT", id });
  }, []);

  const editProductItem = useCallback((productId: number) => {
    const idx = state.products.findIndex((p) => p.id === productId);
    if (idx === -1) return;
    const p = state.products[idx];
    setProductData(p);
    setIsUpdating(true);
    setUpdateIndex(idx);
    // mark currentProduct in form (optional)
    localDispatch({
      type: "SET_FIELD",
      key: "currentProduct",
      value: { index: idx },
    });
  }, [state.products]);

  /* -------------------------
     Server edit load
  ------------------------- */
  useEffect(() => {
    // when editLabourInvoice arrives, populate form state once
    const payload = labourInvoice?.editLabourInvoice?.data?.data;
    if (!payload) return;

    // Build products
    const productsFromServer: Product[] =
      payload.transaction?.inventory_labour_master?.inventory_labour_details?.map(
        (detail: any) => ({
          id: detail.id,
          product: detail.labour_item?.id ?? 0,
          product_name: detail.labour_item?.name ?? "",
          unit: detail.labour_item?.unit?.name ?? "",
          qty: detail.quantity?.toString() ?? "0",
          price: detail.purchase_price?.toString() ?? "0",
        }),
      ) || [];

    // find accountName from transaction details
    let accountName = "-";
    const trxMasters = payload.transaction?.acc_transaction_master || [];
    const supplierId = payload.transaction?.inventory_labour_master?.supplier_id;
    for (const t of trxMasters) {
      for (const d of t.acc_transaction_details || []) {
        if (d.coa_l4?.id === supplierId) {
          accountName = d.coa_l4?.name || accountName;
          break;
        }
      }
      if (accountName !== "-") break;
    }

    const editForm: Partial<FormState> = {
      mtmId: payload.mtmId ?? "",
      account: (payload.transaction?.inventory_labour_master?.supplier_id || "").toString(),
      accountName,
      bill_no: payload.transaction?.inventory_labour_master?.bill_no || "",
      bill_date: payload.transaction?.inventory_labour_master?.bill_date || "",
      paymentAmt: (payload.transaction?.inventory_labour_master?.netpayment || "").toString(),
      discountAmt: parseFloat(payload.transaction?.inventory_labour_master?.discount || 0) || 0,
      notes: payload.transaction?.inventory_labour_master?.notes || "",
      products: productsFromServer,
    };

    localDispatch({ type: "LOAD_EDIT", payload: editForm });
    setIsInvoiceUpdate(true);
    setIsUpdateButton(true);

    // set date picker (if needed)
    if (payload.transaction?.inventory_labour_master?.bill_date) {
      const parsed = new Date(payload.transaction.inventory_labour_master.bill_date);
      if (!isNaN(parsed.getTime())) setStartDate(parsed);
    }
  }, [labourInvoice.editLabourInvoice]);

  /* -------------------------
     Computed totals
     - If editing an existing invoice (isInvoiceUpdate) we DO NOT auto-override paymentAmt
     - For new invoices auto-calc paymentAmt from products-discount
  ------------------------- */
  const totalAmount = useMemo(() => {
    return state.products.reduce((acc, p) => {
      const q = parseFloat(p.qty as unknown as string) || 0;
      const pr = parseFloat(p.price as unknown as string) || 0;
      return acc + q * pr;
    }, 0);
  }, [state.products]);

  // Auto-calc paymentAmt only in create/new mode
  useEffect(() => {
    if (isInvoiceUpdate) return; // do not override when editing existing invoice
    const net = totalAmount - (state.discountAmt || 0);
    // Keep two decimals
    localDispatch({ type: "SET_FIELD", key: "paymentAmt", value: net.toFixed(2) });
  }, [totalAmount, state.discountAmt, isInvoiceUpdate]);

  /* -------------------------
     Handlers: save / update
  ------------------------- */
  const handleInvoiceSave = useCallback(async () => {
    const validationMessages = validateForm(state as any, invoiceMessage);
    if (validationMessages) {
      toast.info(validationMessages);
      return;
    }
    if (!state.paymentAmt || state.paymentAmt === "") {
      toast.info("Please enter payment amount!");
      return;
    }
    if (!state.account || state.products.length === 0) {
      toast.error("Please add products information!");
      return;
    }

    try {
      setSaveButtonLoading(true);
      const res = await dispatch(labourInvoiceStore(state as any)).unwrap();
      // res expected to contain data and message
      toast.success(res?.message || "Invoice saved");
      // Reset after small delay so user sees toast
      setTimeout(() => {
        resetForm();
        setSaveButtonLoading(false);
      }, 600);
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong!");
      setSaveButtonLoading(false);
    }
  }, [dispatch, state, resetForm]);

  const handleInvoiceUpdate = useCallback(async () => {
    const validationMessages = validateForm(state as any, invoiceMessage);
    if (validationMessages) {
      toast.info(validationMessages);
      return;
    }
    if (!state.account || state.products.length === 0) {
      toast.error("Please add products information!");
      return;
    }

    try {
      const res = await dispatch(labourInvoiceUpdate(state as any)).unwrap();
      if (res?.success) {
        toast.success(res.message || "Labour invoice updated successfully!", {
          style: { width: "450px", fontSize: "16px" },
        });
        setTimeout(() => {
          resetForm();
        }, 500);
      } else {
        toast.info(res?.message || "Update completed");
      }
      setIsUpdateButton(false);
      setIsUpdating(false);
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong!");
    }
  }, [dispatch, state, resetForm]);

  /* -------------------------
     Select handlers
  ------------------------- */
  const supplierAccountHandler = useCallback((option: any) => {
    localDispatch({ type: "SET_FIELD", key: "account", value: option.value });
    localDispatch({ type: "SET_FIELD", key: "accountName", value: option.label });
  }, []);

  const productSelectHandler = useCallback((option: any) => {
    setUnit(option.label_3 || null);
    setProductData((prev) => ({
      ...prev,
      product: option.value,
      product_name: option.label,
      unit: option.label_3,
    }));
    // focus qty after small delay (UI nicety)
    setTimeout(() => {
      const qtyInput = document.getElementById("qty") as HTMLInputElement | null;
      qtyInput?.focus();
      qtyInput?.select();
    }, 120);
  }, []);

  const handleOnChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // If discountAmt or numeric fields, convert to number when appropriate
    if (name === "discountAmt") {
      const n = parseFloat(value) || 0;
      localDispatch({ type: "SET_FIELD", key: "discountAmt", value: n });
      return;
    }
    localDispatch({ type: "SET_FIELD", key: name as keyof FormState, value });
  }, []);

  const handleProductChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProductData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleStartDate = useCallback((e: any) => {
    const startD = dayjs(e).format("YYYY-MM-DD");
    localDispatch({ type: "SET_FIELD", key: "bill_date", value: startD });
    setStartDate(new Date(startD));
  }, []);

  // search invoice
  const [search, setSearch] = useState("");


  const searchInvoice = useCallback(() => {
    if (!search) {
      toast.info("Please enter an invoice number");
      return;
    }
    const res = dispatch(labourInvoiceEdit({ invoiceNo: search, voucherType }));
    // mark edit attempt; actual form will load when editLabourInvoice updates
    setIsInvoiceUpdate(true);
  }, [dispatch, search, voucherType]);


  useEffect(() => {
  if (labourInvoice.editLabourInvoice?.message) {
    toast.info(labourInvoice.editLabourInvoice.message);
  }
}, [labourInvoice.editLabourInvoice]);

  /* -------------------------
     useCtrlS for save
  ------------------------- */
  useCtrlS(handleInvoiceSave);

  /* -------------------------
     Derived UI values
  ------------------------- */
  const totalAmountForUI = useMemo(() => totalAmount, [totalAmount]);

  /* -------------------------
     Render
  ------------------------- */
  return (
    <>
      <HelmetTitle title="Labour Invoice" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-8">
        {labourInvoice.isLoading ? <Loader /> : null}

        <div className="self-start md:self-auto">
          <div className="grid grid-cols-1 gap-y-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="text-black dark:text-white">Select Supplier</label>
                <DdlMultiline
                  id="account"
                  name="account"
                  onSelect={supplierAccountHandler}
                  value={
                    state.account
                      ? { value: state.account, label: state.accountName }
                      : null
                  }
                  acType={"3"}
                />
              </div>

              <InputElement
                id="notes"
                name="notes"
                value={state.notes}
                placeholder={"Notes"}
                label={"Notes"}
                className={"py-1"}
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, "bill_no")}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <InputElement
                id="bill_no"
                value={state.bill_no}
                name="bill_no"
                placeholder={"Bill Number"}
                label={"Bill Number"}
                className={"py-1 -mt-1"}
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, "bill_date")}
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
                  onKeyDown={(e) => handleInputKeyDown(e, "paymentAmt")}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <InputElement
                id="paymentAmt"
                value={state.paymentAmt}
                name="paymentAmt"
                type="number"
                disabled={Number(state.account) === 17}
                placeholder={"Payment Amount"}
                label={"Payment Amount"}
                className={"py-1 text-right"}
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, "discountAmt")}
              />

              <InputElement
                id="discountAmt"
                name="discountAmt"
                type="number"
                value={state.discountAmt?.toString() ?? "0"}
                placeholder={"Discount Amount"}
                label={"Discount Amount"}
                className={"py-1 text-right"}
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, "product")}
              />

              <div className="grid grid-cols-1 md:gap-x-1 -mb-1 ">
                <p className="text-sm font-bold dark:text-white">Total Tk.</p>
                <span className="text-sm font-bold dark:text-white">
                  {thousandSeparator(totalAmountForUI, 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-1 gap-y-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {hasPermission(settings?.data?.permissions, "purchase.edit") && (
                <div className="relative mt-6">
                  <div className="w-full ">
                    <DropdownCommon
                      id={"voucher_type"}
                      name={"voucher_type"}
                      label={"Select Invoice Type"}
                      className="h-9"
                      onChange={(e: any) => setVoucherType(e.target.value)}
                      data={voucherTypes}
                    />
                  </div>
                </div>
              )}

              {hasPermission(settings?.data?.permissions, "purchase.edit") && (
                <div className="relative mt-6">
                  <label className="text-black dark:text-white">Search Invoice</label>
                  <div className="w-full ">
                    <InputOnly
                      id="search"
                      value={search}
                      name="search"
                      placeholder={"Search Labour Invoice"}
                      label={""}
                      className={"py-1 w-full"}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => handleInputKeyDown(e, "btnSearch")}
                    />
                  </div>

                  <ButtonLoading
                    id="btnSearch"
                    name="btnSearch"
                    onClick={searchInvoice}
                    buttonLoading={false}
                    label=""
                    className="whitespace-nowrap !bg-transparent text-center mr-0 py-2 absolute -right-1 top-6"
                    icon={<FiSearch className="dark:text-white text-black-2 text-lg ml-2  mr-2" />}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-12 gap-x-2">
              <div className="col-span-12 md:col-span-6">
                <label className="text-black dark:text-white">Select Labour Item</label>
                <LabourDropdown
                  id="product"
                  name="product"
                  onSelect={productSelectHandler}
                  defaultValue={
                    productData.product_name && productData.product
                      ? { label: productData.product_name, value: productData.product }
                      : null
                  }
                  value={
                    productData.product_name && productData.product
                      ? { label: productData.product_name, value: productData.product }
                      : null
                  }
                  className="w-full py-1"
                />
              </div>

              <div className="col-span-12 md:col-span-3 block relative">
                <InputElement
                  id="qty"
                  value={productData.qty || ""}
                  name="qty"
                  placeholder={"Quantity"}
                  label={"Quantity"}
                  className={"py-1"}
                  type="number"
                  onChange={handleProductChange}
                  onKeyDown={(e) => handleInputKeyDown(e, "price")}
                />
                <span className="absolute top-8 right-3 z-50">{unit}</span>
              </div>

              <div className="col-span-12 md:col-span-3">
                <InputElement
                  id="price"
                  value={productData.price || ""}
                  name="price"
                  placeholder={"Price"}
                  label={"Price"}
                  className={"py-1"}
                  type="number"
                  onChange={handleProductChange}
                  onKeyDown={(e) => handleInputKeyDown(e, "addProduct")}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-x-1 gap-y-1">
              {isUpdating ? (
                <ButtonLoading
                  onClick={editProductSave}
                  buttonLoading={false}
                  label="Update"
                  className="whitespace-nowrap text-center mr-0 py-1.5"
                  icon={<FiEdit2 className="text-white text-lg ml-2  mr-2" />}
                />
              ) : (
                <ButtonLoading
                  id="addProduct"
                  onClick={addProduct}
                  buttonLoading={false}
                  label="Add New"
                  className="whitespace-nowrap text-center mr-0 py-1.5"
                  icon={<FiPlus className="text-white text-lg ml-2  mr-2" />}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addProduct();
                      setTimeout(() => {
                        const product = document.getElementById("product");
                        product?.focus();
                      }, 100);
                    }
                  }}
                />
              )}

              {isUpdateButton ? (
                <ButtonLoading
                  onClick={handleInvoiceUpdate}
                  buttonLoading={false}
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
                />
              )}

              <ButtonLoading
                onClick={resetForm}
                buttonLoading={false}
                label="Reset"
                className="whitespace-nowrap text-center mr-0"
                icon={<FiRefreshCcw className="text-white text-lg ml-2  mr-2" />}
              />

              <Link to="/dashboard" className="text-nowrap justify-center mr-0">
                <FiHome className="text-white text-lg ml-2  mr-2" />
                <span className="hidden md:block">Home</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Products table */}
      <div className="mt-6 col-span-2 overflow-x-auto ">
        {labourInvoice.isLoading ? <Loader /> : null}
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-300 dark:bg-gray-700 dark:text-gray-200">
            <tr className="bg-black-700">
              <th className="px-2 py-2 text-center">Sl. No.</th>
              <th className="px-2 py-2">Item Name</th>
              <th className="px-2 py-2 text-right">Quantity</th>
              <th className="px-2 py-2 text-right">Rate</th>
              <th className="px-2 py-2 text-right">Total</th>
              <th className="px-2 py-2 text-center w-20">Action</th>
            </tr>
          </thead>
          <tbody>
            {state.products.length > 0 &&
              state.products.map((row, index) => (
                <tr key={row.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                  <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-center">
                    {index + 1}
                  </td>
                  <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                    {row.product_name}
                  </td>
                  <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-right">
                    {thousandSeparator(Number(row.qty), 2)} {row.unit}
                  </td>
                  <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-right">
                    {thousandSeparator(Number(row.price), 2)}
                  </td>
                  <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-right">
                    {thousandSeparator(Number(row.price) * Number(row.qty), 2)}
                  </td>
                  <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-center w-20">
                    <button onClick={() => removeProduct(row.id)} className="text-red-500 ml-2">
                      <FiTrash2 />
                    </button>
                    <button onClick={() => editProductItem(row.id)} className="text-green-500 ml-2">
                      <FiEdit2 />
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
