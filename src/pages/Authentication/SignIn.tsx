import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useDispatch, useSelector } from 'react-redux';
import ROUTES from '../../components/services/appRoutes';
import Loader from '../../common/Loader';
import { login } from '../../features/authReducer';
import HelmetTitle from '../../components/utils/others/HelmetTitle';
import { getSettings } from '../../components/modules/settings/settingsSlice';
import { FiEye, FiEyeOff, FiLogIn, FiBookOpen, FiBarChart2, FiShield, FiTrendingUp } from 'react-icons/fi';
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
          <div className="relative hidden h-full overflow-hidden xl:flex xl:flex-col xl:justify-center bg-[#0B1B26]">

            {/* Ambient glows */}
            <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-meta-3/20 blur-[120px]" />
            <div className="pointer-events-none absolute -bottom-32 right-0 h-[28rem] w-[28rem] rounded-full bg-primary/20 blur-[130px]" />

            {/* Grid texture */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
                backgroundSize: '56px 56px',
                maskImage: 'radial-gradient(ellipse at 30% 40%, #000 40%, transparent 75%)',
                WebkitMaskImage: 'radial-gradient(ellipse at 30% 40%, #000 40%, transparent 75%)',
              }}
            />

            <div className="relative z-10 px-14 2xl:px-20">
              {/* Badge */}
              <span className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 py-2 pl-3 pr-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/80 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-meta-3 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-meta-3" />
                </span>
                CashbookBD
              </span>

              {/* Heading */}
              <h1 className="mt-8 text-5xl font-bold leading-[1.1] tracking-tight text-white 2xl:text-6xl">
                Accounts,
                <br />
                Stock and{' '}
                <span className="bg-gradient-to-r from-meta-3 to-secondary bg-clip-text text-transparent">
                  HR
                </span>
              </h1>

              <p className="mt-5 max-w-md text-lg leading-relaxed text-white/50">
                A clean workspace for daily business — everything in one place.
              </p>

              {/* Features */}
              <ul className="mt-12 space-y-6">
                {[
                  {
                    icon: FiBookOpen,
                    tint: 'bg-meta-3/15 text-meta-3',
                    title: 'Ledger and Vouchers',
                    desc: 'Clear posting, balance and reports',
                  },
                  {
                    icon: FiBarChart2,
                    tint: 'bg-primary/20 text-secondary',
                    title: 'Sales and Payroll',
                    desc: 'Inventory and attendance in sync',
                  },
                  {
                    icon: FiShield,
                    tint: 'bg-meta-6/15 text-meta-6',
                    title: 'Secure by Design',
                    desc: 'Device-aware login and audit trail',
                  },
                ].map(({ icon: Icon, tint, title, desc }) => (
                  <li key={title} className="flex items-start gap-4">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-white/10 ${tint}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="pt-0.5">
                      <span className="block font-semibold text-white">{title}</span>
                      <span className="block text-sm text-white/40">{desc}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Floating live card */}
            <div className="absolute bottom-16 right-10 z-20 w-72 rounded-2xl border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-xl 2xl:right-16">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Today</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-meta-3/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-meta-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-meta-3" />
                  Live
                </span>
              </div>

              <div className="mt-5 flex items-end justify-between">
                <div>
                  <p className="text-xs text-white/40">Cash Balance</p>
                  <p className="mt-1 text-3xl font-bold tracking-tight text-white">Tk 48.6K</p>
                </div>
                <FiTrendingUp className="mb-1 h-8 w-8 text-meta-3" />
              </div>

              <div className="my-4 h-px bg-white/10" />

              <ul className="space-y-3">
                {[
                  { dot: 'bg-meta-3', title: 'Cash Received', sub: 'Voucher #CR-1028' },
                  { dot: 'bg-meta-6', title: 'Purchase Bill', sub: 'Inventory posted' },
                ].map((row) => (
                  <li key={row.title} className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${row.dot}`} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-white/90">
                        {row.title}
                      </span>
                      <span className="block truncate text-xs text-white/35">{row.sub}</span>
                    </span>
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
