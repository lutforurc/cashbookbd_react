import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiRefreshCcw, FiSend } from 'react-icons/fi';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Link from '../../utils/others/Link';
import InputElement from '../../utils/fields/InputElement';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { sendSms } from './smsSlice';

interface SmsFormData {
  mobile: string;
  message: string;
}

const initialFormData: SmsFormData = {
  mobile: '',
  message: '',
};

const SendSms = () => {
  const dispatch = useDispatch();
  const smsState = useSelector((state: any) => state.sms);
  const [formData, setFormData] = useState<SmsFormData>(initialFormData);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, message: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!formData.mobile.trim()) {
      toast.info('Mobile number is required');
      return;
    }

    if (!formData.message.trim()) {
      toast.info('Message is required');
      return;
    }

    const resultAction = await dispatch(sendSms(formData) as any);

    if (sendSms.fulfilled.match(resultAction)) {
      toast.success(resultAction.payload || 'SMS sent successfully');
      setFormData(initialFormData);
      return;
    }

    toast.info(resultAction.payload || 'Failed to send SMS');
  };

  return (
    <>
      <HelmetTitle title="Send SMS" />
      <div className="grid grid-cols-1 gap-3 w-full md:w-2/3 lg:w-1/2 mx-auto mt-5">
        <InputElement
          id="mobile"
          name="mobile"
          label="Mobile Number"
          value={formData.mobile}
          placeholder="Enter mobile number"
          onChange={handleInputChange}
        />

        <div className="text-left flex flex-col">
          <label htmlFor="message" className="text-black dark:text-white">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            rows={4}
            value={formData.message}
            placeholder="Write SMS message"
            onChange={handleMessageChange}
            className="form-input px-3 py-1 text-gray-600 outline-none border rounded-xs bg-white dark:bg-transparent dark:border-gray-600 dark:text-white dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <ButtonLoading
            onClick={handleSubmit}
            buttonLoading={smsState?.loading}
            label="Send SMS"
            className="whitespace-nowrap text-center mr-0 h-8"
            icon={<FiSend className="text-white text-lg ml-2 mr-2" />}
          />
          <ButtonLoading
            onClick={() => setFormData(initialFormData)}
            buttonLoading={false}
            label="Reset"
            className="whitespace-nowrap text-center mr-0 h-8"
            icon={<FiRefreshCcw className="text-white text-lg ml-2 mr-2" />}
          />
          <Link to="/dashboard" className="text-nowrap justify-center mr-0 h-8">
            <FiArrowLeft className="text-white text-lg ml-2 mr-2" />
            <span className="hidden md:block">Back</span>
          </Link>
        </div>
      </div>
    </>
  );
};

export default SendSms;
