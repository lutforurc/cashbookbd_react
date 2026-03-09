import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import ROUTES from '../../components/services/appRoutes';
import {
  API_CSRF_COOKIES,
  API_REGISTER_REQUEST_OTP_URL,
  API_REGISTER_VERIFY_OTP_URL,
} from '../../components/services/apiRoutes';
import httpService from '../../components/services/httpService';

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

  console.log('====================================');
  console.log("sessionFromState", state?.otp_session);
  console.log('====================================');

  const getErrorMessage = (error: any): string => {
    const responseData = error?.response?.data;
    const errorMessage = responseData?.message;
    const validationErrors = responseData?.errors;

    if (typeof errorMessage === 'string' && errorMessage.trim()) {
      return errorMessage;
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

      toast.success(response?.data?.message || 'Registration completed successfully.');
      sessionStorage.removeItem('public_register_otp_session');
      sessionStorage.removeItem('public_register_mobile');
      sessionStorage.removeItem(REGISTRATION_PAYLOAD_KEY);
      navigate(ROUTES.login, { replace: true });
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
      toast.error(getErrorMessage(error));
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
            <input
              type="text"
              inputMode="numeric"
              value={otp}
              maxLength={8}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter OTP"
              className="w-full border border-stroke bg-transparent px-4 py-2.5 text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
            />

            <button
              type="submit"
              disabled={submitting}
              className="mt-5 w-full bg-primary px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Verifying...' : 'Verify OTP'}
            </button>
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
