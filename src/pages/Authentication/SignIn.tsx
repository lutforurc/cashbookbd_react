import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useDispatch, useSelector } from 'react-redux';
import ROUTES from '../../components/services/appRoutes';
import Loader from '../../common/Loader';
import { login } from '../../features/authReducer';
import HelmetTitle from '../../components/utils/others/HelmetTitle';
import { getSettings } from '../../components/modules/settings/settingsSlice';
import { FiEye, FiEyeOff, FiLogIn, FiBookOpen, FiShoppingCart, FiUsers, FiPieChart, FiSmartphone } from 'react-icons/fi';
import { ButtonLoading } from '../UiElements/CustomButtons';
import { getSignInTitleByHost } from '../../components/services/tenantTitles';
import DeviceLimitNotice from '../../components/modules/devices/DeviceLimitNotice';

const SignIn: React.FC = () => {
  const { isLoading, errors, isLoggedIn, deviceLimit } = useSelector((state: any) => state.auth);

  const [checkPassword, setCheckPassword] = useState(true);
  const hostname = window.location.hostname;
  const shouldShowCompanyRegistration =
    window.location.origin === 'https://app.cashbookbd.com' ||
    window.location.origin === 'https://accounts.staging.cashbookbd.com' ||
    window.location.origin === 'http://localhost:5173';

  const prevLocation = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoggedIn) return;

    const { from } = (prevLocation.state as any) || {
      from: { pathname: ROUTES.dashboard },
    };

    navigate(from, { replace: true });
    dispatch(getSettings() as any);
  }, [isLoggedIn, prevLocation.state, navigate, dispatch]);

  const [formData, setFormData] = useState({
    loginId: '',
    password: '',
    remember: false,
  });

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCheckPassword = () => setCheckPassword((p) => !p);

  const submitLogin = () => {
    dispatch(
      login({
        loginId: formData.loginId,
        password: formData.password,
        remember: formData.remember,
        callback: () => { },
      }) as any,
    );
  };

  const handleLogin = (e: any) => {
    e.preventDefault();

    if (!formData.loginId || !formData.password) {
      dispatch({
        type: 'AUTH/login/error',
        payload: { message: 'Please add the required info.' },
      });
      toast.error('Please add the required info.', { toastId: 'login-error' } as any);
      return;
    }

    submitLogin();
  };

  useEffect(() => {
    const msg = errors?.message;
    if (!msg) return;

    toast.info(msg, { toastId: 'login-error' } as any);
  }, [errors?.message]);

  const handleSetUser = () => {
    setFormData({
      ...formData,
      loginId: 'lutforurc@gmail.com',
      password: 'Lutfor01911282149#',
    });

    if (process.env.NODE_ENV === 'development') {
      (document.getElementById('emailaddress') as HTMLInputElement).value = 'lutforurco@gmail.com';
      (document.getElementById('emailaddress') as HTMLInputElement).focus();

      setTimeout(() => {
        (document.getElementById('password') as HTMLInputElement).value = 'Lutfor01911282149#';
        (document.getElementById('password') as HTMLInputElement).focus();
      }, 100);
    }
  };

  return (
    <>
      {isLoading && <Loader />}

      <div className="fixed inset-0 bg-white shadow-default dark:bg-boxdark overflow-y-auto xl:overflow-hidden">

        <div className="grid h-full grid-cols-1 xl:grid-cols-2">

          {/* LEFT: Branding Panel */}
          {/* h-screen, not h-full: the grid row stretches to whichever column is
              taller, so h-full would inherit the form's height and park the
              branding content above the fold instead of centring it. */}
          <div className="relative hidden h-full bg-[#0B1B26] xl:flex xl:h-screen xl:flex-col xl:justify-center xl:overflow-hidden">

            {/* Ambient glows */}
            <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-meta-3/20 blur-[120px]" />
            <div className="pointer-events-none absolute -bottom-32 right-0 h-[28rem] w-[28rem] rounded-full bg-primary/20 blur-[130px]" />

            {/* Grid texture. Fades from the top-left so it sits behind the
                heading and dissolves before the feature tiles. */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
                backgroundSize: '48px 48px',
                maskImage: 'radial-gradient(120% 90% at 0% 0%, #000 0%, transparent 65%)',
                WebkitMaskImage: 'radial-gradient(120% 90% at 0% 0%, #000 0%, transparent 65%)',
              }}
            />

            {/* Sizing is deliberately tight so the panel fits a 768px-tall
                laptop without scrolling; 2xl relaxes it on roomier screens. */}
            <div className="relative z-10 w-full px-12 py-10 2xl:px-20 2xl:py-14">
              {/* Badge */}
              <span className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 py-2 pl-3 pr-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/80 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-meta-3 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-meta-3" />
                </span>
                CashbookBD
              </span>

              {/* Heading */}
              <h1 className="mt-5 text-[2.25rem] font-bold leading-[1.05] tracking-tight text-white 2xl:mt-7 2xl:text-[3.25rem]">
                Accounts,
                <br />
                Procurement and{' '}
                <span className="bg-gradient-to-r from-meta-3 to-secondary bg-clip-text text-transparent">
                  HR
                </span>
              </h1>

              {/* Brighter than the surrounding copy, with the three pillars
                  tinted to match their cards further down the panel. */}
              <p className="mt-3.5 max-w-lg text-sm leading-relaxed text-white/70 2xl:mt-5 2xl:text-base">
                Multi-branch{' '}
                <span className="font-semibold text-meta-3">accounting</span>,{' '}
                <span className="font-semibold text-meta-5">inventory</span> and{' '}
                <span className="font-semibold text-meta-6">payroll</span> — with
                role-based permissions and a full audit trail.
              </p>

              {/* The Android app signs in against this same API, so it is worth
                  saying up front rather than only in the footer line. */}
              <div className="mt-4 inline-flex items-center gap-2.5 rounded-lg border border-meta-3/20 bg-meta-3/10 py-1.5 pl-2.5 pr-3.5">
                <FiSmartphone className="h-4 w-4 shrink-0 text-meta-3" />
                <span className="text-[13px] font-semibold text-white">
                  Mobile app available
                  <span className="font-normal text-white/45"> — on Android</span>
                </span>
              </div>

              {/* Features. A 2x2 grid of tiles rather than a single narrow
                  column, so the panel's width is actually used. */}
              <ul className="mt-5 grid max-w-2xl gap-2.5 sm:grid-cols-2 2xl:mt-8">
                {[
                  {
                    icon: FiBookOpen,
                    tint: 'bg-meta-3/15 text-meta-3',
                    title: 'Cash, Bank and Journal Transaction',
                    desc: 'Receipts, payments and journal entries',
                  },
                  {
                    icon: FiShoppingCart,
                    tint: 'bg-primary/20 text-secondary',
                    title: 'Sales, Purchase and Stock',
                    desc: 'Invoices, returns, orders and warehouse transfer',
                  },
                  {
                    icon: FiUsers,
                    tint: 'bg-meta-10/20 text-meta-10',
                    title: 'HR, Attendance and Payroll',
                    desc: 'Salary, festival bonus, leave and overtime',
                  },
                  {
                    icon: FiPieChart,
                    tint: 'bg-meta-6/15 text-meta-6',
                    title: 'Reports and Statements',
                    desc: 'Cash book, ledger, trial balance and P&L',
                  },
                ].map(({ icon: Icon, tint, title, desc }) => (
                  <li
                    key={title}
                    className="group flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 transition-colors duration-200 hover:border-white/15 hover:bg-white/[0.06]"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ring-white/10 ${tint}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold leading-snug text-white">
                        {title}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-white/40">
                        {desc}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>

              {/* Footer: the secondary modules, each with its own accent so the
                  row reads as a set rather than a wall of grey. Every one is a
                  real module in the API (realestate, installment, requisition,
                  warehouse-transfer, sms routes) — nothing aspirational here. */}
              <ul className="mt-6 flex max-w-2xl flex-wrap gap-2 border-t border-white/[0.07] pt-5 2xl:mt-8 2xl:gap-2.5 2xl:pt-7">
                {[
                  // Business types the app has dedicated purchase/sales flows for.
                  { label: 'General Business', ring: 'border-meta-3/40', text: 'text-meta-3' },
                  { label: 'Electronics Business', ring: 'border-meta-5/40', text: 'text-meta-5' },
                  { label: 'Trading Business', ring: 'border-meta-8/40', text: 'text-meta-8' },
                  { label: 'Real Estate Business', ring: 'border-meta-7/40', text: 'text-meta-7' },
                  // Secondary modules.
                  { label: 'Installments Sales', ring: 'border-meta-10/40', text: 'text-meta-10' },
                  { label: 'Warehouse Transfer', ring: 'border-meta-6/40', text: 'text-meta-6' },
                  { label: 'SMS Alerts', ring: 'border-meta-1/40', text: 'text-meta-1' },
                ].map(({ label, ring, text }) => (
                  <li
                    key={label}
                    className={`rounded-lg border bg-black/25 px-2.5 py-1.5 text-xs font-bold tracking-tight ${ring} ${text} 2xl:px-3 2xl:py-2 2xl:text-[13px]`}
                  >
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* RIGHT: Form Panel */}
          <div className="flex h-full items-center justify-center px-4 py-8 sm:px-10 xl:py-0">
            <div className="w-full max-w-md">
              <h2 className="mb-2 text-2xl font-bold text-black dark:text-white sm:text-title-xl2">
                <HelmetTitle title={getSignInTitleByHost(hostname)} />
              </h2>

              <p className="mb-1 text-sm text-black/60 dark:text-white/60 text-center w-full">
                Sign in to continue.
              </p>

              {process.env.NODE_ENV === 'development' ? (
                <div className="w-full text-center">
                  <button
                    className="text-sm font-medium text-primary hover:underline"
                    onClick={handleSetUser}
                    type="button"
                  >
                    Set User
                  </button>
                </div>
              ) : null}

              {/* ✅ Card: border ছিল না, add করা হলো */}
              <div className="rounded-xl  border-stroke bg-white shadow-sm dark:border-strokedark dark:bg-boxdark p-6 sm:p-6 ">
                <form onSubmit={handleLogin}>
                  <div className="mb-4">
                    <label className="mb-2.5 block font-medium text-black dark:text-white">
                      Email or Phone
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="loginId"
                        id="emailaddress"
                        value={formData.loginId}
                        onChange={handleChange}
                        placeholder="Enter email or phone number"
                        autoComplete="username"
                        className="w-full border border-stroke bg-transparent py-2 pl-4 pr-4 text-black outline-none focus:border-primary focus-visible:shadow-none dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="mb-2.5 block font-medium text-black dark:text-white">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        name="password"
                        type={checkPassword ? 'password' : 'text'}
                        id="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Enter your password"
                        className="w-full border border-stroke bg-transparent py-2 pl-4 pr-14 text-black outline-none focus:border-primary focus-visible:shadow-none dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      />

                      {/* ✅ Show/Hide Password */}
                      <button
                        type="button"
                        onClick={handleCheckPassword}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:opacity-80"
                      >
                        {checkPassword ? <FiEye className="h-5 w-5" /> : <FiEyeOff className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="mb-6 flex items-center justify-between">
                    <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-black/70 dark:text-white/70">
                      <input
                        type="checkbox"
                        name="remember"
                        checked={formData.remember}
                        onChange={handleChange}
                        className="h-4 w-4 rounded border-stroke text-primary focus:ring-primary"
                      />
                      Remember me
                    </label>
                    <Link
                      to={ROUTES.forgot_password}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  {deviceLimit && (
                    <div className="mb-4">
                      <DeviceLimitNotice
                        block={deviceLimit}
                        loginId={formData.loginId}
                        password={formData.password}
                        onReleased={submitLogin}
                        onCancel={() => dispatch({ type: 'AUTH/login/deviceLimitDismissed' })}
                      />
                    </div>
                  )}

                  <div className="mb-2">

                    <ButtonLoading icon={
                      <div className='md:hidden'>
                        <FiLogIn className="h-5 w-5" />
                      </div>
                    } type="submit" label='Sign In' className='p-3 w-full' />
                  </div>

                    {shouldShowCompanyRegistration && (
                      <div className=''>
                        <p className="mt-4 text-center text-sm text-black/70 dark:text-white/70">
                          New here?{' '}
                          <Link to={ROUTES.public_register} className="text-primary hover:underline">
                            Register your company
                          </Link>
                        </p>
                      </div>
                    )}

                </form>
              </div>

              <p className="mt-6 text-center text-xs text-black/80 dark:text-white/20">
                © {new Date().getFullYear()} CashbookBD - All rights reserved.
              </p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default SignIn;
