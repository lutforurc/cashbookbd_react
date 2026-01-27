import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { FiHome, FiRefreshCcw, FiSave } from 'react-icons/fi';

import HelmetTitle from '../../utils/others/HelmetTitle';
import InputElement from '../../utils/fields/InputElement';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import { ClientType, TrueFalse } from '../../utils/fields/DataConstant';
import DdlDynamicMultiline from '../../utils/utils-functions/DdlDynamicMultiline';
import { getDdlArea } from '../area/areaSlice';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import Link from '../../utils/others/Link';
import { storeCustomer } from './customerSlice';
import { toast } from 'react-toastify';
import { getSettings } from '../settings/settingsSlice';

const AddCustomerSupplier = () => {
  const area = useSelector((state: any) => state.area);
  const settings = useSelector((state: any) => state.settings);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getDdlArea());
      dispatch(getSettings());
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
    [area],
  );

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    manual_address: Yup.string().required('Address is required'),
    mobile: Yup.string().required('Mobile number is required'),
    ledger_page: Yup.string(), // ✅ no `.required()`
    idfr_code: Yup.string(), // ✅ no `.required()`
    national_id: Yup.string(), // ✅ no `.required()`
    type_id: Yup.string().required('Customer or Supplier type is required'),
    area_id: Yup.string(), //.required('Area is required'),
    customerLogin: Yup.boolean(),
  });

  const formik = useFormik({
    initialValues: {
      name: '',
      manual_address: '',
      mobile: '',
      ledger_page: '',
      idfr_code: '',
      national_id: '',
      type_id: '',
      area_id: '',
      areaName: '',
      customerLogin: false,
    },
    validationSchema,
    onSubmit: async (values, { resetForm }) => {
      try {
        const res = await dispatch(storeCustomer(values)).unwrap();
        toast.success(res?.message || 'Customer saved successfully!');

        setTimeout(() => {
          resetForm();
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



  console.log('====================================');
  console.log("settings", settings?.data?.branch?.have_is_guaranter);
  console.log('====================================');



  return (
    <div>
      <HelmetTitle title={'Add Customers'} />
      <div className="flex justify-between mb-1">
        <div />
        <Link to="/customer-supplier/list" className="pt-2 pb-2">
          Customer List
        </Link>
      </div>

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
        { settings?.data?.branch?.have_is_guaranter === "1" && (
        <div className="mb-2">
          <label className="dark:text-white text-sm text-gray-900 mb-1">
            Guaranter Details
          </label>
          </div>
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
            className="whitespace-nowrap text-center"
            icon={<FiRefreshCcw className="text-white text-lg ml-2 mr-2" />}
          />
          <ButtonLoading
            onClick={() => console.log('Back clicked')}
            buttonLoading={false}
            label="Back"
            className="whitespace-nowrap text-center"
            icon={<FiHome className="text-white text-lg ml-2 mr-2" />}
          />
        </div>
      </form>
    </div>
  );
};

export default AddCustomerSupplier;