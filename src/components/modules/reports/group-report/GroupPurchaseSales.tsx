import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { FaHouse, FaArrowLeft, FaArrowsTurnToDots } from 'react-icons/fa6';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Loader from '../../../../common/Loader';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import { TRANSACTION_VOUCHER_TYPES } from '../../../constant/constant/variables';
import InputDatePicker from '../../../utils/fields/DatePicker';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import Link from '../../../utils/others/Link';
import { changeVoucherDate } from './groupPurchaseSalesSlice';
import { getCategoryDdl } from '../../category/categorySlice';

const GroupPurchaseSales = (user: any) => {
  const dispatch = useDispatch();
  const { me } = useSelector((state: any) => state.auth);
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const category = useSelector((state) => state.category);
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    dispatch(getCategoryDdl({ search }));
  }, []);

  useEffect(() => {
    // dispatch(getVoucherTypes());
    dispatch(getDdlProtectedBranch());
  }, [dispatch]);

  useEffect(() => {
    setDropdownData(branchDdlData?.protectedData?.data || []);
  }, [branchDdlData]);

  const validationSchema = Yup.object().shape({
    branch_id: Yup.string().required('Branch is required'),
    voucher_type: Yup.string().required('Voucher type is required'),
    present_date: Yup.date().required('Current date is required'),
    change_date: Yup.date().required('Change date is required'),
    start_voucher: Yup.string().required('Start voucher number is required'),
    end_voucher: Yup.string().required('End voucher number is required'),
  });

  const initialValues = {
    branch_id: me?.branch_id?.toString() || '',
    voucher_type: '',
    present_date: '',
    change_date: '',
    start_voucher: '',
    end_voucher: '',
  };

  const handleOnChange = (e: any) => {
    // const { value, type, name } = e.target;
    // if (name === 'warranty_type') {
    //   setFormData({
    //     ...formData,
    //     warranty_type: value,
    //     warranty_days: '', // নতুন type হলে দিন আবার দিতে হবে
    //   });
    //   return;
    // }
    // switch (type) {
    //   case 'checkbox':
    //     setFormData({
    //       ...formData,
    //       [name]: e.target.checked,
    //     });
    //     break;
    //   default:
    //     setFormData({
    //       ...formData,
    //       [name]: value,
    //     });
    // }
  };
  const handleSubmit = async (values: any, { setSubmitting }: any) => {
    const payload = {
      ...values,
      branch_id: Number(values.branch_id),
    };
    await dispatch(
      changeVoucherDate(payload, (msg: string) => {
        toast.success(msg);
      }),
    );
    setSubmitting(false);
  };

  const handleStartDate = (date: Date | null) => {
    if (date) {
      // setFieldValue('present_date', date);
    }
  };

  return (
    <>
      <HelmetTitle title="Category wise purchase & sales" />
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting, setFieldValue, values, errors, touched }) => (
          <Form>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full md:w-2/3 lg:w-1/2 mx-auto mt-1">
              <div>
                <label className='text-gray-900 dark:text-white text-sm'>Select Branch</label>
                {branchDdlData.isLoading && <Loader />}
                <BranchDropdown
                  defaultValue={values.branch_id}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setFieldValue('branch_id', e.target.value)
                  }
                  className="w-60 font-medium text-sm p-1.5"
                  branchDdl={dropdownData}
                />
                {touched.branch_id && typeof errors.branch_id === 'string' && (
                  <div className="text-red-500 text-sm">{errors.branch_id}</div>
                )}
              </div>

              <div>
                <DropdownCommon
                  id="voucher_type"
                  name="voucher_type"
                  label="Select Transaction Type"
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setFieldValue('voucher_type', e.target.value)
                  }
                  defaultValue={values.voucher_type}
                  className="w-60 font-medium text-sm p-1.5"
                  data={TRANSACTION_VOUCHER_TYPES}
                />
                {touched.voucher_type && errors.voucher_type && (
                  <div className="text-red-500 text-sm">
                    {errors.voucher_type}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 w-full md:w-2/3 lg:w-1/2 mx-auto mt-2">
              {category.isLoading == true ? <Loader /> : ''}
              <DropdownCommon
                id="category_id"
                name={'category_id'}
                label="Select Category"
                onChange={handleOnChange}
                className="h-[2.20rem]"
                data={category?.data?.category}
                // defaultValue={formData?.category_id?.toString() ?? ''}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full md:w-2/3 lg:w-1/2 mx-auto mt-2">
              <div className="w-full">
                {/* <label htmlFor="present_date">Enter Start Date</label> */}
                <InputDatePicker
                  setCurrentDate={handleStartDate}
                  label="Enter Start Date"
                  className="font-medium w-full h-8 text-sm"
                  selectedDate={
                    values.present_date ? new Date(values.present_date) : null
                  }
                  setSelectedDate={(val: any) =>
                    setFieldValue('present_date', val)
                  }
                />

                {touched.present_date && errors.present_date && (
                  <div className="text-red-500 text-sm">
                    {errors.present_date}
                  </div>
                )}
              </div>
              <div className="w-full">
                {/* <label htmlFor="change_date">Enter End Date</label> */}
                <InputDatePicker
                  setCurrentDate={handleStartDate}
                  label="Enter End Date"
                  className="font-medium text-sm w-full h-8"
                  selectedDate={
                    values.change_date ? new Date(values.change_date) : null
                  }
                  setSelectedDate={(val: any) =>
                    setFieldValue('change_date', val)
                  }
                />
                {touched.change_date && errors.change_date && (
                  <div className="text-red-500 text-sm">
                    {errors.change_date}
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-2 w-full md:w-2/3 lg:w-1/2 mx-auto mt-2">
              <div className="grid grid-cols-1 gap-1 md:grid-cols-3">
                <ButtonLoading
                  type="submit"
                  buttonLoading={isSubmitting}
                  label="Change"
                  className="whitespace-nowrap text-center mr-0 h-8"
                  icon={
                    <FaArrowsTurnToDots className="text-white text-lg ml-2 mr-2" />
                  }
                />
                <Link
                  to="/admin/dayclose"
                  className="text-nowrap justify-center mr-0 h-8"
                >
                  <FaArrowLeft className="text-white text-lg ml-2 mr-2" />
                  <span className="hidden md:block">Back</span>
                </Link>
                <Link
                  to="/dashboard"
                  className="text-nowrap justify-center mr-0 h-8"
                >
                  <FaHouse className="text-white text-lg ml-2 mr-2" />
                  <span className="hidden md:block">Home</span>
                </Link>
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </>
  );
};

export default GroupPurchaseSales;
