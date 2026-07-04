import React, { useEffect, useMemo, useRef, useState } from "react";
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
import {
  ClientType,
  nomineeRelationType,
  relationType,
  TrueFalse,
} from "../../utils/fields/DataConstant";
import DdlDynamicMultiline from "../../utils/utils-functions/DdlDynamicMultiline";
import InputDatePicker from "../../utils/fields/DatePicker";
import { getDdlArea } from "../area/areaSlice";
import { ButtonLoading } from "../../../pages/UiElements/CustomButtons";
import Link from "../../utils/others/Link";
import { toast } from "react-toastify";
import { getSettings } from "../settings/settingsSlice";
import {
  getCustomerForEdit,
  updateCustomerFromEdit,
  setCustomerPortalPassword,
} from "./customerSlice";
import Loader from "../../../common/Loader";

const EditCustomerSupplier = () => {
  const nomineeStatusOptions = [
    { id: 'active', name: 'Active' },
    { id: 'inactive', name: 'Inactive' },
  ];
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<any>();

  const area = useSelector((state: any) => state.area);
  const settings = useSelector((state: any) => state.settings);
  const customers = useSelector((state: any) => state.customers);
  const fetchedSettingsRef = useRef(false);
  const fetchedEditIdRef = useRef<number | null>(null);

  const editCustomer = customers?.editCustomer;
  const editLoading = customers?.editLoading;

  // Self-service portal password (set/reset separately from the profile update).
  const [portalPassword, setPortalPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSavePortalPassword = async () => {
    if (!portalPassword || portalPassword.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }
    try {
      setSavingPassword(true);
      const res = await dispatch(
        setCustomerPortalPassword({ id: Number(id), password: portalPassword })
      ).unwrap();
      toast.success(res?.message || "Portal password updated");
      setPortalPassword("");
    } catch (error: any) {
      toast.error(error || "Failed to set portal password");
    } finally {
      setSavingPassword(false);
    }
  };
  const areaList = Array.isArray(area?.area)
    ? area.area
    : Array.isArray(area?.area?.data)
      ? area.area.data
      : [];
  const hasSettings = Boolean(settings?.data && Object.keys(settings.data).length);

  const formatPickerDate = (date: Date | null) => {
    if (!date || Number.isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  const parsePickerDate = (value?: string) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  /* ================= LOAD NEEDED DATA ================= */
  useEffect(() => {
    if (!area?.loaded && !area?.loading) {
      dispatch(getDdlArea());
    }

    if (!hasSettings && !settings?.loading && !fetchedSettingsRef.current) {
      fetchedSettingsRef.current = true;
      dispatch(getSettings());
    }
  }, [area?.loaded, area?.loading, dispatch, hasSettings, settings?.loading]);

  useEffect(() => {
    const editId = Number(id);

    if (!id || Number.isNaN(editId) || fetchedEditIdRef.current === editId) {
      return;
    }

    fetchedEditIdRef.current = editId;
    dispatch(getCustomerForEdit(editId));
  }, [dispatch, id]);

  /* ================= AREA FORMAT ================= */
  const formattedAreaData = useMemo(
    () =>
      areaList.map((item: any) => ({
        value: item?.id?.toString() || "",
        label: item?.name || "",
        label_2: item?.thana_name || "",
        label_3: item?.district_name || "",
        label_4: item?.mobile || "",
        label_5: item?.manual_address || "",
      })) || [],
    [areaList]
  );

  /* ================= VALIDATION ================= */
  const validationSchema = Yup.object().shape({
    name: Yup.string().required("Name is required"),
    father: Yup.string(),
    mother_name: Yup.string(),
    contact_person: Yup.string(),
    contact_number: Yup.string(),
    manual_address: Yup.string().required("Address is required"),
    mobile: Yup.string().required("Mobile number is required"),
    ledger_page: Yup.string(),
    idfr_code: Yup.string(),
    party_type_id: Yup.string().required("Customer or Supplier type is required"),
    area_id: Yup.string(),
    customerLogin: Yup.mixed(),

    guarantors: Yup.array().of(
      Yup.object().shape({
        name: Yup.string().required("Guarantor name required"),
        father_name: Yup.string().required("Father name required"),
        mobile: Yup.string().required("Mobile required"),
        national_id: Yup.string(),
        address: Yup.string().required("Address required"),
      })
    ),
    nominees: Yup.array().of(
      Yup.object().shape({
        name: Yup.string().required('Nominee name required'),
        relation: Yup.string(),
        relation_name: Yup.string(),
        date_of_birth: Yup.string(),
        mobile: Yup.string(),
        present_address: Yup.string(),
        permanent_address: Yup.string(),
        national_id: Yup.string(),
        share_percentage: Yup.number()
          .transform((value, originalValue) => (originalValue === '' ? null : value))
          .nullable()
          .min(0, 'Share percentage cannot be negative')
          .max(100, 'Share percentage cannot be more than 100'),
        priority_order: Yup.number()
          .transform((value, originalValue) => (originalValue === '' ? null : value))
          .nullable()
          .min(1, 'Priority order must be at least 1'),
        guardian_name: Yup.string(),
        guardian_mobile: Yup.string(),
        status: Yup.string(),
        remarks: Yup.string(),
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
      mother_name: editCustomer?.mother_name ?? "",
      contact_person: editCustomer?.contact_person ?? "",
      contact_number: editCustomer?.contact_number ?? "",
      relation_id: editCustomer?.relation_id ?? "",
      manual_address: editCustomer?.manual_address ?? "",
      mobile: editCustomer?.mobile ?? "",
      ledger_page: editCustomer?.ledger_page ?? "",
      idfr_code: editCustomer?.idfr_code ?? "",
      national_id: editCustomer?.national_id ?? "",
      party_type_id: (editCustomer?.party_type_id ?? "").toString(),
      area_id: (editCustomer?.area_id ?? "").toString(),
      areaName: editCustomer?.areaName ?? "",
      customerLogin: Number(editCustomer?.customer_login ?? 0),

      // ----- guarantors & nominees -----
      guarantors: editCustomer?.guarantors ?? [],
      nominees: editCustomer?.nominees ?? [],
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
                label="Select Type"
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

          {/* ================= NAME + ADDRESS ================= */}
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

          {/* ================= RELATION + MOTHER ================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
            {settings?.data?.branch?.need_relation_info === '1' && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <>
                  <div className="md:col-span-1">
                    <DropdownCommon
                      id="relation_id"
                      name="relation_id"
                      label="Relation"
                      onChange={formik.handleChange}
                      value={formik.values.relation_id}
                      className="h-[2.1rem] bg-transparent"
                      data={relationType}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <InputElement
                      id="father"
                      name="father"
                      placeholder="Enter relation's name"
                      label="Relation's Name"
                      value={formik.values.father}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    {formik.touched.father && formik.errors.father && (
                      <div className="text-red-500 text-sm">{formik.errors.father as any}</div>
                    )}
                  </div>
                </>
              </div>
            )}
            {settings?.data?.branch?.need_mother_name === '1' && (
              <div className="text-left flex flex-col">
                <InputElement
                  id="mother_name"
                  name="mother_name"
                  placeholder="Enter Mother's Name"
                  label="Mother's Name"
                  value={formik.values.mother_name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                {formik.touched.mother_name && formik.errors.mother_name && (
                  <div className="text-red-500 text-sm">{formik.errors.mother_name as any}</div>
                )}
              </div>
            )}
          </div>

          {/* ================= CONTACT PERSON + NUMBER ================= */}
          {settings?.data?.branch?.need_contact_person === '1' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
              <div className="text-left flex flex-col">
                <InputElement
                  id="contact_person"
                  name="contact_person"
                  placeholder="Enter Contact Person"
                  label="Contact Person"
                  value={formik.values.contact_person}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                {formik.touched.contact_person && formik.errors.contact_person && (
                  <div className="text-red-500 text-sm">{formik.errors.contact_person as any}</div>
                )}
              </div>

              <div className="text-left flex flex-col">
                <InputElement
                  id="contact_number"
                  name="contact_number"
                  placeholder="Enter Contact Number"
                  label="Contact Number"
                  value={formik.values.contact_number}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                {formik.touched.contact_number && formik.errors.contact_number && (
                  <div className="text-red-500 text-sm">{formik.errors.contact_number as any}</div>
                )}
              </div>
            </div>
          )}

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
            <div
              className={`grid grid-cols-1 ${settings?.data?.branch?.have_customer_sl === 1 ? 'md:grid-cols-2' : 'md:grid-cols-1'
                } gap-2`}
            >
              <InputElement
                id="national_id"
                name="national_id"
                value={formik.values.national_id}
                placeholder="Enter National ID"
                label="National ID"
                onChange={formik.handleChange}
              />

              {settings?.data?.branch?.have_customer_sl === 1 && (
                <InputElement
                  id="idfr_code"
                  name="idfr_code"
                  value={formik.values.idfr_code}
                  placeholder="Enter Customer Number"
                  label="Customer Number"
                  onChange={formik.handleChange}
                />
              )}
            </div>

            <DropdownCommon
              id="customerLogin"
              name="customerLogin"
              label="Access Customer Login"
              selectOption="Access Customer Login"
              onChange={formik.handleChange}
              value={formik.values.customerLogin.toString()}
              className="h-[2.1rem] bg-transparent"
              data={TrueFalse}
            />
          </div>

          {/* ================= PORTAL PASSWORD (self-service login) ================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <InputElement
                  id="portalPassword"
                  name="portalPassword"
                  type="password"
                  value={portalPassword}
                  placeholder="Set / reset portal password"
                  label="Portal Password"
                  onChange={(e: any) => setPortalPassword(e.target.value)}
                />
              </div>
              <ButtonLoading
                type="button"
                onClick={handleSavePortalPassword}
                buttonLoading={savingPassword}
                label="Save Password"
                className="whitespace-nowrap text-center pt-2 pb-2 h-[2.4rem]"
                icon={<FiSave className="text-white text-lg ml-2 mr-2" />}
              />
            </div>
            <p className="text-xs text-gray-500 self-end pb-2">
              The customer logs in at <span className="font-medium">/customer/login</span> using their
              mobile number and this password. Leave blank and it stays unchanged.
            </p>
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

          {/* ================= NOMINEES ================= */}
          {settings?.data?.branch?.have_is_nominee === '1' && (
            <>
              <h3 className="mt-4 mb-2 font-semibold">Nominee Details</h3>

              <FieldArray name="nominees">
                {({ push, remove }) => (
                  <>
                    {formik.values.nominees.map((n: any, index: number) => (
                      <div key={index} className="border p-3 mb-2 ">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <InputElement
                            name={`nominees.${index}.name`}
                            label="Name"
                            placeholder="Enter Name"
                            value={n.name}
                            onChange={formik.handleChange}
                          />
                          <DropdownCommon
                            id={`nominees.${index}.relation`}
                            name={`nominees.${index}.relation`}
                            label="Relation"
                            onChange={formik.handleChange}
                            value={n.relation || ''}
                            className="h-[2.1rem] bg-transparent"
                            data={nomineeRelationType}
                          />
                          <InputElement
                            name={`nominees.${index}.relation_name`}
                            label="Relation's Name"
                            placeholder="Enter Relation's Name"
                            value={n.relation_name}
                            onChange={formik.handleChange}
                          />
                          <InputDatePicker
                            id={`nominees.${index}.date_of_birth`}
                            name={`nominees.${index}.date_of_birth`}
                            label="Date of Birth"
                            setCurrentDate={(date) =>
                              formik.setFieldValue(`nominees.${index}.date_of_birth`, formatPickerDate(date))
                            }
                            className="font-medium text-sm w-full h-8"
                            selectedDate={parsePickerDate(n.date_of_birth)}
                            setSelectedDate={(date) =>
                              formik.setFieldValue(`nominees.${index}.date_of_birth`, formatPickerDate(date))
                            }
                          />
                          <InputElement
                            name={`nominees.${index}.mother_name`}
                            label="Mother Name"
                            placeholder="Enter Mother Name"
                            value={n.mother_name}
                            onChange={formik.handleChange}
                          />
                          <InputElement
                            name={`nominees.${index}.mobile`}
                            label="Mobile"
                            placeholder="Enter Mobile Number"
                            value={n.mobile}
                            onChange={formik.handleChange}
                          />
                          <InputElement
                            name={`nominees.${index}.present_address`}
                            label="Present Address"
                            placeholder="Enter Present Address"
                            value={n.present_address}
                            onChange={formik.handleChange}
                          />
                          <InputElement
                            name={`nominees.${index}.permanent_address`}
                            label="Permanent Address"
                            placeholder="Enter Permanent Address"
                            value={n.permanent_address}
                            onChange={formik.handleChange}
                          />
                          <InputElement
                            name={`nominees.${index}.national_id`}
                            label="National ID"
                            placeholder="Enter National ID"
                            value={n.national_id}
                            onChange={formik.handleChange}
                          />
                          <InputElement
                            name={`nominees.${index}.share_percentage`}
                            label="Share Percentage"
                            type="number"
                            placeholder="Enter Share Percentage"
                            value={n.share_percentage}
                            onChange={formik.handleChange}
                          />
                          <InputElement
                            name={`nominees.${index}.priority_order`}
                            label="Priority Order"
                            type="number"
                            placeholder="Enter Priority Order"
                            value={n.priority_order}
                            onChange={formik.handleChange}
                          />

                          <InputElement
                            name={`nominees.${index}.guardian_name`}
                            label="Guardian Name"
                            placeholder="Enter Guardian Name"
                            value={n.guardian_name}
                            onChange={formik.handleChange}
                          />
                          <InputElement
                            name={`nominees.${index}.guardian_mobile`}
                            label="Guardian Mobile"
                            placeholder="Enter Guardian Mobile"
                            value={n.guardian_mobile}
                            onChange={formik.handleChange}
                          />
                          <DropdownCommon
                            id={`nominees.${index}.status`}
                            name={`nominees.${index}.status`}
                            label="Status"
                            onChange={formik.handleChange}
                            value={n.status || 'active'}
                            className="h-[2.1rem] bg-transparent"
                            data={nomineeStatusOptions}
                          />
                          <div className="md:col-span-3">
                            <InputElement
                              name={`nominees.${index}.remarks`}
                              label="Remarks"
                              placeholder="Enter Remarks"
                              value={n.remarks}
                              onChange={formik.handleChange}
                            />
                          </div>
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
                      label="Add Nominee"
                      className="flex items-center gap-2 text-blue-600 mb-4 p-2"
                      onClick={() =>
                        push({
                          name: '',
                          relation: '',
                          relation_name: '',
                          mother_name: '',
                          date_of_birth: '',
                          mobile: '',
                          present_address: '',
                          permanent_address: '',
                          national_id: '',
                          share_percentage: '',
                          priority_order: '',
                          guardian_name: '',
                          guardian_mobile: '',
                          status: 'active',
                          remarks: '',
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
