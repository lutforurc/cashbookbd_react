import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';

import HelmetTitle from '../../utils/others/HelmetTitle';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import InputElement from '../../utils/fields/InputElement';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import Loader from '../../../common/Loader';
import { getDdlProtectedBranch } from '../branch/ddlBranchSlider';
import { changeVoucherDate } from './changeVoucherDateSlice';
import { parseVoucherNumber, validateVoucherRange } from './voucherNumber';
import InputDatePicker from '../../utils/fields/DatePicker';
import { FiArrowLeft, FiCheckSquare, FiHome } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

/** The picked date as a plain `YYYY-MM-DD`, in the browser's own timezone. */
const toYmd = (value: any): string => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const ChangeDate = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { me } = useSelector((state: any) => state.auth);
  const branchDdlData = useSelector((state: any) => state.branchDdl);

  const [dropdownData, setDropdownData] = useState<any[]>([]);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
  }, [dispatch]);

  useEffect(() => {
    setDropdownData(branchDdlData?.protectedData?.data || []);
  }, [branchDdlData]);

  const validationSchema = Yup.object().shape({
    branch_id: Yup.string().required('Branch is required'),
    present_date: Yup.date()
      .required('Current date is required')
      .typeError('Current date is required'),
    change_date: Yup.date()
      .required('Change date is required')
      .typeError('Change date is required'),
    start_voucher: Yup.string()
      .required('Start voucher number is required')
      .test(
        'start-format',
        'Start voucher number is not a valid voucher number.',
        (value) => parseVoucherNumber(value) !== null,
      ),
    end_voucher: Yup.string()
      .required('End voucher number is required')
      .test(
        'end-format',
        'End voucher number is not a valid voucher number.',
        (value) => parseVoucherNumber(value) !== null,
      )
      .test('end-range', 'Invalid voucher number range.', function (value) {
        // A malformed number is already reported by the format tests above.
        if (!parseVoucherNumber(this.parent.start_voucher) || !parseVoucherNumber(value)) {
          return true;
        }

        const message = validateVoucherRange(this.parent.start_voucher, value);
        return message ? this.createError({ message }) : true;
      }),
  });

  const initialValues = {
    branch_id: me?.branch_id?.toString() || '',
    present_date: '' as any,
    change_date: '' as any,
    start_voucher: '',
    end_voucher: '',
  };

  const handleSubmit = async (values: any, { setSubmitting }: any) => {
    const payload = {
      branch_id: Number(values.branch_id),
      present_date: toYmd(values.present_date),
      change_date: toYmd(values.change_date),
      start_voucher: values.start_voucher.trim(),
      end_voucher: values.end_voucher.trim(),
    };

    try {
      const message = await dispatch(changeVoucherDate(payload)).unwrap();
      toast.success(message);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to change voucher date');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartDate = (date: Date | null) => {
    if (date) {
      // Kept for the picker's required prop; the value lives in Formik state.
    }
  };

  return (
    <>
      <HelmetTitle title="Voucher Change Date" />
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting, setFieldValue, values, errors, touched }) => (
          <Form>
            {/* Select Branch sits on a row of its own, full width at every
                breakpoint — no field is ever placed beside it. */}
            <div className="grid grid-cols-1 gap-2 w-full 2xl:w-2/3 mx-auto mt-5">
              <div>
                <label>Select Branch</label>
                {branchDdlData.isLoading && <Loader />}
                <BranchDropdown
                  defaultValue={values.branch_id}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setFieldValue('branch_id', e.target.value)
                  }
                  className="w-full font-medium text-sm p-1.5"
                  branchDdl={dropdownData}
                />
                {touched.branch_id && typeof errors.branch_id === 'string' && (
                  <div className="text-red-500 text-sm">{errors.branch_id}</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full 2xl:w-2/3 mx-auto mt-5">
              <div className="w-full">
                <label htmlFor="present_date">Enter Current Date</label>
                <InputDatePicker
                  setCurrentDate={handleStartDate}
                  className="font-medium text-sm w-full "
                  selectedDate={values.present_date ? new Date(values.present_date) : null}
                  setSelectedDate={(val: any) => setFieldValue('present_date', val)}
                />
                {touched.present_date && typeof errors.present_date === 'string' && (
                  <div className="text-red-500 text-sm">{errors.present_date}</div>
                )}
              </div>

              <div className="w-full">
                <label htmlFor="change_date">Enter Change Date</label>
                <InputDatePicker
                  setCurrentDate={handleStartDate}
                  className="font-medium text-sm w-full "
                  selectedDate={values.change_date ? new Date(values.change_date) : null}
                  setSelectedDate={(val: any) => setFieldValue('change_date', val)}
                />
                {touched.change_date && typeof errors.change_date === 'string' && (
                  <div className="text-red-500 text-sm">{errors.change_date}</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full 2xl:w-2/3 mx-auto mt-5">
              <div className="flex flex-col">
                <InputElement
                  id="start_voucher"
                  name="start_voucher"
                  value={values.start_voucher}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFieldValue('start_voucher', e.target.value)
                  }
                  label="Start Voucher Number"
                  placeholder="e.g. 10-261000001"
                />
                {touched.start_voucher && typeof errors.start_voucher === 'string' && (
                  <div className="text-red-500 text-sm">{errors.start_voucher}</div>
                )}
              </div>

              <div className="flex flex-col">
                <InputElement
                  id="end_voucher"
                  name="end_voucher"
                  value={values.end_voucher}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFieldValue('end_voucher', e.target.value)
                  }
                  label="End Voucher Number"
                  placeholder="e.g. 10-261000010"
                />
                {touched.end_voucher && typeof errors.end_voucher === 'string' && (
                  <div className="text-red-500 text-sm">{errors.end_voucher}</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 w-full 2xl:w-2/3 mx-auto mt-5">
              <div className="grid grid-cols-1 gap-1 md:grid-cols-3">
                <ButtonLoading
                  type="submit"
                  buttonLoading={isSubmitting}
                  label="Change"
                  className="whitespace-nowrap text-center mr-0"
                  icon={<FiCheckSquare className="text-white text-lg ml-2 mr-2" />}
                />
                <ButtonLoading
                  onClick={() => navigate('/admin/dayclose')}
                  buttonLoading={false}
                  label="Back"
                  className="whitespace-nowrap text-center mr-0"
                  icon={<FiArrowLeft className="text-lg ml-2 mr-2" />}
                />
                <ButtonLoading
                  onClick={() => navigate('/dashboard')}
                  buttonLoading={false}
                  label="Home"
                  className="whitespace-nowrap text-center mr-0"
                  icon={<FiHome className="text-lg ml-2 mr-2" />}
                />
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </>
  );
};

export default ChangeDate;
