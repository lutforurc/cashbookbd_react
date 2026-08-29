import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff, FiSave } from 'react-icons/fi';
import { FaYoutube } from 'react-icons/fa';
import { toast } from 'react-toastify';
import ROUTES from '../../components/services/appRoutes';
import {
  API_CSRF_COOKIES,
  API_REGISTER_BUSINESS_TYPES_URL,
  API_REGISTER_REQUEST_OTP_URL,
} from '../../components/services/apiRoutes';
import httpService from '../../components/services/httpService';
import InputElement from '../../components/utils/fields/InputElement';
import { Button, ButtonLoading } from '../UiElements/CustomButtons';
import HelmetTitle from '../../components/utils/others/HelmetTitle';
import { FIELD_BASE, FIELD_SELECT, FIELD_TEXTAREA } from '../../theme/fieldStyles';
import { Input, Select, Textarea } from '../../components/utils/fields/FormControls';

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
  business_type_id: string;
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
  business_type_id: '',
  // notes: '',
};

const REGISTRATION_PAYLOAD_KEY = 'public_register_payload';

const PublicRegistration: React.FC = () => {
  const navigate = useNavigate();
  const { search } = useLocation();

  // Set by the marketing site's pricing cards, which link here as
  // /register?plan_id=N so the company is created on the plan that was picked
  // rather than on whichever plan sorts first.
  const selectedPlanId = React.useMemo(() => {
    const raw = Number(new URLSearchParams(search).get('plan_id'));
    return Number.isInteger(raw) && raw > 0 ? raw : null;
  }, [search]);

  // The trades on offer, read from the public list rather than hardcoded: the
  // ids are auto-increment and seeded per installation, so "Hotel / Motel" is 9
  // in one database and 11 in another. A list written into this file would send
  // whichever number it was compiled with.
  const [businessTypes, setBusinessTypes] = useState<{ id: number; name: string }[]>([]);

  React.useEffect(() => {
    let alive = true;

    httpService
      .get(API_REGISTER_BUSINESS_TYPES_URL)
      .then((response) => {
        if (!alive) return;
        setBusinessTypes(response?.data?.data?.business_types ?? []);
      })
      // Silent, and deliberately: the field is optional and the API falls back
      // to the default type on its own, so a list that will not load must not
      // stop somebody registering with a toast they can do nothing about.
      .catch(() => undefined);

    return () => {
      alive = false;
    };
  }, []);

  const [formData, setFormData] = useState<RegistrationForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
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
      // 'email',
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

      const payload: Record<string, any> = { ...formData };

      // Left out entirely rather than sent empty: the API takes the field as
      // nullable, and an empty string is not a number.
      if (!payload.business_type_id) delete payload.business_type_id;

      // The plan rides along only when the pricing card sent one. The API
      // re-checks that it is active before it provisions anything, and falls
      // back to the default plan when it is absent or unusable.
      if (selectedPlanId) payload.plan_id = selectedPlanId;

      const response = await httpService.post(API_REGISTER_REQUEST_OTP_URL, payload);

      const successMessage =
        response?.data?.message ||
        `OTP request sent successfully to ${formData.mobile}.`;
      const otpSession = getOtpSession(response);

      toast.success(successMessage);
      if (otpSession) sessionStorage.setItem('public_register_otp_session', otpSession);
      sessionStorage.setItem('public_register_mobile', formData.mobile);
      // What was SENT, not what was typed. The OTP screen posts this straight
      // back when somebody asks for the code again, so anything the form added
      // on the way out -- the plan, the business type -- has to be in it, or a
      // resend would quietly register on different terms from the first try.
      sessionStorage.setItem(REGISTRATION_PAYLOAD_KEY, JSON.stringify(payload));
      navigate(ROUTES.public_register_otp, {
        state: {
          mobile: formData.mobile,
          otp_session: otpSession,
          registrationPayload: payload,
        },
      });
    } catch (error: any) {
      toast.info(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[rgb(var(--c-surface))]">
      
      <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-8">
        <div className="w-full max-w-3xl rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-2">
              
              <HelmetTitle title="Registration your company" />
              <a
                href="https://www.youtube.com/watch?v=aedE-I79XHM&list=PLZcNDKJT-3gc&index=2&t=17s"
                target="_blank"
                rel="noreferrer"
                aria-label="Watch registration video"
                title="Watch registration video"
                className="inline-flex h-8 w-8 items-center justify-center   text-red-600 transition  dark:bg-red-950/30 dark:text-red-400"
              >
                <FaYoutube className="text-base" />
              </a>
            </div>
            {/* <p className="mt-1 text-sm text-[rgb(var(--c-text))]/60 dark:text-[rgb(var(--c-text))]/60">
              Create your account and request OTP for verification.
            </p> */}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                  Company Name *
                </label>
                <Input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  placeholder="ABC Traders Ltd"
                  className={`${FIELD_BASE} w-full px-4 py-2.5`}
                />
              </div>

              {/* <div>
                <label className="mb-2 block text-sm font-medium text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                  Branch Name *
                </label>
                <Input
                  type="text"
                  name="branch_name"
                  value={formData.branch_name}
                  onChange={handleChange}
                  placeholder="Belkuchi Branch"
                  className={`${FIELD_BASE} w-full px-4 py-2.5`}
                />
              </div> */}

              <div>
                <label className="mb-2 block text-sm font-medium text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                  User Name *
                </label>
                
                <Input
                  type="text"
                  name="user_name"
                  value={formData.user_name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className={`${FIELD_BASE} w-full px-4 py-2.5`}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                  Contact Person *
                </label>
                <Input
                  type="text"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className={`${FIELD_BASE} w-full px-4 py-2.5`}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                  Mobile *
                </label>
                <Input
                  type="text"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="017********"
                  className={`${FIELD_BASE} w-full px-4 py-2.5`}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                  Email *
                </label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="abc@example.com"
                  className={`${FIELD_BASE} w-full px-4 py-2.5`}
                />
              </div>

              <div className="">
                <label className="mb-2 block text-sm font-medium text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                  Address *
                </label>
                <Input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="H # 123, Road # 45, Gulshan, Dhaka."
                  className={`${FIELD_BASE} w-full px-4 py-2.5`}
                />
              </div>

              {/* The trade the company is in. It decides which dashboard opens
                  and which menus are drawn, so it is asked here rather than
                  defaulted and corrected later on the branch screen.
                  Optional: left blank, the API writes the same default it
                  always wrote. */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                  Business Type
                </label>
                {/* Horizontal padding only. FIELD_SELECT already carries the
                    one control height, and a select given vertical padding on
                    top of it pushes its own text past the bottom edge -- an
                    input centres its text inside the box, a select does not. */}
                <Select
                  name="business_type_id"
                  value={formData.business_type_id}
                  onChange={handleChange}
                  className={`${FIELD_SELECT} w-full px-4`}
                >
                  <option value="">Select Business Type</option>
                  {businessTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                  Password (Min 8 Characters) *
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter password"
                    className={`${FIELD_BASE} w-full px-4 py-2.5 pr-12`}
                  />
                  <Button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-primary"
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </Button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="password_confirmation"
                    value={formData.password_confirmation}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    className={`${FIELD_BASE} w-full px-4 py-2.5 pr-12`}
                  />
                  {/* className={`text-white bg-gray-700 hover:bg-blue-400 focus:outline-none font-medium text-sm px-5 text-center dark:hover:bg-blue-400 focus:bg-blue-400 inline-flex justify-center items-center ${className}`} */}
                  <Button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-primary"
                  >
                    {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                  </Button>
                </div>
              </div>

              {/* <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                  Notes
                </label>
                <Textarea
                  rows={3}
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="New registration via mobile app"
                  className={`${FIELD_TEXTAREA} w-full px-4 py-2.5`}
                />
              </div> */}
            </div>
              
             <ButtonLoading
             type="submit"
                            //  onClick={handleBranchUpdate}
                            //  buttonLoading={buttonLoading}
              label={submitting ? 'Requesting OTP...' : 'Request OTP'}
              disabled={submitting}
              className="whitespace-nowrap text-center mr-0 p-2 w-full mt-6 flex items-center justify-center"
              icon={<FiSave className="text-lg ml-2 mr-2" />}
            />

            {/* <Button
              type="submit"
              disabled={submitting}
              variant="primary"
              className="mt-6 w-full px-4 py-3 text-sm font-medium transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Requesting OTP...' : 'Request OTP'}
            </Button> */}

            <p className="mt-4 text-center text-sm text-[rgb(var(--c-text))]/70 dark:text-[rgb(var(--c-text))]/70">
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
