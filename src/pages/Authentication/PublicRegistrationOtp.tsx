import React, { useEffect, useMemo, useState } from 'react';
import OtpInput from '../../components/Forms/OtpInput';
import { FiSave, FiSend } from 'react-icons/fi';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { userCurrentBranch } from '../../components/modules/branch/branchSlice';
import { getSettings } from '../../components/modules/settings/settingsSlice';
import ROUTES from '../../components/services/appRoutes';
import {
  API_CSRF_COOKIES,
  API_REGISTER_REQUEST_OTP_URL,
  API_REGISTER_VERIFY_OTP_URL,
} from '../../components/services/apiRoutes';
import httpService from '../../components/services/httpService';
import { storeToken } from '../../features/authReducer';
import { ButtonLoading } from '../UiElements/CustomButtons';

type RegisterPayload = {
  company_name: string;
  address: string;
  mobile: string;
  user_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  branch_name: string;
  contact_person: string;
  notes?: string;
};

const REGISTRATION_PAYLOAD_KEY = 'public_register_payload';

const PublicRegistrationOtp: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [otpSession, setOtpSession] = useState('');

  const state = location.state as {
    mobile?: string;
    otp_session?: string;
    registrationPayload?: RegisterPayload;
  } | null;

  const mobile =
    state?.mobile ||
    state?.registrationPayload?.mobile ||
    sessionStorage.getItem('public_register_mobile') ||
    '';
  const registrationPayloadFromStorage = (() => {
    try {
      const raw = sessionStorage.getItem(REGISTRATION_PAYLOAD_KEY);
      return raw ? (JSON.parse(raw) as RegisterPayload) : null;
    } catch {
      return null;
    }
  })();
  const registrationPayload = state?.registrationPayload || registrationPayloadFromStorage || undefined;

  const maskedMobile = useMemo(() => {
    if (!mobile) return '';
    const last4 = mobile.slice(-4);
    return `${'*'.repeat(Math.max(0, mobile.length - 4))}${last4}`;
  }, [mobile]);

  useEffect(() => {
    if (!mobile) {
      navigate(ROUTES.public_register, { replace: true });
    }
  }, [mobile, navigate]);

  useEffect(() => {
    const sessionFromState = state?.otp_session || '';
    const sessionFromStorage =
      sessionStorage.getItem('public_register_otp_session') || '';
    const resolvedSession = sessionFromState || sessionFromStorage;
    setOtpSession(resolvedSession);
  }, [state?.otp_session]);

  // console.log('====================================');
  // console.log("sessionFromState", state?.otp_session);
  // console.log('====================================');

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

    return 'OTP verification failed. Please try again.';
  };

  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cleanOtp = otp.trim();

    if (!cleanOtp) {
      toast.error('Please enter OTP.');
      return;
    }

    if (!/^\d{4,8}$/.test(cleanOtp)) {
      toast.error('Please enter a valid OTP.');
      return;
    }

    if (!state?.otp_session) {
      toast.error('OTP session not found. Please request OTP again.');
      return;
    }

    try {
      setSubmitting(true);
      await httpService.get(API_CSRF_COOKIES);
      const response = await httpService.post(
        API_REGISTER_VERIFY_OTP_URL,
        { mobile, otp: cleanOtp, otp_session_id: otpSession },
        { xsrfHeaderName: 'X-XSRF-TOKEN', withCredentials: true },
      );

      const token = response?.data?.data?.token;
      const user = response?.data?.data?.user;

      if (token && user) {
        storeToken(token, true);
        dispatch({
          type: 'AUTH/login/success',
          payload: user,
        });
        dispatch(userCurrentBranch() as any);
        dispatch(getSettings() as any);
      }

      toast.success(response?.data?.message || 'Registration completed successfully.');
      sessionStorage.removeItem('public_register_otp_session');
      sessionStorage.removeItem('public_register_mobile');
      sessionStorage.removeItem(REGISTRATION_PAYLOAD_KEY);
      navigate(ROUTES.dashboard, { replace: true });
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
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

    try {
      setResending(true);
      await httpService.get(API_CSRF_COOKIES);
      let response: any;

      if (registrationPayload) {
        response = await httpService.post(API_REGISTER_REQUEST_OTP_URL, registrationPayload, {
          xsrfHeaderName: 'X-XSRF-TOKEN',
          withCredentials: true,
        });
      } else {
        toast.error('Registration তথ্য পাওয়া যায়নি। আবার registration form submit করুন।');
        navigate(ROUTES.public_register, { replace: true });
        return;
      }

      const newSession = getOtpSession(response);
      if (newSession) {
        setOtpSession(newSession);
        sessionStorage.setItem('public_register_otp_session', newSession);
        if (mobile) sessionStorage.setItem('public_register_mobile', mobile);
      }

      toast.success('A new OTP has been sent.');
    } catch (error: any) {
      toast.info(getErrorMessage(error));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 overflow-y-auto bg-white dark:bg-boxdark">
      <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-8">
        <div className="w-full max-w-md rounded-xl border border-stroke bg-white p-6 shadow-sm dark:border-strokedark dark:bg-boxdark sm:p-8">
          <h2 className="text-2xl font-bold text-black dark:text-white">Verify OTP</h2>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            OTP sent to {maskedMobile || mobile}. Enter it to complete registration.
          </p>

          <form className="mt-6" onSubmit={handleVerifyOtp}>
            <label className="mb-2 block text-sm font-medium text-black dark:text-white">
              OTP Code
            </label>
            <OtpInput
              value={otp}
              onChange={setOtp}
              numInputs={6}
              renderInput={(props) => (
                <input
                  {...props}
                  className="!h-10 !w-10 rounded border border-slate-300 bg-white text-center text-xl font-semibold text-slate-700 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 mx-0 shadow-sm sm:!h-12 sm:!w-12 dark:border-slate-600 dark:bg-form-input dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-900/30"
                />
              )}
            />

            
            <ButtonLoading
              type="submit"
              buttonLoading={submitting}
              label={submitting ? 'Verifying...' : 'Verify OTP'}
              disabled={submitting}
              className="whitespace-nowrap text-center mr-0 p-2 w-full mt-5 flex items-center justify-center bg-primary hover:bg-primary focus:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
              icon={<FiSend className="text-white text-lg ml-2 mr-2" />}
            />
          </form>

          <button
            type="button"
            onClick={handleResendOtp}
            disabled={resending}
            className="mt-4 w-full border border-stroke px-4 py-3 text-sm font-medium text-black transition hover:bg-gray-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-strokedark dark:text-white dark:hover:bg-form-input"
          >
            {resending ? 'Resending...' : 'Resend OTP'}
          </button>

          <p className="mt-4 text-center text-sm text-black/70 dark:text-white/70">
            Wrong information?{' '}
            <Link to={ROUTES.public_register} className="text-primary hover:underline">
              Back to registration
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicRegistrationOtp;
