import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FieldArray, useFormik, FormikProvider } from 'formik';
import * as Yup from 'yup';
import { FiHome, FiPlus, FiRefreshCcw, FiSave, FiTrash2 } from 'react-icons/fi';

import HelmetTitle from '../../utils/others/HelmetTitle';
import InputElement from '../../utils/fields/InputElement';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import { ClientType, relationType, TrueFalse } from '../../utils/fields/DataConstant';
import DdlDynamicMultiline from '../../utils/utils-functions/DdlDynamicMultiline';
import { getDdlArea } from '../area/areaSlice';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import Link from '../../utils/others/Link';
import { storeCustomer } from './customerSlice';
import { toast } from 'react-toastify';

const AddCustomerSupplier = () => {
  const area = useSelector((state: any) => state.area);
  const settings = useSelector((state: any) => state.settings);
  const dispatch = useDispatch();

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
  });

  const formik = useFormik({
    initialValues: {
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

      /* 🔥 GUARANTORS */
      guarantors: [],
    },
    validationSchema,
    onSubmit: async (values, { resetForm }) => {
      try {
        const res = await dispatch(storeCustomer(values)).unwrap();
        toast.success(res?.message || 'Customer saved successfully!');

        setTimeout(() => {
          resetForm({
            values: {
              ...formik.initialValues,
              type_id: values.type_id, // ✅ keep selection
            },
          });
          // window.location.href = '/customer-supplier/list';
        }, 2000);
      } catch (error: any) {
        toast.error(error?.message || 'Failed to save customer');
      }
    },

  });

  const selectedArea = formattedAreaData.find(
    (opt: any) => opt.value === formik.values.area_id?.toString(),
  );

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
                label="Select Customer / Supplier Type"
                onChange={formik.handleChange}
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
              />
              {formik.touched.manual_address && formik.errors.manual_address && (
                <div className="text-red-500 text-sm">
                  {formik.errors.manual_address}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
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
            </div>
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
          </div>

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
              />
              {formik.touched.contact_number && formik.errors.contact_number && (
                <div className="text-red-500 text-sm">{formik.errors.contact_number}</div>
              )}
            </div>
          </div>

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
                <div className="text-red-500 text-sm">{formik.errors.mobile}</div>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
            <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
            <ButtonLoading
              onClick={formik.handleSubmit}
              buttonLoading={false}
              label="Save"
              className="whitespace-nowrap text-center pt-2 pb-2"
              icon={<FiSave className="text-white text-lg ml-2 mr-2" />}
            />
            <ButtonLoading
              onClick={formik.handleReset}
              buttonLoading={false}
              label="Reset"
              className="whitespace-nowrap text-center pt-2 pb-2"
              icon={<FiRefreshCcw className="text-white text-lg ml-2 mr-2" />}
            />
            <ButtonLoading
              onClick={() => console.log('Back clicked')}
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

export default AddCustomerSupplier;
