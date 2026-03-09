import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { toast } from 'react-toastify';
import ROUTES from '../../components/services/appRoutes';
import {
  API_CSRF_COOKIES,
  API_REGISTER_REQUEST_OTP_URL,
} from '../../components/services/apiRoutes';
import httpService from '../../components/services/httpService';

type RegistrationForm = {
  company_name: string;
  address: string;
  mobile: string;
  user_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  // branch_name: string;
  contact_person: string;
  // notes: string;
};

const initialForm: RegistrationForm = {
  company_name: '',
  address: '',
  mobile: '',
  user_name: '',
  email: '',
  password: '',
  password_confirmation: '',
  // branch_name: '',
  contact_person: '',
  // notes: '',
};

const REGISTRATION_PAYLOAD_KEY = 'public_register_payload';

const PublicRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<RegistrationForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getErrorMessage = (error: any): string => {
    const responseData = error?.response?.data;
    const errorMessage = responseData?.message;
    const nestedErrorMessage = responseData?.error?.message;
    const validationErrors = responseData?.errors;

    if (typeof errorMessage === 'string' && errorMessage.trim()) {
      return errorMessage;
    }

    if (typeof nestedErrorMessage === 'string' && nestedErrorMessage.trim()) {
      return nestedErrorMessage;
    }

    if (validationErrors && typeof validationErrors === 'object') {
      const allErrors = Object.values(validationErrors)
        .flatMap((value) => (Array.isArray(value) ? value : []))
        .filter((value) => typeof value === 'string' && value.trim());

      if (allErrors.length > 0) return allErrors.join(' | ');
    }

    return 'Registration request failed. Please try again.';
  };

  const findSessionInObject = (value: any): string => {
    if (!value || typeof value !== 'object') return '';

    const directCandidates = [
      value.otp_session,
      value.otp_session_id,
      value.otpSession,
      value.otpSessionId,
      value.session_id,
      value.sessionId,
      value.session,
      value.otp_token,
      value.otpToken,
      value.verify_token,
      value.verifyToken,
    ];

    for (const candidate of directCandidates) {
      if (typeof candidate === 'string' && candidate.trim()) return candidate;
    }

    for (const nestedValue of Object.values(value)) {
      const found = findSessionInObject(nestedValue);
      if (found) return found;
    }

    return '';
  };

  const getOtpSession = (response: any): string => {
    const fromBody = findSessionInObject(response?.data);
    const fromHeaders =
      response?.headers?.['x-otp-session'] ||
      response?.headers?.['x-session-id'] ||
      response?.headers?.['x-verify-session'] ||
      '';

    return fromBody || fromHeaders || '';
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const requiredFields: (keyof RegistrationForm)[] = [
      'company_name',
      'address',
      'mobile',
      'user_name',
      'email',
      'password',
      'password_confirmation',
      // 'branch_name',
      'contact_person',
    ];

    const hasEmptyRequiredField = requiredFields.some(
      (field) => !String(formData[field]).trim(),
    );

    if (hasEmptyRequiredField) {
      toast.error('Please fill all required fields.');
      return;
    }

    if (formData.password !== formData.password_confirmation) {
      toast.error('Password and confirmation do not match.');
      return;
    }

    try {
      setSubmitting(true);

      await httpService.get(API_CSRF_COOKIES);
      const response = await httpService.post(
        API_REGISTER_REQUEST_OTP_URL,
        formData
        // ,
        // {
        //   xsrfHeaderName: 'X-XSRF-TOKEN',
        //   withCredentials: true,
        // },
      );

      const successMessage =
        response?.data?.message ||
        `OTP request sent successfully to ${formData.mobile}.`;
      const otpSession = getOtpSession(response);

      toast.success(successMessage);
      if (otpSession) sessionStorage.setItem('public_register_otp_session', otpSession);
      sessionStorage.setItem('public_register_mobile', formData.mobile);
      sessionStorage.setItem(REGISTRATION_PAYLOAD_KEY, JSON.stringify(formData));
      navigate(ROUTES.public_register_otp, {
        state: {
          mobile: formData.mobile,
          otp_session: otpSession,
          registrationPayload: formData,
        },
      });
    } catch (error: any) {
      toast.info(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 overflow-y-auto bg-white dark:bg-boxdark">
      <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-8">
        <div className="w-full max-w-3xl rounded-xl border border-stroke bg-white p-6 shadow-sm dark:border-strokedark dark:bg-boxdark sm:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-black dark:text-white">
              Public Registration
            </h2>
            <p className="mt-1 text-sm text-black/60 dark:text-white/60">
              Create your account and request OTP for verification.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                  Company Name *
                </label>
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  placeholder="Sinthia Electronics"
                  className="w-full border border-stroke bg-transparent px-4 py-2.5 text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
                />
              </div>

              {/* <div>
                <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                  Branch Name *
                </label>
                <input
                  type="text"
                  name="branch_name"
                  value={formData.branch_name}
                  onChange={handleChange}
                  placeholder="Belkuchi Branch"
                  className="w-full border border-stroke bg-transparent px-4 py-2.5 text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
                />
              </div> */}

              <div>
                <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                  User Name *
                </label>
                <input
                  type="text"
                  name="user_name"
                  value={formData.user_name}
                  onChange={handleChange}
                  placeholder="Lutfor"
                  className="w-full border border-stroke bg-transparent px-4 py-2.5 text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                  Contact Person *
                </label>
                <input
                  type="text"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleChange}
                  placeholder="Md Lutfor"
                  className="w-full border border-stroke bg-transparent px-4 py-2.5 text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                  Mobile *
                </label>
                <input
                  type="text"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="01811282149"
                  className="w-full border border-stroke bg-transparent px-4 py-2.5 text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="sinthia@example.com"
                  className="w-full border border-stroke bg-transparent px-4 py-2.5 text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
                />
              </div>

              <div className="">
                <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                  Address *
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Sherpur, Bogura"
                  className="w-full border border-stroke bg-transparent px-4 py-2.5 text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter password"
                    className="w-full border border-stroke bg-transparent px-4 py-2.5 pr-12 text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-primary"
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="password_confirmation"
                    value={formData.password_confirmation}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    className="w-full border border-stroke bg-transparent px-4 py-2.5 pr-12 text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-primary"
                  >
                    {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              {/* <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                  Notes
                </label>
                <textarea
                  rows={3}
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="New registration via mobile app"
                  className="w-full border border-stroke bg-transparent px-4 py-2.5 text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
                />
              </div> */}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full bg-primary px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Requesting OTP...' : 'Request OTP'}
            </button>

            <p className="mt-4 text-center text-sm text-black/70 dark:text-white/70">
              Already have an account?{' '}
              <Link className="text-primary hover:underline" to={ROUTES.login}>
                Sign In
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PublicRegistration;
