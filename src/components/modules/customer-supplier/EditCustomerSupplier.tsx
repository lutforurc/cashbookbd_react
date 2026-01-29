import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FieldArray, useFormik, FormikProvider } from "formik";
import * as Yup from "yup";
import {
  FiHome,
  FiPlus,
  FiRefreshCcw,
  FiSave,
  FiTrash2,
} from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";

import HelmetTitle from "../../utils/others/HelmetTitle";
import InputElement from "../../utils/fields/InputElement";
import DropdownCommon from "../../utils/utils-functions/DropdownCommon";
import { ClientType, TrueFalse } from "../../utils/fields/DataConstant";
import DdlDynamicMultiline from "../../utils/utils-functions/DdlDynamicMultiline";
import { getDdlArea } from "../area/areaSlice";
import { ButtonLoading } from "../../../pages/UiElements/CustomButtons";
import Link from "../../utils/others/Link";
import { toast } from "react-toastify";
import { getSettings } from "../settings/settingsSlice";
import {
  getCustomerForEdit,
  updateCustomerFromEdit,
} from "./customerSlice";
import Loader from "../../../common/Loader";

const EditCustomerSupplier = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<any>();

  const area = useSelector((state: any) => state.area);
  const settings = useSelector((state: any) => state.settings);
  const customers = useSelector((state: any) => state.customers);

  const editCustomer = customers?.editCustomer;
  const editLoading = customers?.editLoading;

  /* ================= LOAD NEEDED DATA ================= */
  useEffect(() => {
    dispatch(getDdlArea());
    dispatch(getSettings());

    if (id) {
      dispatch(getCustomerForEdit(Number(id)));
    }
  }, [dispatch, id]);

 


  /* ================= AREA FORMAT ================= */
  const formattedAreaData = useMemo(
    () =>
      area?.area?.data?.map((item: any) => ({
        value: item?.id?.toString() || "",
        label: item?.name || "",
        label_2: item?.thana_name || "",
        label_3: item?.district_name || "",
        label_4: item?.mobile || "",
        label_5: item?.manual_address || "",
      })) || [],
    [area]
  );

  /* ================= VALIDATION ================= */
  const validationSchema = Yup.object().shape({
    name: Yup.string().required("Name is required"),
    father: Yup.string(),
    manual_address: Yup.string().required("Address is required"),
    mobile: Yup.string().required("Mobile number is required"),
    ledger_page: Yup.string(),
    idfr_code: Yup.string(), 
    party_type_id: Yup.string().required("Customer or Supplier type is required"),
    area_id: Yup.string(),
    customerLogin: Yup.boolean(),

    guarantors: Yup.array().of(
      Yup.object().shape({
        name: Yup.string().required("Guarantor name required"),
        father_name: Yup.string().required("Father name required"),
        mobile: Yup.string().required("Mobile required"),
        address: Yup.string().required("Address required"),
      })
    ),
  });

  /* ================= FORM ================= */
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      // ----- keep same fields as Add page -----
      name: editCustomer?.name ?? "",
      father: editCustomer?.father ?? "",
      manual_address: editCustomer?.manual_address ?? "",
      mobile: editCustomer?.mobile ?? "",
      ledger_page: editCustomer?.ledger_page ?? "",
      idfr_code: editCustomer?.idfr_code ?? "",
      national_id: editCustomer?.national_id ?? "",
      party_type_id: (editCustomer?.party_type_id ?? "").toString(),
      area_id: (editCustomer?.area_id ?? "").toString(),
      areaName: editCustomer?.areaName ?? "",
      customerLogin: Boolean(editCustomer?.customerLogin ?? false),

      // ----- guarantors -----
      guarantors: editCustomer?.guarantors ?? [],
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        const res = await dispatch(
          updateCustomerFromEdit({
            id: Number(id),
            data: values,
          })
        ).unwrap();

        toast.success(res?.message || "Customer updated successfully!");
        navigate("/customer-supplier/list");
      } catch (error: any) {
        toast.error(error?.message || "Failed to update customer");
      }
    },
  });

  /* ================= SELECTED AREA ================= */
  const selectedArea = formattedAreaData.find(
    (opt: any) => opt.value === formik.values.area_id?.toString()
  );

  if (editLoading) return <Loader />;

  return (
    <div>
      <HelmetTitle title={"Edit Customers"} />

      <div className="flex justify-between mb-1">
        <div />
        <Link to="/customer-supplier/list" className="pt-2 pb-2">
          Customer List
        </Link>
      </div>

      <FormikProvider value={formik}>
        <form onSubmit={formik.handleSubmit}>
          {/* ================= TOP AREA + TYPE ================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
            <div>
              <label className="dark:text-white text-sm text-gray-900">
                Select Area
              </label>
              <DdlDynamicMultiline
                onSelect={(option: any) => {
                  formik.setFieldValue("area_id", option?.value ?? "");
                  formik.setFieldValue("areaName", option?.label ?? "");
                }}
                value={selectedArea || null}
                defaultValue={selectedArea || null}
                data={formattedAreaData}
              />
              {formik.errors.area_id && formik.touched.area_id && (
                <div className="text-red-500 text-sm">
                  {formik.errors.area_id as any}
                </div>
              )}
            </div>

            <div className="text-left flex flex-col">
              <DropdownCommon
                id="party_type_id"
                name="party_type_id"
                label="Select Customer / Supplier Type"
                onChange={formik.handleChange}
                value={formik.values.party_type_id}
                className="h-[2.4rem] bg-transparent"
                data={ClientType}
              />
              {formik.errors.party_type_id && formik.touched.party_type_id && (
                <div className="text-red-500 text-sm">
                  {formik.errors.party_type_id as any}
                </div>
              )}
            </div>
          </div>

          {/* ================= NAME + FATHER ================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
            <div className="text-left flex flex-col">
              <InputElement
                id="name"
                name="name"
                placeholder="Enter Name"
                label="Name"
                value={formik.values.name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              {formik.touched.name && formik.errors.name && (
                <div className="text-red-500 text-sm">
                  {formik.errors.name as any}
                </div>
              )}
            </div>

            <InputElement
              id="father"
              name="father"
              placeholder="Enter father's Name"
              label="Father's Name"
              value={formik.values.father}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
          </div>

          {/* ================= ADDRESS ================= */}
          <div className="grid grid-cols-1 mb-2">
            <div className="text-left flex flex-col">
              <InputElement
                id="manual_address"
                name="manual_address"
                placeholder="Enter Address"
                label="Address"
                value={formik.values.manual_address}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              {formik.touched.manual_address && formik.errors.manual_address && (
                <div className="text-red-500 text-sm">
                  {formik.errors.manual_address as any}
                </div>
              )}
            </div>
          </div>

          {/* ================= MOBILE + LEDGER ================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
            <div className="text-left flex flex-col">
              <InputElement
                id="mobile"
                name="mobile"
                placeholder="Enter Mobile Number"
                label="Mobile Number"
                value={formik.values.mobile}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              {formik.touched.mobile && formik.errors.mobile && (
                <div className="text-red-500 text-sm">
                  {formik.errors.mobile as any}
                </div>
              )}
            </div>

            <InputElement
              id="ledger_page"
              name="ledger_page"
              value={formik.values.ledger_page}
              placeholder="Enter Ledger Page"
              label="Ledger Page"
              onChange={formik.handleChange}
            />
          </div>

          {/* ================= NID + CUSTOMER NO + LOGIN ================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <InputElement
                id="national_id"
                name="national_id"
                value={formik.values.national_id}
                placeholder="Enter National ID"
                label="National ID"
                onChange={formik.handleChange}
              />

              <InputElement
                id="idfr_code"
                name="idfr_code"
                value={formik.values.idfr_code}
                placeholder="Enter Customer Number"
                label="Customer Number"
                onChange={formik.handleChange}
              />
            </div>

            <DropdownCommon
              id="customerLogin"
              name="customerLogin"
              label="Access Customer Login"
              selectOption="Access Customer Login"
              onChange={formik.handleChange}
              defaultValue={formik.values.customerLogin.toString()}
              className="h-[2.1rem] bg-transparent"
              data={TrueFalse}
            />
          </div>

          {/* ================= GUARANTORS ================= */}
          {settings?.data?.branch?.have_is_guaranter === "1" && (
            <>
              <h3 className="mt-4 mb-2 font-semibold">
                Guarantor Details
              </h3>

              <FieldArray name="guarantors">
                {({ push, remove }) => (
                  <>
                    {formik.values.guarantors.map((g: any, index: number) => (
                      <div key={index} className="border p-3 mb-2 ">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <InputElement
                            name={`guarantors.${index}.name`}
                            label="Name"
                            placeholder="Enter Name"
                            value={g.name}
                            onChange={formik.handleChange}
                          />
                          <InputElement
                            name={`guarantors.${index}.father_name`}
                            label="Father Name"
                            placeholder="Enter Father Name"
                            value={g.father_name}
                            onChange={formik.handleChange}
                          />
                          <InputElement
                            name={`guarantors.${index}.mobile`}
                            label="Mobile"
                            placeholder="Enter Mobile Number"
                            value={g.mobile}
                            onChange={formik.handleChange}
                          />
                          <InputElement
                            name={`guarantors.${index}.national_id`}
                            label="National ID"
                            placeholder="Enter National ID"
                            value={g.national_id}
                            onChange={formik.handleChange}
                          />
                          <InputElement
                            name={`guarantors.${index}.address`}
                            label="Address"
                            placeholder="Enter Address"
                            value={g.address}
                            onChange={formik.handleChange}
                          />
                        </div>

                        <button
                          type="button"
                          className="text-red-600 mt-2"
                          onClick={() => remove(index)}
                        >
                          <div className="flex">
                            <FiTrash2 />
                            <span className="ml-2 -mt-1">Remove</span>
                          </div>
                        </button>
                      </div>
                    ))}

                    <ButtonLoading
                      type="button"
                      label="Add Guarantor"
                      className="flex items-center gap-2 text-blue-600 mb-4 p-2"
                      onClick={() =>
                        push({
                          name: "",
                          father_name: "",
                          mobile: "",
                          national_id: "",
                          address: "",
                        })
                      }
                      icon={<FiPlus className="text-white text-lg ml-2 mr-2" />}
                    />
                  </>
                )}
              </FieldArray>
            </>
          )}

          {/* ================= ACTIONS ================= */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
            <ButtonLoading
              type="submit"
              buttonLoading={editLoading}
              label="Update"
              className="whitespace-nowrap text-center pt-2 pb-2"
              icon={<FiSave className="text-white text-lg ml-2 mr-2" />}
            />

            <ButtonLoading
              type="button"
              onClick={formik.handleReset}
              buttonLoading={false}
              label="Reset"
              className="whitespace-nowrap text-center pt-2 pb-2"
              icon={<FiRefreshCcw className="text-white text-lg ml-2 mr-2" />}
            />
            <ButtonLoading
              type="button"
              onClick={() => navigate(-1)}
              buttonLoading={false}
              label="Back"
              className="whitespace-nowrap text-center pt-2 pb-2"
              icon={<FiHome className="text-white text-lg ml-2 mr-2" />}
            />
          </div>
        </form>
      </FormikProvider>
    </div>
  );
};

export default EditCustomerSupplier;
