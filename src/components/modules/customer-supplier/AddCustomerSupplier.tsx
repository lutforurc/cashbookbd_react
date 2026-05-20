import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FieldArray, useFormik, FormikProvider } from 'formik';
import * as Yup from 'yup';
import { FiHome, FiPlus, FiRefreshCcw, FiSave, FiTrash2 } from 'react-icons/fi';

import HelmetTitle from '../../utils/others/HelmetTitle';
import InputElement from '../../utils/fields/InputElement';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import { ClientType, nomineeRelationType, relationType, TrueFalse } from '../../utils/fields/DataConstant';
import DdlDynamicMultiline from '../../utils/utils-functions/DdlDynamicMultiline';
import { getDdlArea } from '../area/areaSlice';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import Link from '../../utils/others/Link';
import { storeCustomer } from './customerSlice';
import { toast } from 'react-toastify';
import InputDatePicker from '../../utils/fields/DatePicker';
import httpService from '../../services/httpService';
import { API_CUSTOMER_MOBILE_CHECK_URL } from '../../services/apiRoutes';

type DuplicateWarning = {
  mobile: string;
  items: any[];
  values: any;
  resetForm: (nextState?: any) => void;
} | null;

type MobileDuplicateState = {
  checking: boolean;
  exists: boolean;
  mobile: string;
  items: any[];
  error: string;
};

const AddCustomerSupplier = () => {
  const nomineeStatusOptions = [
    { id: 'active', name: 'Active' },
    { id: 'inactive', name: 'Inactive' },
  ];
  const area = useSelector((state: any) => state.area);
  const settings = useSelector((state: any) => state.settings);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [buttonLoading, setButtonLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateWarning>(null);
  const [mobileDuplicate, setMobileDuplicate] = useState<MobileDuplicateState>({
    checking: false,
    exists: false,
    mobile: '',
    items: [],
    error: '',
  });
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

  useEffect(() => {
    dispatch(getDdlArea());
  }, [dispatch]);

  const formattedAreaData = useMemo(
    () =>
      area?.area?.data?.map((item: any) => ({
        value: item?.id?.toString() || '',
        label: item?.name || '',
        label_2: item?.thana_name || '',
        label_3: item?.district_name || '',
        label_4: item?.mobile || '',
        label_5: item?.manual_address || '',
      })) || [],
    [area?.area?.data],
  );

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    father: Yup.string(),
    mother_name: Yup.string(),
    contact_person: Yup.string(),
    contact_number: Yup.string(),
    manual_address: Yup.string().required('Address is required'),
    mobile: Yup.string().required('Mobile number is required'),
    ledger_page: Yup.string(), // ✅ no `.required()`
    idfr_code: Yup.string(), // ✅ no `.required()` 
    type_id: Yup.string().required('Customer or Supplier type is required'),
    area_id: Yup.string(), //.required('Area is required'),
    customerLogin: Yup.boolean(),

    /* 🔥 GUARANTORS */
    guarantors: Yup.array().of(
      Yup.object().shape({
        name: Yup.string().required('Guarantor name required'),
        father_name: Yup.string().required('Father name required'),
        mobile: Yup.string().required('Mobile required'),
        national_id: Yup.string(),
        address: Yup.string().required('Address required'),
      }),
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
      }),
    ),
  });

  const initialCustomerValues = {
    name: '',
    father: '',
    mother_name: '',
    contact_person: '',
    contact_number: '',
    manual_address: '',
    mobile: '',
    ledger_page: '',
    idfr_code: '',
    national_id: '',
    type_id: '',
    area_id: '',
    areaName: '',
    customerLogin: false,
    guarantors: [],
    nominees: [],
  };

  const saveCustomer = async (values: any, resetForm: (nextState?: any) => void) => {
    setButtonLoading(true);
    try {
      const res = await dispatch(storeCustomer(values) as any).unwrap();
      toast.success(res?.message || 'Customer saved successfully!');

      setTimeout(() => {
        resetForm({
          values: {
            ...initialCustomerValues,
            type_id: values.type_id,
          },
        });
        setMobileDuplicate({
          checking: false,
          exists: false,
          mobile: '',
          items: [],
          error: '',
        });
      }, 2000);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save customer');
    } finally {
      setButtonLoading(false);
    }
  };

  const checkDuplicateMobile = async (mobile: string) => {
    const response = await httpService.post(API_CUSTOMER_MOBILE_CHECK_URL, { mobile });
    const payload = response?.data?.data ?? response?.data ?? {};

    return {
      exists: Boolean(payload?.exists),
      items: Array.isArray(payload?.items) ? payload.items : [],
    };
  };

  const formik = useFormik({
    initialValues: initialCustomerValues,
    validationSchema,
    onSubmit: async (values, { resetForm }) => {
      try {
        setButtonLoading(true);
        const duplicate = await checkDuplicateMobile(values.mobile);
        setButtonLoading(false);

        if (duplicate.exists) {
          setDuplicateWarning({
            mobile: values.mobile,
            items: duplicate.items,
            values,
            resetForm,
          });
          return;
        }

        await saveCustomer(values, resetForm);
      } catch (error: any) {
        setButtonLoading(false);
        toast.error(error?.response?.data?.message || error?.message || 'Failed to check mobile number');
      }
    },
  });

  const handleDuplicateContinue = async () => {
    if (!duplicateWarning) return;

    const pending = duplicateWarning;
    setDuplicateWarning(null);
    await saveCustomer(pending.values, pending.resetForm);
  };

  const handleDuplicateCancel = () => {
    setDuplicateWarning(null);
    formik.setFieldTouched('mobile', true, false);
    toast.info('Customer entry cancelled. Please change the mobile number if needed.');
  };

  const handleMobileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    formik.handleChange(event);
    setMobileDuplicate({
      checking: false,
      exists: false,
      mobile: '',
      items: [],
      error: '',
    });
  };

  const handleMobileBlur = async (event: React.FocusEvent<HTMLInputElement>) => {
    formik.handleBlur(event);

    const mobile = event.target.value.trim();
    if (!mobile) {
      setMobileDuplicate({
        checking: false,
        exists: false,
        mobile: '',
        items: [],
        error: '',
      });
      return;
    }

    setMobileDuplicate({
      checking: true,
      exists: false,
      mobile,
      items: [],
      error: '',
    });

    try {
      const duplicate = await checkDuplicateMobile(mobile);
      setMobileDuplicate({
        checking: false,
        exists: duplicate.exists,
        mobile,
        items: duplicate.items,
        error: '',
      });
    } catch (error: any) {
      setMobileDuplicate({
        checking: false,
        exists: false,
        mobile,
        items: [],
        error: error?.response?.data?.message || error?.message || 'Failed to check mobile number',
      });
    }
  };

  const handleReset = () => {
    formik.handleReset();
    setDuplicateWarning(null);
    setMobileDuplicate({
      checking: false,
      exists: false,
      mobile: '',
      items: [],
      error: '',
    });
  };

  const selectedArea = formattedAreaData.find(
    (opt: any) => opt.value === formik.values.area_id?.toString(),
  );

  const enterNavigationOrder = [
    'type_id',
    'name',
    'manual_address',
    'contact_person',
    'contact_number',
    'mobile',
    'ledger_page',
    'national_id',
    'customer_supplier_save_button',
  ];

  const focusNextField = (currentId: string) => {
    const currentIndex = enterNavigationOrder.indexOf(currentId);

    for (let i = currentIndex + 1; i < enterNavigationOrder.length; i += 1) {
      const nextElement = document.getElementById(enterNavigationOrder[i]);
      if (nextElement instanceof HTMLElement) {
        nextElement.focus();
        return;
      }
    }
  };

  const handleEnterNavigation =
    (currentId: string) =>
      (event: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (event.key !== 'Enter') return;

        event.preventDefault();
        focusNextField(currentId);
      };

  return (
    <div>
      <HelmetTitle title={'Add Customers'} />
      <div className="flex justify-between mb-1">
        <div />
        <Link to="/customer-supplier/list" className="pt-2 pb-2">
          Customer List
        </Link>
      </div>
      <FormikProvider value={formik}>
        <form onSubmit={formik.handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
            <div>
              <label className="dark:text-white text-sm text-gray-900">
                Select Area
              </label>
              <DdlDynamicMultiline
                onSelect={(option: any) => {
                  formik.setFieldValue('area_id', option?.value ?? '');
                  formik.setFieldValue('areaName', option?.label ?? '');
                }}
                value={selectedArea || null}
                defaultValue={selectedArea || null}
                data={formattedAreaData}
              />
              {formik.errors.area_id && formik.touched.area_id && (
                <div className="text-red-500 text-sm">
                  {formik.errors.area_id}
                </div>
              )}
            </div>

            <div className="text-left flex flex-col">
              <DropdownCommon
                id="type_id"
                name="type_id"
                label="Select Type"
                onChange={formik.handleChange}
                onKeyDown={handleEnterNavigation('type_id')}
                defaultValue={formik.values.type_id}
                className="h-[2.4rem] bg-transparent"
                data={ClientType}
              />
              {formik.errors.type_id && formik.touched.type_id && (
                <div className="text-red-500 text-sm">
                  {formik.errors.type_id}
                </div>
              )}
            </div>
          </div>

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
                onKeyDown={handleEnterNavigation('name')}
              />
              {formik.touched.name && formik.errors.name && (
                <div className="text-red-500 text-sm">{formik.errors.name}</div>
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
                onKeyDown={handleEnterNavigation('manual_address')}
              />
              {formik.touched.manual_address && formik.errors.manual_address && (
                <div className="text-red-500 text-sm">
                  {formik.errors.manual_address}
                </div>
              )}
            </div>
          </div>

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
                      defaultValue={formik.values.customerLogin.toString()}
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
                      <div className="text-red-500 text-sm">{formik.errors.father}</div>
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
                  <div className="text-red-500 text-sm">{formik.errors.mother_name}</div>
                )}
              </div>
            )}
          </div>

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
                  onKeyDown={handleEnterNavigation('contact_person')}
                />
                {formik.touched.contact_person && formik.errors.contact_person && (
                  <div className="text-red-500 text-sm">{formik.errors.contact_person}</div>
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
                  onKeyDown={handleEnterNavigation('contact_number')}
                />
                {formik.touched.contact_number && formik.errors.contact_number && (
                  <div className="text-red-500 text-sm">{formik.errors.contact_number}</div>
                )}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
            <div className="text-left flex flex-col">
              <InputElement
                id="mobile"
                name="mobile"
                placeholder="Enter Mobile Number"
                label="Mobile Number"
                value={formik.values.mobile}
                onChange={handleMobileChange}
                onBlur={handleMobileBlur}
                onKeyDown={handleEnterNavigation('mobile')}
              />
              {formik.touched.mobile && formik.errors.mobile && (
                <div className="text-red-500 text-sm">{formik.errors.mobile}</div>
              )}
              {mobileDuplicate.checking ? (
                <div className="text-amber-600 text-sm">Checking mobile number...</div>
              ) : null}
              {!mobileDuplicate.checking && mobileDuplicate.exists ? (
                <div className="mt-1 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-100">
                  <div className="font-semibold">This mobile number already exists.</div>
                  {mobileDuplicate.items.length > 0 ? (
                    <div className="mt-1 space-y-1">
                      {mobileDuplicate.items.slice(0, 3).map((item: any) => (
                        <div
                          key={item?.id ?? item?.coa4_id ?? `${item?.name}-${item?.manual_address}`}
                          className="text-xs"
                        >
                          {item?.name || '-'}, {item?.manual_address ? `${item.manual_address}` : ''}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {!mobileDuplicate.checking && mobileDuplicate.error ? (
                <div className="text-red-500 text-sm">{mobileDuplicate.error}</div>
              ) : null}
            </div>
            <InputElement
              id="ledger_page"
              name="ledger_page"
              value={formik.values.ledger_page}
              placeholder="Enter Ledger Page"
              label="Ledger Page"
              onChange={formik.handleChange}
              onKeyDown={handleEnterNavigation('ledger_page')}
            />
          </div>

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
                onKeyDown={handleEnterNavigation('national_id')}
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
              defaultValue={formik.values.customerLogin.toString()}
              className="h-[2.1rem] bg-transparent"
              data={TrueFalse}
            />
          </div>
          {/* ================= GUARANTORS ================= */}
          {settings?.data?.branch?.have_is_guaranter === '1' && (
            <>
              <h3 className="mt-4 mb-2 font-semibold">Guarantor Details</h3>

              <FieldArray name="guarantors">
                {({ push, remove }) => (
                  <>
                    {formik.values.guarantors.map((g: any, index: number) => (
                      <div key={index} className="border p-3 mb-2 ">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <InputElement name={`guarantors.${index}.name`} label="Name" placeholder='Enter Name' value={g.name} onChange={formik.handleChange} />
                          <InputElement name={`guarantors.${index}.father_name`} label="Father Name" placeholder='Enter Father Name' value={g.father_name} onChange={formik.handleChange} />
                          <InputElement name={`guarantors.${index}.mobile`} label="Mobile" placeholder='Enter Mobile Number' value={g.mobile} onChange={formik.handleChange} />
                          <InputElement name={`guarantors.${index}.national_id`} label="National ID" placeholder='Enter National ID' value={g.national_id} onChange={formik.handleChange} />
                          <InputElement name={`guarantors.${index}.address`} label="Address" placeholder='Enter Address' value={g.address} onChange={formik.handleChange} />
                        </div>

                        <button type="button" className="text-red-600 mt-2" onClick={() => remove(index)}>
                          <div className='flex'> <FiTrash2 /> <span className='ml-2 -mt-1'>Remove</span></div>
                        </button>
                      </div>
                    ))}

                    <ButtonLoading
                      type="button"
                      label="Add Guarantor"
                      className="flex items-center gap-2 text-blue-600 mb-4 p-2"
                      onClick={() =>
                        push({
                          name: '',
                          father_name: '',
                          mobile: '',
                          national_id: '',
                          address: '',
                        })
                      }

                      icon={<FiPlus className="text-white text-lg ml-2 mr-2" />}
                    />
                  </>
                )}
              </FieldArray>
            </>
          )}

          {settings?.data?.branch?.have_is_nominee === '1' && (
            <>
              <h3 className="mt-4 mb-2 font-semibold">Nominee Details</h3>
              <FieldArray name="nominees">
                {({ push, remove }) => (
                  <>
                    {formik.values.nominees.map((n: any, index: number) => (
                      <div key={index} className="border p-3 mb-2">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
            <ButtonLoading
              id="customer_supplier_save_button"
              onClick={formik.handleSubmit}
              buttonLoading={buttonLoading}
              label={buttonLoading ? 'Saving...' : 'Save'}
              className="whitespace-nowrap text-center pt-2 pb-2"
              icon={<FiSave className="text-white text-lg ml-2 mr-2" />}
              disabled={buttonLoading}
            />
            <ButtonLoading
              onClick={handleReset}
              buttonLoading={false}
              label="Reset"
              className="whitespace-nowrap text-center pt-2 pb-2"
              icon={<FiRefreshCcw className="text-white text-lg ml-2 mr-2" />}
            />
            <ButtonLoading
              onClick={() => navigate('/customer-supplier/list')}
              buttonLoading={false}
              label="Back"
              className="whitespace-nowrap text-center pt-2 pb-2"
              icon={<FiHome className="text-white text-lg ml-2 mr-2" />}
            />
          </div>
        </form>
      </FormikProvider>

      {duplicateWarning ? (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/50 px-3 py-6">
          <div className="w-full max-w-lg rounded-sm bg-white shadow-xl dark:bg-gray-800">
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-900/20">
              <h3 className="text-base font-semibold text-amber-800 dark:text-amber-100">
                Mobile Number Already Exists
              </h3>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-200">
                This mobile number already exists: {duplicateWarning.mobile}
              </p>
            </div>

            <div className="px-4 py-4">
              <p className="text-sm text-gray-700 dark:text-gray-200">
                You can continue and save another entry with this mobile number, or cancel and change it.
              </p>

              {duplicateWarning.items.length > 0 ? (
                <div className="mt-3 max-h-48 overflow-y-auto rounded-sm border border-gray-200 dark:border-gray-700">
                  {duplicateWarning.items.map((item: any) => (
                    <div
                      key={item?.id ?? item?.coa4_id ?? `${item?.name}-${item?.mobile}`}
                      className="border-b border-gray-100 px-3 py-2 text-sm last:border-b-0 dark:border-gray-700"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {item?.name || '-'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {item?.mobile || '-'}
                        {item?.manual_address ? ` | ${item.manual_address}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 border-t border-gray-200 px-4 py-3 sm:flex-row sm:justify-end dark:border-gray-700">
              <button
                type="button"
                onClick={handleDuplicateCancel}
                className="rounded-sm border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <ButtonLoading
                type="button"
                onClick={handleDuplicateContinue}
                buttonLoading={buttonLoading}
                label="Continue Save"
                className="whitespace-nowrap px-4 py-2"
                icon={<FiSave className="text-white text-lg ml-2 mr-2" />}
                disabled={buttonLoading}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AddCustomerSupplier;
