import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useDispatch, useSelector } from 'react-redux';
import ROUTES from '../../components/services/appRoutes';
import Loader from '../../common/Loader';
import { login } from '../../features/authReducer';
import HelmetTitle from '../../components/utils/others/HelmetTitle';
import { getSettings } from '../../components/modules/settings/settingsSlice';
import { FiEye, FiEyeOff, FiLogIn, FiBookOpen, FiShoppingCart, FiUsers, FiPieChart, FiSmartphone, FiMail, FiLock } from 'react-icons/fi';
import { Button, ButtonLoading } from '../UiElements/CustomButtons';
import { getSignInTitleByHost } from '../../components/services/tenantTitles';
import DeviceLimitNotice from '../../components/modules/devices/DeviceLimitNotice';
import { FIELD_BASE, FIELD_LABEL } from '../../theme/fieldStyles';
import ToggleSwitch from '../../components/utils/fields/ToggleSwitch';
import { Input } from '../../components/utils/fields/FormControls';

/**
 * Forgot password and Register: the quiet way out of this screen, so they are
 * text links rather than buttons competing with Sign In.
 *
 * Same size, weight and colour as the Remember me label beside them -- one
 * muted voice for everything on the card that is not the action. The underline
 * on hover is what says they are clickable, not a brighter colour.
 */
const TEXT_LINK = 'text-sm font-medium text-body hover:underline dark:text-bodydark';

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
          <div className="relative hidden h-full bg-[rgb(var(--c-gray-950))] xl:flex xl:h-screen xl:flex-col xl:justify-center xl:overflow-hidden">

            {/* Ambient glows */}
            <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-meta-3/20 blur-[120px]" />
            <div className="pointer-events-none absolute -bottom-32 right-0 h-112 w-md rounded-full bg-primary/20 blur-[130px]" />

            {/* Grid texture. Fades from the top-left so it sits behind the
                heading and dissolves before the feature tiles. */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgb(var(--c-white)) 1px, transparent 1px), linear-gradient(to bottom, rgb(var(--c-white)) 1px, transparent 1px)',
                backgroundSize: '48px 48px',
                maskImage: 'radial-gradient(120% 90% at 0% 0%, rgb(var(--c-black-2)) 0%, transparent 65%)',
                WebkitMaskImage: 'radial-gradient(120% 90% at 0% 0%, rgb(var(--c-black-2)) 0%, transparent 65%)',
              }}
            />

            {/* Sizing is deliberately tight so the panel fits a 768px-tall
                laptop without scrolling; 2xl relaxes it on roomier screens. */}
            <div className="relative z-10 w-full animate-fade-in-up px-12 py-10 2xl:px-20 2xl:py-14">
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
                Inventory and{' '}
                <span className="bg-linear-to-r from-meta-3 to-secondary bg-clip-text text-transparent">
                  HRM
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
                    className="group flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/3 p-3 transition-colors duration-200 hover:border-white/15 hover:bg-white/6"
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
            <div className="w-full max-w-md animate-fade-in-up">
              {/* Brand lockup — shown only below xl, where the left panel is
                  hidden and the form would otherwise sit on a blank field. */}
              <div className="mb-6 flex items-center justify-center gap-2.5 xl:hidden">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-meta-3 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-meta-3" />
                </span>
                <span className="text-sm font-semibold uppercase tracking-[0.18em] text-black dark:text-white">
                  CashbookBD
                </span>
              </div>

              <h2 className="mb-2 text-center text-2xl font-bold text-black dark:text-white sm:text-title-xl2">
                <HelmetTitle title={getSignInTitleByHost(hostname)} />
              </h2>

              {/* `text-body` / `dark:text-bodydark`, not black-at-60% over
                  white-at-60%: the two are not the same grey, so the line used
                  to change weight as well as colour between the themes. */}
              <p className="mb-6 w-full text-center text-sm text-body dark:text-bodydark">
                Sign in to continue.
              </p>

              {process.env.NODE_ENV === 'development' ? (
                <div className="w-full text-center">
                  {/* Dev-only, and deliberately not on TEXT_LINK: this one
                      should stand out from the card's muted links. */}
                  <Button
                    className="text-sm font-medium text-primary hover:underline"
                    onClick={handleSetUser}
                    type="button"
                  >
                    Set User
                  </Button>
                </div>
              ) : null}

              {/* The card sits on a page painted the same white/boxdark, so
                  without a stroke it had no edge at all -- the shadow alone
                  disappears in dark mode. */}
              <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
                <form onSubmit={handleLogin}>
                  <div className="mb-4">
                    <label className={`mb-2.5 block font-medium ${FIELD_LABEL}`}>
                      Email or Phone
                    </label>
                    <div className="relative">
                      <FiMail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-body dark:text-bodydark2" />
                      <Input
                        type="text"
                        name="loginId"
                        id="emailaddress"
                        value={formData.loginId}
                        onChange={handleChange}
                        placeholder="Enter email or phone number"
                        autoComplete="username"
                        className={`${FIELD_BASE} w-full py-2.5 pl-11 pr-4`}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className={`mb-2.5 block font-medium ${FIELD_LABEL}`}>
                      Password
                    </label>
                    <div className="relative">
                      <FiLock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-body dark:text-bodydark2" />
                      <Input
                        name="password"
                        type={checkPassword ? 'password' : 'text'}
                        id="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Enter your password"
                        className={`${FIELD_BASE} w-full py-2.5 pl-11 pr-14`}
                      />

                      {/* ✅ Show/Hide Password */}
                      <Button
                        type="button"
                        onClick={handleCheckPassword}
                        title={checkPassword ? 'Show password' : 'Hide password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-body transition-colors hover:text-primary dark:text-bodydark2 dark:hover:text-primary"
                      >
                        {checkPassword ? <FiEye className="h-5 w-5" /> : <FiEyeOff className="h-5 w-5" />}
                      </Button>
                    </div>
                  </div>

                  <div className="mb-6 flex items-center justify-between">
                    <ToggleSwitch
                      name="remember"
                      checked={formData.remember}
                      onChange={handleChange}
                      label="Remember me"
                      labelClassName="text-sm text-body dark:text-bodydark"
                    />
                    <Link to={ROUTES.forgot_password} className={TEXT_LINK}>
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

                    {/* The app's own button, unmodified: the `default` variant
                        that Add New, Save and Home already wear, at the h-10
                        those call sites use. It carried `primary` and a
                        `rounded-lg` of its own before, which made Sign In the
                        one button in the app that looked like nothing else.
                        Full width is the only thing this screen asks for. */}
                    <ButtonLoading
                      type="submit"
                      label="Sign In"
                      buttonLoading={isLoading}
                      icon={<FiLogIn className="h-5 w-5" />}
                      className="h-10 w-full"
                    />
                  </div>

                    {shouldShowCompanyRegistration && (
                      <div>
                        <p className="mt-4 text-center text-sm text-body dark:text-bodydark">
                          New here?{' '}
                          <Link to={ROUTES.public_register} className={TEXT_LINK}>
                            Register your company
                          </Link>
                        </p>
                      </div>
                    )}

                </form>
              </div>

              {/* Was black-at-80% in light and white-at-20% in dark -- the same
                  line, near-solid on one theme and almost gone on the other. */}
              <p className="mt-6 text-center text-xs text-body dark:text-bodydark2">
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
