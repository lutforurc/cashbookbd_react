import React, { useEffect, useMemo, useState } from 'react';
import { FiArrowLeft, FiEye, FiEyeOff, FiRefreshCcw, FiSave, FiSend } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import OtpInput from '../../components/Forms/OtpInput';
import ROUTES from '../../components/services/appRoutes';
import {
  API_CSRF_COOKIES,
  API_FORGOT_PASSWORD_REQUEST_OTP_URL,
  API_FORGOT_PASSWORD_RESET_URL,
  API_FORGOT_PASSWORD_VERIFY_OTP_URL,
} from '../../components/services/apiRoutes';
import httpService from '../../components/services/httpService';
import { Button, ButtonLoading } from '../UiElements/CustomButtons';
import { FIELD_BASE } from '../../theme/fieldStyles';
import { Input } from '../../components/utils/fields/FormControls';

type Step = 'request' | 'verify' | 'reset';

const MOBILE_STORAGE_KEY = 'forgot_password_mobile';
const SESSION_STORAGE_KEY = 'forgot_password_otp_session';
const RESET_TOKEN_STORAGE_KEY = 'forgot_password_reset_token';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('request');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSession, setOtpSession] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);

  useEffect(() => {
    const storedMobile = sessionStorage.getItem(MOBILE_STORAGE_KEY) || '';
    const storedSession = sessionStorage.getItem(SESSION_STORAGE_KEY) || '';
    const storedResetToken = sessionStorage.getItem(RESET_TOKEN_STORAGE_KEY) || '';

    if (storedMobile) setMobile(storedMobile);
    if (storedSession) {
      setOtpSession(storedSession);
      setStep('verify');
    }
    if (storedResetToken) {
      setResetToken(storedResetToken);
      setStep('reset');
    }
  }, []);

  const maskedMobile = useMemo(() => {
    if (!mobile) return '';
    const last4 = mobile.trim().slice(-4);
    return `${'*'.repeat(Math.max(0, mobile.trim().length - 4))}${last4}`;
  }, [mobile]);

  const getErrorMessage = (error: any): string => {
    const responseData = error?.response?.data;
    const errorMessage = responseData?.message;
    const nestedErrorMessage = responseData?.error?.message;
    const validationErrors = responseData?.errors;

    if (typeof errorMessage === 'string' && errorMessage.trim()) return errorMessage;
    if (typeof nestedErrorMessage === 'string' && nestedErrorMessage.trim()) return nestedErrorMessage;

    if (validationErrors && typeof validationErrors === 'object') {
      const allErrors = Object.values(validationErrors)
        .flatMap((value) => (Array.isArray(value) ? value : []))
        .filter((value) => typeof value === 'string' && value.trim());

      if (allErrors.length > 0) return allErrors.join(' | ');
    }

    return 'Request failed. Please try again.';
  };

  const findValueInObject = (value: any, candidates: string[]): string => {
    if (!value || typeof value !== 'object') return '';

    for (const candidate of candidates) {
      const directValue = value?.[candidate];
      if (typeof directValue === 'string' && directValue.trim()) return directValue;
    }

    for (const nestedValue of Object.values(value)) {
      const found = findValueInObject(nestedValue, candidates);
      if (found) return found;
    }

    return '';
  };

  const extractOtpSession = (response: any): string => {
    const fromBody = findValueInObject(response?.data, [
      'otp_session',
      'otp_session_id',
      'otpSession',
      'otpSessionId',
      'session',
      'session_id',
    ]);

    const fromHeaders =
      response?.headers?.['x-otp-session'] ||
      response?.headers?.['x-session-id'] ||
      response?.headers?.['x-verify-session'] ||
      '';

    return fromBody || fromHeaders || '';
  };

  const extractResetToken = (response: any): string =>
    findValueInObject(response?.data, ['reset_token', 'resetToken', 'token']);

  const clearResetFlow = () => {
    sessionStorage.removeItem(MOBILE_STORAGE_KEY);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(RESET_TOKEN_STORAGE_KEY);
    setOtp('');
    setOtpSession('');
    setResetToken('');
    setPassword('');
    setPasswordConfirmation('');
  };

  const requestOtp = async (mobileNumber: string, isResend = false) => {
    const normalizedMobile = mobileNumber.trim();

    if (!normalizedMobile) {
      toast.error('Please enter your mobile number.');
      return;
    }

    try {
      if (isResend) setResendingOtp(true);
      else setRequestingOtp(true);

      await httpService.get(API_CSRF_COOKIES);
      const response = await httpService.post(
        API_FORGOT_PASSWORD_REQUEST_OTP_URL,
        { mobile: normalizedMobile },
        { xsrfHeaderName: 'X-XSRF-TOKEN', withCredentials: true },
      );

      const nextSession = extractOtpSession(response);
      if (!nextSession) {
        toast.error('OTP session could not be created. Please try again.');
        return;
      }

      setMobile(normalizedMobile);
      setOtpSession(nextSession);
      setResetToken('');
      setStep('verify');
      sessionStorage.setItem(MOBILE_STORAGE_KEY, normalizedMobile);
      sessionStorage.setItem(SESSION_STORAGE_KEY, nextSession);
      sessionStorage.removeItem(RESET_TOKEN_STORAGE_KEY);
      toast.success(response?.data?.message || 'OTP has been sent to your mobile number.');
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    } finally {
      setRequestingOtp(false);
      setResendingOtp(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await requestOtp(mobile, false);
  };

  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cleanOtp = otp.trim();

    if (!cleanOtp) {
      toast.error('Please enter OTP.');
      return;
    }

    if (!otpSession) {
      toast.error('OTP session not found. Please request OTP again.');
      setStep('request');
      return;
    }

    try {
      setVerifyingOtp(true);
      await httpService.get(API_CSRF_COOKIES);
      const response = await httpService.post(
        API_FORGOT_PASSWORD_VERIFY_OTP_URL,
        { mobile: mobile.trim(), otp: cleanOtp, otp_session_id: otpSession },
        { xsrfHeaderName: 'X-XSRF-TOKEN', withCredentials: true },
      );

      const nextResetToken = extractResetToken(response);
      if (!nextResetToken) {
        toast.error('Reset token was not received. Please try again.');
        return;
      }

      setResetToken(nextResetToken);
      setStep('reset');
      sessionStorage.setItem(RESET_TOKEN_STORAGE_KEY, nextResetToken);
      toast.success(response?.data?.message || 'OTP verified successfully.');
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!resetToken) {
      toast.error('Reset token not found. Please verify OTP again.');
      setStep('verify');
      return;
    }

    if (!password || !passwordConfirmation) {
      toast.error('Please enter and confirm your new password.');
      return;
    }

    if (password !== passwordConfirmation) {
      toast.error('Password and confirmation do not match.');
      return;
    }

    try {
      setResettingPassword(true);
      await httpService.get(API_CSRF_COOKIES);
      const response = await httpService.post(
        API_FORGOT_PASSWORD_RESET_URL,
        {
          mobile: mobile.trim(),
          reset_token: resetToken,
          password,
          password_confirmation: passwordConfirmation,
        },
        { xsrfHeaderName: 'X-XSRF-TOKEN', withCredentials: true },
      );

      clearResetFlow();
      toast.success(response?.data?.message || 'Password reset successful.');
      navigate(ROUTES.login, { replace: true });
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    } finally {
      setResettingPassword(false);
    }
  };

  const backToRequestStep = () => {
    setStep('request');
    setOtp('');
    setOtpSession('');
    setResetToken('');
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(RESET_TOKEN_STORAGE_KEY);
  };

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[rgb(var(--c-surface))]">
      <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-8">
        <div className="w-full max-w-md rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">Forgot Password</h2>
          <p className="mt-2 text-sm text-[rgb(var(--c-text))]/60 dark:text-[rgb(var(--c-text))]/60">
            {step === 'request' && 'Enter your mobile number to receive a password reset OTP.'}
            {step === 'verify' && `OTP sent to ${maskedMobile || mobile}. Enter it to continue.`}
            {step === 'reset' && 'OTP verified. Now set a new password for your account.'}
          </p>

          {step === 'request' && (
            <form className="mt-6" onSubmit={handleRequestOtp}>
              <label className="mb-2 block text-sm font-medium text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                Mobile Number
              </label>
              <Input
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="017********"
                className="w-full rounded border border-[rgb(var(--c-border))] bg-transparent px-4 py-2.5 text-[rgb(var(--c-text))] outline-none focus:border-blue-400 dark:bg-form-input dark:text-[rgb(var(--c-text))]"
              />

              <ButtonLoading
                type="submit"
                buttonLoading={requestingOtp}
                label={requestingOtp ? 'Sending OTP...' : 'Send OTP'}
                disabled={requestingOtp}
                variant="primary"
                className="whitespace-nowrap text-center mr-0 p-2 w-full mt-5 flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-60"
                icon={<FiSend className="text-lg ml-2 mr-2" />}
              />
            </form>
          )}

          {step === 'verify' && (
            <form className="mt-6" onSubmit={handleVerifyOtp}>
              <label className="mb-2 block text-sm font-medium text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                OTP Code
              </label>
              <OtpInput
                value={otp}
                onChange={setOtp}
                numInputs={6}
                renderInput={(props) => (
                  <Input
                    {...props}
 className={`${FIELD_BASE} ! w-10! text-center text-xl font-semibold transition-all duration-200 mx-0 shadow-sm sm:! sm:w-12!`}
                  />
                )}
              />

              <ButtonLoading
                type="submit"
                buttonLoading={verifyingOtp}
                label={verifyingOtp ? 'Verifying...' : 'Verify OTP'}
                disabled={verifyingOtp}
                variant="primary"
                className="whitespace-nowrap text-center mr-0 p-2 w-full mt-5 flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-60"
                icon={<FiSave className="text-lg ml-2 mr-2" />}
              />

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  onClick={() => requestOtp(mobile, true)}
                  disabled={resendingOtp}
                  className="inline-flex items-center justify-center rounded border border-[rgb(var(--c-border))] px-4 py-3 text-sm font-medium text-[rgb(var(--c-text))] transition hover:bg-gray-2 disabled:cursor-not-allowed disabled:opacity-60 dark:text-[rgb(var(--c-text))] dark:hover:bg-form-input"
                >
                  <FiRefreshCcw className="mr-2" />
                  {resendingOtp ? 'Resending...' : 'Resend OTP'}
                </Button>

                <Button
                  type="button"
                  onClick={backToRequestStep}
                  className="inline-flex items-center justify-center rounded border border-[rgb(var(--c-border))] px-4 py-3 text-sm font-medium text-[rgb(var(--c-text))] transition hover:bg-gray-2 dark:text-[rgb(var(--c-text))] dark:hover:bg-form-input"
                >
                  <FiArrowLeft className="mr-2" />
                  Change Mobile
                </Button>
              </div>
            </form>
          )}

          {step === 'reset' && (
            <form className="mt-6" onSubmit={handleResetPassword}>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                  New Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full rounded border border-[rgb(var(--c-border))] bg-transparent px-4 py-2.5 pr-12 text-[rgb(var(--c-text))] outline-none focus:border-blue-400 dark:bg-form-input dark:text-[rgb(var(--c-text))]"
                  />
                  <Button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-primary"
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </Button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                  Confirm Password
                </label>
                <div className="relative">
                  <Input
                    type={showPasswordConfirmation ? 'text' : 'password'}
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full rounded border border-[rgb(var(--c-border))] bg-transparent px-4 py-2.5 pr-12 text-[rgb(var(--c-text))] outline-none focus:border-blue-400 dark:bg-form-input dark:text-[rgb(var(--c-text))]"
                  />
                  <Button
                    type="button"
                    onClick={() => setShowPasswordConfirmation((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-primary"
                  >
                    {showPasswordConfirmation ? <FiEyeOff /> : <FiEye />}
                  </Button>
                </div>
              </div>

              <ButtonLoading
                type="submit"
                buttonLoading={resettingPassword}
                label={resettingPassword ? 'Updating Password...' : 'Update Password'}
                disabled={resettingPassword}
                variant="primary"
                className="whitespace-nowrap text-center mr-0 p-2 w-full mt-5 flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-60"
                icon={<FiSave className="text-lg ml-2 mr-2" />}
              />
            </form>
          )}

          <p className="mt-4 text-center text-sm text-[rgb(var(--c-text))]/70 dark:text-[rgb(var(--c-text))]/70">
            Remember your password?{' '}
            <Link to={ROUTES.login} className="text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
