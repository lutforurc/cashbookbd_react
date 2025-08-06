import React, { useEffect, useState } from 'react';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { FiHome, FiSave } from 'react-icons/fi';
import { FaCheckDouble, FaHouse } from 'react-icons/fa6';
import Link from '../../utils/others/Link';
import { useDispatch, useSelector } from 'react-redux';

import { toast } from 'react-toastify';
import { addDayInDate } from '../../utils/utils-functions/addDayInDate';
import { getSettings } from '../settings/settingsSlice';
import { FaArrowLeft } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';
import InputDatePicker from '../../utils/fields/DatePicker';
import { formatDateBdToUsd } from '../../utils/utils-functions/formatDate';
import { storeVoucherApproval } from './voucherApprovalSlice';
import { setTime } from 'react-datepicker/dist/date_utils';

interface Props {
  transaction_date: string;
  day: number;
}

const VoucherApproval = () => {
  const settings = useSelector((s: any) => s.settings);
  const dayclose = useSelector((state: any) => state.dayclose);
  const voucherApprove = useSelector((state: any) => state.voucherApproval);
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState<string>('');
  const [nextDate, setNextDate] = useState<string>('');
  const dispatch = useDispatch();
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [saveButtonLoading, setSaveButtonLoading] = useState(false);
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    if (currentDate) {
      setStartDate(formatDateBdToUsd(currentDate));
      setEndDate(formatDateBdToUsd(currentDate));
    }
  }, [currentDate]);

  useEffect(() => {
    setFormData({
      start_date: startDate ? startDate.toISOString().split('T')[0] : '',
      end_date: endDate ? endDate.toISOString().split('T')[0] : '',
    });
  }, [startDate, endDate]);

  // Update localStorage when settings change
  useEffect(() => {
    if (settings?.data?.trx_dt) {
      setFormData({
        start_date: settings?.data?.trx_dt,
        end_date: addDayInDate(settings?.data?.trx_dt, 1),
      });
      setCurrentDate(settings.data.trx_dt);
      setNextDate(settings.data.trx_dt);
      setNextDate(addDayInDate(settings.data.trx_dt, 1));
    }
    dispatch(getSettings());
  }, [settings.data.trx_dt, dayclose?.data?.trx_date]);

  // Listen for changes in other tabs
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === 'settings_updated') {
        dispatch(getSettings());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [dispatch]);

  const handleSave = async () => {
    setSaveButtonLoading(true);
    await dispatch(
      storeVoucherApproval(formData, (message, success) => {
        if (success) {
            toast.success(message);
        } else {
            toast.info(message?.message);
        }
      }),
    );

    setTimeout(() => {
      setSaveButtonLoading(false);
    }, 1000);
  };
  const handleStartDate = (e: any) => {
    setStartDate(e);
  };
  const handleEndDate = (e: any) => {
    setEndDate(e);
  };

  const buttonLoading = true;
  return (
    <>
      <HelmetTitle title="Voucher Approval" />
      <div className="grid grid-cols-1 gap-2 w-full md:w-2/3 lg:w-1/2 justify-center mx-auto mt-5 ">
        <div className="w-full mb-1">
          <InputDatePicker
            id="start_date"
            name="start_date"
            label={'Enter Start Date for Approval'}
            setCurrentDate={handleStartDate}
            className="font-medium text-sm w-full h-8"
            selectedDate={startDate}
            setSelectedDate={setStartDate}
          />
        </div>

        {/* endDate, setEndDate */}
        <div className="w-full mb-1">
          <InputDatePicker
            id="end_date"
            name="end_date"
            label={'Enter End Date for Approval'}
            setCurrentDate={handleEndDate}
            className="font-medium text-sm w-full h-8"
            selectedDate={endDate}
            setSelectedDate={setEndDate}
          />
        </div>

        <div className={`grid grid-cols-1 gap-1 md:grid-cols-3`}>
          <ButtonLoading
            onClick={handleSave}
            buttonLoading={saveButtonLoading}
            label="Approved"
            className="whitespace-nowrap text-center mr-0 h-8"
            icon={<FaCheckDouble className="text-white text-lg ml-2  mr-2" />}
          />
          <Link
            to="/admin/dayclose"
            className="text-nowrap justify-center mr-0 h-8"
          >
            <FaArrowLeft className="text-white text-lg ml-2  mr-2" />
            <span className="hidden md:block">{'Back'}</span>
          </Link>
          <Link to="/dashboard" className="text-nowrap justify-center mr-0 h-8">
            <FaHouse className="text-white text-lg ml-2  mr-2" />
            <span className="hidden md:block">{'Home'}</span>
          </Link>
        </div>
      </div>
    </>
  );
};

export default VoucherApproval;
